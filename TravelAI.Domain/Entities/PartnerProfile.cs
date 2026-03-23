namespace TravelAI.Domain.Entities;

public class PartnerProfile {
    public int ProfileId { get; set; }
    public int UserId { get; set; }
    public string BusinessName { get; set; } = string.Empty;
    public string? TaxCode { get; set; }
    public string? BankAccount { get; set; }
    public string? Address { get; set; }
    public string? Description { get; set; }

    public User User { get; set; } = null!;
}