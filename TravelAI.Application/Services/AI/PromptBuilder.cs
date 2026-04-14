using TravelAI.Domain.Entities;

namespace TravelAI.Application.Services.AI;

public class PromptBuilder 
{
    public string Build(UserPreference pref, Destination dest, List<TouristSpot> spots, int days) {
    
        // Chuyển danh sách DB thành chuỗi, nhấn mạnh đây là dịch vụ chính thức
        var officialServices = spots.Select(s => 
            $"- {s.Name} (Địa danh này có dịch vụ đặt vé/tour: {s.Services.FirstOrDefault()?.BasePrice ?? 0} VND). Mô tả: {s.Description}").ToList();

        return $@"Bạn là chuyên gia lập kế hoạch du lịch. Hãy lập lịch trình {days} ngày tại {dest.Name}.
        
        ### YÊU CẦU ƯU TIÊN:
        1. Nếu danh sách 'DỊCH VỤ HỆ THỐNG' dưới đây có dữ liệu, bạn BẮT BUỘC phải đưa chúng vào lịch trình một cách hợp lý.
        2. Với các khoảng thời gian trống còn lại trong ngày, hãy sử dụng kiến thức của bạn để gợi ý thêm các địa điểm tham quan TỰ DO, MIỄN PHÍ hoặc các quán ăn nổi tiếng địa phương để lịch trình hoàn hảo hơn.
        3. Đảm bảo lịch trình cân bằng giữa các điểm có phí (trong hệ thống) và các điểm trải nghiệm tự do.

        ### DỊCH VỤ HỆ THỐNG (ƯU TIÊN SỬ DỤNG):
        {(officialServices.Any() ? string.Join("\n", officialServices) : "Hiện tại tỉnh này chưa có dịch vụ trả phí, hãy gợi ý hoàn toàn bằng địa điểm tự do.")}

        ### THÔNG TIN KHÁCH HÀNG:
        - Phong cách: {pref.TravelStyle}
        - Ngân sách: {pref.BudgetLevel}
        - Nhịp độ: {pref.TravelPace}

        YÊU CẦU ĐẦU RA: Trả về JSON theo đúng Schema, tính toán 'estimatedCost' là 0 cho các điểm tự do và đúng giá hệ thống cho các điểm chính thức.";
    }
}