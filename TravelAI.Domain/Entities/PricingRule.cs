namespace TravelAI.Domain.Entities;

public class PricingRule
{
    public int RuleId { get; set; }
    public int ServiceId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal PriceMultiplier { get; set; } // Ví dụ: 1.3 = tăng 30%
    public string? Description { get; set; } // Ví dụ: "Giá mùa hè"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Service Service { get; set; } = null!;
}
