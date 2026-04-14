namespace TravelAI.Application.DTOs.Chat;

public record ChatRequest(string Message);

public class ChatResponse
{
    public string Text { get; set; } = string.Empty;
    public string Type { get; set; } = "text"; // text, itinerary, hotel, booking
    public object? Data { get; set; } // Chứa list hotels hoặc timeline
}