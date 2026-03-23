using TravelAI.Application.DTOs.Destination;

namespace TravelAI.Application.Interfaces;

public interface IDestinationService
{
    Task<IEnumerable<DestinationDto>> GetActiveDestinationsAsync();
}