using TravelAI.Application.DTOs.Spot;

namespace TravelAI.Application.Interfaces;

public interface ISpotService
{
    Task<IEnumerable<SpotDto>> GetSpotsByDestinationAsync(int destinationId);
}