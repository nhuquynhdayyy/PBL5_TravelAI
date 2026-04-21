using System.Globalization;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelAI.Application.DTOs.AI;
using TravelAI.Application.DTOs.Chat;
using TravelAI.Application.Interfaces;
using TravelAI.Application.Services.AI;
using TravelAI.Infrastructure.ExternalServices;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IItineraryService _itineraryService;
    private readonly GeminiService _aiService;

    public ChatController(ApplicationDbContext db, IItineraryService itineraryService, GeminiService aiService)
    {
        _db = db;
        _itineraryService = itineraryService;
        _aiService = aiService;
    }

    [HttpPost]
    public async Task<IActionResult> GetAIResponse([FromBody] ChatRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest("Message is required.");
        }

        var history = (request.History ?? new List<ChatMessage>())
            .Where(message => !string.IsNullOrWhiteSpace(message.Content))
            .ToList();

        string conversationContext = BuildConversationContext(history, request.Message);
        string intentPrompt = $@"Duoi day la lich su hoi thoai giua nguoi dung va tro ly du lich:
{conversationContext}

Hay tra ve duy nhat ten tinh thanh Viet Nam xuat hien gan nhat va quan trong nhat trong context (vi du: Ha Noi, Da Nang).
Neu khong xac dinh duoc, tra ve 'none'.";

        string detectedDestName = await _aiService.CallApiAsync(intentPrompt);
        detectedDestName = detectedDestName.Trim().Replace(".", "").Replace("\"", "");

        var destination = await _db.Destinations
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Name.Contains(detectedDestName));

        if (destination != null && IsItineraryRequest(request.Message))
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            var userId = userIdClaim != null ? int.Parse(userIdClaim.Value) : 0;
            var genReq = new GenerateItineraryRequest(destination.DestinationId, 3, DateTime.Today);
            var itinerary = await _itineraryService.GenerateAndLogItineraryAsync(userId, genReq);

            return Ok(new
            {
                text = $"Toi da lap xong lich trinh cho chuyen di {destination.Name} cua ban!",
                type = "itinerary",
                data = itinerary
            });
        }

        string generalResponse = await _aiService.CallApiAsync(
            request.Message,
            history,
            AIPrompts.ChatSystemPrompt);

        return Ok(new { text = generalResponse, type = "text" });
    }

    private static string BuildConversationContext(IEnumerable<ChatMessage> history, string currentMessage)
    {
        var lines = history
            .Select(message => $"{NormalizeRole(message.Role)}: {message.Content.Trim()}")
            .ToList();

        lines.Add($"user: {currentMessage.Trim()}");
        return string.Join(Environment.NewLine, lines);
    }

    private static bool IsItineraryRequest(string message)
    {
        var normalized = NormalizeText(message);
        return normalized.Contains("lich trinh", StringComparison.Ordinal)
            || normalized.Contains("itinerary", StringComparison.Ordinal)
            || normalized.Contains("plan", StringComparison.Ordinal);
    }

    private static string NormalizeRole(string? role)
    {
        return role?.Trim().ToLowerInvariant() switch
        {
            "assistant" => "assistant",
            _ => "user"
        };
    }

    private static string NormalizeText(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return string.Empty;
        }

        var normalized = text.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);

        foreach (var character in normalized)
        {
            if (character is '\u0111' or '\u0110')
            {
                builder.Append('d');
                continue;
            }

            if (CharUnicodeInfo.GetUnicodeCategory(character) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            builder.Append(char.ToLowerInvariant(character));
        }

        return builder.ToString().Normalize(NormalizationForm.FormC);
    }
}
