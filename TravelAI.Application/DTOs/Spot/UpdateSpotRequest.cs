using Microsoft.AspNetCore.Http;

namespace TravelAI.Application.DTOs.Spot;

public class UpdateSpotRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public int? AvgTimeSpent { get; set; }
    public string? OpeningHours { get; set; }

    public IFormFile? Image { get; set; } // 👈 QUAN TRỌNG
}