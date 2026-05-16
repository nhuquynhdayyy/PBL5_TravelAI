namespace TravelAI.Application.DTOs.Review;

public class PartnerReviewDto
{
    public int ReviewId { get; set; }
    public int ServiceId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string? CustomerAvatarUrl { get; set; }
    public int Rating { get; set; }
    public string? Comment { get; set; }
    public string? ReplyText { get; set; }
    public DateTime? ReplyTime { get; set; }
    public DateTime CreatedAt { get; set; }
}
