using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using TravelAI.Application.DTOs.Spot;
using TravelAI.Application.Interfaces;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SpotsController : ControllerBase
{
    private readonly ISpotService _spotService;
    private readonly IWebHostEnvironment _env;

    public SpotsController(ISpotService spotService, IWebHostEnvironment env)
    {
        _spotService = spotService;
        _env = env;
    }
    
    [HttpGet("by-destination/{destinationId}")]
    public async Task<IActionResult> GetByDestination(int destinationId)
    {
        var result = await _spotService.GetSpotsByDestinationAsync(destinationId);
        
        return Ok(new { 
            success = true, 
            data = result,
            message = result.Any() ? "Lấy danh sách địa danh thành công" : "Không tìm thấy địa danh nào cho tỉnh này"
        });
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _spotService.GetByIdAsync(id);

        if (result == null)
            return NotFound(new { message = "Spot not found" });

        return Ok(new { success = true, data = result });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromForm] CreateSpotRequest request)
    {
        // Lấy đường dẫn, nếu null thì trỏ về thư mục hiện tại/wwwroot
        string webRootPath = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");

        // Đảm bảo thư mục wwwroot tồn tại vật lý
        if (!Directory.Exists(webRootPath)) 
        {
            Directory.CreateDirectory(webRootPath);
        }

        var result = await _spotService.CreateSpotAsync(request, webRootPath);
        return Ok(result);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromForm] UpdateSpotRequest request)
    {
        var result = await _spotService.UpdateSpotAsync(id, request, _env.WebRootPath);

        if (!result)
            return NotFound(new { message = "Spot not found" });

        return Ok(new { message = "Updated successfully" });
    }
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _spotService.DeleteSpotAsync(id, _env.WebRootPath);

        if (!result)
            return NotFound(new { message = "Spot not found" });

        return Ok(new { message = "Deleted successfully" });
    }
}