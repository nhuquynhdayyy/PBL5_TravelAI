using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelAI.Application.DTOs.AI;
using TravelAI.Application.Interfaces;
using TravelAI.Infrastructure.ExternalServices;
using TravelAI.Infrastructure.Persistence;
using TravelAI.Application.DTOs.Chat;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IItineraryService _itineraryService;
    private readonly GeminiService _aiService; // Hoặc GroqService

    public ChatController(ApplicationDbContext db, IItineraryService itineraryService, GeminiService aiService)
    {
        _db = db;
        _itineraryService = itineraryService;
        _aiService = aiService;
    }

    [HttpPost]
    public async Task<IActionResult> GetAIResponse([FromBody] ChatRequest request)
    {
        // 1. Nhờ AI phân tích xem User đang nhắc đến tỉnh nào
        string intentPrompt = $@"Phân tích tin nhắn này của người dùng: '{request.Message}'. 
        Hãy trả về duy nhất tên tỉnh thành Việt Nam xuất hiện trong câu (ví dụ: Hà Nội, Đà Nẵng). 
        Nếu không nhắc đến tỉnh nào, trả về 'none'.";
        
        string detectedDestName = await _aiService.CallApiAsync(intentPrompt);
        detectedDestName = detectedDestName.Trim().Replace(".", "");

        // 2. Tra cứu trong Database xem hệ thống có tỉnh đó không
        var destination = await _db.Destinations
            .FirstOrDefaultAsync(d => d.Name.Contains(detectedDestName));

        // 3. Nếu tìm thấy tỉnh và user muốn xem lịch trình
        if (destination != null && (request.Message.Contains("lịch trình") || request.Message.Contains("plan")))
        {
            // Tự động gọi Itinerary Service đã làm ở các buổi trước
            var userId = 1; // Giả định user ID 1, hoặc lấy từ Token
            var genReq = new GenerateItineraryRequest(destination.DestinationId, 3); // Mặc định 3 ngày
            var itinerary = await _itineraryService.GenerateAndLogItineraryAsync(userId, genReq);

            return Ok(new {
                text = $"Tôi đã lập xong lịch trình cho chuyến đi {destination.Name} của bạn!",
                type = "itinerary",
                data = itinerary
            });
        }

        // 4. Nếu không phải lịch trình, trả về phản hồi tự nhiên từ AI
        string generalResponse = await _aiService.CallApiAsync(request.Message);
        return Ok(new { text = generalResponse, type = "text" });
    }
}