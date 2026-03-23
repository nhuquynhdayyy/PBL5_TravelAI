namespace TravelAI.Domain.Entities;

public class BookingItem {
    public int ItemId { get; set; }
    public int BookingId { get; set; }
    public int ServiceId { get; set; }
    public int Quantity { get; set; }
    public decimal PriceAtBooking { get; set; }
    public DateTime CheckInDate { get; set; }
    public string? Notes { get; set; }

    public Booking Booking { get; set; } = null!;
    public Service Service { get; set; } = null!;
}