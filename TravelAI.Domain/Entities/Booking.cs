namespace TravelAI.Domain.Entities;
using TravelAI.Domain.Enums;

public class Booking {
    public int BookingId { get; set; }
    public int UserId { get; set; }
    public int? PromoId { get; set; }
    public decimal TotalAmount { get; set; }
    public BookingStatus Status { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public Promotion? Promotion { get; set; }
    public ICollection<BookingItem> BookingItems { get; set; } = new List<BookingItem>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}