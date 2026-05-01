namespace TravelAI.Domain.Entities;
using TravelAI.Domain.Enums;

public class PartnerProfile {
    public int ProfileId { get; set; }
    public int UserId { get; set; }
    public string BusinessName { get; set; } = string.Empty;
    public string? TaxCode { get; set; }
    public string? BankAccount { get; set; }
    public string? Address { get; set; }
    public string? Description { get; set; }
    public string? ContactPhone { get; set; }
    public string? BusinessLicenseUrl { get; set; }
    public PartnerVerificationStatus VerificationStatus { get; set; } = PartnerVerificationStatus.Pending;
    public string? ReviewNote { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }

    public User User { get; set; } = null!;
}
