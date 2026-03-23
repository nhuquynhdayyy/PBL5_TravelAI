using System.Text.Json.Serialization;

namespace TravelAI.Application.DTOs.AI;

// 1. Class cao nhất: Toàn bộ lịch trình
public class ItineraryResponseDto
{
    [JsonPropertyName("trip_title")]
    public string TripTitle { get; set; } = string.Empty;

    [JsonPropertyName("destination")]
    public string Destination { get; set; } = string.Empty;

    [JsonPropertyName("total_estimated_cost")]
    public decimal TotalEstimatedCost { get; set; }

    [JsonPropertyName("currency")]
    public string Currency { get; set; } = "VND";

    [JsonPropertyName("days")]
    public List<DayDto> Days { get; set; } = new();
}

// 2. Class cho từng ngày
public class DayDto
{
    [JsonPropertyName("day")]
    public int DayNumber { get; set; }

    [JsonPropertyName("daily_cost")]
    public decimal DailyCost { get; set; }

    [JsonPropertyName("activities")]
    public ActivitiesDto Activities { get; set; } = new();
}

// 3. Khối hoạt động Sáng - Chiều - Tối
public class ActivitiesDto
{
    [JsonPropertyName("morning")]
    public List<ActivityItemDto> Morning { get; set; } = new();

    [JsonPropertyName("afternoon")]
    public List<ActivityItemDto> Afternoon { get; set; } = new();

    [JsonPropertyName("evening")]
    public List<ActivityItemDto> Evening { get; set; } = new();
}

// 4. Chi tiết từng hoạt động
public class ActivityItemDto
{
    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("location")]
    public string Location { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("duration")]
    public string Duration { get; set; } = string.Empty;

    [JsonPropertyName("estimated_cost")]
    public decimal EstimatedCost { get; set; }
}