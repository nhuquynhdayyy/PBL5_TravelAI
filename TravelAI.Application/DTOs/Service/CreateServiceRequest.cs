using Microsoft.AspNetCore.Http;
using TravelAI.Domain.Enums;

namespace TravelAI.Application.DTOs.Service;

public class CreateServiceRequest
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal BasePrice { get; set; }
    public int ServiceType { get; set; }
    public int? SpotId { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public List<IFormFile>? Images { get; set; } // Upload nhiều ảnh
}