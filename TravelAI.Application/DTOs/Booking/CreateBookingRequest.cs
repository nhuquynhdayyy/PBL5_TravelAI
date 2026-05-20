namespace TravelAI.Application.DTOs.Booking;

public record CreateBookingRequest(
    int ServiceId, 
    int Quantity, 
    DateTime CheckInDate
);

public sealed class CreateCartBookingRequest
{
    public List<CreateBookingRequest> Items { get; set; } = new();
}
