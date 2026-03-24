using Microsoft.AspNetCore.Http;

namespace TravelAI.Application.DTOs.Destination;

public class CreateDestinationRequest
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public IFormFile Image { get; set; } = null!; // Nhận file từ Form-data
}