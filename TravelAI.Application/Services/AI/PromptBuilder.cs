using TravelAI.Domain.Entities;

namespace TravelAI.Application.Services.AI;

public class PromptBuilder
{
    public string Build(UserPreference pref, Destination dest, List<TouristSpot> spots, int days, DateTime startDate)
    {
        var officialServices = spots.Select(spot =>
            $"- {spot.Name} (Dia danh nay co dich vu dat ve/tour: {spot.Services.FirstOrDefault()?.BasePrice ?? 0} VND). Mo ta: {spot.Description}")
            .ToList();

        return $@"Ban la chuyen gia lap ke hoach du lich. Hay lap lich trinh {days} ngay tai {dest.Name}.
Chuyen di bat dau tu ngay {startDate:dd/MM/yyyy}. Day la moc ngay bat dau co dinh cho ca hanh trinh.
Hay sap xep tung ngay trong lich trinh gan voi cac ngay cu the dua tren moc thoi gian nay, trong do ngay 1 ung voi {startDate:dd/MM/yyyy} va moi ngay sau la ngay lien ke.

### YEU CAU UU TIEN:
1. Neu danh sach 'DICH VU HE THONG' duoi day co du lieu, ban BAT BUOC phai dua chung vao lich trinh mot cach hop ly.
2. Voi cac khoang thoi gian trong con lai trong ngay, hay su dung kien thuc cua ban de goi y them cac dia diem tham quan tu do, mien phi hoac cac quan an noi tieng dia phuong de lich trinh hoan hao hon.
3. Dam bao lich trinh can bang giua cac diem co phi (trong he thong) va cac diem trai nghiem tu do.

### DICH VU HE THONG (UU TIEN SU DUNG):
{(officialServices.Any() ? string.Join("\n", officialServices) : "Hien tai tinh nay chua co dich vu tra phi, hay goi y hoan toan bang dia diem tu do.")}

### THONG TIN KHACH HANG:
- Phong cach: {pref.TravelStyle}
- Ngan sach: {pref.BudgetLevel}
- Nhip do: {pref.TravelPace}

YEU CAU DAU RA: Tra ve JSON theo dung schema, tinh toan 'estimatedCost' la 0 cho cac diem tu do va dung gia he thong cho cac diem chinh thuc. Lich trinh phai khop voi ngay bat dau da cung cap.";
    }
}
