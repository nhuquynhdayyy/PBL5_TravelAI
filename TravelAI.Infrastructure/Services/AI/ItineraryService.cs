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
    private readonly ISpotScoringService _spotScoringService;
    private readonly PromptBuilder _promptBuilder;
    private readonly WeatherService _weatherService;
    private readonly IRealtimeNotificationService _notificationService;

    public ItineraryService(
        ApplicationDbContext db, 
        GeminiService gemini, 
        AIParserService parserService,
        ISpotScoringService spotScoringService,
        PromptBuilder promptBuilder,
        WeatherService weatherService,
        IRealtimeNotificationService notificationService)
    {
        _db = db;
        _gemini = gemini;
        _parserService = parserService;
        _spotScoringService = spotScoringService;
        _promptBuilder = promptBuilder;
        _weatherService = weatherService;
        _notificationService = notificationService;
    }

    public async Task<ItineraryResponseDto?> GenerateAndLogItineraryAsync(int userId, GenerateItineraryRequest request)
    {
        if (request.DestinationId <= 0)
        {
            throw new InvalidOperationException("Destination khong hop le.");
        }

        if (request.NumberOfDays <= 0)
        {
            throw new InvalidOperationException("So ngay phai lon hon 0.");
        }

        await _notificationService.NotifyUserAsync(userId, "itinerary_processing", new
        {
            status = "started",
            destinationId = request.DestinationId,
            days = request.NumberOfDays,
            message = "AI dang phan tich so thich, thoi tiet va dich vu phu hop."
        });

        var dest = await _db.Destinations.FindAsync(request.DestinationId);
        if (dest == null)
        {
            throw new InvalidOperationException("Khong tim thay diem den de tao lich trinh.");
        }

        var pref = await _db.UserPreferences.FirstOrDefaultAsync(u => u.UserId == userId)
            ?? new UserPreference
            {
                TravelStyle = "Kham pha tong hop",
                BudgetLevel = BudgetLevel.Medium,
                TravelPace = TravelPace.Balanced,
                CuisinePref = "Khong co yeu cau dac biet"
            };

        var spots = await _db.TouristSpots
            .Include(s => s.Services)
                .ThenInclude(service => service.Reviews)
            .Include(s => s.ServiceSpots)
                .ThenInclude(serviceSpot => serviceSpot.Service)
                    .ThenInclude(service => service.Reviews)
            .Where(s => s.DestinationId == request.DestinationId)
            .ToListAsync();

        var tripStartDate = request.StartDate == default ? DateTime.Today : request.StartDate.Date;
        
        // Tính tọa độ trung tâm từ các spots (nếu có)
        double? centerLat = null;
        double? centerLng = null;
        var spotsWithCoords = spots.Where(s => s.Latitude != 0 && s.Longitude != 0).ToList();
        if (spotsWithCoords.Count > 0)
        {
            centerLat = spotsWithCoords.Average(s => s.Latitude);
            centerLng = spotsWithCoords.Average(s => s.Longitude);
        }
        
        // Tính toán điểm số cho các spots dựa trên user preferences
        var rankedSpots = await _spotScoringService.ScoreAndRankSpotsAsync(
            spots, 
            pref, 
            centerLat, 
            centerLng);
        
        var promptServices = await GetAvailableServicesForPromptAsync(dest, tripStartDate, request.NumberOfDays);
        var availableServiceEntities = await GetAvailableServiceEntitiesForPromptAsync(dest, tripStartDate, request.NumberOfDays);
        var historyLogs = await _db.AISuggestionLogs
            .AsNoTracking()
            .Where(log => log.UserId == userId)
            .OrderByDescending(log => log.CreatedAt)
            .Take(3)
            .ToListAsync();
        var weatherData = centerLat.HasValue && centerLng.HasValue
            ? await _weatherService.GetWeatherAsync(centerLat.Value, centerLng.Value)
            : null;
        var spotReviews = spots
            .SelectMany(spot => spot.Services.SelectMany(service => service.Reviews)
                .Concat(spot.ServiceSpots.SelectMany(serviceSpot => serviceSpot.Service.Reviews)))
            .GroupBy(review => review.ReviewId)
            .Select(group => group.First())
            .ToList();

        var prompt = _promptBuilder.Build(
            pref,
            dest,
            spots,
            request.NumberOfDays,
            tripStartDate,
            promptServices,
            rankedSpots,
            spotReviews,
            historyLogs,
            weatherData,
            availableServiceEntities);
        var rawAiResponse = await _gemini.CallApiAsync(
            prompt,
            systemPrompt: AIPrompts.ItinerarySystemPrompt,
            requireJsonResponse: true);

        var aiLog = new AISuggestionLog
        {
            UserId = userId,
            UserPrompt = prompt,
            AiResponseJson = rawAiResponse,
            CreatedAt = DateTime.UtcNow
        };

        _db.AISuggestionLogs.Add(aiLog);

        await _db.SaveChangesAsync();

        if (GeminiService.TryExtractErrorMessage(rawAiResponse, out var aiError))
        {
            throw new InvalidOperationException(aiError);
        }

        var parsed = _parserService.ParseAndValidate(rawAiResponse);
        if (parsed == null)
        {
            var repairedResponse = await TryRepairItineraryResponseAsync(rawAiResponse, dest.Name, request.NumberOfDays);

            if (!string.IsNullOrWhiteSpace(repairedResponse))
            {
                aiLog.AiResponseJson = $"ORIGINAL RESPONSE:{Environment.NewLine}{rawAiResponse}{Environment.NewLine}{Environment.NewLine}REPAIRED RESPONSE:{Environment.NewLine}{repairedResponse}";
                await _db.SaveChangesAsync();

                if (GeminiService.TryExtractErrorMessage(repairedResponse, out var repairError))
                {
                    throw new InvalidOperationException(repairError);
                }

                parsed = _parserService.ParseAndValidate(repairedResponse);
            }
        }

        if (parsed == null)
        {
            await _notificationService.NotifyUserAsync(userId, "itinerary_processing", new
            {
                status = "failed",
                destinationId = request.DestinationId,
                message = "AI chua tra ve lich trinh hop le."
            });

            throw new InvalidOperationException(BuildInvalidJsonMessage(rawAiResponse));
        }

        parsed.StartDate = tripStartDate;
        parsed.EndDate = tripStartDate.AddDays(parsed.Days.Count);

        await _notificationService.NotifyUserAsync(userId, "itinerary_processing", new
        {
            status = "completed",
            destination = dest.Name,
            days = parsed.Days.Count,
            message = "AI da tao xong lich trinh."
        });

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

    public async Task<ItineraryResponseDto?> OptimizeItineraryAsync(int id, int userId)
    {
        var itinerary = await _db.Itineraries
            .Include(i => i.Items)
                .ThenInclude(item => item.TouristSpot)
            .Include(i => i.Items)
                .ThenInclude(item => item.Service)
                    .ThenInclude(service => service!.TouristSpot)
            .Include(i => i.Items)
                .ThenInclude(item => item.Service)
                    .ThenInclude(service => service!.ServiceSpots)
                        .ThenInclude(serviceSpot => serviceSpot.TouristSpot)
            .FirstOrDefaultAsync(i => i.ItineraryId == id && i.UserId == userId);

        if (itinerary == null)
        {
            return null;
        }

        var optimizableItems = itinerary.Items
            .Select(item => new
            {
                Item = item,
                Spot = ResolvePrimarySpot(item)
            })
            .Where(item => item.Spot != null
                && item.Spot.Latitude != 0
                && item.Spot.Longitude != 0)
            .OrderBy(item => item.Item.StartTime)
            .ThenBy(item => item.Item.ActivityOrder)
            .ToList();

        if (optimizableItems.Count == 0)
        {
            throw new InvalidOperationException("Lich trinh can it nhat mot dia diem co toa do de toi uu.");
        }

        var candidates = optimizableItems
            .Select(item => new OptimizeCandidate(
                item.Item,
                item.Spot!,
                ResolveDurationMinutes(item.Item.Service, item.Spot)))
            .ToList();
        var scheduledItems = FindOptimalSequence(candidates, itinerary.StartDate, itinerary.EndDate);

        var order = 1;
        foreach (var scheduledItem in scheduledItems)
        {
            scheduledItem.Candidate.Item.ActivityOrder = order++;
            scheduledItem.Candidate.Item.StartTime = scheduledItem.StartTime;
            scheduledItem.Candidate.Item.EndTime = scheduledItem.EndTime;
        }

        await _db.SaveChangesAsync();

        return await GetByIdAsync(id, userId);
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

    private async Task<List<Service>> GetAvailableServiceEntitiesForPromptAsync(Destination destination, DateTime tripStartDate, int totalDays)
    {
        var tripDates = Enumerable.Range(0, Math.Max(totalDays, 1))
            .Select(offset => tripStartDate.Date.AddDays(offset))
            .ToHashSet();

        var services = await _db.Services
            .AsNoTracking()
            .Include(service => service.TouristSpot)
            .Include(service => service.ServiceSpots)
                .ThenInclude(serviceSpot => serviceSpot.TouristSpot)
            .Include(service => service.Availabilities)
            .Where(service => service.IsActive
                && ((service.TouristSpot != null && service.TouristSpot.DestinationId == destination.DestinationId)
                    || service.ServiceSpots.Any(serviceSpot => serviceSpot.TouristSpot.DestinationId == destination.DestinationId)))
            .ToListAsync();

        // Chi dua cac service co availability dung lich trinh vao context combo.
        return services
            .Where(service => service.Availabilities.Any(availability =>
                IsAvailabilityUsable(service.ServiceType, availability, tripStartDate.Date, tripDates)))
            .ToList();
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

    private async Task<string?> TryRepairItineraryResponseAsync(string rawAiResponse, string destinationName, int requestedDays)
    {
        if (string.IsNullOrWhiteSpace(rawAiResponse))
        {
            return null;
        }

        var repairPrompt = $@"Chuan hoa noi dung lich trinh sau thanh JSON hop le theo schema TravelAI:

{rawAiResponse}

Yeu cau:
- Destination la {destinationName}.
- Uu tien giu dung noi dung goc va tong so ngay gan voi {requestedDays}.
- Moi activity phai co: title, location, description, duration, estimatedCost, service_id.
- Khong them markdown hay giai thich.";

        return await _gemini.CallApiAsync(
            repairPrompt,
            systemPrompt: AIPrompts.ItineraryRepairSystemPrompt,
            requireJsonResponse: true);
    }

    private static string BuildInvalidJsonMessage(string rawAiResponse)
    {
        var preview = rawAiResponse
            .Replace("\r", " ", StringComparison.Ordinal)
            .Replace("\n", " ", StringComparison.Ordinal)
            .Trim();

        if (preview.Length > 220)
        {
            preview = preview[..220] + "...";
        }

        return $"AI tra ve du lieu khong dung dinh dang lich trinh JSON. Preview: {preview}";
    }

    private static List<ScheduledOptimizeItem> FindOptimalSequence(
        List<OptimizeCandidate> candidates,
        DateTime itineraryStartDate,
        DateTime itineraryEndDate)
    {
        var remaining = candidates
            .OrderBy(candidate => candidate.Item.StartTime)
            .ThenBy(candidate => candidate.Item.ActivityOrder)
            .ToList();
        var scheduledItems = new List<ScheduledOptimizeItem>();
        var dayCount = Math.Max(1, (itineraryEndDate.Date - itineraryStartDate.Date).Days);
        var maxIterations = remaining.Count * 2;
        var iteration = 0;

        for (var dayIndex = 0; dayIndex < dayCount && remaining.Count > 0; dayIndex++)
        {
            var day = itineraryStartDate.Date.AddDays(dayIndex);
            TouristSpot? previousSpot = null;

            foreach (var session in BuildDaySessions(day))
            {
                var currentTime = session.Start;
                if (session.Kind == DaySessionKind.Afternoon)
                {
                    currentTime = MaxDateTime(currentTime, day.AddHours(13));
                }

                while (remaining.Count > 0 && currentTime < session.End && iteration++ < maxIterations)
                {
                    var next = SelectBestCandidate(remaining, previousSpot, currentTime, session);
                    if (next == null)
                    {
                        break;
                    }

                    var travelMinutes = previousSpot == null
                        ? 0
                        : EstimateTravelMinutes(previousSpot, next.Spot);
                    var startTime = currentTime.AddMinutes(travelMinutes);
                    if (!TryAdjustStartToOpeningHours(next.Spot, startTime, next.DurationMinutes, session.End, out startTime))
                    {
                        remaining.Remove(next);
                        remaining.Add(next);
                        break;
                    }

                    var endTime = startTime.AddMinutes(next.DurationMinutes);
                    scheduledItems.Add(new ScheduledOptimizeItem(next, startTime, endTime));
                    remaining.Remove(next);

                    previousSpot = next.Spot;
                    currentTime = endTime;
                }
            }
        }

        if (remaining.Count > 0)
        {
            AppendOverflowItems(remaining, scheduledItems, itineraryStartDate, dayCount);
        }

        return scheduledItems
            .OrderBy(item => item.StartTime)
            .ThenBy(item => item.Candidate.Item.ItemId)
            .ToList();
    }

    private static OptimizeCandidate? SelectBestCandidate(
        List<OptimizeCandidate> candidates,
        TouristSpot? previousSpot,
        DateTime currentTime,
        DaySession session)
    {
        return candidates
            .Select(candidate =>
            {
                var travelMinutes = previousSpot == null
                    ? 0
                    : EstimateTravelMinutes(previousSpot, candidate.Spot);
                var candidateStart = currentTime.AddMinutes(travelMinutes);
                var isTimeValid = TryAdjustStartToOpeningHours(
                    candidate.Spot,
                    candidateStart,
                    candidate.DurationMinutes,
                    session.End,
                    out var adjustedStart);

                if (!isTimeValid)
                {
                    return null;
                }

                var distanceKm = previousSpot == null
                    ? DistanceFromSessionAnchor(candidate, candidates)
                    : CalculateHaversineDistance(previousSpot.Latitude, previousSpot.Longitude, candidate.Spot.Latitude, candidate.Spot.Longitude);
                var waitMinutes = Math.Max(0, (adjustedStart - candidateStart).TotalMinutes);
                var backtrackingPenalty = previousSpot == null
                    ? 0
                    : CalculateBacktrackingPenalty(previousSpot, candidate.Spot, candidates);

                return new
                {
                    Candidate = candidate,
                    Score = distanceKm + (travelMinutes / 60.0) + (waitMinutes / 120.0) + backtrackingPenalty
                };
            })
            .Where(candidate => candidate != null)
            .OrderBy(candidate => candidate!.Score)
            .ThenBy(candidate => candidate!.Candidate.Item.ActivityOrder)
            .Select(candidate => candidate!.Candidate)
            .FirstOrDefault();
    }

    private static void AppendOverflowItems(
        List<OptimizeCandidate> remaining,
        List<ScheduledOptimizeItem> scheduledItems,
        DateTime itineraryStartDate,
        int dayCount)
    {
        var fallbackDay = itineraryStartDate.Date.AddDays(Math.Max(dayCount - 1, 0));
        var currentTime = scheduledItems.Count == 0
            ? fallbackDay.AddHours(18)
            : scheduledItems.Max(item => item.EndTime).AddMinutes(30);

        foreach (var candidate in remaining.OrderBy(candidate => candidate.Item.ActivityOrder).ToList())
        {
            if (currentTime.Hour >= 22)
            {
                currentTime = currentTime.Date.AddDays(1).AddHours(8);
            }

            if (!TryAdjustStartToOpeningHours(candidate.Spot, currentTime, candidate.DurationMinutes, currentTime.Date.AddHours(22), out var startTime))
            {
                startTime = currentTime;
            }

            var endTime = startTime.AddMinutes(candidate.DurationMinutes);
            scheduledItems.Add(new ScheduledOptimizeItem(candidate, startTime, endTime));
            currentTime = endTime.AddMinutes(30);
            remaining.Remove(candidate);
        }
    }

    private static List<DaySession> BuildDaySessions(DateTime day)
    {
        return new List<DaySession>
        {
            new(DaySessionKind.Morning, day.AddHours(8), day.AddHours(12)),
            new(DaySessionKind.Afternoon, day.AddHours(13), day.AddHours(17)),
            new(DaySessionKind.Evening, day.AddHours(18), day.AddHours(22))
        };
    }

    private static bool TryAdjustStartToOpeningHours(
        TouristSpot spot,
        DateTime proposedStart,
        int durationMinutes,
        DateTime sessionEnd,
        out DateTime adjustedStart)
    {
        adjustedStart = proposedStart;
        if (string.IsNullOrWhiteSpace(spot.OpeningHours)
            || spot.OpeningHours.Contains("24/7", StringComparison.OrdinalIgnoreCase)
            || spot.OpeningHours.Contains("all day", StringComparison.OrdinalIgnoreCase))
        {
            return adjustedStart.AddMinutes(durationMinutes) <= sessionEnd;
        }

        var windows = ParseOpeningWindows(spot.OpeningHours, proposedStart.Date);
        if (windows.Count == 0)
        {
            return adjustedStart.AddMinutes(durationMinutes) <= sessionEnd;
        }

        foreach (var window in windows)
        {
            var start = MaxDateTime(proposedStart, window.Open);
            var end = start.AddMinutes(durationMinutes);
            if (end <= window.Close && end <= sessionEnd)
            {
                adjustedStart = start;
                return true;
            }
        }

        return false;
    }

    private static List<OpeningWindow> ParseOpeningWindows(string openingHours, DateTime day)
    {
        if (openingHours.Contains("closed", StringComparison.OrdinalIgnoreCase)
            || openingHours.Contains("dong cua", StringComparison.OrdinalIgnoreCase))
        {
            return new List<OpeningWindow>();
        }

        var matches = System.Text.RegularExpressions.Regex.Matches(
            openingHours,
            @"(?<open>\d{1,2}[:h]\d{2}|\d{1,2})\s*[-–]\s*(?<close>\d{1,2}[:h]\d{2}|\d{1,2})");

        if (matches.Count == 0)
        {
            return new List<OpeningWindow>
            {
                new(day.AddHours(8), day.AddHours(22))
            };
        }

        var windows = new List<OpeningWindow>();
        foreach (System.Text.RegularExpressions.Match match in matches)
        {
            if (!TryParseOpeningTime(match.Groups["open"].Value, out var openTime)
                || !TryParseOpeningTime(match.Groups["close"].Value, out var closeTime))
            {
                continue;
            }

            var open = day.Add(openTime);
            var close = day.Add(closeTime);
            if (close <= open)
            {
                close = close.AddDays(1);
            }

            windows.Add(new OpeningWindow(open, close));
        }

        return windows;
    }

    private static bool TryParseOpeningTime(string value, out TimeSpan time)
    {
        var normalized = value.Replace("h", ":", StringComparison.OrdinalIgnoreCase);
        if (!normalized.Contains(':', StringComparison.Ordinal))
        {
            normalized += ":00";
        }

        return TimeSpan.TryParse(normalized, CultureInfo.InvariantCulture, out time);
    }

    private static int EstimateTravelMinutes(TouristSpot from, TouristSpot to)
    {
        var distanceKm = CalculateHaversineDistance(from.Latitude, from.Longitude, to.Latitude, to.Longitude);
        return Math.Max(10, (int)Math.Ceiling(distanceKm / 25.0 * 60));
    }

    private static double DistanceFromSessionAnchor(OptimizeCandidate candidate, List<OptimizeCandidate> candidates)
    {
        var centerLat = candidates.Average(item => item.Spot.Latitude);
        var centerLng = candidates.Average(item => item.Spot.Longitude);
        return CalculateHaversineDistance(centerLat, centerLng, candidate.Spot.Latitude, candidate.Spot.Longitude);
    }

    private static double CalculateBacktrackingPenalty(
        TouristSpot previousSpot,
        TouristSpot candidateSpot,
        List<OptimizeCandidate> remainingCandidates)
    {
        if (remainingCandidates.Count < 3)
        {
            return 0;
        }

        var centerLat = remainingCandidates.Average(item => item.Spot.Latitude);
        var centerLng = remainingCandidates.Average(item => item.Spot.Longitude);
        var previousDistanceToCenter = CalculateHaversineDistance(previousSpot.Latitude, previousSpot.Longitude, centerLat, centerLng);
        var candidateDistanceToCenter = CalculateHaversineDistance(candidateSpot.Latitude, candidateSpot.Longitude, centerLat, centerLng);

        return candidateDistanceToCenter > previousDistanceToCenter + 5
            ? 2.5
            : 0;
    }

    private static double CalculateHaversineDistance(double lat1, double lon1, double lat2, double lon2)
    {
        const double earthRadiusKm = 6371.0;
        var dLat = DegreesToRadians(lat2 - lat1);
        var dLon = DegreesToRadians(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
            + Math.Cos(DegreesToRadians(lat1))
            * Math.Cos(DegreesToRadians(lat2))
            * Math.Sin(dLon / 2)
            * Math.Sin(dLon / 2);

        return earthRadiusKm * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    private static double DegreesToRadians(double degrees)
        => degrees * Math.PI / 180.0;

    private static DateTime MaxDateTime(DateTime first, DateTime second)
        => first >= second ? first : second;

    private sealed record OptimizeCandidate(
        ItineraryItem Item,
        TouristSpot Spot,
        int DurationMinutes);

    private sealed record ScheduledOptimizeItem(
        OptimizeCandidate Candidate,
        DateTime StartTime,
        DateTime EndTime);

    private sealed record OpeningWindow(
        DateTime Open,
        DateTime Close);

    private sealed record DaySession(
        DaySessionKind Kind,
        DateTime Start,
        DateTime End);

    private enum DaySessionKind
    {
        Morning,
        Afternoon,
        Evening
    }
}
