using System.Globalization;
using System.Text;
using TravelAI.Domain.Entities;
using TravelAI.Domain.Enums;

namespace TravelAI.Application.Services.Scoring;

public sealed record SpotScoringContext(
    TouristSpot Spot,
    UserPreference Preference,
    IReadOnlyCollection<Review> Reviews,
    double? CenterLatitude,
    double? CenterLongitude);

public interface ISpotScoreStrategy
{
    string Name { get; }

    double Weight { get; }

    double Calculate(SpotScoringContext context);
}

public sealed class StyleMatchScoreStrategy : ISpotScoreStrategy
{
    private static readonly Dictionary<string, string[]> StyleKeywords = new(StringComparer.OrdinalIgnoreCase)
    {
        ["van hoa"] = new[] { "chua", "den", "bao tang", "di tich", "lich su", "co do", "truyen thong", "dinh", "phu", "thap" },
        ["culture"] = new[] { "chua", "den", "bao tang", "di tich", "lich su", "museum", "temple", "historic", "heritage" },
        ["thien nhien"] = new[] { "nui", "bien", "rung", "thac", "ho", "song", "dao", "vinh", "bai", "suoi", "hang", "dong" },
        ["nature"] = new[] { "nui", "bien", "rung", "thac", "lake", "river", "island", "beach", "forest", "cave" },
        ["am thuc"] = new[] { "cho", "pho an", "quan", "nha hang", "am thuc", "mon", "dac san", "food", "market" },
        ["food"] = new[] { "cho", "quan", "nha hang", "am thuc", "mon", "dac san", "food", "market" },
        ["mao hiem"] = new[] { "leo nui", "lan", "du luon", "zipline", "kayak", "trekking", "the thao", "adventure" },
        ["adventure"] = new[] { "leo nui", "lan", "zipline", "kayak", "trekking", "sport", "adventure" },
        ["nghi duong"] = new[] { "resort", "spa", "bai bien", "nghi", "thu gian", "massage", "yoga", "wellness" },
        ["relax"] = new[] { "resort", "spa", "beach", "nghi", "thu gian", "massage", "wellness" },
        ["kham pha"] = new[] { "pho co", "lang", "khu", "cong vien", "quang truong", "duong pho", "cho dem", "vui choi" }
    };

    public string Name => "StyleMatch";
    public double Weight => 0.30;

    public double Calculate(SpotScoringContext context)
    {
        var travelStyle = context.Preference.TravelStyle;
        if (string.IsNullOrWhiteSpace(travelStyle))
        {
            return 0.6;
        }

        var style = SpotScoreMath.NormalizeText(travelStyle);
        var content = SpotScoreMath.NormalizeText($"{context.Spot.Name} {context.Spot.Description}");
        var matchedStyles = StyleKeywords
            .Where(item => style.Contains(item.Key, StringComparison.OrdinalIgnoreCase))
            .SelectMany(item => item.Value)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (matchedStyles.Count == 0)
        {
            matchedStyles = style
                .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Where(word => word.Length >= 3)
                .ToList();
        }

        if (matchedStyles.Count == 0)
        {
            return 0.6;
        }

        var matchCount = matchedStyles.Count(keyword => content.Contains(keyword, StringComparison.OrdinalIgnoreCase));
        return matchCount == 0
            ? 0.35
            : SpotScoreMath.Clamp(0.55 + (matchCount / (double)matchedStyles.Count * 0.45));
    }
}

public sealed class BudgetMatchScoreStrategy : ISpotScoreStrategy
{
    public string Name => "BudgetMatch";
    public double Weight => 0.25;

    public double Calculate(SpotScoringContext context)
    {
        var services = context.Spot.Services?.Where(service => service.BasePrice >= 0).ToList() ?? new List<Service>();
        if (services.Count == 0)
        {
            return context.Preference.BudgetLevel switch
            {
                BudgetLevel.Low => 1.0,
                BudgetLevel.Medium => 0.85,
                BudgetLevel.High => 0.65,
                _ => 0.75
            };
        }

        var averagePrice = services.Average(service => service.BasePrice);
        return context.Preference.BudgetLevel switch
        {
            BudgetLevel.Low => averagePrice switch
            {
                <= 0 => 1.0,
                <= 100_000m => 0.95,
                <= 250_000m => 0.75,
                <= 500_000m => 0.45,
                _ => 0.2
            },
            BudgetLevel.Medium => averagePrice switch
            {
                <= 100_000m => 0.75,
                <= 500_000m => 1.0,
                <= 1_200_000m => 0.8,
                _ => 0.45
            },
            BudgetLevel.High => averagePrice switch
            {
                <= 250_000m => 0.55,
                <= 1_200_000m => 0.85,
                _ => 1.0
            },
            _ => 0.7
        };
    }
}

public sealed class PaceMatchScoreStrategy : ISpotScoreStrategy
{
    public string Name => "PaceMatch";
    public double Weight => 0.20;

    public double Calculate(SpotScoringContext context)
    {
        var minutes = context.Spot.AvgTimeSpent <= 0 ? 90 : context.Spot.AvgTimeSpent;

        return context.Preference.TravelPace switch
        {
            TravelPace.Relaxed => minutes switch
            {
                < 60 => 1.0,
                <= 120 => 0.8,
                <= 180 => 0.55,
                _ => 0.35
            },
            TravelPace.FastPaced => minutes switch
            {
                < 60 => 0.55,
                <= 120 => 0.75,
                <= 240 => 1.0,
                _ => 0.85
            },
            TravelPace.Balanced => minutes switch
            {
                < 60 => 0.7,
                <= 150 => 1.0,
                <= 240 => 0.75,
                _ => 0.5
            },
            _ => 0.7
        };
    }
}

public sealed class DistanceOptimizationScoreStrategy : ISpotScoreStrategy
{
    public string Name => "DistanceOptimization";
    public double Weight => 0.15;

    public double Calculate(SpotScoringContext context)
    {
        var centerLatitude = context.CenterLatitude;
        var centerLongitude = context.CenterLongitude;

        if (!centerLatitude.HasValue || !centerLongitude.HasValue)
        {
            var destinationCenter = SpotScoreMath.ResolveDestinationCenter(context.Spot);
            centerLatitude = destinationCenter?.Latitude;
            centerLongitude = destinationCenter?.Longitude;
        }

        if (!centerLatitude.HasValue || !centerLongitude.HasValue)
        {
            return 0.7;
        }

        if (context.Spot.Latitude == 0 && context.Spot.Longitude == 0)
        {
            return 0.5;
        }

        var distanceKm = SpotScoreMath.CalculateHaversineDistance(
            centerLatitude.Value,
            centerLongitude.Value,
            context.Spot.Latitude,
            context.Spot.Longitude);

        return distanceKm switch
        {
            < 2 => 1.0,
            <= 5 => 0.7,
            <= 10 => 0.5,
            _ => 0.3
        };
    }
}

public sealed class RatingScoreStrategy : ISpotScoreStrategy
{
    public string Name => "Rating";
    public double Weight => 0.10;

    public double Calculate(SpotScoringContext context)
    {
        if (context.Reviews.Count > 0)
        {
            return SpotScoreMath.Clamp(context.Reviews.Average(review => review.Rating) / 5.0);
        }

        var ratedServices = context.Spot.Services?.Where(service => service.RatingAvg > 0).ToList() ?? new List<Service>();
        if (ratedServices.Count > 0)
        {
            return SpotScoreMath.Clamp(ratedServices.Average(service => service.RatingAvg) / 5.0);
        }

        return 0.6;
    }
}

public static class SpotScoreMath
{
    public static double Clamp(double value)
        => Math.Max(0, Math.Min(1, value));

    public static string NormalizeText(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return string.Empty;
        }

        var normalized = text.ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);

        foreach (var character in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
            {
                builder.Append(character == 'đ' ? 'd' : character);
            }
        }

        return builder.ToString().Normalize(NormalizationForm.FormC);
    }

    public static (double Latitude, double Longitude)? ResolveDestinationCenter(TouristSpot spot)
    {
        var destinationSpots = spot.Destination?.TouristSpots?
            .Where(destinationSpot => destinationSpot.Latitude != 0 && destinationSpot.Longitude != 0)
            .ToList();

        if (destinationSpots == null || destinationSpots.Count == 0)
        {
            return null;
        }

        return (
            destinationSpots.Average(destinationSpot => destinationSpot.Latitude),
            destinationSpots.Average(destinationSpot => destinationSpot.Longitude));
    }

    public static double CalculateHaversineDistance(double lat1, double lon1, double lat2, double lon2)
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
}
