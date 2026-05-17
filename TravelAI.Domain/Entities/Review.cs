namespace TravelAI.Domain.Entities;

public class Review {
    public int ReviewId { get; set; }
    public int ServiceId { get; set; }
    public int UserId { get; set; }
    public int Rating { get; set; }
    public string? Comment { get; set; }
    public string? ReplyText { get; set; }
    public DateTime? ReplyTime { get; set; }
    public DateTime CreatedAt { get; set; } // Vietnam time (UTC+7)

    public Service Service { get; set; } = null!;
    public User User { get; set; } = null!;
}
