using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TravelAI.Application.DTOs.AI;
using TravelAI.Application.Services.AI;
using TravelAI.Application.Interfaces;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ItineraryController : ControllerBase
{
    private readonly IItineraryService _itineraryService;

    public ItineraryController(IItineraryService itineraryService)
    {
        _itineraryService = itineraryService;
    }

    [HttpPost("generate")]
    public async Task<IActionResult> Generate([FromBody] GenerateItineraryRequest request)
    {
        // 1. Lấy UserId từ Token
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();
        int userId = int.Parse(userIdClaim.Value);

        // 2. Gọi Service xử lý
        var result = await _itineraryService.GenerateAndLogItineraryAsync(userId, request);

        if (result == null)
            return BadRequest(new { message = "Không thể tạo lịch trình. Vui lòng thử lại sau." });

        // 3. Trả về JSON lịch trình hoàn chỉnh cho FE vẽ UI
        return Ok(new { 
            success = true, 
            data = result, 
            message = "Lịch trình đã được tạo bởi AI thành công!" 
        });
    }
}