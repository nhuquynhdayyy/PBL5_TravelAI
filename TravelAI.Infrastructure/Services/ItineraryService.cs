// using Microsoft.EntityFrameworkCore;
// using TravelAI.Application.DTOs.AI;
// using TravelAI.Application.Interfaces; // Quan trọng
// using TravelAI.Application.Services.AI; // Để thấy AIParserService và PromptBuilder
// using TravelAI.Domain.Entities;
// using TravelAI.Infrastructure.Persistence;
// using TravelAI.Infrastructure.ExternalServices;

// namespace TravelAI.Infrastructure.Services.AI;

// // BẮT BUỘC phải kế thừa IItineraryService
// public class ItineraryService : IItineraryService 
// {
//     private readonly ApplicationDbContext _context;
//     private readonly GeminiService _geminiService;
//     private readonly AIParserService _parserService;
//     private readonly PromptBuilder _promptBuilder;

//     public ItineraryService(
//         ApplicationDbContext context, 
//         GeminiService geminiService,
//         AIParserService parserService,
//         PromptBuilder promptBuilder) // Inject luôn PromptBuilder cho chuyên nghiệp
//     {
//         _context = context;
//         _geminiService = geminiService;
//         _parserService = parserService;
//         _promptBuilder = promptBuilder;
//     }

//     public async Task<ItineraryResponseDto?> GenerateAndLogItineraryAsync(int userId, GenerateItineraryRequest request)
//     {
//         // 1. Lấy dữ liệu thực tế từ Database
//         var pref = await _context.UserPreferences.FirstOrDefaultAsync(u => u.UserId == userId);
//         var dest = await _context.Destinations.FindAsync(request.DestinationId);
//         var spots = await _context.TouristSpots
//             .Where(s => s.DestinationId == request.DestinationId)
//             .ToListAsync();

//         if (dest == null) return null;

//         // 2. Xây dựng Prompt "xịn"
//         string finalPrompt = _promptBuilder.BuildItineraryPrompt(pref!, dest, spots, request.NumberOfDays);

//         // 3. Gọi Gemini API (Sử dụng DevMode nếu em chưa fix được lỗi Quota)
//         string rawJson = await _geminiService.GenerateItineraryRawAsync(finalPrompt);

//         // 4. Lưu Log vào Database (Lưu vết để debug và tiết kiệm tiền)
//         var log = new AISuggestionLog
//         {
//             UserId = userId,
//             UserPrompt = finalPrompt,
//             AiResponseJson = rawJson,
//             CreatedAt = DateTime.UtcNow
//         };
//         _context.AISuggestionLogs.Add(log);
//         await _context.SaveChangesAsync();

//         // 5. Bóc tách chuỗi String từ AI thành Object C# (ItineraryResponseDto)
//         // Lưu ý: Gemini thường trả về có bọc ký hiệu ```json ... ```, cần xử lý chuỗi này
//         string cleanedJson = CleanAiResponse(rawJson);
//         return _parserService.ParseAndValidateItinerary(cleanedJson);
//     }

//     // Hàm phụ để lọc bỏ các ký tự thừa của Markdown nếu AI trả về
//     private string CleanAiResponse(string raw)
//     {
//         if (raw.Contains("```json"))
//         {
//             return raw.Split("```json")[1].Split("```")[0].Trim();
//         }
//         return raw.Trim();
//     }
// }