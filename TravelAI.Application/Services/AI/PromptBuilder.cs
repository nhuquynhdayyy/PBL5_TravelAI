using System.Text;
using TravelAI.Domain.Entities;
using TravelAI.Domain.Enums;

namespace TravelAI.Application.Services.AI;

public class PromptBuilder
{
    public string BuildItineraryPrompt(
        UserPreference pref, 
        Destination destination, 
        List<TouristSpot> availableSpots, 
        int days)
    {
        var sb = new StringBuilder();

        // 1. Thông tin cơ bản
        sb.AppendLine($"Hãy lập lịch trình du lịch cho tôi tại {destination.Name} trong vòng {days} ngày.");

        // 2. Mapping Sở thích người dùng (Cá nhân hóa)
        sb.AppendLine("### THÔNG TIN KHÁCH HÀNG:");
        sb.AppendLine($"- Phong cách du lịch: {pref.TravelStyle}");
        sb.AppendLine($"- Ngân sách: {MapBudget(pref.BudgetLevel)}");
        sb.AppendLine($"- Nhịp độ chuyến đi: {MapPace(pref.TravelPace)}");
        if (!string.IsNullOrEmpty(pref.CuisinePref))
            sb.AppendLine($"- Sở thích ẩm thực: {pref.CuisinePref}");

        // 3. Cung cấp dữ liệu thực tế từ Database (Quan trọng nhất)
        // Việc này giúp AI không bị "bịa" ra địa điểm không có trong hệ thống của bạn
        sb.AppendLine("\n### CÁC ĐỊA DANH CÓ SẴN TRONG HỆ THỐNG (Hãy ưu tiên sử dụng):");
        foreach (var spot in availableSpots)
        {
            sb.AppendLine($"- {spot.Name}: {spot.Description} (Thời gian tham quan dự kiến: {spot.AvgTimeSpent} phút)");
        }

        // 4. Lời nhắc cuối cùng để chốt format
        sb.AppendLine("\nLưu ý: Hãy sắp xếp lịch trình sao cho logic về mặt địa lý và trả về đúng định dạng JSON đã thỏa thuận.");

        return sb.ToString();
    }

    private string MapBudget(BudgetLevel level) => level switch
    {
        BudgetLevel.Low => "Tiết kiệm, ưu tiên các hoạt động miễn phí hoặc giá rẻ.",
        BudgetLevel.Medium => "Trung bình, cân đối giữa chi phí và trải nghiệm.",
        BudgetLevel.High => "Cao cấp, ưu tiên dịch vụ sang trọng và chất lượng tốt nhất.",
        _ => "Trung bình"
    };

    private string MapPace(TravelPace pace) => pace switch
    {
        TravelPace.Relaxed => "Thong thả, mỗi buổi chỉ nên có 1 địa điểm để nghỉ ngơi.",
        TravelPace.Balanced => "Vừa phải, khoảng 2 địa điểm mỗi buổi.",
        TravelPace.FastPaced => "Dày đặc, tận dụng tối đa thời gian để đi được nhiều nơi nhất.",
        _ => "Vừa phải"
    };
}