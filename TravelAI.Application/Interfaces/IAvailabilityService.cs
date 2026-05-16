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

    // Hàm 4: Bulk set availability cho nhiều ngày
    Task<bool> BulkSetAvailabilityAsync(int serviceId, int partnerId, DateTime startDate, DateTime endDate, decimal price, int stock);

    // Hàm 5: Cập nhật availability cho 1 ngày cụ thể
    Task<bool> UpdateAvailabilityAsync(int availId, int partnerId, decimal? price, int? stock);

    // Hàm 6: Lấy tất cả availability của services thuộc partner
    Task<IEnumerable<MyServicesAvailabilityDto>> GetMyServicesAvailabilityAsync(int partnerId, DateTime? startDate, DateTime? endDate);

    // Hàm 7: Áp dụng giá cuối tuần tự động
    Task<bool> ApplyWeekendPricingAsync(int serviceId, int partnerId, DateTime startDate, DateTime endDate, decimal weekendMultiplier);
}