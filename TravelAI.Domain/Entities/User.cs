namespace TravelAI.Domain.Entities;

public class User {
    public int UserId { get; set; }
    public int RoleId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; } = true;
    public string? AvatarUrl { get; set; }
    public Role Role { get; set; } = null!;
    public PartnerProfile? PartnerProfile { get; set; }
    public ICollection<UserPreference> Preferences { get; set; } = new List<UserPreference>();
    public ICollection<Service> Services { get; set; } = new List<Service>(); // Đối với Partner
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
    public ICollection<Itinerary> Itineraries { get; set; } = new List<Itinerary>();
}