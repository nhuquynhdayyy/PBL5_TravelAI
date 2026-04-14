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

    public async Task<int> SaveItineraryAsync(int userId, ItineraryResponseDto dto)
    {
        // 1. Khởi tạo Transaction để đảm bảo an toàn dữ liệu
        using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            // 2. Tạo đối tượng Itinerary (Bảng Cha)
            var itinerary = new Itinerary
            {
                UserId = userId,
                Title = dto.TripTitle,
                StartDate = DateTime.Now, // Có thể mở rộng để User chọn ngày sau
                EndDate = DateTime.Now.AddDays(dto.Days.Count),
                EstimatedCost = dto.TotalEstimatedCost,
                Status = Domain.Enums.ItineraryStatus.Confirmed
            };

            _db.Itineraries.Add(itinerary);
            await _db.SaveChangesAsync(); // Lưu để lấy ItineraryId

            // 3. Duyệt qua từng ngày và từng hoạt động để lưu ItineraryItems (Bảng Con)
            int order = 1;
            foreach (var day in dto.Days)
            {
                foreach (var act in day.Activities)
                {
                    // --- SMART MATCHING LOGIC ---
                    // Tìm SpotId dựa trên tên địa danh AI trả về
                    var spot = await _db.TouristSpots
                        .FirstOrDefaultAsync(s => s.Name.Contains(act.Location) || act.Title.Contains(s.Name));

                    // Tìm ServiceId (Khách sạn/Tour) nếu có
                    var service = await _db.Services
                        .FirstOrDefaultAsync(s => s.Name.Contains(act.Title));

                    var item = new ItineraryItem
                    {
                        ItineraryId = itinerary.ItineraryId,
                        SpotId = spot?.SpotId, // Nếu không tìm thấy thì để null (địa điểm tự do)
                        ServiceId = service?.ServiceId,
                        StartTime = DateTime.Now, // AI có thể trả về giờ cụ thể, tạm thời để mặc định
                        EndTime = DateTime.Now,
                        ActivityOrder = order++
                    };
                    _db.ItineraryItems.Add(item);
                }
            }

            await _db.SaveChangesAsync();
            await transaction.CommitAsync(); // Xác nhận lưu thành công toàn bộ

            return itinerary.ItineraryId;
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(); // Nếu lỗi thì hủy bỏ toàn bộ thao tác trên
            throw new Exception("Lỗi khi lưu lịch trình: " + ex.Message);
        }
    }
}