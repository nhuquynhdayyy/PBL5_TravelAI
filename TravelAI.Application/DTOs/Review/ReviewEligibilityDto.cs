namespace TravelAI.Application.DTOs.Review;

public class ReviewEligibilityDto
{
    public bool CanReview { get; set; }
    public bool HasPaidBooking { get; set; }
    public bool HasReviewed { get; set; }
    public bool IsOwnerPartner { get; set; }
}
