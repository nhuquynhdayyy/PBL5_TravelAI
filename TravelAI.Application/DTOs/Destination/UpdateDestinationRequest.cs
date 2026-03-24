using Microsoft.AspNetCore.Http;

namespace TravelAI.Application.DTOs.Destination;

public class UpdateDestinationRequest
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    // Cho phép null vì Admin có thể không muốn đổi ảnh
    public IFormFile? Image { get; set; } 
}