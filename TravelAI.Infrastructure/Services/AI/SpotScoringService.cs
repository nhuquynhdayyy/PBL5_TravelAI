using Microsoft.EntityFrameworkCore;
using TravelAI.Application.DTOs.AI;
using TravelAI.Application.Interfaces;
using TravelAI.Domain.Entities;
using TravelAI.Domain.Enums;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.Infrastructure.Services.AI;

public class SpotScoringService : ISpotScoringService
{
    private readonly ApplicationDbContext _context;

    // Keywords mapping cho từng travel style
    private static readonly Dictionary<string, string[]> StyleKeywords = new()
    {
        ["văn hóa"] = new[] { "chùa", "đền", "bảo tàng", "di tích", "lịch sử", "cổ", "truyền thống", "văn miếu", "đình", "phủ", "tháp", "cung điện" },
        ["thiên nhiên"] = new[] { "núi", "biển", "rừng", "thác", "hồ", "sông", "đảo", "vịnh", "bãi", "suối", "động", "hang", "vườn quốc gia" },
        ["ẩm thực"] = new[] { "chợ", "phố ăn", "quán", "nhà hàng", "ẩm thực", "món", "đặc sản", "street food", "food court" },
        ["mạo hiểm"] = new[] { "leo núi", "lặn", "dù lượn", "zipline", "bungee", "kayak", "rafting", "trekking", "phượt", "thể thao" },
        ["nghỉ dưỡng"] = new[] { "resort", "spa", "bãi biển", "khách sạn", "nghỉ", "thư giãn", "massage", "yoga", "wellness" },
        ["khám phá"] = new[] { "phố cổ", "làng", "khu", "công viên", "quảng trường", "đường phố", "chợ đêm", "khu vui chơi" },
        ["tôn giáo"] = new[] { "chùa", "đền", "nhà thờ", "thánh đường", "tu viện", "tháp", "linh thiêng", "tâm linh" }
    };

    public SpotScoringService(ApplicationDbContext context)
    {
        _context = context;
    }

    public double CalculateScore(TouristSpot spot, UserPreference pref, List<Review> reviews)
    {
        var applicationScoringService = new TravelAI.Application.Services.SpotScoringService();
        return applicationScoringService.CalculateScore(spot, pref, reviews);
    }

    public async Task<List<SpotScoreDto>> ScoreAndRankSpotsAsync(
        List<TouristSpot> spots,
        UserPreference preference,
        double? centerLatitude = null,
        double? centerLongitude = null)
    {
        var scoredSpots = new List<SpotScoreDto>();

        foreach (var spot in spots)
        {
            var totalScore = await CalculateScoreAsync(spot, preference, centerLatitude, centerLongitude);
            
            var scoreDto = new SpotScoreDto
            {
                SpotId = spot.SpotId,
                SpotName = spot.Name,
                TotalScore = totalScore
            };

            scoredSpots.Add(scoreDto);
        }

        return scoredSpots.OrderByDescending(s => s.TotalScore).ToList();
    }

    public async Task<double> CalculateScoreAsync(
        TouristSpot spot,
        UserPreference preference,
        double? centerLatitude = null,
        double? centerLongitude = null)
    {
        var styleScore = CalculateStyleMatch(spot, preference.TravelStyle);
        var budgetScore = CalculateBudgetMatch(spot, preference.BudgetLevel);
        var paceScore = CalculatePaceMatch(spot, preference.TravelPace);
        var distanceScore = CalculateDistanceScore(spot, centerLatitude, centerLongitude);
        var ratingScore = await CalculateRatingScoreAsync(spot.SpotId);

        // Công thức tổng hợp
        var totalScore = (styleScore * 0.3) +
                        (budgetScore * 0.25) +
                        (paceScore * 0.2) +
                        (distanceScore * 0.15) +
                        (ratingScore * 0.1);

        return totalScore;
    }

    /// <summary>
    /// Tính điểm phù hợp với phong cách du lịch (0-1)
    /// </summary>
    private static double CalculateStyleMatch(TouristSpot spot, string travelStyle)
    {
        if (string.IsNullOrWhiteSpace(travelStyle) || string.IsNullOrWhiteSpace(spot.Description))
        {
            return 0.5; // Điểm trung bình nếu thiếu thông tin
        }

        var normalizedStyle = NormalizeVietnamese(travelStyle.ToLower());
        var normalizedDescription = NormalizeVietnamese(spot.Description.ToLower());
        var normalizedName = NormalizeVietnamese(spot.Name.ToLower());

        var matchCount = 0;
        var totalKeywords = 0;

        foreach (var (style, keywords) in StyleKeywords)
        {
            if (!normalizedStyle.Contains(style))
            {
                continue;
            }

            foreach (var keyword in keywords)
            {
                totalKeywords++;
                if (normalizedDescription.Contains(keyword) || normalizedName.Contains(keyword))
                {
                    matchCount++;
                }
            }
        }

        if (totalKeywords == 0)
        {
            return 0.5;
        }

        // Tính tỷ lệ match, tối thiểu 0.3 để không loại bỏ hoàn toàn
        var matchRatio = (double)matchCount / totalKeywords;
        return Math.Max(0.3, Math.Min(1.0, matchRatio * 2)); // Scale up và clamp
    }

    /// <summary>
    /// Tính điểm phù hợp với ngân sách (0-1)
    /// </summary>
    private static double CalculateBudgetMatch(TouristSpot spot, BudgetLevel budgetLevel)
    {
        // Giả định: Nếu spot có service liên kết, lấy giá trung bình
        // Nếu không có service, coi như miễn phí (điểm cao cho Low budget)
        var hasServices = spot.Services?.Any() == true;
        
        if (!hasServices)
        {
            // Điểm tham quan miễn phí
            return budgetLevel switch
            {
                BudgetLevel.Low => 1.0,      // Rất phù hợp với ngân sách thấp
                BudgetLevel.Medium => 0.8,   // Khá phù hợp
                BudgetLevel.High => 0.6,     // Vẫn OK nhưng không đặc biệt
                _ => 0.7
            };
        }

        var avgPrice = spot.Services!.Average(s => (double)s.BasePrice);

        return budgetLevel switch
        {
            BudgetLevel.Low => avgPrice switch
            {
                < 200_000 => 1.0,
                < 500_000 => 0.7,
                < 1_000_000 => 0.4,
                _ => 0.2
            },
            BudgetLevel.Medium => avgPrice switch
            {
                < 200_000 => 0.7,
                < 500_000 => 1.0,
                < 1_000_000 => 0.9,
                < 2_000_000 => 0.6,
                _ => 0.3
            },
            BudgetLevel.High => avgPrice switch
            {
                < 500_000 => 0.5,
                < 1_000_000 => 0.8,
                < 2_000_000 => 1.0,
                _ => 0.9
            },
            _ => 0.5
        };
    }

    /// <summary>
    /// Tính điểm phù hợp với nhịp độ du lịch (0-1)
    /// </summary>
    private static double CalculatePaceMatch(TouristSpot spot, TravelPace travelPace)
    {
        var avgTimeSpent = spot.AvgTimeSpent; // Đơn vị: phút

        return travelPace switch
        {
            TravelPace.Relaxed => avgTimeSpent switch
            {
                <= 60 => 1.0,      // Dưới 1 giờ - rất phù hợp
                <= 120 => 0.8,     // 1-2 giờ - khá phù hợp
                <= 180 => 0.5,     // 2-3 giờ - trung bình
                _ => 0.3           // Trên 3 giờ - ít phù hợp
            },
            TravelPace.Balanced => avgTimeSpent switch
            {
                <= 60 => 0.7,
                <= 120 => 1.0,     // 1-2 giờ - lý tưởng
                <= 180 => 0.9,
                <= 240 => 0.6,
                _ => 0.4
            },
            TravelPace.FastPaced => avgTimeSpent switch
            {
                <= 60 => 0.6,
                <= 120 => 0.8,
                <= 180 => 1.0,     // 2-3 giờ - phù hợp
                <= 300 => 0.9,     // 3-5 giờ - rất phù hợp
                _ => 0.7           // Trên 5 giờ - vẫn OK
            },
            _ => 0.5
        };
    }

    /// <summary>
    /// Tính điểm dựa trên khoảng cách (0-1)
    /// Nếu không có tọa độ trung tâm, trả về điểm trung bình
    /// </summary>
    private static double CalculateDistanceScore(
        TouristSpot spot,
        double? centerLatitude,
        double? centerLongitude)
    {
        if (!centerLatitude.HasValue || !centerLongitude.HasValue)
        {
            return 0.7; // Điểm mặc định nếu không có thông tin khoảng cách
        }

        if (spot.Latitude == 0 && spot.Longitude == 0)
        {
            return 0.5; // Spot chưa có tọa độ
        }

        var distance = CalculateHaversineDistance(
            centerLatitude.Value,
            centerLongitude.Value,
            spot.Latitude,
            spot.Longitude);

        // Khoảng cách tính bằng km
        return distance switch
        {
            < 5 => 1.0,      // Dưới 5km - rất gần
            < 10 => 0.9,     // 5-10km - gần
            < 20 => 0.7,     // 10-20km - trung bình
            < 50 => 0.5,     // 20-50km - xa
            _ => 0.3         // Trên 50km - rất xa
        };
    }

    /// <summary>
    /// Tính điểm rating trung bình từ reviews (0-1)
    /// </summary>
    private async Task<double> CalculateRatingScoreAsync(int spotId)
    {
        // Lấy rating từ các services liên quan đến spot này
        var avgRating = await _context.Services
            .Where(s => s.SpotId == spotId && s.RatingAvg > 0)
            .Select(s => s.RatingAvg)
            .DefaultIfEmpty(0)
            .AverageAsync();

        if (avgRating == 0)
        {
            return 0.6; // Điểm mặc định nếu chưa có review
        }

        // Chuyển đổi rating 1-5 sang 0-1
        return avgRating / 5.0;
    }

    /// <summary>
    /// Tính khoảng cách Haversine giữa 2 điểm GPS (km)
    /// </summary>
    private static double CalculateHaversineDistance(
        double lat1, double lon1,
        double lat2, double lon2)
    {
        const double earthRadiusKm = 6371.0;

        var dLat = DegreesToRadians(lat2 - lat1);
        var dLon = DegreesToRadians(lon2 - lon1);

        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(DegreesToRadians(lat1)) * Math.Cos(DegreesToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

        return earthRadiusKm * c;
    }

    private static double DegreesToRadians(double degrees)
    {
        return degrees * Math.PI / 180.0;
    }

    /// <summary>
    /// Chuẩn hóa tiếng Việt có dấu về không dấu để so sánh
    /// </summary>
    private static string NormalizeVietnamese(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return string.Empty;
        }

        var normalized = text.ToLower();
        
        // Bảng chuyển đổi ký tự có dấu sang không dấu
        var vietnameseChars = new Dictionary<char, char>
        {
            ['á'] = 'a', ['à'] = 'a', ['ả'] = 'a', ['ã'] = 'a', ['ạ'] = 'a',
            ['ă'] = 'a', ['ắ'] = 'a', ['ằ'] = 'a', ['ẳ'] = 'a', ['ẵ'] = 'a', ['ặ'] = 'a',
            ['â'] = 'a', ['ấ'] = 'a', ['ầ'] = 'a', ['ẩ'] = 'a', ['ẫ'] = 'a', ['ậ'] = 'a',
            ['é'] = 'e', ['è'] = 'e', ['ẻ'] = 'e', ['ẽ'] = 'e', ['ẹ'] = 'e',
            ['ê'] = 'e', ['ế'] = 'e', ['ề'] = 'e', ['ể'] = 'e', ['ễ'] = 'e', ['ệ'] = 'e',
            ['í'] = 'i', ['ì'] = 'i', ['ỉ'] = 'i', ['ĩ'] = 'i', ['ị'] = 'i',
            ['ó'] = 'o', ['ò'] = 'o', ['ỏ'] = 'o', ['õ'] = 'o', ['ọ'] = 'o',
            ['ô'] = 'o', ['ố'] = 'o', ['ồ'] = 'o', ['ổ'] = 'o', ['ỗ'] = 'o', ['ộ'] = 'o',
            ['ơ'] = 'o', ['ớ'] = 'o', ['ờ'] = 'o', ['ở'] = 'o', ['ỡ'] = 'o', ['ợ'] = 'o',
            ['ú'] = 'u', ['ù'] = 'u', ['ủ'] = 'u', ['ũ'] = 'u', ['ụ'] = 'u',
            ['ư'] = 'u', ['ứ'] = 'u', ['ừ'] = 'u', ['ử'] = 'u', ['ữ'] = 'u', ['ự'] = 'u',
            ['ý'] = 'y', ['ỳ'] = 'y', ['ỷ'] = 'y', ['ỹ'] = 'y', ['ỵ'] = 'y',
            ['đ'] = 'd'
        };

        var result = new char[normalized.Length];
        for (var i = 0; i < normalized.Length; i++)
        {
            result[i] = vietnameseChars.TryGetValue(normalized[i], out var replacement)
                ? replacement
                : normalized[i];
        }

        return new string(result);
    }
}
