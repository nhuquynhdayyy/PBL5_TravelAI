using Microsoft.AspNetCore.Mvc;
using TravelAI.Application.Interfaces;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SpotsController : ControllerBase
{
    private readonly ISpotService _spotService;
    public SpotsController(ISpotService spotService) => _spotService = spotService;

    // [HttpGet("by-destination/{destinationId}")]
    // public async Task<IActionResult> GetByDestination(int destinationId)
    // {
    //     var spots = await _spotService.GetByDestinationIdAsync(destinationId);
        
    //     if (!spots.Any())
    //         return Ok(new { success = true, data = spots, message = "Chưa có địa điểm tham quan nào cho tỉnh này." });

    //     return Ok(new { success = true, data = spots });
    // }
    
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
}