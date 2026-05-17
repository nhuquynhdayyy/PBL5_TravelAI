namespace TravelAI.Domain.Entities;
using TravelAI.Domain.Enums;

public class Itinerary {
    public int ItineraryId { get; set; }
    public int UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal EstimatedCost { get; set; }
    public ItineraryStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public User User { get; set; } = null!;
    public ICollection<ItineraryItem> Items { get; set; } = new List<ItineraryItem>();
}
