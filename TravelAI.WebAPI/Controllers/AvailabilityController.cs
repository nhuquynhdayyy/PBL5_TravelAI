using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelAI.Application.Interfaces;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AvailabilityController : ControllerBase
{
    private readonly IAvailabilityService _availabilityService;
    private readonly ApplicationDbContext _context;

    public AvailabilityController(IAvailabilityService availabilityService, ApplicationDbContext context)
    {
        _availabilityService = availabilityService;
        _context = context;
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

        return Ok(new
        {
            canBook,
            price = avail?.Price ?? 0,
            message = canBook ? "Còn chỗ" : "Đã hết chỗ"
        });
    }

    [HttpPost("set")]
    public async Task<IActionResult> SetAvailability([FromBody] SetAvailabilityRequest request)
    {
        var success = await _availabilityService.SetAvailabilityAsync(
            request.ServiceId, request.Date, request.Price, request.Stock);

        return success ? Ok(new { message = "Cap nhat thanh cong" }) : BadRequest("Loi khi cap nhat");
    }
}

public class SetAvailabilityRequest
{
    public int ServiceId { get; set; }
    public DateTime Date { get; set; }
    public decimal Price { get; set; }
    public int Stock { get; set; }
}
