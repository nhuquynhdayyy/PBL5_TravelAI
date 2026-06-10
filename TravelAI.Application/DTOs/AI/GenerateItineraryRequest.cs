using TravelAI.Application.DTOs.Service;

namespace TravelAI.Application.DTOs.AI;

public record GenerateItineraryRequest(int DestinationId, int NumberOfDays, DateTime StartDate)
{
    public ServiceFilterRequest? ServiceFilters { get; init; }
    public string? SpecialRequest { get; init; }
    public int Adults { get; init; } = 1;
    public int Children { get; init; } = 0;
    public string? UserFeedback { get; init; }
    public ItineraryResponseDto? PriorItinerary { get; init; }
}
