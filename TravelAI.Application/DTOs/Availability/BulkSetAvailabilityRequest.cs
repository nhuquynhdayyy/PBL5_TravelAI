namespace TravelAI.Application.DTOs.Availability;

public class BulkSetAvailabilityRequest
{
    public int ServiceId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal Price { get; set; }
    public int Stock { get; set; }
}
