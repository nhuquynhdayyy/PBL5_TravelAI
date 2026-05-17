using Microsoft.EntityFrameworkCore;
using TravelAI.Application.Interfaces;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.Infrastructure.Services;

/// <summary>
/// Analytics service cho AI suggestions.
/// Dữ liệu được query thẳng từ các cột DestinationName / EstimatedCost trên AISuggestionLog
/// thay vì load toàn bộ AiResponseJson về memory để parse.
/// Các log cũ (trước khi có 2 cột này) sẽ có giá trị null và được bỏ qua trong thống kê.
/// </summary>
public class AIAnalyticsService : IAIAnalyticsService
{
    private readonly ApplicationDbContext _db;

    public AIAnalyticsService(ApplicationDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Tỷ lệ chuyển đổi: tính theo số user duy nhất đã generate AI ít nhất 1 lần
    /// so với số user duy nhất đã lưu ít nhất 1 itinerary.
    /// Đây là funnel thực sự: user có dùng AI → user có lưu lịch trình.
    /// </summary>
    public async Task<UserFeedbackStatsDto> GetUserFeedbackStatsAsync()
    {
        var totalSuggestions = await _db.AISuggestionLogs.CountAsync();

        // Số user duy nhất đã từng generate AI
        var usersWhoGenerated = await _db.AISuggestionLogs
            .Select(log => log.UserId)
            .Distinct()
            .CountAsync();

        // Số user duy nhất đã từng lưu itinerary
        var usersWhoSaved = await _db.Itineraries
            .Select(i => i.UserId)
            .Distinct()
            .CountAsync();

        // Tỷ lệ chuyển đổi theo user: bao nhiêu % user đã generate thì có lưu lại
        var conversionRate = usersWhoGenerated == 0
            ? 0
            : Math.Min(100, usersWhoSaved * 100.0 / usersWhoGenerated);

        var savedItineraries = await _db.Itineraries.CountAsync();

        return new UserFeedbackStatsDto(
            totalSuggestions,
            savedItineraries,
            Math.Round(conversionRate, 2));
    }

    /// <summary>
    /// Điểm đến được AI gợi ý nhiều nhất — query thẳng cột DestinationName trên DB,
    /// không load AiResponseJson về memory.
    /// </summary>
    public async Task<List<PopularDestinationDto>> GetPopularDestinationsAsync()
    {
        return await _db.AISuggestionLogs
            .AsNoTracking()
            .Where(log => log.DestinationName != null && log.DestinationName != "")
            .GroupBy(log => log.DestinationName!)
            .Select(group => new PopularDestinationDto(group.Key, group.Count()))
            .OrderByDescending(item => item.SuggestedCount)
            .ThenBy(item => item.Destination)
            .ToListAsync();
    }

    /// <summary>
    /// Ngân sách trung bình AI gợi ý theo điểm đến — query thẳng cột EstimatedCost trên DB.
    /// Chỉ tính các log có EstimatedCost > 0 (log cũ không có giá trị này sẽ bị bỏ qua).
    /// </summary>
    public async Task<List<AverageBudgetDto>> GetAverageBudgetByDestinationAsync()
    {
        return await _db.AISuggestionLogs
            .AsNoTracking()
            .Where(log => log.DestinationName != null
                && log.DestinationName != ""
                && log.EstimatedCost != null
                && log.EstimatedCost > 0)
            .GroupBy(log => log.DestinationName!)
            .Select(group => new AverageBudgetDto(
                group.Key,
                Math.Round(group.Average(log => log.EstimatedCost!.Value), 0),
                group.Count()))
            .OrderByDescending(item => item.SampleCount)
            .ThenBy(item => item.Destination)
            .ToListAsync();
    }
}
