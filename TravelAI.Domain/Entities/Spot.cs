namespace TravelAI.Domain.Entities;

public class Spot
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public string? Location { get; set; }

    // Khóa ngoại liên kết tới Destination (Tỉnh/Thành phố)
    public int DestinationId { get; set; }
    
    // Quan hệ điều hướng (Navigation Property)
    public virtual Destination? Destination { get; set; }
}