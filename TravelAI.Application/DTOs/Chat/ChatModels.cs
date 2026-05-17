using System.Text.Json.Serialization;

namespace TravelAI.Application.DTOs.Chat;

public class ChatMessage
{
    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}

public class ChatRequest
{
    public string Message { get; set; } = string.Empty;
    public List<ChatMessage> History { get; set; } = new();
}

public class ChatIntentAnalysis
{
    public string Intent { get; set; } = "general_question";
    public string? Destination { get; set; }
    public int? Days { get; set; }
    public decimal? Budget { get; set; }
}

public class ChatServiceItem
{
    public int Id { get; set; }

    [JsonPropertyName("service_id")]
    public int? ServiceId { get; set; }

    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string? Location { get; set; }
    public string ServiceType { get; set; } = string.Empty;
}

public class ChatResponse
{
    public string Text { get; set; } = string.Empty;
    public string Type { get; set; } = "text"; // text, itinerary, hotel, service, booking
    public object? Data { get; set; }
}
