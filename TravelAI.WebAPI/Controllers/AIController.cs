using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TravelAI.Infrastructure.Persistence; // Chứa ApplicationDbContext
using TravelAI.Domain.Entities;          // Chứa UserPreference
using TravelAI.Domain.Enums;             // Chứa BudgetLevel
using TravelAI.Application.Services.AI;  // Chứa PromptBuilder

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AIController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    // Hàm khởi tạo để hệ thống "bơm" Database vào đây
    public AIController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("preview-prompt")]
    public async Task<IActionResult> PreviewPrompt(int destId)
    {
        try
        {
            // 1. Lấy UserId từ Token (Bắt buộc phải Authorize hoặc Login trước đó)
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized("Vui lòng đăng nhập");
            int userId = int.Parse(userIdClaim.Value);
            // int userId = 4; // Tạm thời hardcode để test, sau này sẽ dùng token thực tế

            // 2. Lấy dữ liệu từ DB để chuẩn bị làm Input cho AI
            var pref = await _context.UserPreferences
                .FirstOrDefaultAsync(u => u.UserId == userId)
                ?? new UserPreference { TravelStyle = "Khám phá", BudgetLevel = BudgetLevel.Medium };

            var dest = await _context.Destinations.FindAsync(destId);
            if (dest == null) return NotFound("Không tìm thấy điểm đến");

            var spots = await _context.TouristSpots
                .Where(s => s.DestinationId == destId)
                .ToListAsync();

            // 3. Gọi PromptBuilder để tạo câu lệnh
            var builder = new PromptBuilder();
            // Giả sử lịch trình mặc định là 3 ngày
            string finalPrompt = BuildItineraryPrompt(builder, pref, dest, spots, 3);

            // Local helper to build a fallback prompt so we don't depend on a missing API on PromptBuilder.
            // This can be replaced later with the real PromptBuilder method when available.
            string BuildItineraryPrompt(PromptBuilder b, UserPreference p, Destination d, List<TouristSpot> s, int days)
            {
                var sb = new System.Text.StringBuilder();
                sb.AppendLine($"Itinerary for {(d?.Name ?? "Unknown destination")} - {days} day(s)");
                if (p != null)
                {
                    sb.AppendLine($"Travel style: {p.TravelStyle}");
                    sb.AppendLine($"Budget level: {p.BudgetLevel}");
                }

                if (s != null && s.Count > 0)
                {
                    sb.AppendLine("Suggested spots:");
                    foreach (var spot in s)
                    {
                        var spotName = string.IsNullOrWhiteSpace(spot.Name) ? "Unnamed spot" : spot.Name;
                        var spotDesc = string.IsNullOrWhiteSpace(spot.Description) ? "" : $" - {spot.Description}";
                        sb.AppendLine($"- {spotName}{spotDesc}");
                    }
                }
                else
                {
                    sb.AppendLine("No spots found for this destination.");
                }

                // Optionally include a simple summary from the PromptBuilder instance if needed,
                // for now we don't rely on any missing members.
                return sb.ToString();
            }

            // 4. Trả về kết quả để đọc trên Swagger
            return Ok(new
            {
                description = "Đây là nội dung sẽ gửi cho Gemini",
                prompt = finalPrompt
            });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }
}