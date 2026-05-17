namespace TravelAI.Application.DTOs.Pricing;

public class CreatePricingRuleRequest
{
    public int ServiceId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal PriceMultiplier { get; set; } // Ví dụ: 1.3 = tăng 30%
    public string? Description { get; set; }
}
