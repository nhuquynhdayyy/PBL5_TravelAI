namespace TravelAI.Application.DTOs.Booking;

public record CreateBookingRequest(
    int ServiceId, 
    int Quantity, 
    DateTime CheckInDate,
    DateTime? CheckOutDate = null  // Thêm ngày trả xe cho dịch vụ Transport
);

public sealed class CreateCartBookingRequest
{
    public List<CreateBookingRequest> Items { get; set; } = new();
}
