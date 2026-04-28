using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelAI.Application.DTOs.Partner;
using TravelAI.Application.DTOs.Service;
using TravelAI.Application.DTOs.User;
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

    // ──────────────────────────────────────────────
    //  USER MANAGEMENT
    // ──────────────────────────────────────────────

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers([FromQuery] int page = 1, [FromQuery] string search = "", [FromQuery] string role = "")
    {
        const int pageSize = 20;
        var keyword = (search ?? "").Trim().ToLower();
        var roleFilter = (role ?? "").Trim().ToLower();

        var query = _context.Users
            .AsNoTracking()
            .Include(u => u.Role)
            .Where(u => u.Role.RoleName != "Admin")
            .AsQueryable();

        if (!string.IsNullOrEmpty(roleFilter))
        {
            query = query.Where(u => u.Role.RoleName.ToLower() == roleFilter);
        }

        if (!string.IsNullOrEmpty(keyword))
        {
            query = query.Where(u =>
                u.FullName.ToLower().Contains(keyword) ||
                u.Email.ToLower().Contains(keyword));
        }

        var totalCount = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new AdminUserDto
            {
                UserId = u.UserId,
                FullName = u.FullName,
                Email = u.Email,
                Phone = u.Phone,
                AvatarUrl = u.AvatarUrl,
                RoleName = u.Role.RoleName,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();

        return Ok(new
        {
            items = users,
            totalCount,
            totalPages,
            currentPage = page
        });
    }

    [HttpPost("users/{id}/ban")]
    public async Task<IActionResult> BanUser(int id)
    {
        var adminUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        if (id == adminUserId)
        {
            return BadRequest(new { message = "Khong the khoa tai khoan cua chinh minh." });
        }

        var user = await _context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.UserId == id);
        if (user == null)
        {
            return NotFound(new { message = "Khong tim thay nguoi dung." });
        }

        if (user.Role.RoleName.Equals("Admin", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Khong the khoa tai khoan Admin khac." });
        }

        user.IsActive = false;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Da khoa tai khoan nguoi dung." });
    }

    [HttpPost("users/{id}/unban")]
    public async Task<IActionResult> UnbanUser(int id)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == id);
        if (user == null)
        {
            return NotFound(new { message = "Khong tim thay nguoi dung." });
        }

        user.IsActive = true;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Da mo khoa tai khoan nguoi dung." });
    }

    // ──────────────────────────────────────────────
    //  SERVICE MANAGEMENT
    // ──────────────────────────────────────────────

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

    // ──────────────────────────────────────────────
    //  PARTNER MANAGEMENT
    // ──────────────────────────────────────────────

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

    // ──────────────────────────────────────────────
    //  HELPERS
    // ──────────────────────────────────────────────

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
