using TravelAI.Application.DTOs.Service;

namespace TravelAI.Application.Interfaces;

public interface IServiceService
{
    // 1. Lấy danh sách cho Khách (Chỉ lấy IsActive = true)
    Task<IEnumerable<ServiceDto>> GetAllAsync(int? type); 

    // 2. Lấy danh sách cho Partner (Chỉ lấy của chính họ)
    Task<IEnumerable<ServiceDto>> GetPartnerServicesAsync(int partnerId);

    // 3. Lấy danh sách cho Admin (Lấy tất cả)
    Task<IEnumerable<ServiceDto>> AdminGetAllServicesAsync();

    // 4. Các thao tác CRUD
    Task<ServiceDto?> GetByIdAsync(int id);
    Task<ServiceDto> CreateAsync(int partnerId, CreateServiceRequest request, string webRootPath);
    Task<bool> UpdateAsync(int id, CreateServiceRequest request, string webRootPath);
    Task<bool> DeleteAsync(int id, string webRootPath);
    
    // 5. Thao tác Duyệt/Khóa của Admin
    Task<bool> ToggleStatusAsync(int id);
}