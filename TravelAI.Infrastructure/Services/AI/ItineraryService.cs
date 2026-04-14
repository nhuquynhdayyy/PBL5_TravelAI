using Microsoft.EntityFrameworkCore;
using TravelAI.Application.DTOs.AI;
using TravelAI.Application.Interfaces;
using TravelAI.Application.Services.AI;
using TravelAI.Infrastructure.Persistence;
using TravelAI.Infrastructure.ExternalServices;
using TravelAI.Domain.Entities;

namespace TravelAI.Infrastructure.Services.AI;

public class ItineraryService : IItineraryService 
{
    private readonly ApplicationDbContext _db;
    private readonly GeminiService _gemini;
    private readonly AIParserService _parserService;
    private readonly PromptBuilder _promptBuilder; // ✅ THÊM DÒNG NÀY

    public ItineraryService(ApplicationDbContext db, GeminiService gemini, AIParserService parserService) 
    {
        _db = db; 
        _gemini = gemini; 
        _parserService = parserService;
        _promptBuilder = new PromptBuilder(); // ✅ KHỞI TẠO TẠI ĐÂY
    }

    public async Task<ItineraryResponseDto?> GenerateAndLogItineraryAsync(int userId, GenerateItineraryRequest request)
    {
        // 1. Lấy tỉnh thành
        var dest = await _db.Destinations.FindAsync(request.DestinationId);
        if (dest == null) return null;

        // 2. Lấy sở thích người dùng (✅ SỬA: Lấy từ DB thay vì dùng biến chưa định nghĩa)
        var pref = await _db.UserPreferences.FirstOrDefaultAsync(u => u.UserId == userId)
                   ?? new UserPreference { TravelStyle = "Khám phá tổng hợp", BudgetLevel = TravelAI.Domain.Enums.BudgetLevel.Medium };
        
        // 3. Lấy địa danh và giá tiền
        var spots = await _db.TouristSpots
            .Include(s => s.Services) 
            .Where(s => s.DestinationId == request.DestinationId)
            .ToListAsync();

        if (spots.Count == 0) {
            return new ItineraryResponseDto { 
                TripTitle = "Dữ liệu đang cập nhật", 
                Destination = dest.Name,
                Days = new List<DayPlanDto>() // Trả về mảng rỗng để FE biết đường hiện thông báo
            };
        }

        // 4. Xây dựng câu lệnh gửi AI
        var prompt = _promptBuilder.Build(pref, dest, spots, request.NumberOfDays);
        
        // 5. Gọi AI
        var rawAiResponse = await _gemini.CallApiAsync(prompt);

        // 6. Lưu Nhật ký (Log)
        _db.AISuggestionLogs.Add(new AISuggestionLog {
            UserId = userId, 
            UserPrompt = prompt, 
            AiResponseJson = rawAiResponse, 
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        // 7. Bóc tách và trả kết quả
        return _parserService.ParseAndValidate(rawAiResponse);
    }
}