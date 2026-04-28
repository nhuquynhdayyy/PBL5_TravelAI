using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelAI.Application.DTOs.Partner;
using TravelAI.Application.DTOs.Service;
using TravelAI.Application.Interfaces;
using TravelAI.Domain.Enums;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly IServiceService _serviceService;
    private readonly ApplicationDbContext _context;

    public AdminController(IServiceService serviceService, ApplicationDbContext context)
    {
        _serviceService = serviceService;
        _context = context;
    }

    [HttpGet("pending-services")]
    public async Task<IActionResult> GetPendingServices()
    {
        var data = await _serviceService.GetPendingServicesAsync();
        return Ok(data);
    }

    [HttpPost("services/{id}/approve")]
    public async Task<IActionResult> ApproveService(int id)
    {
        var success = await _serviceService.ApproveAsync(id);
        if (!success)
        {
            return NotFound(new { message = "Khong tim thay dich vu." });
        }

        return Ok(new { success = true, message = "Da duyet dich vu." });
    }

    [HttpPost("services/{id}/reject")]
    public async Task<IActionResult> RejectService(int id, [FromBody] RejectServiceRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            return BadRequest(new { message = "Vui long nhap ly do tu choi." });
        }

        var adminUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var success = await _serviceService.RejectAsync(id, request.Reason, adminUserId);
        if (!success)
        {
            return NotFound(new { message = "Khong tim thay dich vu." });
        }

        return Ok(new { success = true, message = "Da tu choi dich vu." });
    }

    [HttpGet("pending-partners")]
    public async Task<IActionResult> GetPendingPartners()
    {
        var partners = await BuildPartnerReviewQuery()
            .Where(profile => profile.VerificationStatus != PartnerVerificationStatus.Approved.ToString())
            .ToListAsync();

        return Ok(partners);
    }

    [HttpGet("partners")]
    public async Task<IActionResult> GetAllPartners()
    {
        var partners = await BuildPartnerReviewQuery().ToListAsync();
        return Ok(partners);
    }

    [HttpPost("partners/{profileId}/approve")]
    public async Task<IActionResult> ApprovePartner(int profileId, [FromBody] PartnerApprovalActionRequest? request)
    {
        var profile = await _context.PartnerProfiles.FirstOrDefaultAsync(item => item.ProfileId == profileId);
        if (profile == null)
        {
            return NotFound(new { message = "Khong tim thay ho so doi tac." });
        }

        profile.VerificationStatus = PartnerVerificationStatus.Approved;
        profile.ReviewNote = NormalizeOptionalText(request?.ReviewNote);
        profile.ReviewedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Da duyet doi tac." });
    }

    [HttpPost("partners/{profileId}/reject")]
    public async Task<IActionResult> RejectPartner(int profileId, [FromBody] PartnerApprovalActionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ReviewNote))
        {
            return BadRequest(new { message = "Vui long nhap ly do tu choi." });
        }

        var profile = await _context.PartnerProfiles.FirstOrDefaultAsync(item => item.ProfileId == profileId);
        if (profile == null)
        {
            return NotFound(new { message = "Khong tim thay ho so doi tac." });
        }

        profile.VerificationStatus = PartnerVerificationStatus.Rejected;
        profile.ReviewNote = request.ReviewNote.Trim();
        profile.ReviewedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Da tu choi doi tac." });
    }

    [HttpPost("partners/{profileId}/need-more-info")]
    public async Task<IActionResult> RequestMoreInfo(int profileId, [FromBody] PartnerApprovalActionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ReviewNote))
        {
            return BadRequest(new { message = "Vui long nhap noi dung can bo sung." });
        }

        var profile = await _context.PartnerProfiles.FirstOrDefaultAsync(item => item.ProfileId == profileId);
        if (profile == null)
        {
            return NotFound(new { message = "Khong tim thay ho so doi tac." });
        }

        profile.VerificationStatus = PartnerVerificationStatus.NeedMoreInfo;
        profile.ReviewNote = request.ReviewNote.Trim();
        profile.ReviewedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Da yeu cau doi tac bo sung thong tin." });
    }

    private static string? NormalizeOptionalText(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }

    private IQueryable<AdminPartnerReviewDto> BuildPartnerReviewQuery()
    {
        return _context.PartnerProfiles
            .AsNoTracking()
            .Include(profile => profile.User)
            .OrderByDescending(profile => profile.SubmittedAt ?? DateTime.MinValue)
            .ThenByDescending(profile => profile.ProfileId)
            .Select(profile => new AdminPartnerReviewDto
            {
                ProfileId = profile.ProfileId,
                UserId = profile.UserId,
                FullName = profile.User.FullName,
                Email = profile.User.Email,
                BusinessName = profile.BusinessName,
                TaxCode = profile.TaxCode,
                ContactPhone = profile.ContactPhone,
                BankAccount = profile.BankAccount,
                Address = profile.Address,
                Description = profile.Description,
                BusinessLicenseUrl = profile.BusinessLicenseUrl,
                VerificationStatus = profile.VerificationStatus.ToString(),
                ReviewNote = profile.ReviewNote,
                SubmittedAt = profile.SubmittedAt,
                ReviewedAt = profile.ReviewedAt
            });
    }
}
