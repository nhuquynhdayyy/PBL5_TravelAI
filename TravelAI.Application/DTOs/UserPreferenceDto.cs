namespace TravelAI.Application.DTOs;

public class UserPreferenceDto
{
    public string TravelStyle { get; set; } = string.Empty;
    public int BudgetLevel { get; set; } // Map với Enum int
    public int TravelPace { get; set; }  // Map với Enum int
    public string? CuisinePref { get; set; }
}