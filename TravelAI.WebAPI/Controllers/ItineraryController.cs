using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using TravelAI.Application.Interfaces;
using TravelAI.Application.DTOs.AI;

[ApiController] [Route("api/[controller]")] [Authorize]
public class ItineraryController : ControllerBase {
    private readonly IItineraryService _service;
    public ItineraryController(IItineraryService service) => _service = service;

    [HttpPost("generate")]
    public async Task<IActionResult> Generate([FromBody] GenerateItineraryRequest req) {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap de tao lich trinh." });
        }

        try
        {
            var userId = int.Parse(userIdClaim.Value);
            var result = await _service.GenerateAndLogItineraryAsync(userId, req);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("save")]
    public async Task<IActionResult> SaveItinerary([FromBody] ItineraryResponseDto dto)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        
        var itineraryId = await _service.SaveItineraryAsync(userId, dto);
        
        return Ok(new { 
            success = true, 
            itineraryId = itineraryId, 
            message = "Lịch trình đã được lưu vào tài khoản của bạn!" 
        });
    }

    [HttpGet("my-trips")]
    public async Task<IActionResult> GetMyTrips()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var result = await _service.GetMyTripsAsync(userId);
        return Ok(new { success = true, data = result });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var result = await _service.GetByIdAsync(id, userId);
        return result != null
            ? Ok(new { success = true, data = result })
            : NotFound();
    }

    [HttpPost("{id:int}/optimize")]
    public async Task<IActionResult> Optimize(int id)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        try
        {
            var result = await _service.OptimizeItineraryAsync(id, userId);
            return result != null
                ? Ok(new { success = true, data = result })
                : NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
