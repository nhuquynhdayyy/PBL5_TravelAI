namespace TravelAI.Domain.Entities;

public class Refund {
    public int RefundId { get; set; }
    public int PaymentId { get; set; }
    public decimal RefundAmount { get; set; }
    public string? RefundRef { get; set; }
    public string? Reason { get; set; }
    public DateTime RefundTime { get; set; }

    public Payment Payment { get; set; } = null!;
}