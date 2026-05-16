namespace TravelAI.Domain.Entities;
using TravelAI.Domain.Enums;

public class Payment {
    public int PaymentId { get; set; }
    public int BookingId { get; set; }
    public string Method { get; set; } = string.Empty;
    public string Provider { get; set; } = string.Empty;
    public string? TransactionRef { get; set; }
    public decimal Amount { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PaidAt { get; set; }
    public DateTime PaymentTime { get; set; }

    public Booking Booking { get; set; } = null!;
    public ICollection<Refund> Refunds { get; set; } = new List<Refund>();
}
