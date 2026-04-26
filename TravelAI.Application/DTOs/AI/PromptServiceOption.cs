using TravelAI.Domain.Enums;

namespace TravelAI.Application.DTOs.AI;

public class PromptServiceOption
{
    public int ServiceId { get; init; }
    public string Name { get; init; } = string.Empty;
    public ServiceType ServiceType { get; init; }
    public string Location { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public decimal Price { get; init; }
    public string PriceUnit { get; init; } = string.Empty;
    public List<DateTime> AvailableDates { get; init; } = new();
}
