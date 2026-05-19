namespace TravelAI.Domain.Entities;

public class AISuggestionLog {
    public int LogId { get; set; }
    public int UserId { get; set; }
    public string UserPrompt { get; set; } = string.Empty;
    public string AiResponseJson { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}