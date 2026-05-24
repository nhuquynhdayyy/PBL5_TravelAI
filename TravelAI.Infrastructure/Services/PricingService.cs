using Microsoft.EntityFrameworkCore;
using TravelAI.Application.Helpers;
using TravelAI.Application.Interfaces;
using TravelAI.Application.DTOs.Pricing;
using TravelAI.Domain.Entities;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.Infrastructure.Services;

public class PricingService : IPricingService
{
    private readonly ApplicationDbContext _context;

    public PricingService(ApplicationDbContext context)
    {
        _context = context;
    }

    // Tạo pricing rule mới
    public async Task<int> CreatePricingRuleAsync(int serviceId, int requestingUserId, bool isAdmin, DateTime startDate, DateTime endDate, decimal priceMultiplier, string? description)
    {
        ValidatePricingRule(startDate, endDate, priceMultiplier);

        // Kiểm tra service thuộc về partner
        var service = await _context.Services.FindAsync(serviceId);
        if (service == null || (!isAdmin && service.PartnerId != requestingUserId))
        {
            return 0;
        }

        var rule = new PricingRule
        {
            ServiceId = serviceId,
            StartDate = startDate.Date,
            EndDate = endDate.Date,
            PriceMultiplier = priceMultiplier,
            Description = description,
            CreatedAt = DateTimeHelper.Now
        };

        _context.PricingRules.Add(rule);
        await _context.SaveChangesAsync();

        return rule.RuleId;
    }

    // Lấy tất cả pricing rules của 1 service
    public async Task<IEnumerable<PricingRuleDto>> GetPricingRulesAsync(int serviceId)
    {
        var rules = await _context.PricingRules
            .Where(r => r.ServiceId == serviceId)
            .OrderBy(r => r.StartDate)
            .ToListAsync();

        return rules.Select(r => new PricingRuleDto
        {
            RuleId = r.RuleId,
            ServiceId = r.ServiceId,
            StartDate = r.StartDate,
            EndDate = r.EndDate,
            PriceMultiplier = r.PriceMultiplier,
            Description = r.Description,
            CreatedAt = r.CreatedAt
        });
    }

    // Xóa pricing rule
    public async Task<bool> DeletePricingRuleAsync(int ruleId, int requestingUserId, bool isAdmin)
    {
        var rule = await _context.PricingRules
            .Include(r => r.Service)
            .FirstOrDefaultAsync(r => r.RuleId == ruleId);

        if (rule == null || (!isAdmin && rule.Service.PartnerId != requestingUserId))
        {
            return false;
        }

        _context.PricingRules.Remove(rule);
        return await _context.SaveChangesAsync() > 0;
    }

    // Tính giá cuối cùng sau khi áp dụng tất cả rules
    public async Task<decimal> CalculateFinalPriceAsync(int serviceId, DateTime date, decimal basePrice)
    {
        var rules = await _context.PricingRules
            .Where(r => r.ServiceId == serviceId && r.StartDate <= date.Date && r.EndDate >= date.Date)
            .ToListAsync();

        var finalPrice = basePrice;
// Áp dụng tất cả rules (nhân lũy thừa)
        foreach (var rule in rules)
        {
            finalPrice *= rule.PriceMultiplier;
        }

        return finalPrice;
    }

    private static void ValidatePricingRule(DateTime startDate, DateTime endDate, decimal priceMultiplier)
    {
        if (startDate.Date > endDate.Date)
        {
            throw new InvalidOperationException("Ngay bat dau phai nho hon hoac bang ngay ket thuc.");
        }

        if (priceMultiplier <= 0)
        {
            throw new InvalidOperationException("He so gia phai lon hon 0.");
        }
    }
}