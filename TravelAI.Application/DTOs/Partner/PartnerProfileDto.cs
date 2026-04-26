namespace TravelAI.Application.DTOs.Partner;

public class PartnerProfileDto
{
    public string BusinessName { get; set; } = string.Empty;
    public string? TaxCode { get; set; }
    public string? BankAccount { get; set; }
    public string? Address { get; set; }
    public string? Description { get; set; }
}
