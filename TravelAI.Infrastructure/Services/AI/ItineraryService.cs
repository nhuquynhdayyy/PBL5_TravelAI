using System.Globalization;
using Microsoft.EntityFrameworkCore;
using TravelAI.Application.DTOs.AI;
using TravelAI.Application.Interfaces;
using TravelAI.Application.Services.AI;
using TravelAI.Domain.Entities;
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
                BudgetLevel = TravelAI.Domain.Enums.BudgetLevel.Medium
            };

        var spots = await _db.TouristSpots
            .Include(s => s.Services)
            .Where(s => s.DestinationId == request.DestinationId)
            .ToListAsync();

        var prompt = _promptBuilder.Build(pref, dest, spots, request.NumberOfDays);
        var rawAiResponse = await _gemini.CallApiAsync(prompt);

        _db.AISuggestionLogs.Add(new AISuggestionLog
        {
            UserId = userId,
            UserPrompt = prompt,
            AiResponseJson = rawAiResponse,
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return _parserService.ParseAndValidate(rawAiResponse);
    }

    public async Task<int> SaveItineraryAsync(int userId, ItineraryResponseDto dto)
    {
        using var transaction = await _db.Database.BeginTransactionAsync();

        try
        {
            var tripStartDate = DateTime.Today;
            var totalDays = Math.Max(dto.Days.Count, 1);

            var itinerary = new Itinerary
            {
                UserId = userId,
                Title = dto.TripTitle,
                StartDate = tripStartDate,
                EndDate = tripStartDate.AddDays(totalDays),
                EstimatedCost = dto.TotalEstimatedCost,
                Status = Domain.Enums.ItineraryStatus.Confirmed
            };

            _db.Itineraries.Add(itinerary);
            await _db.SaveChangesAsync();

            var order = 1;
            foreach (var day in dto.Days.OrderBy(d => d.Day))
            {
                var dayCursor = tripStartDate.AddDays(Math.Max(day.Day - 1, 0)).AddHours(8);

                foreach (var act in day.Activities)
                {
                    var spot = await _db.TouristSpots
                        .FirstOrDefaultAsync(s => s.Name.Contains(act.Location) || act.Title.Contains(s.Name));

                    var service = await _db.Services
                        .FirstOrDefaultAsync(s => s.Name.Contains(act.Title));

                    var durationMinutes = spot?.AvgTimeSpent > 0 ? spot.AvgTimeSpent : 120;
                    var startTime = dayCursor;
                    var endTime = dayCursor.AddMinutes(durationMinutes);
                    dayCursor = endTime.AddMinutes(30);

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
            TotalEstimatedCost = totalEstimatedCost,
            Days = days
        };
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
        var spot = item.TouristSpot ?? item.Service?.TouristSpot;
        var service = item.Service;
        var durationMinutes = (int)Math.Max((item.EndTime - item.StartTime).TotalMinutes, 0);

        if (durationMinutes <= 0)
        {
            durationMinutes = spot?.AvgTimeSpent > 0 ? spot.AvgTimeSpent : 120;
        }

        return new ActivityDto
        {
            Title = spot?.Name ?? service?.Name ?? $"Activity {item.ActivityOrder.ToString(CultureInfo.InvariantCulture)}",
            Location = spot?.Name ?? service?.Name ?? "Custom activity",
            Description = spot?.Description ?? service?.Description ?? "No description available.",
            Duration = FormatDuration(durationMinutes),
            EstimatedCost = service?.BasePrice ?? 0
        };
    }

    private static string ResolveDestinationName(IEnumerable<ItineraryItem> items, string fallback)
    {
        foreach (var item in items)
        {
            var destinationName = item.TouristSpot?.Destination?.Name
                ?? item.Service?.TouristSpot?.Destination?.Name;

            if (!string.IsNullOrWhiteSpace(destinationName))
            {
                return destinationName;
            }
        }

        return fallback;
    }

    private static string FormatDuration(int totalMinutes)
    {
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
