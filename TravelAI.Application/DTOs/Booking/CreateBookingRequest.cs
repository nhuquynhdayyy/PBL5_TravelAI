namespace TravelAI.Application.DTOs.Booking;

public record CreateBookingRequest(
    int ServiceId, 
    int Quantity, 
    DateTime CheckInDate
);