using TravelAI.Domain.Entities;

namespace TravelAI.Application.Services.AI;

public class PromptBuilder 
{
    public string Build(UserPreference pref, Destination dest, List<TouristSpot> spots, int days) {
    
        // Kiểm tra nếu tỉnh này chưa có địa danh nào trong DB
        if (spots == null || spots.Count == 0) {
            return "THÔNG BÁO: Hiện tại hệ thống chưa cập nhật địa danh cho tỉnh này. Hãy trả về JSON thông báo lỗi format rỗng.";
        }

        var spotDetails = spots.Select(s => $"- {s.Name}: {s.Description}. (Giá: {s.Services.FirstOrDefault()?.BasePrice ?? 0} VND)").ToList();

        return $@"Bạn là chuyên gia du lịch. Hãy lập lịch trình {days} ngày tại {dest.Name}.
        
        ### QUY TẮC TỐI THƯỢNG:
        1. CHỈ ĐƯỢC PHÉP sử dụng địa danh có trong danh sách 'DỮ LIỆU HỆ THỐNG' dưới đây.
        2. TUYỆT ĐỐI KHÔNG sử dụng địa danh bên ngoài trí nhớ của bạn.
        3. Nếu danh sách địa danh cung cấp không đủ để lập lịch trình, hãy chỉ sử dụng những gì đang có.

        ### DỮ LIỆU HỆ THỐNG (BẮT BUỘC DÙNG):
        {string.Join("\n", spotDetails)}

        YÊU CẦU: Trả về JSON theo đúng cấu trúc.";
    }
}