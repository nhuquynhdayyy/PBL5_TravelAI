using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TravelAI.Application.Interfaces;
using TravelAI.Application.DTOs.Pricing;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Partner,Admin")]
public class PricingController : ControllerBase
{
    private readonly IPricingService _pricingService;

    public PricingController(IPricingService pricingService)
    {
        _pricingService = pricingService;
    }

    // A2.1: Tạo pricing rule mới
    [HttpPost("seasonal-rule")]
    public async Task<IActionResult> CreateSeasonalRule([FromBody] CreatePricingRuleRequest request)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        
        var ruleId = await _pricingService.CreatePricingRuleAsync(
            request.ServiceId,
            userId,
            request.StartDate,
            request.EndDate,
            request.PriceMultiplier,
            request.Description);

        if (ruleId == 0)
        {
            return BadRequest(new { message = "Không thể tạo rule. Kiểm tra lại service ID hoặc quyền truy cập." });
        }

        var percentChange = (request.PriceMultiplier - 1) * 100;
        return Ok(new 
        { 
            message = $"Đã tạo pricing rule thành công. Giá sẽ {(percentChange > 0 ? "tăng" : "giảm")} {Math.Abs(percentChange):F0}%",
            ruleId,
            priceMultiplier = request.PriceMultiplier,
            percentChange = $"{percentChange:+0.0;-0.0}%"
        });
    }

    // A2.2: Lấy tất cả pricing rules của 1 service
    [HttpGet("rules/{serviceId}")]
    [AllowAnonymous] // Cho phép xem rules công khai
    public async Task<IActionResult> GetPricingRules(int serviceId)
    {
        var rules = await _pricingService.GetPricingRulesAsync(serviceId);
        return Ok(rules);
    }

    // A2.3: Xóa pricing rule
    [HttpDelete("rule/{ruleId}")]
    public async Task<IActionResult> DeletePricingRule(int ruleId)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        
        var success = await _pricingService.DeletePricingRuleAsync(ruleId, userId);

        if (!success)
        {
            return BadRequest(new { message = "Không thể xóa rule. Kiểm tra lại rule ID hoặc quyền truy cập." });
        }

        return Ok(new { message = "Đã xóa pricing rule thành công" });
    }

    // A2.4: Tính giá cuối cùng cho 1 ngày cụ thể (utility endpoint)
    [HttpGet("calculate-price/{serviceId}")]
    [AllowAnonymous]
    public async Task<IActionResult> CalculatePrice(int serviceId, [FromQuery] DateTime date, [FromQuery] decimal basePrice)
    {
        var finalPrice = await _pricingService.CalculateFinalPriceAsync(serviceId, date, basePrice);
        
        return Ok(new 
        { 
            serviceId,
            date = date.Date,
            basePrice,
            finalPrice,
            priceIncrease = finalPrice - basePrice,
            percentChange = basePrice > 0 ? ((finalPrice - basePrice) / basePrice * 100) : 0
        });
    }
}
