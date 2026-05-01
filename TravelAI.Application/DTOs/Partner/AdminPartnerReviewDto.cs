namespace TravelAI.Application.DTOs.Partner;

public class AdminPartnerReviewDto
{
    public int ProfileId { get; set; }
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string BusinessName { get; set; } = string.Empty;
    public string? TaxCode { get; set; }
    public string? ContactPhone { get; set; }
    public string? BankAccount { get; set; }
    public string? Address { get; set; }
    public string? Description { get; set; }
    public string? BusinessLicenseUrl { get; set; }
    public string VerificationStatus { get; set; } = "Pending";
    public string? ReviewNote { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
}
