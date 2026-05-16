namespace TravelAI.Application.DTOs.Review;

public class ReviewStatsDto
{
    public int TotalReviews { get; set; }
    public double AverageRating { get; set; }
    public int FiveStars { get; set; }
    public int FourStars { get; set; }
    public int ThreeStars { get; set; }
    public int TwoStars { get; set; }
    public int OneStar { get; set; }
    public int RepliedCount { get; set; }
    public int UnrepliedCount { get; set; }
}
