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
        if (string.IsNullOrWhiteSpace(request.Destination))
        {
            return BadRequest(new { message = "Destination is required." });
        }

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

        var prompt = $@"Uoc tinh chi phi cho {request.People} nguoi di {request.Destination.Trim()} trong {request.Days} ngay theo phong cach {travelStyle}.
Breakdown chi tiet: luu tru, an uong, di chuyen, tham quan, mua sam.
Format JSON dung nhu sau:
{{
  ""total"": 0,
  ""breakdown"": [
    {{ ""category"": ""Luu tru"", ""amount"": 0, ""note"": ""..."" }},
    {{ ""category"": ""An uong"", ""amount"": 0, ""note"": ""..."" }},
    {{ ""category"": ""Di chuyen"", ""amount"": 0, ""note"": ""..."" }},
    {{ ""category"": ""Tham quan"", ""amount"": 0, ""note"": ""..."" }},
    {{ ""category"": ""Mua sam"", ""amount"": 0, ""note"": ""..."" }}
  ]
}}
Chi tra ve JSON hop le. Don vi tien te la VND.";

        var rawResponse = await _aiService.CallApiAsync(
            prompt,
            systemPrompt: "Ban la tro ly uoc tinh ngan sach du lich Viet Nam. Chi tra ve JSON hop le.",
            requireJsonResponse: true);

        if (GeminiService.TryExtractErrorMessage(rawResponse, out var aiError))
        {
            return BadRequest(new { message = aiError });
        }

        var estimate = ParseBudgetEstimate(rawResponse)
            ?? BuildFallbackEstimate(request.Destination.Trim(), request.Days, request.People, travelStyle);

        return Ok(new { success = true, data = estimate });
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
