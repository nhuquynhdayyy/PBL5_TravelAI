using Microsoft.AspNetCore.Http;

namespace TravelAI.Application.DTOs.Spot;

public record CreateSpotRequest(
    string Name,
    string Description,
    IFormFile? Image, 
    double Latitude,
    double Longitude,
    int AvgTimeSpent,
    string? OpeningHours,
    int DestinationId
);