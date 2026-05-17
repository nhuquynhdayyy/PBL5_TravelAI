namespace TravelAI.Application.DTOs.Review;

public class ReviewItemDto
{
    public int ReviewId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string? CustomerAvatarUrl { get; set; }
    public int Rating { get; set; }
    public string? Comment { get; set; }
    public string? ReplyText { get; set; }
    public DateTime? ReplyTime { get; set; }
    public DateTime CreatedAt { get; set; }
}
