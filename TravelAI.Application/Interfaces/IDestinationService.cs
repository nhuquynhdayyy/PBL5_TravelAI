using TravelAI.Application.DTOs.Destination;
using TravelAI.Application.DTOs; 

namespace TravelAI.Application.Interfaces;

public interface IDestinationService 
{
    Task<IEnumerable<DestinationDto>> GetAllAsync();
    Task<DestinationDto?> GetByIdAsync(int id);
    Task<DestinationDto> CreateAsync(CreateDestinationRequest request, string webRootPath);
}