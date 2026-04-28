using System.Text.Json.Serialization;

namespace TravelAI.Application.DTOs.AI;

public class BudgetEstimateRequest
{
    [JsonPropertyName("destination")]
    public string Destination { get; set; } = string.Empty;

    [JsonPropertyName("days")]
    public int Days { get; set; }

    [JsonPropertyName("people")]
    public int People { get; set; }

    [JsonPropertyName("travel_style")]
    public string TravelStyle { get; set; } = string.Empty;
}

public class BudgetEstimateResponse
{
    [JsonPropertyName("total")]
    public decimal Total { get; set; }

    [JsonPropertyName("breakdown")]
    public List<BudgetBreakdownItem> Breakdown { get; set; } = new();
}

public class BudgetBreakdownItem
{
    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }

    [JsonPropertyName("note")]
    public string Note { get; set; } = string.Empty;
}
