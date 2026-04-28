using System.Globalization;
using System.Text.Json;
using TravelAI.Application.DTOs.AI;

namespace TravelAI.Application.Services.AI;

public class AIParserService
{
    public ItineraryResponseDto? ParseAndValidate(string rawJson)
    {
        if (string.IsNullOrWhiteSpace(rawJson))
        {
            return null;
        }

        try
        {
            string cleanedJson = CleanMarkdown(rawJson);
            using var document = JsonDocument.Parse(cleanedJson, new JsonDocumentOptions
            {
                AllowTrailingCommas = true
            });

            var root = ResolveItineraryRoot(document.RootElement);
            var result = MapItinerary(root);

            if (result == null || result.Days == null || result.Days.Count == 0)
            {
                Console.WriteLine("--> [ERROR] AI response is empty or missing itinerary days.");
                return null;
            }

            NormalizeResult(result);

            Console.WriteLine($"--> [SUCCESS] Parsed itinerary successfully: {result.TripTitle}");
            return result;
        }
        catch (JsonException ex)
        {
            Console.WriteLine("--> [CRITICAL] Invalid JSON returned by AI: " + ex.Message);
            return null;
        }
    }

    private string CleanMarkdown(string raw)
    {
        string result = raw.Trim();

        if (result.Contains("```json"))
        {
            var startIndex = result.IndexOf("```json", StringComparison.Ordinal) + 7;
            var endIndex = result.LastIndexOf("```", StringComparison.Ordinal);
            if (endIndex > startIndex)
            {
                result = result.Substring(startIndex, endIndex - startIndex);
            }
        }
        else if (result.Contains("```"))
        {
            var startIndex = result.IndexOf("```", StringComparison.Ordinal) + 3;
            var endIndex = result.LastIndexOf("```", StringComparison.Ordinal);
            if (endIndex > startIndex)
            {
                result = result.Substring(startIndex, endIndex - startIndex);
            }
        }

        var firstBrace = result.IndexOf('{');
        var lastBrace = result.LastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace)
        {
            result = result.Substring(firstBrace, lastBrace - firstBrace + 1);
        }

        return result.Trim();
    }

    private static ItineraryResponseDto? MapItinerary(JsonElement root)
    {
        var days = ExtractDays(root);
        if (days.Count == 0)
        {
            return null;
        }

        var itinerary = new ItineraryResponseDto
        {
            TripTitle = ReadString(root, "tripTitle", "trip_title", "title", "tripName", "trip_name", "name")
                ?? "Lich trinh du lich",
            Destination = ReadString(root, "destination", "destinationName", "destination_name", "location")
                ?? string.Empty,
            TotalEstimatedCost = ReadDecimal(root, "totalEstimatedCost", "total_estimated_cost", "estimatedCost", "estimated_cost", "budget")
                ?? 0,
            Days = days
        };

        if (string.IsNullOrWhiteSpace(itinerary.TripTitle) && !string.IsNullOrWhiteSpace(itinerary.Destination))
        {
            itinerary.TripTitle = $"Lich trinh {itinerary.Destination}";
        }

        return itinerary;
    }

    private static List<DayPlanDto> ExtractDays(JsonElement root)
    {
        JsonElement daysElement;

        if (root.ValueKind == JsonValueKind.Array)
        {
            daysElement = root;
        }
        else if (!TryGetPropertyValue(root, out daysElement, "days", "schedule", "plan"))
        {
            return new List<DayPlanDto>();
        }

        var dayItems = daysElement.ValueKind switch
        {
            JsonValueKind.Array => daysElement.EnumerateArray()
                .Where(item => item.ValueKind == JsonValueKind.Object)
                .ToList(),
            JsonValueKind.Object => daysElement.EnumerateObject()
                .Select(property => property.Value)
                .Where(item => item.ValueKind == JsonValueKind.Object)
                .ToList(),
            _ => new List<JsonElement>()
        };

        return dayItems
            .Where(LooksLikeDayElement)
            .Select((dayElement, index) => MapDay(dayElement, index + 1))
            .ToList();
    }

    private static DayPlanDto MapDay(JsonElement dayElement, int fallbackDayNumber)
    {
        var activities = ExtractActivities(dayElement);
        var dayNumber = ReadInt(dayElement, "day", "dayNumber", "day_number")
            ?? fallbackDayNumber;

        return new DayPlanDto
        {
            Day = dayNumber,
            DailyCost = ReadDecimal(dayElement, "dailyCost", "daily_cost", "estimatedCost", "estimated_cost")
                ?? activities.Sum(activity => activity.EstimatedCost),
            Activities = activities
        };
    }

    private static List<ActivityDto> ExtractActivities(JsonElement dayElement)
    {
        if (!TryGetPropertyValue(dayElement, out var activitiesElement, "activities", "items", "plans", "schedule"))
        {
            return new List<ActivityDto>();
        }

        IEnumerable<JsonElement> activityItems = activitiesElement.ValueKind switch
        {
            JsonValueKind.Array => activitiesElement.EnumerateArray()
                .Where(item => item.ValueKind == JsonValueKind.Object),
            JsonValueKind.Object => activitiesElement.EnumerateObject()
                .Select(property => property.Value)
                .Where(item => item.ValueKind == JsonValueKind.Object),
            _ => Array.Empty<JsonElement>()
        };

        return activityItems
            .Select((activityElement, index) => MapActivity(activityElement, index + 1))
            .ToList();
    }

    private static ActivityDto MapActivity(JsonElement activityElement, int fallbackIndex)
    {
        var serviceId = ReadInt(activityElement, "serviceId", "service_id");

        return new ActivityDto
        {
            Title = ReadString(activityElement, "title", "name", "activity")
                ?? $"Hoat dong {fallbackIndex.ToString(CultureInfo.InvariantCulture)}",
            Location = ReadString(activityElement, "location", "place", "spot", "destination")
                ?? string.Empty,
            Description = ReadString(activityElement, "description", "details", "summary", "note")
                ?? string.Empty,
            Duration = ReadString(activityElement, "duration", "time", "length")
                ?? "Flexible",
            EstimatedCost = ReadDecimal(activityElement, "estimatedCost", "estimated_cost", "cost", "price")
                ?? 0,
            ServiceId = serviceId > 0 ? serviceId : null
        };
    }

    private static void NormalizeResult(ItineraryResponseDto result)
    {
        result.TripTitle = string.IsNullOrWhiteSpace(result.TripTitle)
            ? "Lich trinh du lich"
            : result.TripTitle.Trim();
        result.Destination = result.Destination?.Trim() ?? string.Empty;

        foreach (var day in result.Days)
        {
            day.Day = day.Day <= 0 ? result.Days.IndexOf(day) + 1 : day.Day;
            day.Activities ??= new List<ActivityDto>();

            foreach (var activity in day.Activities)
            {
                activity.Title = string.IsNullOrWhiteSpace(activity.Title) ? "Hoat dong" : activity.Title.Trim();
                activity.Location = activity.Location?.Trim() ?? string.Empty;
                activity.Description = activity.Description?.Trim() ?? string.Empty;
                activity.Duration = string.IsNullOrWhiteSpace(activity.Duration) ? "Flexible" : activity.Duration.Trim();

                if (activity.ServiceId <= 0)
                {
                    activity.ServiceId = null;
                }
            }

            if (day.DailyCost <= 0)
            {
                day.DailyCost = day.Activities.Sum(activity => activity.EstimatedCost);
            }
        }

        if (result.TotalEstimatedCost <= 0)
        {
            result.TotalEstimatedCost = result.Days.Sum(day => day.DailyCost);
        }
    }

    private static JsonElement ResolveItineraryRoot(JsonElement root)
    {
        if (LooksLikeItineraryRoot(root))
        {
            return root;
        }

        foreach (var child in EnumerateChildren(root))
        {
            var resolved = ResolveItineraryRoot(child);
            if (LooksLikeItineraryRoot(resolved))
            {
                return resolved;
            }
        }

        return root;
    }

    private static IEnumerable<JsonElement> EnumerateChildren(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.Object => element.EnumerateObject()
                .Select(property => property.Value)
                .Where(value => value.ValueKind is JsonValueKind.Object or JsonValueKind.Array),
            JsonValueKind.Array => element.EnumerateArray()
                .Where(value => value.ValueKind is JsonValueKind.Object or JsonValueKind.Array),
            _ => Array.Empty<JsonElement>()
        };
    }

    private static bool LooksLikeItineraryRoot(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Array)
        {
            return element.EnumerateArray().Any(LooksLikeDayElement);
        }

        return element.ValueKind == JsonValueKind.Object
            && TryGetPropertyValue(element, out _, "days", "schedule", "plan");
    }

    private static bool LooksLikeDayElement(JsonElement element)
    {
        return element.ValueKind == JsonValueKind.Object
            && (TryGetPropertyValue(element, out _, "day", "dayNumber", "day_number")
                || TryGetPropertyValue(element, out _, "activities", "items", "plans", "schedule"));
    }

    private static string? ReadString(JsonElement element, params string[] propertyNames)
    {
        if (!TryGetPropertyValue(element, out var value, propertyNames))
        {
            return null;
        }

        return value.ValueKind switch
        {
            JsonValueKind.String => value.GetString(),
            JsonValueKind.Number or JsonValueKind.True or JsonValueKind.False => value.GetRawText(),
            _ => null
        };
    }

    private static int? ReadInt(JsonElement element, params string[] propertyNames)
    {
        if (!TryGetPropertyValue(element, out var value, propertyNames))
        {
            return null;
        }

        if (value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var number))
        {
            return number;
        }

        if (value.ValueKind == JsonValueKind.String)
        {
            var raw = value.GetString();
            if (int.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out number))
            {
                return number;
            }
        }

        return null;
    }

    private static decimal? ReadDecimal(JsonElement element, params string[] propertyNames)
    {
        if (!TryGetPropertyValue(element, out var value, propertyNames))
        {
            return null;
        }

        if (value.ValueKind == JsonValueKind.Number && value.TryGetDecimal(out var number))
        {
            return number;
        }

        if (value.ValueKind != JsonValueKind.String)
        {
            return null;
        }

        var raw = value.GetString();
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        var normalized = raw.Replace(",", string.Empty, StringComparison.Ordinal)
            .Trim();

        return decimal.TryParse(normalized, NumberStyles.AllowDecimalPoint | NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out number)
            ? number
            : null;
    }

    private static bool TryGetPropertyValue(JsonElement element, out JsonElement value, params string[] propertyNames)
    {
        value = default;
        if (element.ValueKind != JsonValueKind.Object)
        {
            return false;
        }

        foreach (var property in element.EnumerateObject())
        {
            if (propertyNames.Any(name => property.Name.Equals(name, StringComparison.OrdinalIgnoreCase)))
            {
                value = property.Value;
                return true;
            }
        }

        return false;
    }
}
