using System.Text.Json;
using System.Text.Json.Serialization;
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

            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                NumberHandling = JsonNumberHandling.AllowReadingFromString,
                AllowTrailingCommas = true
            };

            var result = JsonSerializer.Deserialize<ItineraryResponseDto>(cleanedJson, options);

            if (result == null || result.Days == null || result.Days.Count == 0)
            {
                Console.WriteLine("--> [ERROR] AI response is empty or missing itinerary days.");
                return null;
            }

            foreach (var day in result.Days)
            {
                day.Activities ??= new List<ActivityDto>();

                foreach (var activity in day.Activities)
                {
                    if (activity.ServiceId <= 0)
                    {
                        activity.ServiceId = null;
                    }
                }
            }

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
}
