namespace TravelAI.Application.DTOs.Pricing;

public class PricingRuleDto
{
    public int RuleId { get; set; }
    public int ServiceId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal PriceMultiplier { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
}
