using TravelAI.Application.DTOs.Availability;

namespace TravelAI.Application.Interfaces;

public interface IAvailabilityService
{
    // Hàm 1: Lấy danh sách để hiện lên lịch cho khách xem (Đã có)
    Task<IEnumerable<ServiceAvailabilityDto>> GetAvailabilityAsync(int serviceId, DateTime startDate, DateTime endDate);
    
    // Hàm 2: Partner thiết lập kho (Đã có)
    Task<bool> SetAvailabilityAsync(int serviceId, DateTime date, decimal price, int stock);

    // Hàm 3: Kiểm tra trực tiếp khi đặt hàng (CẦN THÊM MỚI)
    Task<bool> CheckStockAsync(int serviceId, DateTime date, int requestedQuantity);
}