using Microsoft.AspNetCore.Mvc;
using TravelAI.Application.DTOs.Chat;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> GetAIResponse([FromBody] ChatRequest request)
    {
        string msg = request.Message.ToLower();
        var response = new ChatResponse();

        if (msg.Contains("lịch trình") || msg.Contains("đi đâu")) {
            response.Text = "Đây là lịch trình Đà Nẵng 3 ngày tôi gợi ý cho bạn:";
            response.Type = "itinerary";
            response.Data = new { destination = "Đà Nẵng", days = 3 }; // Gắn link tới trang Timeline của bạn
        }
        else if (msg.Contains("khách sạn") || msg.Contains("hotel")) {
            response.Text = "Tôi tìm thấy một số khách sạn tốt tại Đà Nẵng:";
            response.Type = "hotel";
            response.Data = new[] {
                new { id = 1, name = "Mường Thanh Luxury", price = 1500000, img = "/uploads/h1.jpg" },
                new { id = 2, name = "InterContinental", price = 5000000, img = "/uploads/h2.jpg" }
            };
        }
        else if (msg.Contains("đặt") || msg.Contains("book")) {
            response.Text = "Vui lòng xác nhận thông tin đặt chỗ:";
            response.Type = "booking";
        }
        else {
            response.Text = "Chào bạn! Tôi là TravelAI. Bạn muốn lên lịch trình hay tìm khách sạn?";
        }

        return Ok(response);
    }
}