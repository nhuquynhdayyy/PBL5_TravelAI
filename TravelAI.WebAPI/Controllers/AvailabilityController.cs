using Microsoft.AspNetCore.Mvc;
using TravelAI.Application.Interfaces;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AvailabilityController : ControllerBase
{
    private readonly IAvailabilityService _availabilityService;

    public AvailabilityController(IAvailabilityService availabilityService)
    {
        _availabilityService = availabilityService;
    }

    // 1. Khách xem lịch: GET /api/availability/1?start=2024-01-01&end=2024-01-31
    [HttpGet("{serviceId}")]
    public async Task<IActionResult> GetAvailability(int serviceId, [FromQuery] DateTime start, [FromQuery] DateTime end)
    {
        var result = await _availabilityService.GetAvailabilityAsync(serviceId, start, end);
        return Ok(result);
    }

    // 2. Check kho khi đặt: GET /api/availability/check/1?date=2024-01-10&qty=2
    [HttpGet("check/{serviceId}")]
    public async Task<IActionResult> CheckStock(int serviceId, [FromQuery] DateTime date, [FromQuery] int qty)
    {
        var canBook = await _availabilityService.CheckStockAsync(serviceId, date, qty);
        return Ok(new { canBook = canBook, message = canBook ? "Còn chỗ" : "Đã hết chỗ hoặc không đủ số lượng" });
    }

    // 3. Partner set hàng: POST /api/availability/set
    [HttpPost("set")]
    public async Task<IActionResult> SetAvailability([FromBody] SetAvailabilityRequest request)
    {
        var success = await _availabilityService.SetAvailabilityAsync(
            request.ServiceId, request.Date, request.Price, request.Stock);
            
        return success ? Ok(new { message = "Cập nhật thành công" }) : BadRequest("Lỗi khi cập nhật");
    }
}

// Class phụ trợ để nhận dữ liệu từ Body của POST request
public class SetAvailabilityRequest {
    public int ServiceId { get; set; }
    public DateTime Date { get; set; }
    public decimal Price { get; set; }
    public int Stock { get; set; }
}