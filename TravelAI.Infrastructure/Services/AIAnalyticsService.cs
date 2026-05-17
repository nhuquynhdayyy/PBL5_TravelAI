using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TravelAI.Application.Interfaces;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.Infrastructure.Services;

public class AIAnalyticsService : IAIAnalyticsService
{
    private readonly ApplicationDbContext _db;

    public AIAnalyticsService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<UserFeedbackStatsDto> GetUserFeedbackStatsAsync()
    {
        var totalSuggestions = await _db.AISuggestionLogs.CountAsync();
        var savedItineraries = await _db.Itineraries.CountAsync();
        var savedRate = totalSuggestions == 0
            ? 0
            : Math.Min(100, savedItineraries * 100.0 / totalSuggestions);

        return new UserFeedbackStatsDto(
            totalSuggestions,
            savedItineraries,
            Math.Round(savedRate, 2));
    }

    public async Task<List<PopularDestinationDto>> GetPopularDestinationsAsync()
    {
        var logs = await _db.AISuggestionLogs
            .AsNoTracking()
            .Select(log => log.AiResponseJson)
            .ToListAsync();

        return logs
            .Select(TryReadAnalyticsPayload)
            .Where(payload => payload != null && !string.IsNullOrWhiteSpace(payload.Destination))
            .Select(payload => payload!)
            .GroupBy(payload => NormalizeDestination(payload.Destination))
            .Select(group => new PopularDestinationDto(group.Key, group.Count()))
            .OrderByDescending(item => item.SuggestedCount)
            .ThenBy(item => item.Destination)
            .ToList();
    }

    public async Task<List<AverageBudgetDto>> GetAverageBudgetByDestinationAsync()
    {
        var logs = await _db.AISuggestionLogs
            .AsNoTracking()
            .Select(log => log.AiResponseJson)
            .ToListAsync();

        return logs
            .Select(TryReadAnalyticsPayload)
            .Where(payload => payload != null
                && !string.IsNullOrWhiteSpace(payload.Destination)
                && payload.TotalEstimatedCost > 0)
            .Select(payload => payload!)
            .GroupBy(payload => NormalizeDestination(payload.Destination))
            .Select(group => new AverageBudgetDto(
                group.Key,
                Math.Round(group.Average(payload => payload.TotalEstimatedCost), 0),
                group.Count()))
            .OrderByDescending(item => item.SampleCount)
            .ThenBy(item => item.Destination)
            .ToList();
    }

    private static AiAnalyticsPayload? TryReadAnalyticsPayload(string? rawJson)
    {
        if (string.IsNullOrWhiteSpace(rawJson))
        {
            return null;
        }

        var json = ExtractJsonObject(rawJson);
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        try
        {
            using var document = JsonDocument.Parse(json);
            var root = document.RootElement;
            if (root.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Object)
            {
                root = data;
            }

            var destination = ReadString(root, "destination", "Destination");
            var totalEstimatedCost = ReadDecimal(
                root,
                "totalEstimatedCost",
                "total_estimated_cost",
                "estimatedCost",
                "estimated_cost",
                "total");

            return string.IsNullOrWhiteSpace(destination)
                ? null
                : new AiAnalyticsPayload(destination, totalEstimatedCost);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static string? ExtractJsonObject(string value)
    {
        var start = value.IndexOf('{', StringComparison.Ordinal);
        var end = value.LastIndexOf('}');
        return start >= 0 && end > start
            ? value[start..(end + 1)]
            : null;
    }

    private static string ReadString(JsonElement element, params string[] propertyNames)
    {
        foreach (var propertyName in propertyNames)
        {
            if (element.TryGetProperty(propertyName, out var value)
                && value.ValueKind == JsonValueKind.String)
            {
                return value.GetString()?.Trim() ?? string.Empty;
            }
        }

        return string.Empty;
    }

    private static decimal ReadDecimal(JsonElement element, params string[] propertyNames)
    {
        foreach (var propertyName in propertyNames)
        {
            if (!element.TryGetProperty(propertyName, out var value))
            {
                continue;
            }

            if (value.ValueKind == JsonValueKind.Number && value.TryGetDecimal(out var numericValue))
            {
                return numericValue;
            }

            if (value.ValueKind == JsonValueKind.String
                && decimal.TryParse(value.GetString(), out var parsedValue))
            {
                return parsedValue;
            }
        }

        return 0;
    }

    private static string NormalizeDestination(string destination)
        => destination.Trim();

    private sealed record AiAnalyticsPayload(
        string Destination,
        decimal TotalEstimatedCost);
}
