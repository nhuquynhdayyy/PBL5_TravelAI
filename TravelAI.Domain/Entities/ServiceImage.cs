namespace TravelAI.Domain.Entities;

public class ServiceImage {
    public int ImageId { get; set; }
    public int ServiceId { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public bool IsThumbnail { get; set; }

    public Service Service { get; set; } = null!;
}