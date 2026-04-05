namespace TravelAI.Application.DTOs.Availability;

public record ServiceAvailabilityDto(
    DateTime Date,
    decimal Price,
    int RemainingStock,
    bool IsAvailable
);