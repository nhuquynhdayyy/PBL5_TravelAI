namespace TravelAI.Application.DTOs.Service;

/// <summary>
/// DTO cho việc lọc dịch vụ với các tiêu chí động
/// </summary>
public class ServiceFilterRequest
{
    // Filters chung cho tất cả service types
    public string? ServiceType { get; set; } // Hotel, Tour, Transport, Restaurant
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public double? Rating { get; set; }
    public double? MinRating { get; set; }
    public int? DestinationId { get; set; }
    public int? SpotId { get; set; }
    public string? SearchKeyword { get; set; }
    
    // Pagination
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    
    // Sorting
    public string? SortBy { get; set; } // price, rating, name
    public bool SortDescending { get; set; } = false;
    
    // Dynamic filters based on ServiceAttributes
    // Key-Value pairs: e.g., {"Star": "5", "Wifi": "true", "Pool": "true"}
    public Dictionary<string, string>? Attributes { get; set; }
    
    // Specific filters for different service types
    // Hotel
    public List<string>? HotelAmenities { get; set; } // ["Wifi", "Pool", "Breakfast"]
    public int? HotelStars { get; set; } // 1-5
    
    // Tour
    public List<string>? TourThemes { get; set; } // ["Culture", "Adventure", "Relax"]
    public string? TourDuration { get; set; } // "1day", "2days1night", "3days2nights"
    
    // Transport
    public string? TransportType { get; set; } // "Limousine", "Bus", "Train"
    public string? DepartureTime { get; set; } // "morning", "afternoon", "evening"
    public string? DepartureLocation { get; set; }
    public string? ArrivalLocation { get; set; }
    
    // Restaurant
    public List<string>? CuisineTypes { get; set; } // ["Vietnamese", "Japanese", "Italian"]
    public string? MealType { get; set; } // "breakfast", "lunch", "dinner"
}
