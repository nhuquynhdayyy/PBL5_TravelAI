namespace TravelAI.Domain.Entities;
using TravelAI.Domain.Enums;

public class UserPreference {
    public int PrefId { get; set; }
    public int UserId { get; set; }
    public string TravelStyle { get; set; } = string.Empty;
    public BudgetLevel BudgetLevel { get; set; }
    public TravelPace TravelPace { get; set; }
    public string? CuisinePref { get; set; }

    public User User { get; set; } = null!;
}