using TravelAI.Application.DTOs.AI;
using TravelAI.Application.Interfaces;
using TravelAI.Application.Services.Scoring;
using AppScoring = TravelAI.Application.Services.SpotScoringService;
using TravelAI.Domain.Entities;

namespace TravelAI.Infrastructure.Services.AI;

/// <summary>
/// Infrastructure wrapper — ủy quyền toàn bộ logic scoring cho
/// Application.Services.SpotScoringService (dùng Strategy pattern).
/// Không tự tính toán để tránh trùng lặp và lệch tham số.
/// </summary>
public class SpotScoringService : ISpotScoringService
{
    private readonly AppScoring _inner;

    public SpotScoringService()
    {
        _inner = new AppScoring();
    }

    public SpotScoringService(IEnumerable<ISpotScoreStrategy> strategies)
    {
        _inner = new AppScoring(strategies);
    }

    public double CalculateScore(TouristSpot spot, UserPreference pref, List<Review> reviews)
        => _inner.CalculateScore(spot, pref, reviews);

    public Task<List<SpotScoreDto>> ScoreAndRankSpotsAsync(
        List<TouristSpot> spots,
        UserPreference preference,
        double? centerLatitude = null,
        double? centerLongitude = null)
        => _inner.ScoreAndRankSpotsAsync(spots, preference, centerLatitude, centerLongitude);

    public Task<double> CalculateScoreAsync(
        TouristSpot spot,
        UserPreference preference,
        double? centerLatitude = null,
        double? centerLongitude = null)
        => _inner.CalculateScoreAsync(spot, preference, centerLatitude, centerLongitude);
}
