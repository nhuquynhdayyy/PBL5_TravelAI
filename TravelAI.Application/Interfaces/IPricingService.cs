using TravelAI.Application.DTOs.Pricing;

namespace TravelAI.Application.Interfaces;

public interface IPricingService
{
    // Tạo pricing rule mới
    Task<int> CreatePricingRuleAsync(int serviceId, int partnerId, DateTime startDate, DateTime endDate, decimal priceMultiplier, string? description);

    // Lấy tất cả pricing rules của 1 service
    Task<IEnumerable<PricingRuleDto>> GetPricingRulesAsync(int serviceId);

    // Xóa pricing rule
    Task<bool> DeletePricingRuleAsync(int ruleId, int partnerId);

    // Tính giá cuối cùng sau khi áp dụng tất cả rules
    Task<decimal> CalculateFinalPriceAsync(int serviceId, DateTime date, decimal basePrice);
}
