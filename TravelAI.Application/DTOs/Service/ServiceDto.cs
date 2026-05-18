namespace TravelAI.Application.DTOs.Service;

public class ServiceDto
{
    public int ServiceId { get; set; }
    public int PartnerId { get; set; }
    public string PartnerName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal BasePrice { get; set; }
    public string ServiceType { get; set; } = string.Empty; // Hotel, Tour, Transport, Restaurant
    public double RatingAvg { get; set; }
    public int ReviewCount { get; set; }
    public bool IsActive { get; set; }
    
    // Location
    public int? SpotId { get; set; }
    public string? SpotName { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    
    // Images
    public List<string> ImageUrls { get; set; } = new();
    
    // Attributes (dynamic properties)
    public Dictionary<string, string> Attributes { get; set; } = new();
    
    // Availability
    public bool HasAvailability { get; set; }
}
