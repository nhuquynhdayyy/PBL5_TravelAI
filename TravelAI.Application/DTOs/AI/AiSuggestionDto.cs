using TravelAI.Application.DTOs.Spot;

namespace TravelAI.Application.DTOs.AI;

public class AiSuggestionDto
{
    public SpotDto Spot { get; set; } = null!;
    public double TotalScore { get; set; }
    public double StyleMatchScore { get; set; }
    public double BudgetMatchScore { get; set; }
    public double PaceMatchScore { get; set; }
    public double DistanceScore { get; set; }
    public double RatingScore { get; set; }
    public double AverageRating { get; set; }
}
