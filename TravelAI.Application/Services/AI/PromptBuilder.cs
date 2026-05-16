using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
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

    public string BuildPrompt(
        UserPreference pref,
        Destination dest,
        List<TouristSpot> spots,
        int days,
        DateTime startDate,
        List<AISuggestionLog> historyLogs,
        dynamic weatherData,
        List<Service> availableServices)
    {
        return Build(
            pref,
            dest,
            spots,
            days,
            startDate,
            historyLogs: historyLogs,
            weatherData: weatherData,
            availableServiceEntities: availableServices);
    }

    public string Build(
        UserPreference pref,
        Destination dest,
        List<TouristSpot> spots,
        int days,
        DateTime startDate,
        IEnumerable<PromptServiceOption>? availableServices = null,
        List<SpotScoreDto>? rankedSpots = null,
        List<Review>? reviews = null,
        List<AISuggestionLog>? historyLogs = null,
        dynamic? weatherData = null,
        List<Service>? availableServiceEntities = null)
    {
        var openSpots = spots
            .Where(spot => IsSpotOpenForTrip(spot, startDate, days))
            .ToList();

        // Sap xep dia danh theo diem A1, sau do moi dua vao prompt.
        var orderedSpots = openSpots;
        if (rankedSpots != null && rankedSpots.Count > 0)
        {
            var spotScoreMap = rankedSpots.ToDictionary(score => score.SpotId, score => score.TotalScore);
            orderedSpots = openSpots
                .OrderByDescending(spot => spotScoreMap.GetValueOrDefault(spot.SpotId, 0))
                .ToList();
        }
        else if (_spotScoringService != null && openSpots.Count > 0)
        {
            orderedSpots = openSpots
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
            .Select(spot => $"- {spot.Name}. Mo ta: {spot.Description}. Gio mo cua: {FormatOpeningHours(spot.OpeningHours)}")
            .ToList();

        var serviceOptions = availableServices?.ToList() ?? new List<PromptServiceOption>();
        var hotelLines = BuildServiceLines(serviceOptions.Where(service => service.ServiceType == ServiceType.Hotel));
        var tourLines = BuildServiceLines(serviceOptions.Where(service => service.ServiceType == ServiceType.Tour));
        var travelStyle = FormatTravelStyle(pref.TravelStyle);
        var budgetLevel = FormatBudgetLevel(pref.BudgetLevel);
        var travelPace = FormatTravelPace(pref.TravelPace);
        var cuisinePreference = FormatCuisinePreference(pref.CuisinePref);
        var historyLines = BuildHistoryContext(historyLogs);
        var weatherLines = BuildWeatherContext(weatherData);
        var comboLines = BuildServiceComboLines(availableServiceEntities);

        var prompt = new StringBuilder();
        prompt.AppendLine($"Ban la chuyen gia lap ke hoach du lich. Hay lap lich trinh {days} ngay tai {dest.Name}.");
        prompt.AppendLine($"Chuyen di bat dau tu ngay {startDate:dd/MM/yyyy}. Day la moc ngay bat dau co dinh cho ca hanh trinh.");
        prompt.AppendLine($"Hay sap xep tung ngay trong lich trinh gan voi cac ngay cu the dua tren moc thoi gian nay, trong do ngay 1 ung voi {startDate:dd/MM/yyyy} va moi ngay sau la ngay lien ke.");
        prompt.AppendLine();
        prompt.AppendLine("### YEU CAU UU TIEN:");
        prompt.AppendLine("1. Neu danh sach 'DICH VU HE THONG' duoi day co du lieu, ban BAT BUOC phai uu tien dua chung vao lich trinh mot cach hop ly.");
        prompt.AppendLine("2. Voi cac khoang thoi gian trong con lai trong ngay, hay su dung kien thuc cua ban de goi y them cac dia diem tham quan tu do, mien phi hoac cac quan an noi tieng dia phuong de lich trinh hoan hao hon.");
        prompt.AppendLine("3. Dam bao lich trinh can bang giua cac diem co phi (trong he thong) va cac diem trai nghiem tu do.");
        prompt.AppendLine("4. Neu su dung dich vu co trong danh sach he thong, ban BAT BUOC ghi dung service_id vao field service_id cua activity do.");
        prompt.AppendLine("5. Tuyet doi khong tu suy doan service_id. Neu activity khong phai mot dich vu co trong danh sach he thong, service_id phai la null.");
        prompt.AppendLine("6. Chi duoc gan service_id cho mot activity vao dung ngay co availability duoc liet ke ben duoi.");
        prompt.AppendLine("7. Chi su dung cac dia danh co gio mo cua phu hop voi lich trinh du kien.");
        prompt.AppendLine("8. Neu tra ve bat ky danh sach dich vu goi y nao trong JSON, moi object dich vu BAT BUOC co field \"service_id\" bang ID that tu danh sach DICH VU HE THONG; neu khong tim thay ID hop le thi de \"service_id\": null va khong bia ID.");
        prompt.AppendLine();
        prompt.AppendLine("### NGU CANH LICH SU:");
        prompt.AppendLine(historyLines);
        prompt.AppendLine();
        prompt.AppendLine("### THOI TIET DU KIEN:");
        prompt.AppendLine(weatherLines);
        prompt.AppendLine();
        prompt.AppendLine("### DIA DANH HE THONG:");
        prompt.AppendLine(destinationSpots.Count > 0
            ? string.Join("\n", destinationSpots)
            : "Khong co dia danh nao trong he thong cho diem den nay hoac khong co dia danh phu hop gio mo cua.");
        prompt.AppendLine();
        prompt.AppendLine("### CAC DICH VU CO SAN TRONG HE THONG:");
        prompt.AppendLine("Khach san:");
        prompt.AppendLine(hotelLines);
        prompt.AppendLine();
        prompt.AppendLine("Tour:");
        prompt.AppendLine(tourLines);
        prompt.AppendLine();
        prompt.AppendLine("### GOI Y COMBO DICH VU - DIA DANH:");
        prompt.AppendLine(comboLines);
        prompt.AppendLine();
        prompt.AppendLine("### THONG TIN NGUOI DUNG:");
        prompt.AppendLine($"- Phong cach: {travelStyle}");
        prompt.AppendLine($"- Ngan sach: {budgetLevel}");
        prompt.AppendLine($"- Nhip do: {travelPace}");
        prompt.AppendLine($"- Am thuc: {cuisinePreference}");
        prompt.AppendLine();
        prompt.AppendLine("### YEU CAU CA NHAN HOA:");
        prompt.AppendLine("- Hay lap lich trinh PHU HOP voi toan bo so thich tren.");
        prompt.AppendLine("- Neu nguoi dung uu tien nghi duong va ngan sach cao, hay uu tien cac goi nghi duong, resort, spa va cac trai nghiem thoai mai.");
        prompt.AppendLine("- Neu nguoi dung uu tien kham pha va ngan sach thap, hay uu tien cac lua chon tiet kiem, linh hoat, trai nghiem dia phuong va di chuyen don gian.");
        prompt.AppendLine("- Nhip do moi ngay phai phu hop voi so thich ve toc do chuyen di.");
        prompt.AppendLine("- Goi y an uong va diem dung chan phai phu hop voi so thich am thuc neu co.");
        prompt.AppendLine();
        prompt.Append("YEU CAU DAU RA: Tra ve JSON theo dung schema, tinh toan 'estimatedCost' la 0 cho cac diem tu do va dung gia he thong cho cac diem chinh thuc. Moi activity phai co field service_id. Moi dich vu goi y trong JSON phai co field service_id lay tu Database neu co. Lich trinh phai khop voi ngay bat dau da cung cap.");

        return prompt.ToString();
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

    private static string BuildHistoryContext(List<AISuggestionLog>? historyLogs)
    {
        var logs = historyLogs?
            .OrderByDescending(log => log.CreatedAt)
            .Take(3)
            .ToList() ?? new List<AISuggestionLog>();

        if (logs.Count == 0)
        {
            return "- Chua co lich su goi y truoc do.";
        }

        var lines = logs.Select(log =>
        {
            var responsePreview = TrimForPrompt(log.AiResponseJson, 360);
            return $"- {log.CreatedAt:dd/MM/yyyy HH:mm}: Goi y truoc do: {responsePreview}";
        });

        return string.Join("\n", lines)
            + "\n- Hay tranh lap lai cac goi y nguoi dung co the da tu choi va bam sat phong cach da the hien trong cac phan hoi truoc.";
    }

    private static string BuildWeatherContext(dynamic? weatherData)
    {
        var status = ReadWeatherValue(weatherData, "Status");
        var description = ReadWeatherValue(weatherData, "Description");
        var temperature = ReadWeatherValue(weatherData, "TemperatureCelsius");

        if (string.IsNullOrWhiteSpace(status) && string.IsNullOrWhiteSpace(description))
        {
            return "- Khong co du lieu thoi tiet. Hay lap lich trinh can bang giua trong nha va ngoai troi.";
        }

        var normalizedWeather = $"{status} {description}".ToLowerInvariant();
        var instruction = normalizedWeather.Contains("rain", StringComparison.Ordinal)
            || normalizedWeather.Contains("mua", StringComparison.Ordinal)
                ? "Uu tien cac hoat dong trong nha hoac bao tang."
                : normalizedWeather.Contains("sun", StringComparison.Ordinal)
                    || normalizedWeather.Contains("clear", StringComparison.Ordinal)
                    || normalizedWeather.Contains("nang", StringComparison.Ordinal)
                        ? "Uu tien hoat dong ngoai troi."
                        : "Can bang hoat dong trong nha va ngoai troi theo dieu kien thoi tiet.";

        var weatherSummary = string.IsNullOrWhiteSpace(temperature)
            ? $"- Trang thai: {status} {description}".Trim()
            : $"- Nhiet do: {temperature} C. Trang thai: {status} {description}".Trim();

        return $"{weatherSummary}\n- {instruction}";
    }

    private static string BuildServiceComboLines(List<Service>? availableServices)
    {
        var combos = availableServices?
            .Where(service => service.IsActive)
            .SelectMany(service => ResolveLinkedSpots(service)
                .Select(spot => $"- Ban nen dat {FormatServiceType(service.ServiceType)} {service.Name} de co trai nghiem tot nhat tai {spot.Name}. service_id: {service.ServiceId.ToString(CultureInfo.InvariantCulture)}"))
            .Distinct()
            .Take(12)
            .ToList() ?? new List<string>();

        return combos.Count == 0
            ? "- Khong co combo dich vu - dia danh phu hop."
            : string.Join("\n", combos);
    }

    private static IEnumerable<TouristSpot> ResolveLinkedSpots(Service service)
    {
        if (service.TouristSpot != null)
        {
            yield return service.TouristSpot;
        }

        foreach (var serviceSpot in service.ServiceSpots.OrderBy(serviceSpot => serviceSpot.VisitOrder))
        {
            if (serviceSpot.TouristSpot != null)
            {
                yield return serviceSpot.TouristSpot;
            }
        }
    }

    private static bool IsSpotOpenForTrip(TouristSpot spot, DateTime startDate, int days)
    {
        if (string.IsNullOrWhiteSpace(spot.OpeningHours))
        {
            return true;
        }

        var openingHours = spot.OpeningHours.Trim();
        if (openingHours.Contains("24/7", StringComparison.OrdinalIgnoreCase)
            || openingHours.Contains("all day", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (openingHours.Contains("closed", StringComparison.OrdinalIgnoreCase)
            || openingHours.Contains("dong cua", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        // Heuristic: neu co khung gio, chi giu spot co overlap voi gio tham quan 08:00-20:00.
        var timeRanges = Regex.Matches(openingHours, @"(?<open>\d{1,2}[:h]\d{2}|\d{1,2})\s*[-–]\s*(?<close>\d{1,2}[:h]\d{2}|\d{1,2})");
        if (timeRanges.Count == 0)
        {
            return true;
        }

        foreach (Match range in timeRanges)
        {
            if (!TryParseHour(range.Groups["open"].Value, out var open)
                || !TryParseHour(range.Groups["close"].Value, out var close))
            {
                continue;
            }

            if (close <= open)
            {
                close = close.Add(TimeSpan.FromHours(24));
            }

            if (open < TimeSpan.FromHours(20) && close > TimeSpan.FromHours(8))
            {
                return true;
            }
        }

        return false;
    }

    private static bool TryParseHour(string value, out TimeSpan time)
    {
        var normalized = value.Replace("h", ":", StringComparison.OrdinalIgnoreCase);
        if (!normalized.Contains(':', StringComparison.Ordinal))
        {
            normalized += ":00";
        }

        return TimeSpan.TryParse(normalized, CultureInfo.InvariantCulture, out time);
    }

    private static string ReadWeatherValue(dynamic? weatherData, string propertyName)
    {
        if (weatherData == null)
        {
            return string.Empty;
        }

        if (weatherData is JsonElement element)
        {
            return TryReadJsonProperty(element, propertyName);
        }

        var property = weatherData.GetType().GetProperty(propertyName);
        var value = property?.GetValue(weatherData);
        return Convert.ToString(value, CultureInfo.InvariantCulture) ?? string.Empty;
    }

    private static string TryReadJsonProperty(JsonElement element, string propertyName)
    {
        foreach (var property in element.EnumerateObject())
        {
            if (string.Equals(property.Name, propertyName, StringComparison.OrdinalIgnoreCase))
            {
                return property.Value.ValueKind == JsonValueKind.String
                    ? property.Value.GetString() ?? string.Empty
                    : property.Value.ToString();
            }
        }

        return string.Empty;
    }

    private static string TrimForPrompt(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "Khong co noi dung.";
        }

        var normalized = value
            .Replace("\r", " ", StringComparison.Ordinal)
            .Replace("\n", " ", StringComparison.Ordinal)
            .Trim();

        return normalized.Length <= maxLength
            ? normalized
            : normalized[..maxLength] + "...";
    }

    private static string FormatServiceType(ServiceType serviceType)
    {
        return serviceType switch
        {
            ServiceType.Hotel => "khach san",
            ServiceType.Tour => "Tour",
            ServiceType.Restaurant => "nha hang",
            ServiceType.Transport => "dich vu di chuyen",
            _ => "dich vu"
        };
    }

    private static string FormatOpeningHours(string? openingHours)
    {
        return string.IsNullOrWhiteSpace(openingHours)
            ? "Khong ro"
            : openingHours.Trim();
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
                    || review.Service.ServiceSpots.Any(serviceSpot => serviceSpot.SpotId == spot.SpotId)))
            .ToList();
    }
}
