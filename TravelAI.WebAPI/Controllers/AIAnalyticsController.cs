using Microsoft.AspNetCore.Mvc;
using TravelAI.Application.Interfaces;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/ai-analytics")]
public class AIAnalyticsController : ControllerBase
{
    private readonly IAIAnalyticsService _analyticsService;

    public AIAnalyticsController(IAIAnalyticsService analyticsService)
    {
        _analyticsService = analyticsService;
    }

    [HttpGet("user-feedback-stats")]
    public async Task<IActionResult> GetUserFeedbackStats()
    {
        var data = await _analyticsService.GetUserFeedbackStatsAsync();
        return Ok(new { success = true, data });
    }

    [HttpGet("popular-destinations")]
    public async Task<IActionResult> GetPopularDestinations()
    {
        var data = await _analyticsService.GetPopularDestinationsAsync();
        return Ok(new { success = true, data });
    }

    [HttpGet("average-budget")]
    public async Task<IActionResult> GetAverageBudget()
    {
        var data = await _analyticsService.GetAverageBudgetByDestinationAsync();
        return Ok(new { success = true, data });
    }
}
