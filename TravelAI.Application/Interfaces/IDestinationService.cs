using TravelAI.Application.DTOs.Destination;
using TravelAI.Application.DTOs; 

namespace TravelAI.Application.Interfaces;

public interface IDestinationService 
{
    Task<IEnumerable<DestinationDto>> GetAllAsync();
    Task<DestinationDto?> GetByIdAsync(int id);
    Task<DestinationDto> CreateAsync(CreateDestinationRequest request, string webRootPath);
    Task<bool> UpdateAsync(int id, UpdateDestinationRequest request, string webRootPath);
    Task<bool> DeleteAsync(int id, string webRootPath);
}