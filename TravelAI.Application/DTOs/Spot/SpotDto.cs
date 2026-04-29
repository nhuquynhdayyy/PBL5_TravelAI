namespace TravelAI.Application.DTOs.Spot;

public record SpotDto(
    int SpotId,
    int DestinationId,
    string Name,
    string Description,
    string? ImageUrl,
    double Latitude,
    double Longitude,
    int AvgTimeSpent,
    string? OpeningHours
);