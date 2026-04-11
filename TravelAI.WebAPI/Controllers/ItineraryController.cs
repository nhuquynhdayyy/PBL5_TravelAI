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
}