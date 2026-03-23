namespace TravelAI.Domain.Entities;

public class Promotion {
    public int PromoId { get; set; }
    public string Code { get; set; } = string.Empty;
    public double DiscountPercent { get; set; }
    public decimal MaxAmount { get; set; }
    public DateTime ExpiryDate { get; set; }
    public bool IsActive { get; set; }
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}