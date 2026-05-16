namespace TravelAI.Application.DTOs.Availability;

public class MyServicesAvailabilityDto
{
    public int ServiceId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public string ServiceType { get; set; } = string.Empty;
    public List<ServiceAvailabilityDetailDto> Availabilities { get; set; } = new();
}

public class ServiceAvailabilityDetailDto
{
    public int AvailId { get; set; }
    public DateTime Date { get; set; }
    public decimal Price { get; set; }  // Giá cuối cùng (đã áp dụng pricing rules)
    public decimal BasePrice { get; set; }  // Giá gốc (chưa áp dụng pricing rules)
    public int TotalStock { get; set; }
    public int BookedCount { get; set; }
    public int HeldCount { get; set; }
    public int Remaining { get; set; }
}
