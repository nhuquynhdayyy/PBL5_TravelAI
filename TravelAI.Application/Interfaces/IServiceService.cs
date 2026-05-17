using TravelAI.Application.DTOs.Service;

namespace TravelAI.Application.Interfaces;

public interface IServiceService
{
    Task<IEnumerable<ServiceDto>> GetAllAsync(int? type);
    Task<IEnumerable<ServiceDto>> GetPartnerServicesAsync(int partnerId);
    Task<IEnumerable<ServiceDto>> AdminGetAllServicesAsync();
    Task<IEnumerable<ServiceDto>> GetPendingServicesAsync();
    Task<ServiceDto?> GetByIdAsync(int id);
    Task<ServiceDto> CreateAsync(int partnerId, CreateServiceRequest request, string webRootPath);
    Task<bool> UpdateAsync(int id, CreateServiceRequest request, int requestingUserId, bool isAdmin, string webRootPath);
    Task<bool> DeleteAsync(int id, int requestingUserId, bool isAdmin, string webRootPath);
    Task<bool> ApproveAsync(int id);
    Task<bool> RejectAsync(int id, string reason, int adminUserId);
    Task<bool> ToggleStatusAsync(int id);
    Task<string?> GetReviewSummaryAsync(int serviceId);
}