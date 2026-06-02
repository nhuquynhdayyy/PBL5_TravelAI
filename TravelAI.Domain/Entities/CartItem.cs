namespace TravelAI.Domain.Entities;

public class CartItem
{
    public int CartItemId { get; set; }
    public int UserId { get; set; }
    public int ServiceId { get; set; }
    public int Quantity { get; set; }
    public decimal PriceAtBooking { get; set; }
    public DateTime CheckInDate { get; set; }
    public DateTime? CheckOutDate { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
    public Service Service { get; set; } = null!;
}
