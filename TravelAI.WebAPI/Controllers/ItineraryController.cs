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
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var result = await _service.GenerateAndLogItineraryAsync(userId, req);
        return result != null ? Ok(result) : BadRequest("AI Error");
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
}
