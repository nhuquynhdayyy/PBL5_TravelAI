using System.Globalization;
using Microsoft.EntityFrameworkCore;
using TravelAI.Application.DTOs.AI;
using TravelAI.Application.Interfaces;
using TravelAI.Application.Services.AI;
using TravelAI.Domain.Entities;
using TravelAI.Domain.Enums;
using TravelAI.Infrastructure.ExternalServices;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.Infrastructure.Services.AI;

public class ItineraryService : IItineraryService
{
    private readonly ApplicationDbContext _db;
    private readonly GeminiService _gemini;
    private readonly AIParserService _parserService;
    private readonly PromptBuilder _promptBuilder;

    public ItineraryService(ApplicationDbContext db, GeminiService gemini, AIParserService parserService)
    {
        _db = db;
        _gemini = gemini;
        _parserService = parserService;
        _promptBuilder = new PromptBuilder();
    }

    public async Task<ItineraryResponseDto?> GenerateAndLogItineraryAsync(int userId, GenerateItineraryRequest request)
    {
        var dest = await _db.Destinations.FindAsync(request.DestinationId);
        if (dest == null)
        {
            return null;
        }

        var pref = await _db.UserPreferences.FirstOrDefaultAsync(u => u.UserId == userId)
            ?? new UserPreference
            {
                TravelStyle = "Kham pha tong hop",
                BudgetLevel = BudgetLevel.Medium
            };

        var spots = await _db.TouristSpots
            .Include(s => s.Services)
            .Where(s => s.DestinationId == request.DestinationId)
            .ToListAsync();

        var tripStartDate = request.StartDate == default ? DateTime.Today : request.StartDate.Date;
        var promptServices = await GetAvailableServicesForPromptAsync(dest, tripStartDate, request.NumberOfDays);
        var prompt = _promptBuilder.Build(pref, dest, spots, request.NumberOfDays, tripStartDate, promptServices);
        var rawAiResponse = await _gemini.CallApiAsync(
            prompt,
            systemPrompt: AIPrompts.ItinerarySystemPrompt,
            requireJsonResponse: true);

        _db.AISuggestionLogs.Add(new AISuggestionLog
        {
            UserId = userId,
            UserPrompt = prompt,
            AiResponseJson = rawAiResponse,
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        var parsed = _parserService.ParseAndValidate(rawAiResponse);
        if (parsed == null)
        {
            return null;
        }

        parsed.StartDate = tripStartDate;
        parsed.EndDate = tripStartDate.AddDays(parsed.Days.Count);

        return parsed;
    }

    public async Task<int> SaveItineraryAsync(int userId, ItineraryResponseDto dto)
    {
        using var transaction = await _db.Database.BeginTransactionAsync();

        try
        {
            var tripStartDate = dto.StartDate == default ? DateTime.Today : dto.StartDate.Date;
            if (dto.Days.Count == 0)
            {
                throw new InvalidOperationException("Itinerary phai co it nhat mot ngay de luu.");
            }

            var itinerary = new Itinerary
            {
                UserId = userId,
                Title = dto.TripTitle,
                StartDate = tripStartDate,
                EndDate = tripStartDate.AddDays(dto.Days.Count),
                EstimatedCost = dto.TotalEstimatedCost,
                Status = ItineraryStatus.Confirmed
            };

            _db.Itineraries.Add(itinerary);
            await _db.SaveChangesAsync();

            var requestedServiceIds = dto.Days
                .SelectMany(day => day.Activities)
                .Where(activity => activity.ServiceId.HasValue)
                .Select(activity => activity.ServiceId!.Value)
                .Distinct()
                .ToList();

            var servicesById = requestedServiceIds.Count == 0
                ? new Dictionary<int, Service>()
                : await _db.Services
                    .Include(service => service.TouristSpot)
                    .Include(service => service.ServiceSpots)
                        .ThenInclude(serviceSpot => serviceSpot.TouristSpot)
                    .Where(service => requestedServiceIds.Contains(service.ServiceId))
                    .ToDictionaryAsync(service => service.ServiceId);

            var spotCandidates = await _db.TouristSpots
                .AsNoTracking()
                .ToListAsync();

            var order = 1;
            foreach (var day in dto.Days.OrderBy(d => d.Day))
            {
                var activities = day.Activities.ToList();

                for (var index = 0; index < activities.Count; index++)
                {
                    var activity = activities[index];
                    servicesById.TryGetValue(activity.ServiceId ?? 0, out var service);

                    var spot = ResolvePrimarySpot(service)
                        ?? spotCandidates.FirstOrDefault(candidate => IsPotentialSpotMatch(candidate, activity));

                    var durationMinutes = ResolveDurationMinutes(service, spot);
                    var startTime = tripStartDate
                        .AddDays(Math.Max(day.Day - 1, 0))
                        .Date
                        .AddHours(8 + index * 3);
                    var endTime = startTime.AddMinutes(durationMinutes);

                    _db.ItineraryItems.Add(new ItineraryItem
                    {
                        ItineraryId = itinerary.ItineraryId,
                        SpotId = spot?.SpotId,
                        ServiceId = service?.ServiceId,
                        StartTime = startTime,
                        EndTime = endTime,
                        ActivityOrder = order++
                    });
                }
            }

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            return itinerary.ItineraryId;
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            throw new Exception("Loi khi luu lich trinh: " + ex.Message, ex);
        }
    }

    public async Task<IEnumerable<ItineraryResponseDto>> GetMyTripsAsync(int userId)
    {
        return await _db.Itineraries
            .AsNoTracking()
            .Where(i => i.UserId == userId)
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => new ItineraryResponseDto
            {
                ItineraryId = i.ItineraryId,
                TripTitle = i.Title,
                Destination = i.Title,
                StartDate = i.StartDate,
                EndDate = i.EndDate,
                TotalEstimatedCost = i.EstimatedCost
            })
            .ToListAsync();
    }

    public async Task<ItineraryResponseDto?> GetByIdAsync(int id, int userId)
    {
        var itinerary = await _db.Itineraries
            .AsNoTracking()
            .Include(i => i.Items)
                .ThenInclude(item => item.TouristSpot)
                    .ThenInclude(spot => spot!.Destination)
            .Include(i => i.Items)
                .ThenInclude(item => item.Service)
                    .ThenInclude(service => service!.TouristSpot)
                        .ThenInclude(spot => spot!.Destination)
            .Include(i => i.Items)
                .ThenInclude(item => item.Service)
                    .ThenInclude(service => service!.ServiceSpots)
                        .ThenInclude(serviceSpot => serviceSpot.TouristSpot)
                            .ThenInclude(spot => spot!.Destination)
            .FirstOrDefaultAsync(i => i.ItineraryId == id && i.UserId == userId);

        if (itinerary == null)
        {
            return null;
        }

        var orderedItems = itinerary.Items
            .OrderBy(item => item.StartTime)
            .ThenBy(item => item.ActivityOrder)
            .ToList();

        var days = BuildDayPlans(itinerary, orderedItems);
        var totalEstimatedCost = itinerary.EstimatedCost > 0
            ? itinerary.EstimatedCost
            : days.Sum(day => day.DailyCost);

        return new ItineraryResponseDto
        {
            ItineraryId = itinerary.ItineraryId,
            TripTitle = itinerary.Title,
            Destination = ResolveDestinationName(orderedItems, itinerary.Title),
            StartDate = itinerary.StartDate,
            EndDate = itinerary.EndDate,
            TotalEstimatedCost = totalEstimatedCost,
            Days = days
        };
    }

    private async Task<List<PromptServiceOption>> GetAvailableServicesForPromptAsync(Destination destination, DateTime tripStartDate, int totalDays)
    {
        var tripDates = Enumerable.Range(0, Math.Max(totalDays, 1))
            .Select(offset => tripStartDate.Date.AddDays(offset))
            .ToHashSet();

        var candidateServices = await _db.Services
            .AsNoTracking()
            .Include(service => service.TouristSpot)
            .Include(service => service.ServiceSpots)
                .ThenInclude(serviceSpot => serviceSpot.TouristSpot)
            .Include(service => service.Availabilities)
            .Where(service => service.IsActive
                && (service.ServiceType == ServiceType.Hotel || service.ServiceType == ServiceType.Tour)
                && ((service.TouristSpot != null && service.TouristSpot.DestinationId == destination.DestinationId)
                    || service.ServiceSpots.Any(serviceSpot => serviceSpot.TouristSpot.DestinationId == destination.DestinationId)))
            .ToListAsync();

        var promptServices = candidateServices
            .Select(service =>
            {
                var matchingAvailabilities = service.Availabilities
                    .Where(availability => IsAvailabilityUsable(service.ServiceType, availability, tripStartDate.Date, tripDates))
                    .OrderBy(availability => availability.Date)
                    .ToList();

                if (matchingAvailabilities.Count == 0)
                {
                    return null;
                }

                var primarySpot = ResolvePrimarySpot(service);
                var price = matchingAvailabilities.FirstOrDefault(availability => availability.Price > 0)?.Price
                    ?? service.BasePrice;

                return new PromptServiceOption
                {
                    ServiceId = service.ServiceId,
                    Name = service.Name,
                    ServiceType = service.ServiceType,
                    Location = primarySpot?.Name ?? destination.Name,
                    Description = service.Description,
                    Price = price,
                    PriceUnit = service.ServiceType == ServiceType.Hotel ? "dem" : "nguoi",
                    AvailableDates = matchingAvailabilities
                        .Select(availability => availability.Date.Date)
                        .Distinct()
                        .ToList()
                };
            })
            .Where(service => service != null)
            .Select(service => service!)
            .GroupBy(service => service.ServiceType)
            .SelectMany(group => group
                .OrderBy(service => service.Price)
                .ThenBy(service => service.Name)
                .Take(group.Key == ServiceType.Hotel ? 6 : 10))
            .ToList();

        return promptServices;
    }

    private static List<DayPlanDto> BuildDayPlans(Itinerary itinerary, List<ItineraryItem> orderedItems)
    {
        var expectedDayCount = Math.Max(1, (itinerary.EndDate.Date - itinerary.StartDate.Date).Days);

        if (orderedItems.Count == 0)
        {
            return Enumerable.Range(1, expectedDayCount)
                .Select(dayNumber => new DayPlanDto
                {
                    Day = dayNumber,
                    DailyCost = 0,
                    Activities = new List<ActivityDto>()
                })
                .ToList();
        }

        var distinctDates = orderedItems
            .Select(item => item.StartTime.Date)
            .Distinct()
            .OrderBy(date => date)
            .ToList();

        if (distinctDates.Count > 1 || expectedDayCount == 1)
        {
            return orderedItems
                .GroupBy(item => item.StartTime.Date)
                .OrderBy(group => group.Key)
                .Select((group, index) => CreateDayPlan(index + 1, group))
                .ToList();
        }

        var distributedGroups = Enumerable.Range(0, expectedDayCount)
            .Select(_ => new List<ItineraryItem>())
            .ToList();

        for (var index = 0; index < orderedItems.Count; index++)
        {
            var dayIndex = Math.Min(expectedDayCount - 1, index * expectedDayCount / orderedItems.Count);
            distributedGroups[dayIndex].Add(orderedItems[index]);
        }

        return distributedGroups
            .Select((items, index) => CreateDayPlan(index + 1, items))
            .Where(day => day.Activities.Count > 0)
            .ToList();
    }

    private static DayPlanDto CreateDayPlan(int dayNumber, IEnumerable<ItineraryItem> items)
    {
        var activities = items
            .OrderBy(item => item.StartTime)
            .ThenBy(item => item.ActivityOrder)
            .Select(MapActivity)
            .ToList();

        return new DayPlanDto
        {
            Day = dayNumber,
            DailyCost = activities.Sum(activity => activity.EstimatedCost),
            Activities = activities
        };
    }

    private static ActivityDto MapActivity(ItineraryItem item)
    {
        var service = item.Service;
        var spot = ResolvePrimarySpot(item);
        var durationMinutes = (int)Math.Max((item.EndTime - item.StartTime).TotalMinutes, 0);

        if (durationMinutes <= 0)
        {
            durationMinutes = ResolveDurationMinutes(service, spot);
        }

        return new ActivityDto
        {
            Title = service?.Name ?? spot?.Name ?? $"Activity {item.ActivityOrder.ToString(CultureInfo.InvariantCulture)}",
            Location = spot?.Name ?? service?.Name ?? "Custom activity",
            Description = service?.Description ?? spot?.Description ?? "No description available.",
            Duration = FormatDuration(durationMinutes, service?.ServiceType),
            EstimatedCost = service?.BasePrice ?? 0,
            ServiceId = service?.ServiceId
        };
    }

    private static string ResolveDestinationName(IEnumerable<ItineraryItem> items, string fallback)
    {
        foreach (var item in items)
        {
            var destinationName = ResolvePrimarySpot(item)?.Destination?.Name;

            if (!string.IsNullOrWhiteSpace(destinationName))
            {
                return destinationName;
            }
        }

        return fallback;
    }

    private static TouristSpot? ResolvePrimarySpot(ItineraryItem item)
        => ResolvePrimarySpot(item.Service, item.TouristSpot);

    private static TouristSpot? ResolvePrimarySpot(Service? service, TouristSpot? fallbackSpot = null)
    {
        if (fallbackSpot != null)
        {
            return fallbackSpot;
        }

        if (service?.TouristSpot != null)
        {
            return service.TouristSpot;
        }

        return service?.ServiceSpots
            .OrderBy(serviceSpot => serviceSpot.VisitOrder)
            .Select(serviceSpot => serviceSpot.TouristSpot)
            .FirstOrDefault();
    }

    private static int ResolveDurationMinutes(Service? service, TouristSpot? spot)
    {
        if (service?.ServiceType == ServiceType.Hotel)
        {
            return 12 * 60;
        }

        return spot?.AvgTimeSpent > 0 ? spot.AvgTimeSpent : 120;
    }

    private static bool IsAvailabilityUsable(
        ServiceType serviceType,
        ServiceAvailability availability,
        DateTime tripStartDate,
        HashSet<DateTime> tripDates)
    {
        if (GetRemainingStock(availability) <= 0)
        {
            return false;
        }

        var availabilityDate = availability.Date.Date;
        return serviceType == ServiceType.Hotel
            ? availabilityDate == tripStartDate
            : tripDates.Contains(availabilityDate);
    }

    private static int GetRemainingStock(ServiceAvailability availability)
        => availability.TotalStock - availability.BookedCount - availability.HeldCount;

    private static bool IsPotentialSpotMatch(TouristSpot candidate, ActivityDto activity)
    {
        return ContainsIgnoreCase(candidate.Name, activity.Location)
            || ContainsIgnoreCase(activity.Location, candidate.Name)
            || ContainsIgnoreCase(candidate.Name, activity.Title)
            || ContainsIgnoreCase(activity.Title, candidate.Name);
    }

    private static bool ContainsIgnoreCase(string? source, string? target)
    {
        if (string.IsNullOrWhiteSpace(source) || string.IsNullOrWhiteSpace(target))
        {
            return false;
        }

        return source.Contains(target, StringComparison.OrdinalIgnoreCase);
    }

    private static string FormatDuration(int totalMinutes, ServiceType? serviceType = null)
    {
        if (serviceType == ServiceType.Hotel)
        {
            return "1 night";
        }

        if (totalMinutes <= 0)
        {
            return "Flexible";
        }

        if (totalMinutes < 60)
        {
            return $"{totalMinutes.ToString(CultureInfo.InvariantCulture)} minutes";
        }

        var hours = totalMinutes / 60;
        var minutes = totalMinutes % 60;

        if (minutes == 0)
        {
            return $"{hours.ToString(CultureInfo.InvariantCulture)} hours";
        }

        return $"{hours.ToString(CultureInfo.InvariantCulture)} hours {minutes.ToString(CultureInfo.InvariantCulture)} minutes";
    }
}
