namespace TravelAI.Domain.Entities;

public class AISuggestionLog {
    public int LogId { get; set; }
    public int UserId { get; set; }
    public string UserPrompt { get; set; } = string.Empty;
    public string AiResponseJson { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Tên điểm đến được AI gợi ý — lưu trực tiếp để tránh parse JSON khi analytics.
    /// </summary>
    public string? DestinationName { get; set; }

    /// <summary>
    /// Tổng chi phí ước tính AI trả về — lưu trực tiếp để tránh parse JSON khi analytics.
    /// </summary>
    public decimal? EstimatedCost { get; set; }

    public User User { get; set; } = null!;
}