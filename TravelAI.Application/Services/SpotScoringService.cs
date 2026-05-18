using TravelAI.Application.DTOs.AI;
using TravelAI.Application.Interfaces;
using TravelAI.Application.Services.Scoring;
using TravelAI.Domain.Entities;

namespace TravelAI.Application.Services;

public class SpotScoringService : ISpotScoringService
{
    private readonly IReadOnlyCollection<ISpotScoreStrategy> _strategies;

    public SpotScoringService()
        : this(CreateDefaultStrategies())
    {
    }

    public SpotScoringService(IEnumerable<ISpotScoreStrategy> strategies)
    {
        _strategies = strategies.ToList();
        if (_strategies.Count == 0)
        {
            throw new InvalidOperationException("At least one spot scoring strategy must be registered.");
        }
    }

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
                var context = new SpotScoringContext(spot, preference, reviews, centerLatitude, centerLongitude);

                return new SpotScoreDto
                {
                    SpotId = spot.SpotId,
                    SpotName = spot.Name,
                    TotalScore = CalculateWeightedScore(context),
                    StyleMatchScore = CalculateStrategyScore<StyleMatchScoreStrategy>(context),
                    BudgetMatchScore = CalculateStrategyScore<BudgetMatchScoreStrategy>(context),
                    PaceMatchScore = CalculateStrategyScore<PaceMatchScoreStrategy>(context),
                    DistanceScore = CalculateStrategyScore<DistanceOptimizationScoreStrategy>(context),
                    RatingScore = CalculateStrategyScore<RatingScoreStrategy>(context)
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
        var context = new SpotScoringContext(
            spot,
            preference,
            GetSpotReviews(spot),
            centerLatitude,
            centerLongitude);

        return Task.FromResult(CalculateWeightedScore(context));
    }

    public double CalculateScore(TouristSpot spot, UserPreference pref, List<Review> reviews)
    {
        var destinationCenter = SpotScoreMath.ResolveDestinationCenter(spot);
        var context = new SpotScoringContext(
            spot,
            pref,
            reviews,
            destinationCenter?.Latitude,
            destinationCenter?.Longitude);

        return CalculateWeightedScore(context);
    }

    private double CalculateWeightedScore(SpotScoringContext context)
    {
        var totalWeight = _strategies.Sum(strategy => strategy.Weight);
        if (totalWeight <= 0)
        {
            throw new InvalidOperationException("Spot scoring strategies must have a positive total weight.");
        }

        var weightedScore = _strategies.Sum(strategy =>
            SpotScoreMath.Clamp(strategy.Calculate(context)) * strategy.Weight);

        return SpotScoreMath.Clamp(weightedScore / totalWeight);
    }

    private double CalculateStrategyScore<TStrategy>(SpotScoringContext context)
        where TStrategy : ISpotScoreStrategy
    {
        var strategy = _strategies.OfType<TStrategy>().FirstOrDefault();
        return strategy == null ? 0 : SpotScoreMath.Clamp(strategy.Calculate(context));
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

    private static IEnumerable<ISpotScoreStrategy> CreateDefaultStrategies()
        => new ISpotScoreStrategy[]
        {
            new StyleMatchScoreStrategy(),
            new BudgetMatchScoreStrategy(),
            new PaceMatchScoreStrategy(),
            new DistanceOptimizationScoreStrategy(),
            new RatingScoreStrategy()
        };
}
