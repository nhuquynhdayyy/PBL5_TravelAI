namespace TravelAI.Domain.Entities;

public class TouristSpot {
    public int SpotId { get; set; }
    public int DestinationId { get; set; }
    public string Name { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int AvgTimeSpent { get; set; } // minutes
    public string? OpeningHours { get; set; }

    public Destination Destination { get; set; } = null!;
    public ICollection<Service> Services { get; set; } = new List<Service>();
    public ICollection<Service_Spot> ServiceSpots { get; set; } = new List<Service_Spot>();
}