using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using TravelAI.Application.Interfaces;
using TravelAI.Application.DTOs; 

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] // Bắt buộc phải đăng nhập
public class PreferencesController : ControllerBase
{
    private readonly IPreferenceService _service;
    public PreferencesController(IPreferenceService service) => _service = service;

    [HttpGet] // URL: GET /api/preferences
    [Authorize]
    public async Task<IActionResult> GetMyPreferences()
    {
        // Lấy UserId từ Token JWT đã đăng nhập
        var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
        
        var result = await _service.GetByUserIdAsync(userId);
        
        // Nếu chưa có sở thích, trả về null hoặc object mặc định
        return Ok(new { success = true, data = result });
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] UserPreferenceDto dto)
    {
        // Lấy UserId từ Token
        var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);

        var success = await _service.UpsertPreferenceAsync(userId, dto);
        return Ok(new { success = true, message = "Sở thích đã được cập nhật!" });
    }
}