namespace TravelAI.Domain.Entities;

public class ServiceAttribute {
    public int AttrId { get; set; }
    public int ServiceId { get; set; }
    public string AttrKey { get; set; } = string.Empty;
    public string AttrValue { get; set; } = string.Empty;

    public Service Service { get; set; } = null!;
}
