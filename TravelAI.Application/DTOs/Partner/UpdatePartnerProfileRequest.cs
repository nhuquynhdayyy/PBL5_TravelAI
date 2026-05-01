using Microsoft.AspNetCore.Http;

namespace TravelAI.Application.DTOs.Partner;

public class UpdatePartnerProfileRequest
{
    public string BusinessName { get; set; } = string.Empty;
    public string? TaxCode { get; set; }
    public string? BankAccount { get; set; }
    public string? Address { get; set; }
    public string? Description { get; set; }
    public string? ContactPhone { get; set; }
    public IFormFile? BusinessLicenseFile { get; set; }
}
