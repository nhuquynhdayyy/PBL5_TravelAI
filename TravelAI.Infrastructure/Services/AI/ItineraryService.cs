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
    private readonly AIParserService _parser;

    public ItineraryService(ApplicationDbContext db, GeminiService gemini, AIParserService parser) 
    {
        _db = db; 
        _gemini = gemini; 
        _parser = parser;
    }

    public async Task<ItineraryResponseDto?> GenerateAndLogItineraryAsync(int userId, GenerateItineraryRequest request)
    {
        // 1. Lấy sở thích (nếu chưa có thì dùng mặc định)
        var pref = await _db.UserPreferences.FirstOrDefaultAsync(u => u.UserId == userId)
                ?? new UserPreference { 
                    TravelStyle = "Khám phá tổng hợp", 
                    BudgetLevel = Domain.Enums.BudgetLevel.Medium,
                    TravelPace = Domain.Enums.TravelPace.Balanced 
                };

        // 2. Lấy dữ liệu Điểm đến và các Địa danh liên quan
        var dest = await _db.Destinations.FindAsync(request.DestinationId);
        if (dest == null) return null;

        var spots = await _db.TouristSpots
            .Include(s => s.Services) 
            .Where(s => s.DestinationId == request.DestinationId)
            .ToListAsync();

        // 3. Xây dựng câu lệnh (Prompt) và gọi AI qua Groq/Gemini
        var prompt = new PromptBuilder().Build(pref, dest, spots, request.NumberOfDays);
        var rawAiResponse = await _gemini.CallApiAsync(prompt);

        // 4. Lưu Nhật ký (Log) vào Database
        _db.AISuggestionLogs.Add(new AISuggestionLog {
            UserId = userId, 
            UserPrompt = prompt, 
            AiResponseJson = rawAiResponse, 
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        // 5. Gửi chuỗi thô sang bộ Parser để làm sạch và bóc tách
        return _parser.ParseAndValidate(rawAiResponse);
    }
}