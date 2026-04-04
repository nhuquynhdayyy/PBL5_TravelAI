namespace TravelAI.Application.DTOs.AI;

public class GenerateItineraryRequest
{
    public int DestinationId { get; set; }
    public int NumberOfDays { get; set; } // Ví dụ: 1-7 ngày
}