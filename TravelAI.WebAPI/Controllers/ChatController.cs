using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelAI.Application.DTOs.AI;
using TravelAI.Application.DTOs.Chat;
using TravelAI.Application.Interfaces;
using TravelAI.Application.Services.AI;
using TravelAI.Domain.Entities;
using TravelAI.Domain.Enums;
using TravelAI.Infrastructure.ExternalServices;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private const string GenerateItineraryIntent = "generate_itinerary";
    private const string SearchHotelIntent = "search_hotel";
    private const string SearchTourIntent = "search_tour";
    private const string AskPriceIntent = "ask_price";
    private const string ShowMoreIntent = "show_more";
    private const string GeneralQuestionIntent = "general_question";

    private readonly ApplicationDbContext _db;
    private readonly IItineraryService _itineraryService;
    private readonly GeminiService _aiService;

    public ChatController(ApplicationDbContext db, IItineraryService itineraryService, GeminiService aiService)
    {
        _db = db;
        _itineraryService = itineraryService;
        _aiService = aiService;
    }

    [HttpPost("stream")]
    public async Task Stream([FromBody] ChatRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
        {
            Response.StatusCode = StatusCodes.Status400BadRequest;
            await Response.WriteAsync("data: Message is required.\n\n", cancellationToken);
            return;
        }

        Response.Headers.ContentType = "text/event-stream; charset=utf-8";
        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Connection = "keep-alive";

        var history = (request.History ?? new List<ChatMessage>())
            .Where(message => !string.IsNullOrWhiteSpace(message.Content))
            .ToList();

        await foreach (var token in _aiService.StreamChatAsync(
            request.Message,
            history,
            AIPrompts.ChatSystemPrompt,
            cancellationToken))
        {
            await Response.WriteAsync($"data: {JsonSerializer.Serialize(token)}\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }

        await Response.WriteAsync("event: done\ndata: {}\n\n", cancellationToken);
        await Response.Body.FlushAsync(cancellationToken);
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

        var shownIds = request.ShownServiceIds ?? new List<int>();
        var intent = await DetectIntentAsync(history, request.Message);
        var destination = await ResolveDestinationAsync(intent.Destination, history, request.Message);
        intent = ApplyIntentFallbacks(intent, request.Message, destination);

        ChatResponse response = intent.Intent switch
        {
            GenerateItineraryIntent => await HandleGenerateItineraryAsync(destination, intent),
            SearchHotelIntent => await HandleServiceSearchAsync(ServiceType.Hotel, destination, intent.Budget, shownIds),
            SearchTourIntent => await HandleServiceSearchAsync(ServiceType.Tour, destination, intent.Budget, shownIds),
            ShowMoreIntent => await HandleShowMoreAsync(destination, history, shownIds),
            AskPriceIntent => await HandleAskPriceAsync(destination, request.Message),
            _ => await CreateGeneralResponseAsync(request.Message, history)
        };

        return Ok(response);
    }

    private async Task<ChatIntentAnalysis> DetectIntentAsync(IEnumerable<ChatMessage> history, string message)
    {
        string conversationContext = BuildConversationContext(history, message);
        string intentPrompt = $@"Phân tích hội thoại du lịch sau:
{conversationContext}

Trả về JSON với format:
{{
  ""intent"": ""generate_itinerary"" | ""search_hotel"" | ""search_tour"" | ""ask_price"" | ""show_more"" | ""general_question"",
  ""destination"": ""tên tỉnh hoặc null"",
  ""days"": số ngày hoặc null,
  ""budget"": ngân sách hoặc null
}}

Yêu cầu:
- destination là tên tỉnh/thành phố Việt Nam nếu có thể suy ra từ context.
- days là TỔNG số ngày nếu người dùng đang nói về lịch trình/chuyến đi.
- budget phải là số VND nếu trong câu có các cụm như 500k, 2 triệu, 1500000.
- Nếu không xác định được thì để null.
- Nếu người dùng hỏi 'còn cái nào khác không?', 'chỉ có vậy thôi à?', 'cho xem thêm', 'có lựa chọn khác không?', 'chỉ có 1 thôi à?' thì intent = show_more.";

        var rawIntent = await _aiService.CallApiAsync(
            intentPrompt,
            systemPrompt: AIPrompts.IntentClassifierSystemPrompt,
            requireJsonResponse: true);

        var intent = ParseIntentAnalysis(rawIntent);
        intent.Budget ??= ExtractBudgetFromText(message);
        intent.Days ??= ExtractDaysFromText(message);
        return intent;
    }

    private async Task<ChatResponse> HandleGenerateItineraryAsync(Destination? destination, ChatIntentAnalysis intent)
    {
        if (destination == null)
        {
            return new ChatResponse
            {
                Text = "Bạn muốn mình lên lịch trình cho điểm đến nào?",
                Type = "text"
            };
        }

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        int? userId = userIdClaim != null && int.TryParse(userIdClaim.Value, CultureInfo.InvariantCulture, out var parsedId)
            ? parsedId
            : null; // Anonymous — vẫn generate nhưng không log vào DB

        var days = Math.Clamp(intent.Days ?? 3, 1, 14);
        var genReq = new GenerateItineraryRequest(destination.DestinationId, days, DateTime.Today);
        var itinerary = await _itineraryService.GenerateAndLogItineraryAsync(userId, genReq);

        if (itinerary == null)
        {
            return new ChatResponse
            {
                Text = $"Mình chưa tạo được lịch trình {days} ngày cho {destination.Name}. Bạn thử lại giúp mình nhé.",
                Type = "text"
            };
        }

        return new ChatResponse
        {
            Text = $"Tôi đã lập xong lịch trình {days} ngày cho chuyến đi {destination.Name} của bạn!",
            Type = "itinerary",
            Data = itinerary
        };
    }

    private async Task<ChatResponse> HandleServiceSearchAsync(
        ServiceType serviceType,
        Destination? destination,
        decimal? budget,
        IReadOnlyCollection<int>? excludeIds = null)
    {
        if (destination == null)
        {
            return new ChatResponse
            {
                Text = serviceType == ServiceType.Hotel
                    ? "Bạn muốn xem khách sạn ở tỉnh/thành nào?"
                    : "Bạn muốn tìm tour ở tỉnh/thành nào?",
                Type = "text"
            };
        }

        var services = await LoadServiceCandidatesAsync(serviceType, destination, requireDestination: true);
        var allItems = services
            .Select(MapChatServiceItem)
            .OrderBy(item => item.Price)
            .ThenBy(item => item.Name)
            .ToList();

        if (allItems.Count == 0)
        {
            return new ChatResponse
            {
                Text = serviceType == ServiceType.Hotel
                    ? $"Mình chưa tìm thấy khách sạn còn chỗ ở {destination.Name}."
                    : $"Mình chưa tìm thấy tour còn chỗ ở {destination.Name}.",
                Type = "text"
            };
        }

        // Loại trừ các dịch vụ đã hiển thị trước đó
        var items = excludeIds is { Count: > 0 }
            ? allItems.Where(item => !excludeIds.Contains(item.Id)).ToList()
            : allItems;

        var filteredItems = budget.HasValue
            ? items.Where(item => item.Price <= budget.Value).Take(5).ToList()
            : items.Take(5).ToList();

        if (filteredItems.Count == 0 && budget.HasValue)
        {
            var fallbackItems = items.Take(3).ToList();
            return new ChatResponse
            {
                Text = serviceType == ServiceType.Hotel
                    ? $"Mình chưa thấy khách sạn ở {destination.Name} dưới {budget.Value:N0}đ. Đây là vài lựa chọn gần mức ngân sách nhất."
                    : $"Mình chưa thấy tour ở {destination.Name} dưới {budget.Value:N0}đ. Đây là vài lựa chọn gần mức ngân sách nhất.",
                Type = "service",
                Data = fallbackItems
            };
        }

        var intro = serviceType == ServiceType.Hotel
            ? $"Mình tìm thấy {filteredItems.Count} khách sạn còn chỗ ở {destination.Name}"
            : $"Mình tìm thấy {filteredItems.Count} tour còn chỗ ở {destination.Name}";

        if (budget.HasValue)
        {
            intro += $" dưới {budget.Value:N0}đ";
        }

        return new ChatResponse
        {
            Text = $"{intro}.",
            Type = "service",
            Data = filteredItems
        };
    }

    /// <summary>
    /// Xử lý yêu cầu "xem thêm" — trả về các dịch vụ chưa được hiển thị.
    /// Phân tích context để xác định loại dịch vụ và điểm đến từ lịch sử hội thoại.
    /// </summary>
    private async Task<ChatResponse> HandleShowMoreAsync(
        Destination? destination,
        IEnumerable<ChatMessage> history,
        IReadOnlyCollection<int> shownIds)
    {
        // Suy ra loại dịch vụ từ lịch sử hội thoại
        var historyText = string.Join(" ", history.Select(h => h.Content));
        var normalizedHistory = NormalizeText(historyText);
        var serviceType = HasAny(normalizedHistory, "tour") && !HasAny(normalizedHistory, "khach san", "hotel", "resort")
            ? ServiceType.Tour
            : ServiceType.Hotel;

        if (destination == null)
        {
            return new ChatResponse
            {
                Text = "Bạn muốn mình tìm thêm dịch vụ ở điểm đến nào?",
                Type = "text"
            };
        }

        var services = await LoadServiceCandidatesAsync(serviceType, destination, requireDestination: true);
        var allItems = services
            .Select(MapChatServiceItem)
            .OrderBy(item => item.Price)
            .ThenBy(item => item.Name)
            .ToList();

        // Các dịch vụ chưa hiển thị
        var newItems = shownIds.Count > 0
            ? allItems.Where(item => !shownIds.Contains(item.Id)).Take(5).ToList()
            : allItems.Take(5).ToList();

        var typeName = serviceType == ServiceType.Hotel ? "khách sạn" : "tour";

        if (newItems.Count == 0)
        {
            var total = allItems.Count;
            return new ChatResponse
            {
                Text = total == 0
                    ? $"Hiện tại hệ thống chưa có {typeName} nào còn chỗ ở {destination.Name} bạn ơi."
                    : $"Mình đã hiển thị toàn bộ {total} {typeName} còn chỗ ở {destination.Name} rồi. Hiện không còn lựa chọn nào khác trong hệ thống.",
                Type = "text"
            };
        }

        return new ChatResponse
        {
            Text = $"Đây là {newItems.Count} {typeName} khác còn chỗ ở {destination.Name} bạn chưa xem.",
            Type = "service",
            Data = newItems
        };
    }

    private async Task<ChatResponse> HandleAskPriceAsync(Destination? destination, string message)
    {
        var candidateTypes = InferServiceTypesFromMessage(message);
        var services = await LoadServiceCandidatesAsync(null, destination, requireDestination: false, candidateTypes);

        if (services.Count == 0)
        {
            return new ChatResponse
            {
                Text = destination == null
                    ? "Bạn đang hỏi giá của dịch vụ nào và ở đâu? Mình cần thêm tên dịch vụ hoặc điểm đến để tìm giá chính xác."
                    : $"Mình chưa tìm thấy dịch vụ phù hợp ở {destination.Name} để báo giá.",
                Type = "text"
            };
        }

        var bestMatch = services
            .Select(service => new
            {
                Service = service,
                Score = ScoreServiceMatch(service, message, destination)
            })
            .OrderByDescending(item => item.Score)
            .ThenBy(item => ResolveDisplayPrice(item.Service))
            .FirstOrDefault();

        if (bestMatch == null || bestMatch.Score <= 0)
        {
            return new ChatResponse
            {
                Text = "Mình chưa xác định được bạn đang hỏi giá của dịch vụ nào. Bạn có thể nói rõ tên tour hoặc khách sạn giúp mình không?",
                Type = "text"
            };
        }

        var nextAvailability = await _db.ServiceAvailabilities
            .AsNoTracking()
            .Where(availability => availability.ServiceId == bestMatch.Service.ServiceId
                && availability.Date >= DateTime.Today
                && availability.TotalStock - availability.BookedCount - availability.HeldCount > 0)
            .OrderBy(availability => availability.Date)
            .ThenBy(availability => availability.Price)
            .Select(availability => new
            {
                availability.Date,
                availability.Price,
                RemainingStock = availability.TotalStock - availability.BookedCount - availability.HeldCount
            })
            .FirstOrDefaultAsync();

        if (nextAvailability != null)
        {
            return new ChatResponse
            {
                Text =
                    $"Giá gần nhất của {bestMatch.Service.Name} hiện là {nextAvailability.Price:N0}đ vào ngày {nextAvailability.Date:dd/MM/yyyy}. Còn {nextAvailability.RemainingStock} chỗ/phòng trống.",
                Type = "text"
            };
        }

        return new ChatResponse
        {
            Text = $"Hiện mình chưa thấy lịch còn chỗ sắp tới của {bestMatch.Service.Name}. Giá cơ bản hiện tại là {bestMatch.Service.BasePrice:N0}đ.",
            Type = "text"
        };
    }

    private async Task<ChatResponse> CreateGeneralResponseAsync(string message, List<ChatMessage> history)
    {
        string generalResponse = await _aiService.CallApiAsync(
            message,
            history,
            AIPrompts.ChatSystemPrompt);

        return new ChatResponse
        {
            Text = generalResponse,
            Type = "text"
        };
    }

    private async Task<List<Service>> LoadServiceCandidatesAsync(
        ServiceType? serviceType,
        Destination? destination,
        bool requireDestination,
        IReadOnlyCollection<ServiceType>? allowedTypes = null)
    {
        if (requireDestination && destination == null)
        {
            return new List<Service>();
        }

        var query = _db.Services
            .AsNoTracking()
            .Include(service => service.TouristSpot)
                .ThenInclude(spot => spot!.Destination)
            .Include(service => service.ServiceSpots)
                .ThenInclude(serviceSpot => serviceSpot.TouristSpot)
                    .ThenInclude(spot => spot.Destination)
            .Include(service => service.Availabilities)
            .Where(service => service.IsActive);

        if (serviceType.HasValue)
        {
            query = query.Where(service => service.ServiceType == serviceType.Value);
        }

        if (allowedTypes is { Count: > 0 })
        {
            query = query.Where(service => allowedTypes.Contains(service.ServiceType));
        }

        if (destination != null)
        {
            query = query.Where(service =>
                (service.TouristSpot != null && service.TouristSpot.DestinationId == destination.DestinationId)
                || service.ServiceSpots.Any(serviceSpot => serviceSpot.TouristSpot.DestinationId == destination.DestinationId));
        }

        // Chỉ trả về dịch vụ còn chỗ trống trong tương lai (tránh gợi ý dịch vụ đã hết chỗ)
        query = query.Where(service =>
            service.Availabilities.Any(availability =>
                availability.Date >= DateTime.Today
                && (availability.TotalStock - availability.BookedCount - availability.HeldCount) > 0));

        return await query.ToListAsync();
    }

    private async Task<Destination?> ResolveDestinationAsync(string? detectedDestination, IEnumerable<ChatMessage> history, string message)
    {
        var destinations = await _db.Destinations
            .AsNoTracking()
            .ToListAsync();

        var directMatch = FindDestinationMatch(destinations, detectedDestination);
        if (directMatch != null)
        {
            return directMatch;
        }

        var normalizedConversation = NormalizeText(BuildConversationContext(history, message));
        return destinations
            .Select(destination => new
            {
                Destination = destination,
                Score = ScoreDestinationMention(normalizedConversation, destination.Name)
            })
            .Where(item => item.Score > 0)
            .OrderByDescending(item => item.Score)
            .ThenByDescending(item => item.Destination.Name.Length)
            .Select(item => item.Destination)
            .FirstOrDefault();
    }

    private static ChatIntentAnalysis ApplyIntentFallbacks(ChatIntentAnalysis intent, string message, Destination? destination)
    {
        intent.Intent = NormalizeIntent(intent.Intent);
        intent.Budget ??= ExtractBudgetFromText(message);
        intent.Days ??= ExtractDaysFromText(message);

        if (intent.Intent != GeneralQuestionIntent)
        {
            return intent;
        }

        var normalizedMessage = NormalizeText(message);

        // Phát hiện yêu cầu "xem thêm" / "còn cái nào khác"
        if (HasAny(normalizedMessage,
            "con cai nao khac", "xem them", "cho xem them", "co lua chon khac",
            "chi co 1 thoi", "chi co vay thoi", "co nhieu hon khong", "them lua chon",
            "lua chon khac", "ket qua khac", "hien thi them", "tim them"))
        {
            intent.Intent = ShowMoreIntent;
            return intent;
        }

        var isPriceQuestion = normalizedMessage.Contains("bao nhieu", StringComparison.Ordinal)
            || normalizedMessage.Contains("gia", StringComparison.Ordinal)
            || normalizedMessage.Contains("chi phi", StringComparison.Ordinal);

        if (HasAny(normalizedMessage, "khach san", "hotel", "resort", "homestay", "villa"))
        {
            intent.Intent = isPriceQuestion ? AskPriceIntent : SearchHotelIntent;
            return intent;
        }

        if (HasAny(normalizedMessage, "tour"))
        {
            intent.Intent = isPriceQuestion ? AskPriceIntent : SearchTourIntent;
            return intent;
        }

        if (HasAny(normalizedMessage, "lich trinh", "itinerary", "plan", "them 1 ngay", "them 2 ngay", "them ngay", "doi lich", "sua lich"))
        {
            intent.Intent = GenerateItineraryIntent;
            return intent;
        }

        if (destination != null
            && intent.Days.HasValue
            && !HasAny(normalizedMessage, "khach san", "hotel", "tour"))
        {
            intent.Intent = GenerateItineraryIntent;
            return intent;
        }

        if (isPriceQuestion && destination != null)
        {
            intent.Intent = AskPriceIntent;
        }

        return intent;
    }

    private static ChatIntentAnalysis ParseIntentAnalysis(string rawIntent)
    {
        var result = new ChatIntentAnalysis();

        if (string.IsNullOrWhiteSpace(rawIntent))
        {
            return result;
        }

        try
        {
            using var document = JsonDocument.Parse(rawIntent);
            var root = document.RootElement;

            result.Intent = NormalizeIntent(ReadJsonString(root, "intent"));
            result.Destination = NormalizeNullableString(ReadJsonString(root, "destination"));
            result.Days = ReadJsonInt(root, "days");
            result.Budget = ReadJsonDecimal(root, "budget");
        }
        catch
        {
            result.Intent = GeneralQuestionIntent;
        }

        return result;
    }

    private static string BuildConversationContext(IEnumerable<ChatMessage> history, string currentMessage)
    {
        var lines = history
            .Select(message => $"{NormalizeRole(message.Role)}: {message.Content.Trim()}")
            .ToList();

        lines.Add($"user: {currentMessage.Trim()}");
        return string.Join(Environment.NewLine, lines);
    }

    private static ChatServiceItem MapChatServiceItem(Service service)
    {
        return new ChatServiceItem
        {
            Id = service.ServiceId,
            ServiceId = service.ServiceId,
            Name = service.Name,
            Price = ResolveDisplayPrice(service),
            Location = ResolvePrimarySpot(service)?.Name,
            ServiceType = service.ServiceType.ToString()
        };
    }

    private static decimal ResolveDisplayPrice(Service service)
    {
        var nextAvailablePrice = service.Availabilities
            .Where(availability => availability.Date >= DateTime.Today && GetRemainingStock(availability) > 0)
            .OrderBy(availability => availability.Date)
            .ThenBy(availability => availability.Price)
            .Select(availability => availability.Price)
            .FirstOrDefault();

        return nextAvailablePrice > 0 ? nextAvailablePrice : service.BasePrice;
    }

    private static IReadOnlyCollection<ServiceType> InferServiceTypesFromMessage(string message)
    {
        var normalizedMessage = NormalizeText(message);
        var types = new List<ServiceType>();

        if (HasAny(normalizedMessage, "khach san", "hotel", "resort", "homestay", "villa"))
        {
            types.Add(ServiceType.Hotel);
        }

        if (HasAny(normalizedMessage, "tour"))
        {
            types.Add(ServiceType.Tour);
        }

        return types;
    }

    private static int ScoreServiceMatch(Service service, string message, Destination? destination)
    {
        var normalizedMessage = NormalizeText(message);
        var score = ScoreTextMatch(normalizedMessage, service.Name, 120, 18);

        var primarySpot = ResolvePrimarySpot(service);
        score += ScoreTextMatch(normalizedMessage, primarySpot?.Name, 90, 15);

        foreach (var spot in service.ServiceSpots.Select(serviceSpot => serviceSpot.TouristSpot))
        {
            score += ScoreTextMatch(normalizedMessage, spot.Name, 45, 8);
        }

        if (destination != null && IsServiceInDestination(service, destination.DestinationId))
        {
            score += 20;
        }

        if (normalizedMessage.Contains(NormalizeText(service.ServiceType.ToString()), StringComparison.Ordinal))
        {
            score += 10;
        }

        return score;
    }

    private static int ScoreTextMatch(string normalizedMessage, string? candidate, int containsScore, int tokenScore)
    {
        if (string.IsNullOrWhiteSpace(candidate))
        {
            return 0;
        }

        var normalizedCandidate = NormalizeText(candidate);
        if (string.IsNullOrWhiteSpace(normalizedCandidate))
        {
            return 0;
        }

        if (normalizedMessage.Contains(normalizedCandidate, StringComparison.Ordinal))
        {
            return containsScore;
        }

        if (normalizedCandidate.Contains(normalizedMessage, StringComparison.Ordinal) && normalizedMessage.Length >= 4)
        {
            return containsScore / 2;
        }

        return normalizedCandidate
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(token => token.Length > 2 && normalizedMessage.Contains(token, StringComparison.Ordinal))
            .Distinct(StringComparer.Ordinal)
            .Sum(_ => tokenScore);
    }

    private static bool IsServiceInDestination(Service service, int destinationId)
    {
        return (service.TouristSpot != null && service.TouristSpot.DestinationId == destinationId)
            || service.ServiceSpots.Any(serviceSpot => serviceSpot.TouristSpot.DestinationId == destinationId);
    }

    private static TouristSpot? ResolvePrimarySpot(Service service)
    {
        if (service.TouristSpot != null)
        {
            return service.TouristSpot;
        }

        return service.ServiceSpots
            .OrderBy(serviceSpot => serviceSpot.VisitOrder)
            .Select(serviceSpot => serviceSpot.TouristSpot)
            .FirstOrDefault();
    }

    private static int GetRemainingStock(ServiceAvailability availability)
        => availability.TotalStock - availability.BookedCount - availability.HeldCount;

    private static Destination? FindDestinationMatch(IEnumerable<Destination> destinations, string? candidate)
    {
        if (string.IsNullOrWhiteSpace(candidate))
        {
            return null;
        }

        var normalizedCandidate = NormalizeText(candidate);

        return destinations
            .Select(destination => new
            {
                Destination = destination,
                Score = ScoreDestinationCandidate(normalizedCandidate, destination.Name)
            })
            .Where(item => item.Score > 0)
            .OrderByDescending(item => item.Score)
            .ThenByDescending(item => item.Destination.Name.Length)
            .Select(item => item.Destination)
            .FirstOrDefault();
    }

    private static int ScoreDestinationCandidate(string normalizedCandidate, string destinationName)
    {
        var normalizedDestination = NormalizeText(destinationName);

        if (normalizedCandidate == normalizedDestination)
        {
            return 200;
        }

        if (normalizedCandidate.Contains(normalizedDestination, StringComparison.Ordinal)
            || normalizedDestination.Contains(normalizedCandidate, StringComparison.Ordinal))
        {
            return 120;
        }

        return normalizedDestination
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Count(token => token.Length > 2 && normalizedCandidate.Contains(token, StringComparison.Ordinal)) * 20;
    }

    private static int ScoreDestinationMention(string normalizedConversation, string destinationName)
    {
        var normalizedDestination = NormalizeText(destinationName);

        if (normalizedConversation.Contains(normalizedDestination, StringComparison.Ordinal))
        {
            return 100 + normalizedDestination.Length;
        }

        return normalizedDestination
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Count(token => token.Length > 2 && normalizedConversation.Contains(token, StringComparison.Ordinal)) * 15;
    }

    private static int? ReadJsonInt(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out var value) || value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
        {
            return null;
        }

        return value.ValueKind switch
        {
            JsonValueKind.Number when value.TryGetInt32(out var number) => number,
            JsonValueKind.String => ExtractInteger(value.GetString()),
            _ => null
        };
    }

    private static decimal? ReadJsonDecimal(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out var value) || value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
        {
            return null;
        }

        return value.ValueKind switch
        {
            JsonValueKind.Number when value.TryGetDecimal(out var number) => number,
            JsonValueKind.String => ExtractBudgetFromText(value.GetString()),
            _ => null
        };
    }

    private static string? ReadJsonString(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out var value) || value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
        {
            return null;
        }

        return value.ValueKind switch
        {
            JsonValueKind.String => value.GetString(),
            JsonValueKind.Number => value.GetRawText(),
            JsonValueKind.True => bool.TrueString,
            JsonValueKind.False => bool.FalseString,
            _ => value.GetRawText()
        };
    }

    private static int? ExtractDaysFromText(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        var match = Regex.Match(NormalizeText(text), @"(?<days>\d+)\s*(ngay|dem)");
        if (!match.Success)
        {
            return null;
        }

        return int.TryParse(match.Groups["days"].Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var days)
            ? days
            : null;
    }

    private static int? ExtractInteger(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        var match = Regex.Match(text, @"\d+");
        if (!match.Success)
        {
            return null;
        }

        return int.TryParse(match.Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var value)
            ? value
            : null;
    }

    private static decimal? ExtractBudgetFromText(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        var normalized = NormalizeText(text);
        var matches = Regex.Matches(normalized, @"(?<amount>\d+(?:[.,]\d+)?)\s*(?<unit>trieu|tr|k|nghin|ngan|vnd|dong)?");

        foreach (Match match in matches)
        {
            var amountText = match.Groups["amount"].Value.Replace(',', '.');
            if (!decimal.TryParse(amountText, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var amount))
            {
                continue;
            }

            var unit = match.Groups["unit"].Value;
            if (string.IsNullOrWhiteSpace(unit))
            {
                if (amount >= 1000)
                {
                    return amount;
                }

                continue;
            }

            return unit switch
            {
                "trieu" or "tr" => amount * 1_000_000m,
                "k" or "nghin" or "ngan" => amount * 1_000m,
                "vnd" or "dong" => amount,
                _ => amount
            };
        }

        return null;
    }

    private static string NormalizeIntent(string? intent)
    {
        return intent?.Trim().ToLowerInvariant() switch
        {
            GenerateItineraryIntent => GenerateItineraryIntent,
            SearchHotelIntent => SearchHotelIntent,
            SearchTourIntent => SearchTourIntent,
            AskPriceIntent => AskPriceIntent,
            ShowMoreIntent => ShowMoreIntent,
            _ => GeneralQuestionIntent
        };
    }

    private static string? NormalizeNullableString(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim().Trim('"');
        return trimmed.Equals("null", StringComparison.OrdinalIgnoreCase)
            || trimmed.Equals("none", StringComparison.OrdinalIgnoreCase)
            || trimmed.Equals("unknown", StringComparison.OrdinalIgnoreCase)
                ? null
                : trimmed;
    }

    private static string NormalizeRole(string? role)
    {
        return role?.Trim().ToLowerInvariant() switch
        {
            "assistant" => "assistant",
            _ => "user"
        };
    }

    private static bool HasAny(string source, params string[] keywords)
        => keywords.Any(keyword => source.Contains(keyword, StringComparison.Ordinal));

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
