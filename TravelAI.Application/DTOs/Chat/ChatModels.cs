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

public class ChatResponse
{
    public string Text { get; set; } = string.Empty;
    public string Type { get; set; } = "text"; // text, itinerary, hotel, booking
    public object? Data { get; set; } // Chứa list hotels hoặc timeline
}
