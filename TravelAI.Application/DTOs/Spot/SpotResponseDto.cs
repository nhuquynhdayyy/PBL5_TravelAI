namespace TravelAI.Application.DTOs.Spot;

public class SpotResponseDto
{
    public int SpotId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string? OpeningHours { get; set; }
    public int AvgTimeSpent { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}