using TravelAI.Application.DTOs.Service;

namespace TravelAI.Application.Interfaces;

public interface IServiceService
{
    Task<IEnumerable<ServiceDto>> GetAllAsync(int? type); 
    Task<ServiceDto?> GetByIdAsync(int id);
    Task<ServiceDto> CreateAsync(int partnerId, CreateServiceRequest request, string webRootPath);
    Task<bool> UpdateAsync(int id, CreateServiceRequest request, string webRootPath);
    Task<bool> DeleteAsync(int id, string webRootPath);
}