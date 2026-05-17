using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TravelAI.Application.Interfaces;
using TravelAI.Application.DTOs.Availability;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AvailabilityController : ControllerBase
{
    private readonly IAvailabilityService _availabilityService;
    private readonly ApplicationDbContext _context;
    private readonly IPricingService _pricingService;

    public AvailabilityController(IAvailabilityService availabilityService, ApplicationDbContext context, IPricingService pricingService)
    {
        _availabilityService = availabilityService;
        _context = context;
        _pricingService = pricingService;
    }

    [HttpGet("{serviceId}")]
    public async Task<IActionResult> GetAvailability(int serviceId, [FromQuery] DateTime start, [FromQuery] DateTime end)
    {
        var result = await _availabilityService.GetAvailabilityAsync(serviceId, start, end);
        return Ok(result);
    }

    [HttpGet("check/{serviceId}")]
    public async Task<IActionResult> CheckStock(int serviceId, [FromQuery] DateTime date, [FromQuery] int qty)
    {
        var canBook = await _availabilityService.CheckStockAsync(serviceId, date, qty);
        var avail = await _context.ServiceAvailabilities
            .FirstOrDefaultAsync(a => a.ServiceId == serviceId && a.Date == date.Date);

        var basePrice = avail?.Price ?? 0;
        
        // Áp dụng pricing rules để tính giá cuối cùng
        var finalPrice = basePrice > 0 
            ? await _pricingService.CalculateFinalPriceAsync(serviceId, date, basePrice)
            : basePrice;

        return Ok(new
        {
            canBook,
            price = finalPrice,
            basePrice = basePrice,
            message = canBook ? "Còn chỗ" : "Đã hết chỗ"
        });
    }

    [HttpPost("set")]
    [Authorize(Roles = "Partner,Admin")]
    public async Task<IActionResult> SetAvailability([FromBody] SetAvailabilityRequest request)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var service = await _context.Services.FindAsync(request.ServiceId);

        if (service == null)
        {
            return NotFound();
        }

        var isAdmin = User.IsInRole("Admin");
        if (!isAdmin && service.PartnerId != userId)
        {
            return Forbid();
        }

        var success = await _availabilityService.SetAvailabilityAsync(
            request.ServiceId, request.Date, request.Price, request.Stock);

        return success ? Ok(new { message = "Cap nhat thanh cong" }) : BadRequest("Loi khi cap nhat");
    }

    // A1.1: Bulk set availability cho nhiều ngày
    [HttpPost("bulk-set")]
    [Authorize(Roles = "Partner,Admin")]
    public async Task<IActionResult> BulkSetAvailability([FromBody] BulkSetAvailabilityRequest request)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        
        var success = await _availabilityService.BulkSetAvailabilityAsync(
            request.ServiceId, 
            userId, 
            request.StartDate, 
            request.EndDate, 
            request.Price, 
            request.Stock);

        if (!success)
        {
            return BadRequest(new { message = "Không thể cập nhật. Kiểm tra lại service ID hoặc quyền truy cập." });
        }

        var totalDays = (request.EndDate.Date - request.StartDate.Date).Days + 1;
        return Ok(new 
        { 
            message = $"Đã cập nhật thành công {totalDays} ngày. Giá cuối tuần tự động tăng 20%.",
            totalDays,
            startDate = request.StartDate.Date,
            endDate = request.EndDate.Date
        });
    }

    // A1.2: Cập nhật availability cho 1 ngày cụ thể
    [HttpPut("{availId}")]
    [Authorize(Roles = "Partner,Admin")]
    public async Task<IActionResult> UpdateAvailability(int availId, [FromBody] UpdateAvailabilityRequest request)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        
        var success = await _availabilityService.UpdateAvailabilityAsync(
            availId, 
            userId, 
            request.Price, 
            request.Stock);

        if (!success)
        {
            return BadRequest(new { message = "Không thể cập nhật. Kiểm tra lại availability ID hoặc quyền truy cập." });
        }

        return Ok(new { message = "Cập nhật thành công" });
    }

    // A1.3: Lấy tất cả availability của services thuộc partner
    [HttpGet("my-services")]
    [Authorize(Roles = "Partner")]
    public async Task<IActionResult> GetMyServicesAvailability([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        
        var result = await _availabilityService.GetMyServicesAvailabilityAsync(userId, startDate, endDate);
        
        return Ok(result);
    }

    // A1.4: Áp dụng giá cuối tuần tự động
    [HttpPost("apply-weekend-pricing")]
    [Authorize(Roles = "Partner,Admin")]
    public async Task<IActionResult> ApplyWeekendPricing([FromBody] ApplyWeekendPricingRequest request)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        
        var success = await _availabilityService.ApplyWeekendPricingAsync(
            request.ServiceId, 
            userId, 
            request.StartDate, 
            request.EndDate, 
            request.WeekendMultiplier);

        if (!success)
        {
            return BadRequest(new { message = "Không thể áp dụng. Kiểm tra lại service ID hoặc quyền truy cập." });
        }

        return Ok(new 
        { 
            message = $"Đã áp dụng giá cuối tuần (x{request.WeekendMultiplier}) thành công",
            multiplier = request.WeekendMultiplier
        });
    }
}

public class SetAvailabilityRequest
{
    public int ServiceId { get; set; }
    public DateTime Date { get; set; }
    public decimal Price { get; set; }
    public int Stock { get; set; }
}

public class ApplyWeekendPricingRequest
{
    public int ServiceId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal WeekendMultiplier { get; set; } = 1.2m; // Mặc định tăng 20%
}
