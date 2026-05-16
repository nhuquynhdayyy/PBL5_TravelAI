namespace TravelAI.Application.Interfaces;

public interface IAIAnalyticsService
{
    Task<UserFeedbackStatsDto> GetUserFeedbackStatsAsync();
    Task<List<PopularDestinationDto>> GetPopularDestinationsAsync();
    Task<List<AverageBudgetDto>> GetAverageBudgetByDestinationAsync();
}

public sealed record UserFeedbackStatsDto(
    int TotalAiSuggestions,
    int SavedItineraries,
    double SavedRatePercent);

public sealed record PopularDestinationDto(
    string Destination,
    int SuggestedCount);

public sealed record AverageBudgetDto(
    string Destination,
    decimal AverageBudget,
    int SampleCount);
