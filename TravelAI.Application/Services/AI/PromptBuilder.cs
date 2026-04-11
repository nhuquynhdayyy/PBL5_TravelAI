using TravelAI.Domain.Entities;
namespace TravelAI.Application.Services.AI;

public class PromptBuilder {
    public string Build(UserPreference pref, Destination dest, List<TouristSpot> spots, int days) {
        
        var topSpots = spots.Take(10).ToList(); 

        var spotDetails = topSpots.Select(s => $"- {s.Name}: {s.Description}. (Giá tham khảo: {s.Services.FirstOrDefault()?.BasePrice ?? 50000} VND)").ToList();

        return $@"Bạn là chuyên gia du lịch. Hãy lập lịch trình {days} ngày tại {dest.Name}.
    Sở thích khách: {pref.TravelStyle}, Ngân sách: {pref.BudgetLevel}.
    DỮ LIỆU THẬT TRONG HỆ THỐNG (Bắt buộc dùng địa danh này):
    {string.Join("\n", spotDetails)}

    YÊU CẦU: 
    - Tính toán tổng chi phí (totalEstimatedCost) dựa trên giá tham khảo tôi đã cung cấp.
    - Trả về DUY NHẤT mã JSON. 
    - KHÔNG có phần giới thiệu, KHÔNG có dấu nháy Markdown ```json ở đầu và cuối. 
    - Phải bắt đầu bằng dấu {{ và kết thúc bằng dấu }}.
    - Cấu trúc JSON: 'days' là mảng, mỗi day có mảng 'activities' chứa các hoạt động theo thứ tự thời gian.
- KHÔNG chia activities thành morning/afternoon/evening. Hãy để chung vào một danh sách duy nhất per day.";
    }
}