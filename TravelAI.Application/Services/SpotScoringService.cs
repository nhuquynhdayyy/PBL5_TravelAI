using System.Globalization;
using System.Text;
using TravelAI.Application.DTOs.AI;
using TravelAI.Application.Interfaces;
using TravelAI.Domain.Entities;
using TravelAI.Domain.Enums;

namespace TravelAI.Application.Services;

public class SpotScoringService : ISpotScoringService
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

    public async Task<List<SpotScoreDto>> ScoreAndRankSpotsAsync(
        List<TouristSpot> spots,
        UserPreference preference,
        double? centerLatitude = null,
        double? centerLongitude = null)
    {
        var scores = spots
            .Select(spot =>
            {
                var reviews = GetSpotReviews(spot);
                return new SpotScoreDto
                {
                    SpotId = spot.SpotId,
                    SpotName = spot.Name,
                    TotalScore = CalculateScore(spot, preference, reviews, centerLatitude, centerLongitude),
                    StyleMatchScore = CalculateStyleMatch(spot, preference.TravelStyle),
                    BudgetMatchScore = CalculateBudgetMatch(spot, preference.BudgetLevel),
                    PaceMatchScore = CalculatePaceMatch(spot, preference.TravelPace),
                    DistanceScore = CalculateDistanceOptimization(spot, centerLatitude, centerLongitude),
                    RatingScore = CalculateRatingScore(spot, reviews)
                };
            })
            .OrderByDescending(score => score.TotalScore)
            .ToList();

        return await Task.FromResult(scores);
    }

    public Task<double> CalculateScoreAsync(
        TouristSpot spot,
        UserPreference preference,
        double? centerLatitude = null,
        double? centerLongitude = null)
    {
        return Task.FromResult(CalculateScore(
            spot,
            preference,
            GetSpotReviews(spot),
            centerLatitude,
            centerLongitude));
    }

    public double CalculateScore(TouristSpot spot, UserPreference pref, List<Review> reviews)
    {
        var destinationCenter = ResolveDestinationCenter(spot);
        return CalculateScore(
            spot,
            pref,
            reviews,
            destinationCenter?.Latitude,
            destinationCenter?.Longitude);
    }

    private static double CalculateScore(
        TouristSpot spot,
        UserPreference pref,
        List<Review> reviews,
        double? centerLatitude,
        double? centerLongitude)
    {
        var styleMatch = CalculateStyleMatch(spot, pref.TravelStyle);
        var budgetMatch = CalculateBudgetMatch(spot, pref.BudgetLevel);
        var paceMatch = CalculatePaceMatch(spot, pref.TravelPace);
        var distanceOptimization = CalculateDistanceOptimization(spot, centerLatitude, centerLongitude);
        var rating = CalculateRatingScore(spot, reviews);

        return (styleMatch * 0.3)
            + (budgetMatch * 0.25)
            + (paceMatch * 0.2)
            + (distanceOptimization * 0.15)
            + (rating * 0.1);
    }

    private static double CalculateStyleMatch(TouristSpot spot, string? travelStyle)
    {
        if (string.IsNullOrWhiteSpace(travelStyle))
        {
            return 0.6;
        }

        var style = NormalizeText(travelStyle);
        var content = NormalizeText($"{spot.Name} {spot.Description}");
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
            : Clamp(0.55 + (matchCount / (double)matchedStyles.Count * 0.45));
    }

    private static double CalculateBudgetMatch(TouristSpot spot, BudgetLevel budgetLevel)
    {
        var services = spot.Services?.Where(service => service.BasePrice >= 0).ToList() ?? new List<Service>();
        if (services.Count == 0)
        {
            return budgetLevel switch
            {
                BudgetLevel.Low => 1.0,
                BudgetLevel.Medium => 0.85,
                BudgetLevel.High => 0.65,
                _ => 0.75
            };
        }

        var averagePrice = services.Average(service => service.BasePrice);
        return budgetLevel switch
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

    private static double CalculatePaceMatch(TouristSpot spot, TravelPace travelPace)
    {
        var minutes = spot.AvgTimeSpent <= 0 ? 90 : spot.AvgTimeSpent;

        return travelPace switch
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

    private static double CalculateDistanceOptimization(
        TouristSpot spot,
        double? centerLatitude,
        double? centerLongitude)
    {
        if (!centerLatitude.HasValue || !centerLongitude.HasValue)
        {
            var destinationCenter = ResolveDestinationCenter(spot);
            centerLatitude = destinationCenter?.Latitude;
            centerLongitude = destinationCenter?.Longitude;
        }

        if (!centerLatitude.HasValue || !centerLongitude.HasValue)
        {
            return 0.7;
        }

        if (spot.Latitude == 0 && spot.Longitude == 0)
        {
            return 0.5;
        }

        var distanceKm = CalculateHaversineDistance(
            centerLatitude.Value,
            centerLongitude.Value,
            spot.Latitude,
            spot.Longitude);

        return distanceKm switch
        {
            < 2 => 1.0,
            <= 5 => 0.7,
            <= 10 => 0.5,
            _ => 0.3
        };
    }

    private static double CalculateRatingScore(TouristSpot spot, List<Review> reviews)
    {
        if (reviews.Count > 0)
        {
            return Clamp(reviews.Average(review => review.Rating) / 5.0);
        }

        var ratedServices = spot.Services?.Where(service => service.RatingAvg > 0).ToList() ?? new List<Service>();
        if (ratedServices.Count > 0)
        {
            return Clamp(ratedServices.Average(service => service.RatingAvg) / 5.0);
        }

        return 0.6;
    }

    private static List<Review> GetSpotReviews(TouristSpot spot)
    {
        var directReviews = spot.Services?
            .SelectMany(service => service.Reviews)
            .ToList() ?? new List<Review>();

        var serviceSpotReviews = spot.ServiceSpots?
            .SelectMany(serviceSpot => serviceSpot.Service.Reviews)
            .ToList() ?? new List<Review>();

        return directReviews
            .Concat(serviceSpotReviews)
            .GroupBy(review => review.ReviewId)
            .Select(group => group.First())
            .ToList();
    }

    private static (double Latitude, double Longitude)? ResolveDestinationCenter(TouristSpot spot)
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

    private static double Clamp(double value)
        => Math.Max(0, Math.Min(1, value));

    private static string NormalizeText(string? text)
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
}
