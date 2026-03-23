namespace TravelAI.Domain.Entities;

public class ServiceAvailability {
    public int AvailId { get; set; }
    public int ServiceId { get; set; }
    public DateTime Date { get; set; }
    public decimal Price { get; set; }
    public int TotalStock { get; set; }
    public int BookedCount { get; set; }
    public int HeldCount { get; set; }
    public DateTime? HoldExpiry { get; set; }

    public Service Service { get; set; } = null!;
}