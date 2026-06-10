using System.Text.Json.Serialization;

namespace TravelAI.Application.DTOs.Destination;

public record DestinationDto(
    int Id,
    string Name,
    string? Description,
    string? ImageUrl,
    [property: JsonPropertyName("hotels_count")] int HotelsCount = 0,
    [property: JsonPropertyName("tours_count")] int ToursCount = 0
);