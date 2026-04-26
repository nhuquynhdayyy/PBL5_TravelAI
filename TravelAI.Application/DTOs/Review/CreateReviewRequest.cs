namespace TravelAI.Application.DTOs.Review;

public class CreateReviewRequest
{
    public int ServiceId { get; set; }
    public int Rating { get; set; }
    public string? Comment { get; set; }
}
