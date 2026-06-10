using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;
using TravelAI.Application.DTOs.AI;
using TravelAI.Application.Interfaces;
using TravelAI.Application.Services.AI;
using TravelAI.Domain.Entities;
using TravelAI.Domain.Enums;
using TravelAI.Infrastructure.ExternalServices;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AIController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly GeminiService _aiService;
    private readonly ISpotScoringService _spotScoringService;

    public AIController(
        ApplicationDbContext context, 
        GeminiService aiService,
        ISpotScoringService spotScoringService)
    {
        _context = context;
        _aiService = aiService;
        _spotScoringService = spotScoringService;
    }

    [HttpPost("estimate-budget")]
    public async Task<IActionResult> EstimateBudget([FromBody] BudgetEstimateRequest request)
    {
        if (request.Days <= 0)
        {
            return BadRequest(new { message = "Days must be greater than 0." });
        }

        if (request.People <= 0)
        {
            return BadRequest(new { message = "People must be greater than 0." });
        }

        var travelStyle = string.IsNullOrWhiteSpace(request.TravelStyle)
            ? "trung binh"
            : request.TravelStyle.Trim();

        // Resolve destination ID
        int? destId = request.DestinationId;
        string destinationName = request.Destination;

        if (!destId.HasValue && !string.IsNullOrWhiteSpace(request.Destination))
        {
            var dest = await _context.Destinations
                .FirstOrDefaultAsync(d => d.Name.Contains(request.Destination.Trim()));
            if (dest != null)
            {
                destId = dest.DestinationId;
                destinationName = dest.Name;
            }
        }
        else if (destId.HasValue && string.IsNullOrWhiteSpace(destinationName))
        {
            var dest = await _context.Destinations.FindAsync(destId.Value);
            if (dest != null)
            {
                destinationName = dest.Name;
            }
        }

        // Query active services in the destination
        var services = new List<Service>();
        if (destId.HasValue)
        {
            services = await _context.Services
                .Include(s => s.TouristSpot)
                .Include(s => s.ServiceSpots)
                    .ThenInclude(ss => ss.TouristSpot)
                .Where(s => s.IsActive && (
                    (s.TouristSpot != null && s.TouristSpot.DestinationId == destId.Value) ||
                    s.ServiceSpots.Any(ss => ss.TouristSpot.DestinationId == destId.Value)
                ))
                .ToListAsync();
        }

        // Default base prices (in VND):
        decimal hotelPrice = 650_000m;
        decimal restaurantPrice = 180_000m;
        decimal transportPrice = 120_000m;
        decimal sightseeingPrice = 200_000m;

        if (services.Any())
        {
            var hotels = services.Where(s => s.ServiceType == ServiceType.Hotel).ToList();
            if (hotels.Any())
            {
                hotelPrice = hotels.Average(s => s.BasePrice);
            }

            var restaurants = services.Where(s => s.ServiceType == ServiceType.Restaurant).ToList();
            if (restaurants.Any())
            {
                restaurantPrice = restaurants.Average(s => s.BasePrice);
            }

            var transports = services.Where(s => s.ServiceType == ServiceType.Transport).ToList();
            if (transports.Any())
            {
                transportPrice = transports.Average(s => s.BasePrice);
            }

            var sightseeing = services.Where(s => s.ServiceType == ServiceType.Tour || s.ServiceType == ServiceType.Activity).ToList();
            if (sightseeing.Any())
            {
                sightseeingPrice = sightseeing.Average(s => s.BasePrice);
            }
        }

        // Round base prices to nearest thousand
        hotelPrice = Math.Round(hotelPrice / 1000m) * 1000m;
        restaurantPrice = Math.Round(restaurantPrice / 1000m) * 1000m;
        transportPrice = Math.Round(transportPrice / 1000m) * 1000m;
        sightseeingPrice = Math.Round(sightseeingPrice / 1000m) * 1000m;

        // Travel style multiplier
        var multiplier = travelStyle.Trim().ToLowerInvariant() switch
        {
            "tiet kiem" or "tiết kiệm" or "low" or "budget" => 0.75m,
            "cao cap" or "cao cấp" or "high" or "luxury" or "sang trong" or "sang trọng" => 1.65m,
            _ => 1.0m
        };

        var hotelNights = Math.Max(request.Days - 1, 1);
        var roomCount = (int)Math.Ceiling(request.People / 2.0);

        var hotelCost = Math.Round(hotelPrice * hotelNights * roomCount * multiplier / 1000m) * 1000m;
        var foodCost = Math.Round(restaurantPrice * 2.5m * request.Days * request.People * multiplier / 1000m) * 1000m;
        var transCost = Math.Round(transportPrice * 2m * request.Days * (decimal)Math.Ceiling(request.People / 4.0) * multiplier / 1000m) * 1000m;
        var sightCost = Math.Round(sightseeingPrice * request.Days * request.People * multiplier / 1000m) * 1000m;
        var shopCost = Math.Round(150_000m * request.Days * request.People * multiplier / 1000m) * 1000m;

        var breakdown = new List<BudgetBreakdownItem>
        {
            new()
            {
                Category = "Lưu trú",
                Amount = hotelCost,
                Note = $"Ước tính {hotelNights} đêm, {roomCount} phòng (trung bình {hotelPrice:N0}đ/phòng/đêm)."
            },
            new()
            {
                Category = "Ăn uống",
                Amount = foodCost,
                Note = $"Ăn uống cho {request.People} người trong {request.Days} ngày (trung bình {restaurantPrice:N0}đ/bữa)."
            },
            new()
            {
                Category = "Di chuyển",
                Amount = transCost,
                Note = $"Di chuyển nội thành (trung bình {transportPrice:N0}đ/chuyến)."
            },
            new()
            {
                Category = "Tham quan",
                Amount = sightCost,
                Note = $"Vé vào cổng, hoạt động trải nghiệm (trung bình {sightseeingPrice:N0}đ/lượt)."
            },
            new()
            {
                Category = "Mua sắm",
                Amount = shopCost,
                Note = "Mua sắm quà lưu niệm và phát sinh (150.000đ/ngày/người)."
            }
        };

        var total = breakdown.Sum(item => item.Amount);

        var estimate = new BudgetEstimateResponse
        {
            Total = total,
            Breakdown = breakdown
        };

        return Ok(new { success = true, data = estimate });
    }

    [HttpGet("suggestions")]
    public async Task<IActionResult> GetSuggestions([FromQuery] int? destinationId)
    {
        try
        {
            // Lấy UserId từ token (nếu có)
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            UserPreference? preference = null;

            if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int userId))
            {
                preference = await _context.UserPreferences
                    .FirstOrDefaultAsync(u => u.UserId == userId);
            }

            // Nếu không có preference, dùng giá trị mặc định
            preference ??= new UserPreference
            {
                TravelStyle = "Kham pha",
                BudgetLevel = BudgetLevel.Medium,
                TravelPace = TravelPace.Balanced
            };

            // Lấy danh sách spots
            var spotsQuery = _context.TouristSpots
                .Include(s => s.Services)
                    .ThenInclude(service => service.Reviews)
                .Include(s => s.ServiceSpots)
                    .ThenInclude(serviceSpot => serviceSpot.Service)
                        .ThenInclude(service => service.Reviews)
                .Include(s => s.Destination)
                .AsQueryable();

            // Lọc theo destinationId nếu có
            if (destinationId.HasValue)
            {
                spotsQuery = spotsQuery.Where(s => s.DestinationId == destinationId.Value);
            }

            var spots = await spotsQuery.ToListAsync();

            if (spots.Count == 0)
            {
                return Ok(new
                {
                    success = true,
                    data = new List<AiSuggestionDto>(),
                    message = "Không tìm thấy địa điểm nào"
                });
            }

            // Tính toán điểm số cho từng spot
            var scores = await _spotScoringService.ScoreAndRankSpotsAsync(
                spots,
                preference,
                null, // centerLatitude
                null  // centerLongitude
            );

            // Tạo danh sách AiSuggestionDto
            var suggestions = scores.Take(10).Select(score =>
            {
                var spot = spots.First(s => s.SpotId == score.SpotId);
                
                // Tính average rating từ reviews
                var allReviews = spot.Services
                    .SelectMany(service => service.Reviews)
                    .Concat(spot.ServiceSpots.SelectMany(ss => ss.Service.Reviews))
                    .GroupBy(r => r.ReviewId)
                    .Select(g => g.First())
                    .ToList();

                var avgRating = allReviews.Any() 
                    ? allReviews.Average(r => r.Rating) 
                    : 0;

                return new AiSuggestionDto
                {
                    Spot = new Application.DTOs.Spot.SpotDto(
                        spot.SpotId,
                        spot.DestinationId,
                        spot.Name,
                        spot.Description ?? "",
                        spot.ImageUrl,
                        spot.Latitude,
                        spot.Longitude,
                        spot.AvgTimeSpent,
                        spot.OpeningHours
                    ),
                    TotalScore = score.TotalScore,
                    StyleMatchScore = score.StyleMatchScore,
                    BudgetMatchScore = score.BudgetMatchScore,
                    PaceMatchScore = score.PaceMatchScore,
                    DistanceScore = score.DistanceScore,
                    RatingScore = score.RatingScore,
                    AverageRating = avgRating
                };
            }).ToList();

            return Ok(new
            {
                success = true,
                data = suggestions,
                message = $"Tìm thấy {suggestions.Count} gợi ý phù hợp"
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new
            {
                success = false,
                message = $"Lỗi khi lấy gợi ý: {ex.Message}"
            });
        }
    }

    [HttpGet("preview-prompt")]
    public async Task<IActionResult> PreviewPrompt(int destId)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
            {
                return Unauthorized("Vui long dang nhap");
            }

            int userId = int.Parse(userIdClaim.Value);

            var pref = await _context.UserPreferences
                .FirstOrDefaultAsync(u => u.UserId == userId)
                ?? new UserPreference { TravelStyle = "Kham pha", BudgetLevel = BudgetLevel.Medium };

            var dest = await _context.Destinations.FindAsync(destId);
            if (dest == null)
            {
                return NotFound("Khong tim thay diem den");
            }

            var spots = await _context.TouristSpots
                .Include(s => s.Services)
                    .ThenInclude(service => service.Reviews)
                .Include(s => s.ServiceSpots)
                    .ThenInclude(serviceSpot => serviceSpot.Service)
                        .ThenInclude(service => service.Reviews)
                .Where(s => s.DestinationId == destId)
                .ToListAsync();

            var spotReviews = spots
                .SelectMany(spot => spot.Services.SelectMany(service => service.Reviews)
                    .Concat(spot.ServiceSpots.SelectMany(serviceSpot => serviceSpot.Service.Reviews)))
                .GroupBy(review => review.ReviewId)
                .Select(group => group.First())
                .ToList();

            var builder = new PromptBuilder(_spotScoringService);
            string finalPrompt = builder.Build(pref, dest, spots, 3, DateTime.Today, reviews: spotReviews);

            return Ok(new
            {
                description = "Noi dung se gui cho AI",
                prompt = finalPrompt
            });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    private static BudgetEstimateResponse? ParseBudgetEstimate(string rawJson)
    {
        if (string.IsNullOrWhiteSpace(rawJson))
        {
            return null;
        }

        try
        {
            using var document = JsonDocument.Parse(rawJson);
            var root = document.RootElement;

            if (root.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Object)
            {
                root = data;
            }

            var breakdown = new List<BudgetBreakdownItem>();
            if (root.TryGetProperty("breakdown", out var breakdownElement)
                && breakdownElement.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in breakdownElement.EnumerateArray())
                {
                    var category = ReadString(item, "category", "name");
                    var amount = ReadDecimal(item, "amount", "cost", "estimatedCost", "estimated_cost");
                    var note = ReadString(item, "note", "description");

                    if (!string.IsNullOrWhiteSpace(category) && amount > 0)
                    {
                        breakdown.Add(new BudgetBreakdownItem
                        {
                            Category = category,
                            Amount = amount,
                            Note = note
                        });
                    }
                }
            }

            if (breakdown.Count == 0)
            {
                return null;
            }

            var total = ReadDecimal(root, "total", "totalCost", "total_cost", "estimatedTotal", "estimated_total");
            if (total <= 0)
            {
                total = breakdown.Sum(item => item.Amount);
            }

            return new BudgetEstimateResponse
            {
                Total = total,
                Breakdown = breakdown
            };
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static BudgetEstimateResponse BuildFallbackEstimate(string destination, int days, int people, string travelStyle)
    {
        var multiplier = travelStyle.Trim().ToLowerInvariant() switch
        {
            "tiet kiem" or "tiết kiệm" or "budget" => 0.75m,
            "cao cap" or "cao cấp" or "luxury" or "sang trong" or "sang trọng" => 1.65m,
            _ => 1m
        };

        var hotelNights = Math.Max(days - 1, 1);
        var breakdown = new List<BudgetBreakdownItem>
        {
            new()
            {
                Category = "Luu tru",
                Amount = Math.Round(650_000m * hotelNights * Math.Ceiling(people / 2m) * multiplier),
                Note = $"Uoc tinh {hotelNights} dem tai {destination}, 2 nguoi/phong."
            },
            new()
            {
                Category = "An uong",
                Amount = Math.Round(320_000m * days * people * multiplier),
                Note = "Bao gom bua chinh, an nhe va do uong co ban."
            },
            new()
            {
                Category = "Di chuyen",
                Amount = Math.Round(220_000m * days * people * multiplier),
                Note = "Di chuyen noi thanh, taxi/xe cong nghe/xe thue ngan han."
            },
            new()
            {
                Category = "Tham quan",
                Amount = Math.Round(250_000m * days * people * multiplier),
                Note = "Ve vao cong, tour ngan hoac hoat dong trai nghiem."
            },
            new()
            {
                Category = "Mua sam",
                Amount = Math.Round(180_000m * days * people * multiplier),
                Note = "Qua luu niem va chi phi phat sinh nho."
            }
        };

        return new BudgetEstimateResponse
        {
            Total = breakdown.Sum(item => item.Amount),
            Breakdown = breakdown
        };
    }

    private static string ReadString(JsonElement element, params string[] propertyNames)
    {
        foreach (var propertyName in propertyNames)
        {
            if (element.TryGetProperty(propertyName, out var value)
                && value.ValueKind == JsonValueKind.String)
            {
                return value.GetString() ?? string.Empty;
            }
        }

        return string.Empty;
    }

    private static decimal ReadDecimal(JsonElement element, params string[] propertyNames)
    {
        foreach (var propertyName in propertyNames)
        {
            if (!element.TryGetProperty(propertyName, out var value))
            {
                continue;
            }

            if (value.ValueKind == JsonValueKind.Number && value.TryGetDecimal(out var number))
            {
                return number;
            }

            if (value.ValueKind == JsonValueKind.String
                && decimal.TryParse(value.GetString(), out var parsed))
            {
                return parsed;
            }
        }

        return 0;
    }
}
