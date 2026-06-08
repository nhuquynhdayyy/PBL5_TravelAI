namespace TravelAI.Domain.Entities;

public class ItineraryItem {
    public int ItemId { get; set; }
    public int ItineraryId { get; set; }
    public int? ServiceId { get; set; }
    public int? SpotId { get; set; }
    public string? CustomTitle { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public int ActivityOrder { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    public Itinerary Itinerary { get; set; } = null!;
    public Service? Service { get; set; }
    public TouristSpot? TouristSpot { get; set; }
}