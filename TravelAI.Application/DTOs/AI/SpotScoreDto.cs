namespace TravelAI.Application.DTOs.AI;

public class SpotScoreDto
{
    public int SpotId { get; set; }
    public string SpotName { get; set; } = string.Empty;
    public double TotalScore { get; set; }
    public double StyleMatchScore { get; set; }
    public double BudgetMatchScore { get; set; }
    public double PaceMatchScore { get; set; }
    public double DistanceScore { get; set; }
    public double RatingScore { get; set; }
}
