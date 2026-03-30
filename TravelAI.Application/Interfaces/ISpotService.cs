using TravelAI.Application.DTOs.Spot;

namespace TravelAI.Application.Interfaces;

public interface ISpotService
{
    Task<IEnumerable<SpotDto>> GetSpotsByDestinationAsync(int destinationId);
    Task<SpotDto?> GetByIdAsync(int id);
    Task<SpotDto> CreateSpotAsync(CreateSpotRequest request, string webRootPath);
    Task<bool> UpdateSpotAsync(int id, UpdateSpotRequest request, string webRootPath);
    Task<bool> DeleteSpotAsync(int id, string webRootPath);
}