using System.Globalization;
using TravelAI.Application.DTOs.AI;
using TravelAI.Application.Interfaces;
using TravelAI.Domain.Entities;
using TravelAI.Domain.Enums;

namespace TravelAI.Application.Services.AI;

public class PromptBuilder
{
    private readonly ISpotScoringService? _spotScoringService;

    public PromptBuilder()
    {
    }

    public PromptBuilder(ISpotScoringService spotScoringService)
    {
        _spotScoringService = spotScoringService;
    }

    public string Build(
        UserPreference pref,
        Destination dest,
        List<TouristSpot> spots,
        int days,
        DateTime startDate,
        IEnumerable<PromptServiceOption>? availableServices = null,
        List<SpotScoreDto>? rankedSpots = null,
        List<Review>? reviews = null)
    {
        // Nếu có ranked spots, sắp xếp lại danh sách spots theo điểm số
        var orderedSpots = spots;
        if (rankedSpots != null && rankedSpots.Count > 0)
        {
            var spotScoreMap = rankedSpots.ToDictionary(s => s.SpotId, s => s.TotalScore);
            orderedSpots = spots
                .OrderByDescending(spot => spotScoreMap.GetValueOrDefault(spot.SpotId, 0))
                .ToList();
        }
        else if (_spotScoringService != null && spots.Count > 0)
        {
            orderedSpots = spots
                .Select(spot => new
                {
                    Spot = spot,
                    Score = _spotScoringService.CalculateScore(spot, pref, ResolveSpotReviews(spot, reviews))
                })
                .OrderByDescending(item => item.Score)
                .Select(item => item.Spot)
                .ToList();
        }

        var destinationSpots = orderedSpots
            .Select(spot => $"- {spot.Name}. Mo ta: {spot.Description}")
            .ToList();

        var serviceOptions = availableServices?.ToList() ?? new List<PromptServiceOption>();
        var hotelLines = BuildServiceLines(serviceOptions.Where(service => service.ServiceType == ServiceType.Hotel));
        var tourLines = BuildServiceLines(serviceOptions.Where(service => service.ServiceType == ServiceType.Tour));
        var travelStyle = FormatTravelStyle(pref.TravelStyle);
        var budgetLevel = FormatBudgetLevel(pref.BudgetLevel);
        var travelPace = FormatTravelPace(pref.TravelPace);
        var cuisinePreference = FormatCuisinePreference(pref.CuisinePref);

        return $@"Ban la chuyen gia lap ke hoach du lich. Hay lap lich trinh {days} ngay tai {dest.Name}.
Chuyen di bat dau tu ngay {startDate:dd/MM/yyyy}. Day la moc ngay bat dau co dinh cho ca hanh trinh.
Hay sap xep tung ngay trong lich trinh gan voi cac ngay cu the dua tren moc thoi gian nay, trong do ngay 1 ung voi {startDate:dd/MM/yyyy} va moi ngay sau la ngay lien ke.

### YEU CAU UU TIEN:
1. Neu danh sach 'DICH VU HE THONG' duoi day co du lieu, ban BAT BUOC phai uu tien dua chung vao lich trinh mot cach hop ly.
2. Voi cac khoang thoi gian trong con lai trong ngay, hay su dung kien thuc cua ban de goi y them cac dia diem tham quan tu do, mien phi hoac cac quan an noi tieng dia phuong de lich trinh hoan hao hon.
3. Dam bao lich trinh can bang giua cac diem co phi (trong he thong) va cac diem trai nghiem tu do.
4. Neu su dung dich vu co trong danh sach he thong, ban BAT BUOC ghi dung service_id vao field service_id cua activity do.
5. Tuyet doi khong tu suy doan service_id. Neu activity khong phai mot dich vu co trong danh sach he thong, service_id phai la null.
6. Chi duoc gan service_id cho mot activity vao dung ngay co availability duoc liet ke ben duoi.

### DIA DANH HE THONG:
{(destinationSpots.Count > 0 ? string.Join("\n", destinationSpots) : "Khong co dia danh nao trong he thong cho diem den nay.")}

### CAC DICH VU CO SAN TRONG HE THONG:
Khach san:
{hotelLines}

Tour:
{tourLines}

### THONG TIN NGUOI DUNG:
- Phong cach: {travelStyle}
- Ngan sach: {budgetLevel}
- Nhip do: {travelPace}
- Am thuc: {cuisinePreference}

### YEU CAU CA NHAN HOA:
- Hay lap lich trinh PHU HOP voi toan bo so thich tren.
- Neu nguoi dung uu tien nghi duong va ngan sach cao, hay uu tien cac goi nghi duong, resort, spa va cac trai nghiem thoai mai.
- Neu nguoi dung uu tien kham pha va ngan sach thap, hay uu tien cac lua chon tiet kiem, linh hoat, trai nghiem dia phuong va di chuyen don gian.
- Nhip do moi ngay phai phu hop voi so thich ve toc do chuyen di.
- Goi y an uong va diem dung chan phai phu hop voi so thich am thuc neu co.

YEU CAU DAU RA: Tra ve JSON theo dung schema, tinh toan 'estimatedCost' la 0 cho cac diem tu do va dung gia he thong cho cac diem chinh thuc. Moi activity phai co field service_id. Lich trinh phai khop voi ngay bat dau da cung cap.";
    }

    private static string BuildServiceLines(IEnumerable<PromptServiceOption> services)
    {
        var items = services.ToList();
        if (items.Count == 0)
        {
            return "- Khong co dich vu phu hop trong he thong cho nhom nay.";
        }

        return string.Join("\n", items.Select(service =>
        {
            var dates = string.Join(", ", service.AvailableDates
                .OrderBy(date => date)
                .Select(date => date.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture)));
            var description = string.IsNullOrWhiteSpace(service.Description)
                ? string.Empty
                : $" | mo ta: {service.Description}";

            return $"- service_id: {service.ServiceId.ToString(CultureInfo.InvariantCulture)} | {service.Name} | {service.Price.ToString("0.##", CultureInfo.InvariantCulture)} VND/{service.PriceUnit} | dia diem: {service.Location} | ngay kha dung: {dates}{description}";
        }));
    }

    private static string FormatTravelStyle(string? travelStyle)
    {
        return string.IsNullOrWhiteSpace(travelStyle)
            ? "Khong co yeu cau dac biet"
            : travelStyle.Trim();
    }

    private static string FormatBudgetLevel(BudgetLevel budgetLevel)
    {
        return budgetLevel switch
        {
            BudgetLevel.Low => "Tiet kiem",
            BudgetLevel.Medium => "Trung binh",
            BudgetLevel.High => "Cao cap",
            _ => budgetLevel.ToString()
        };
    }

    private static string FormatTravelPace(TravelPace travelPace)
    {
        return travelPace switch
        {
            TravelPace.Relaxed => "Thong tha",
            TravelPace.Balanced => "Can bang",
            TravelPace.FastPaced => "Day dac",
            _ => travelPace.ToString()
        };
    }

    private static string FormatCuisinePreference(string? cuisinePreference)
    {
        return string.IsNullOrWhiteSpace(cuisinePreference)
            ? "Khong co yeu cau dac biet"
            : cuisinePreference.Trim();
    }

    private static List<Review> ResolveSpotReviews(TouristSpot spot, List<Review>? reviews)
    {
        if (reviews == null || reviews.Count == 0)
        {
            return new List<Review>();
        }

        return reviews
            .Where(review => review.Service != null
                && (review.Service.SpotId == spot.SpotId
                || review.Service.ServiceSpots.Any(serviceSpot => serviceSpot.SpotId == spot.SpotId))
            )
            .ToList();
    }
}
