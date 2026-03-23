namespace TravelAI.Domain.Entities;

public class Destination {
    public int DestinationId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string? Description { get; set; }
    public ICollection<TouristSpot> TouristSpots { get; set; } = new List<TouristSpot>();
}