using System.Text.Json.Serialization;

namespace TravelAI.Application.DTOs.AI;

public class ItineraryResponseDto {
    [JsonPropertyName("itineraryId")]
    public int ItineraryId { get; set; }

    [JsonPropertyName("itinerary_id")]
    public int ItineraryIdAlias { get => ItineraryId; set => ItineraryId = value; }

    [JsonPropertyName("tripTitle")]
    public string TripTitle { get; set; } = "";

    [JsonPropertyName("trip_title")]
    public string TripTitleAlias { get => TripTitle; set => TripTitle = value; }

    [JsonPropertyName("destination")]
    public string Destination { get; set; } = "";

    [JsonPropertyName("startDate")]
    public DateTime StartDate { get; set; }

    [JsonPropertyName("start_date")]
    public DateTime StartDateAlias { get => StartDate; set => StartDate = value; }

    [JsonPropertyName("endDate")]
    public DateTime EndDate { get; set; }

    [JsonPropertyName("end_date")]
    public DateTime EndDateAlias { get => EndDate; set => EndDate = value; }

    [JsonPropertyName("totalEstimatedCost")]
    public decimal TotalEstimatedCost { get; set; }

    [JsonPropertyName("total_estimated_cost")]
    public decimal TotalEstimatedCostAlias { get => TotalEstimatedCost; set => TotalEstimatedCost = value; }

    [JsonPropertyName("days")]
    public List<DayPlanDto> Days { get; set; } = new();
}

public class DayPlanDto {
    [JsonPropertyName("day")]
    public int Day { get; set; }

    [JsonPropertyName("daily_cost")]
    public decimal DailyCost { get; set; }

    [JsonPropertyName("activities")]
    public List<ActivityDto> Activities { get; set; } = new();
}

public class ActivityDto {
    [JsonPropertyName("title")]
    public string Title { get; set; } = "";

    [JsonPropertyName("location")]
    public string Location { get; set; } = "";

    [JsonPropertyName("description")]
    public string Description { get; set; } = "";

    [JsonPropertyName("duration")]
    public string Duration { get; set; } = "";

    [JsonPropertyName("estimatedCost")]
    public decimal EstimatedCost { get; set; }

    [JsonPropertyName("estimated_cost")]
    public decimal EstimatedCostAlias { get => EstimatedCost; set => EstimatedCost = value; }
}
