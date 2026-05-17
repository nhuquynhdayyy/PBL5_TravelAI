using TravelAI.Application.DTOs.Service;

namespace TravelAI.Application.DTOs.AI;

public record GenerateItineraryRequest(int DestinationId, int NumberOfDays, DateTime StartDate)
{
    public ServiceFilterRequest? ServiceFilters { get; init; }
}
