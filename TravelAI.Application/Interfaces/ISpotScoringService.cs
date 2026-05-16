using TravelAI.Application.DTOs.AI;
using TravelAI.Domain.Entities;

namespace TravelAI.Application.Interfaces;

public interface ISpotScoringService
{
    double CalculateScore(TouristSpot spot, UserPreference pref, List<Review> reviews);

    Task<List<SpotScoreDto>> ScoreAndRankSpotsAsync(
        List<TouristSpot> spots,
        UserPreference preference,
        double? centerLatitude = null,
        double? centerLongitude = null);

    Task<double> CalculateScoreAsync(
        TouristSpot spot,
        UserPreference preference,
        double? centerLatitude = null,
        double? centerLongitude = null);
}
