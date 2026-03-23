namespace TravelAI.Domain.Entities;

public class Payment {
    public int PaymentId { get; set; }
    public int BookingId { get; set; }
    public string Method { get; set; } = string.Empty;
    public string? TransactionRef { get; set; }
    public decimal Amount { get; set; }
    public DateTime PaymentTime { get; set; }

    public Booking Booking { get; set; } = null!;
    public ICollection<Refund> Refunds { get; set; } = new List<Refund>();
}