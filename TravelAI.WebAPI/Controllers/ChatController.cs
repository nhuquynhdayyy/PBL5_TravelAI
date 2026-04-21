using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelAI.Application.DTOs.AI;
using TravelAI.Application.DTOs.Chat;
using TravelAI.Application.Interfaces;
using TravelAI.Infrastructure.ExternalServices;
using TravelAI.Infrastructure.Persistence;
using System.Security.Claims;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IItineraryService _itineraryService;
    private readonly GeminiService _aiService;

    public ChatController(ApplicationDbContext db, IItineraryService itineraryService, GeminiService aiService)
    {
        _db = db;
        _itineraryService = itineraryService;
        _aiService = aiService;
    }

    [HttpPost]
    public async Task<IActionResult> GetAIResponse([FromBody] ChatRequest request)
    {
        string intentPrompt = $@"Phan tich tin nhan nay cua nguoi dung: '{request.Message}'.
Hay tra ve duy nhat ten tinh thanh Viet Nam xuat hien trong cau (vi du: Ha Noi, Da Nang).
Neu khong nhac den tinh nao, tra ve 'none'.";

        string detectedDestName = await _aiService.CallApiAsync(intentPrompt);
        detectedDestName = detectedDestName.Trim().Replace(".", "");

        var destination = await _db.Destinations
            .FirstOrDefaultAsync(d => d.Name.Contains(detectedDestName));

        if (destination != null && (request.Message.Contains("lịch trình") || request.Message.Contains("plan")))
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            var userId = userIdClaim != null ? int.Parse(userIdClaim.Value) : 0;
            var genReq = new GenerateItineraryRequest(destination.DestinationId, 3, DateTime.Today);
            var itinerary = await _itineraryService.GenerateAndLogItineraryAsync(userId, genReq);

            return Ok(new
            {
                text = $"Toi da lap xong lich trinh cho chuyen di {destination.Name} cua ban!",
                type = "itinerary",
                data = itinerary
            });
        }

        string generalResponse = await _aiService.CallApiAsync(request.Message);
        return Ok(new { text = generalResponse, type = "text" });
    }
}
