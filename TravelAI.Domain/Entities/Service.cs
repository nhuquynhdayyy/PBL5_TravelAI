namespace TravelAI.Domain.Entities;
using TravelAI.Domain.Enums;

public class Service {
    public int ServiceId { get; set; }
    public int PartnerId { get; set; }
    public int? SpotId { get; set; }
    public ServiceType ServiceType { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty; 
    public decimal BasePrice { get; set; }
    public double RatingAvg { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }

    public bool IsActive { get; set; } = false;
    public string? ReviewSummary { get; set; } 
    
    public User Partner { get; set; } = null!;
    public TouristSpot? TouristSpot { get; set; }
    public ICollection<ServiceAttribute> Attributes { get; set; } = new List<ServiceAttribute>();
    public ICollection<ServiceImage> Images { get; set; } = new List<ServiceImage>();
    public ICollection<ServiceAvailability> Availabilities { get; set; } = new List<ServiceAvailability>();
    public ICollection<Service_Spot> ServiceSpots { get; set; } = new List<Service_Spot>();
    public ICollection<BookingItem> BookingItems { get; set; } = new List<BookingItem>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
}