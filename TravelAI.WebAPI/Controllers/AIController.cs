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
            string finalPrompt = builder.Build(pref, dest, spots, 3, DateTime.Today);

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
