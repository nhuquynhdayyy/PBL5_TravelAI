namespace TravelAI.Application.DTOs.Service;

/// <summary>
/// Response cho filtered services với pagination
/// </summary>
public class ServiceFilterResponse
{
    public List<ServiceDto> Services { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool HasPreviousPage => PageNumber > 1;
    public bool HasNextPage => PageNumber < TotalPages;
    
    // Filter metadata (để hiển thị available options)
    public ServiceFilterMetadata? Metadata { get; set; }
}

/// <summary>
/// Metadata về các options có sẵn cho filtering
/// </summary>
public class ServiceFilterMetadata
{
    public decimal MinPrice { get; set; }
    public decimal MaxPrice { get; set; }
    public List<string> AvailableServiceTypes { get; set; } = new();
    public List<string> AvailableDestinations { get; set; } = new();
    
    // Dynamic attributes based on service type
    public Dictionary<string, List<string>> AvailableAttributes { get; set; } = new();
}
