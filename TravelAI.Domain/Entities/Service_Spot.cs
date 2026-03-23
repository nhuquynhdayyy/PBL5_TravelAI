namespace TravelAI.Domain.Entities;

public class Service_Spot {
    public int Id { get; set; }
    public int ServiceId { get; set; }
    public int SpotId { get; set; }
    public int VisitOrder { get; set; }

    public Service Service { get; set; } = null!;
    public TouristSpot TouristSpot { get; set; } = null!;
}