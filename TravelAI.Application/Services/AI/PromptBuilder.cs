using System.Globalization;
using TravelAI.Application.DTOs.AI;
using TravelAI.Domain.Entities;
using TravelAI.Domain.Enums;

namespace TravelAI.Application.Services.AI;

public class PromptBuilder
{
    public string Build(
        UserPreference pref,
        Destination dest,
        List<TouristSpot> spots,
        int days,
        DateTime startDate,
        IEnumerable<PromptServiceOption>? availableServices = null)
    {
        var destinationSpots = spots
            .Select(spot => $"- {spot.Name}. Mo ta: {spot.Description}")
            .ToList();

        var serviceOptions = availableServices?.ToList() ?? new List<PromptServiceOption>();
        var hotelLines = BuildServiceLines(serviceOptions.Where(service => service.ServiceType == ServiceType.Hotel));
        var tourLines = BuildServiceLines(serviceOptions.Where(service => service.ServiceType == ServiceType.Tour));

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

### THONG TIN KHACH HANG:
- Phong cach: {pref.TravelStyle}
- Ngan sach: {pref.BudgetLevel}
- Nhip do: {pref.TravelPace}

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
}
