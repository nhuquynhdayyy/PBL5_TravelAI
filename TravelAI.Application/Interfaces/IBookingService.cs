using TravelAI.Application.DTOs.Booking;

namespace TravelAI.Application.Interfaces;

public interface IBookingService
{
    // Tạo đơn hàng nháp và trả về ID đơn hàng
    Task<int?> CreateDraftBookingAsync(int userId, CreateBookingRequest request);
}