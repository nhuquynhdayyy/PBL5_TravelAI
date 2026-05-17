using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelAI.Application.DTOs.Admin;
using TravelAI.Application.DTOs.Partner;
using TravelAI.Application.DTOs.Service;
using TravelAI.Application.DTOs.User;
using TravelAI.Application.Helpers;
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
    private readonly IAuditLogService _auditLogService;

    public AdminController(IServiceService serviceService, ApplicationDbContext context, IAuditLogService auditLogService)
    {
        _serviceService = serviceService;
        _context = context;
        _auditLogService = auditLogService;
    }

    // ──────────────────────────────────────────────
    //  USER MANAGEMENT
    // ──────────────────────────────────────────────

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var today = DateTimeHelper.Today;
        var rangeStart = today.AddDays(-29);
        var rangeEndExclusive = today.AddDays(1);

        var totalUsers = await _context.Users
            .AsNoTracking()
            .CountAsync(user => user.RoleId == (int)RoleName.Customer);

        var totalPartners = await _context.Users
            .AsNoTracking()
            .CountAsync(user => user.RoleId == (int)RoleName.Partner);

        var totalBookings = await _context.Bookings
            .AsNoTracking()
            .CountAsync();

        var totalRevenue = await _context.Bookings
            .AsNoTracking()
            .Where(booking => booking.Status == BookingStatus.Paid)
            .SumAsync(booking => (decimal?)booking.TotalAmount) ?? 0m;

        var bookingStatusBreakdown = await _context.Bookings
            .AsNoTracking()
            .GroupBy(booking => booking.Status)
            .Select(group => new AdminBookingStatusDto
            {
                Status = group.Key.ToString(),
                Count = group.Count(),
                Amount = group.Sum(booking => booking.TotalAmount)
            })
            .OrderByDescending(item => item.Count)
            .ToListAsync();

        var recentBookings = await _context.Bookings
            .AsNoTracking()
            .OrderByDescending(booking => booking.CreatedAt)
            .Take(8)
            .Select(booking => new AdminRecentBookingDto
            {
                BookingId = booking.BookingId,
                CustomerName = booking.User.FullName,
                CustomerEmail = booking.User.Email,
                Status = booking.Status.ToString(),
                TotalAmount = booking.TotalAmount,
                ItemCount = booking.BookingItems.Select(item => (int?)item.Quantity).Sum() ?? 0,
PrimaryServiceName = booking.BookingItems
                    .OrderBy(item => item.ItemId)
                    .Select(item => item.Service.Name)
                    .FirstOrDefault(),
                PrimaryDestinationName = booking.BookingItems
                    .OrderBy(item => item.ItemId)
                    .Select(item => item.Service.SpotId != null
                        ? item.Service.TouristSpot!.Destination.Name
                        : item.Service.ServiceSpots
                            .OrderBy(link => link.VisitOrder)
                            .Select(link => link.TouristSpot.Destination.Name)
                            .FirstOrDefault())
                    .FirstOrDefault(),
                CreatedAt = booking.CreatedAt
            })
            .ToListAsync();

        var topDestinationRows = await _context.BookingItems
            .AsNoTracking()
            .Where(item => item.Booking.Status != BookingStatus.Cancelled)
            .Select(item => new
            {
                item.BookingId,
                Revenue = item.Booking.Status == BookingStatus.Paid
                    ? item.PriceAtBooking * item.Quantity
                    : 0m,
                DestinationId = item.Service.SpotId != null
                    ? (int?)item.Service.TouristSpot!.DestinationId
                    : item.Service.ServiceSpots
                        .OrderBy(link => link.VisitOrder)
                        .Select(link => (int?)link.TouristSpot.DestinationId)
                        .FirstOrDefault(),
                DestinationName = item.Service.SpotId != null
                    ? item.Service.TouristSpot!.Destination.Name
                    : item.Service.ServiceSpots
                        .OrderBy(link => link.VisitOrder)
                        .Select(link => link.TouristSpot.Destination.Name)
                        .FirstOrDefault()
            })
            .ToListAsync();

        var topDestinations = topDestinationRows
            .Where(item => item.DestinationId.HasValue && !string.IsNullOrWhiteSpace(item.DestinationName))
            .GroupBy(item => new { item.DestinationId, item.DestinationName })
            .Select(group => new AdminTopDestinationDto
            {
                DestinationId = group.Key.DestinationId!.Value,
                Name = group.Key.DestinationName!,
                BookingCount = group.Select(item => item.BookingId).Distinct().Count(),
                Revenue = group.Sum(item => item.Revenue)
            })
            .OrderByDescending(item => item.BookingCount)
            .ThenByDescending(item => item.Revenue)
            .Take(5)
            .ToList();

        var revenueRows = await _context.Bookings
            .AsNoTracking()
            .Where(booking =>
                booking.Status == BookingStatus.Paid &&
                ((booking.Payments
.OrderByDescending(payment => payment.PaymentTime)
                    .Select(payment => (DateTime?)payment.PaymentTime)
                    .FirstOrDefault() ?? booking.CreatedAt) >= rangeStart) &&
                ((booking.Payments
                    .OrderByDescending(payment => payment.PaymentTime)
                    .Select(payment => (DateTime?)payment.PaymentTime)
                    .FirstOrDefault() ?? booking.CreatedAt) < rangeEndExclusive))
            .Select(booking => new
            {
                RevenueDate = booking.Payments
                    .OrderByDescending(payment => payment.PaymentTime)
                    .Select(payment => (DateTime?)payment.PaymentTime)
                    .FirstOrDefault() ?? booking.CreatedAt,
                booking.TotalAmount
            })
            .ToListAsync();

        var revenueLookup = revenueRows
            .GroupBy(item => item.RevenueDate.Date)
            .ToDictionary(group => group.Key, group => group.Sum(item => item.TotalAmount));

        var revenueByDay = Enumerable.Range(0, 30)
            .Select(offset => rangeStart.AddDays(offset))
            .Select(date => new AdminDailyRevenueDto
            {
                Date = date,
                Revenue = revenueLookup.GetValueOrDefault(date, 0m)
            })
            .ToList();

        var response = new AdminStatsDto
        {
            TotalUsers = totalUsers,
            TotalPartners = totalPartners,
            TotalBookings = totalBookings,
            TotalRevenue = totalRevenue,
            TopDestinations = topDestinations,
            BookingStatusBreakdown = bookingStatusBreakdown,
            RecentBookings = recentBookings,
            RevenueByDay = revenueByDay
        };

        return Ok(response);
    }

    [HttpGet("dashboard-stats")]
    public async Task<IActionResult> GetDashboardStats()
    {
        var today = DateTime.UtcNow.Date;
        var rangeStart = today.AddDays(-29);
        var rangeEndExclusive = today.AddDays(1);

        var revenueRows = await _context.Bookings
            .AsNoTracking()
            .Where(booking =>
                booking.Status == BookingStatus.Paid &&
                ((booking.Payments
                    .OrderByDescending(payment => payment.PaymentTime)
                    .Select(payment => (DateTime?)payment.PaymentTime)
                    .FirstOrDefault() ?? booking.CreatedAt) >= rangeStart) &&
                ((booking.Payments
                    .OrderByDescending(payment => payment.PaymentTime)
                    .Select(payment => (DateTime?)payment.PaymentTime)
                    .FirstOrDefault() ?? booking.CreatedAt) < rangeEndExclusive))
            .Select(booking => new
            {
                RevenueDate = booking.Payments
                    .OrderByDescending(payment => payment.PaymentTime)
                    .Select(payment => (DateTime?)payment.PaymentTime)
                    .FirstOrDefault() ?? booking.CreatedAt,
                booking.TotalAmount
            })
            .ToListAsync();

        var revenueLookup = revenueRows
            .GroupBy(item => item.RevenueDate.Date)
            .ToDictionary(group => group.Key, group => group.Sum(item => item.TotalAmount));

        var revenueByDay = Enumerable.Range(0, 30)
            .Select(offset => rangeStart.AddDays(offset))
            .Select(date => new
            {
                date,
                revenue = revenueLookup.GetValueOrDefault(date, 0m)
            })
            .ToList();

        var totalRevenue30Days = revenueByDay.Sum(item => item.revenue);

        var bookingStatusCounts = await _context.Bookings
            .AsNoTracking()
            .GroupBy(booking => booking.Status)
            .Select(group => new
            {
                status = group.Key.ToString(),
                count = group.Count()
            })
            .ToListAsync();

        var topDestinationRows = await _context.BookingItems
            .AsNoTracking()
            .Where(item => item.Booking.Status != BookingStatus.Cancelled)
            .Select(item => new
            {
                item.BookingId,
                Revenue = item.Booking.Status == BookingStatus.Paid
                    ? item.PriceAtBooking * item.Quantity
                    : 0m,
                DestinationId = item.Service.SpotId != null
                    ? (int?)item.Service.TouristSpot!.DestinationId
                    : item.Service.ServiceSpots
                        .OrderBy(link => link.VisitOrder)
                        .Select(link => (int?)link.TouristSpot.DestinationId)
                        .FirstOrDefault(),
                DestinationName = item.Service.SpotId != null
                    ? item.Service.TouristSpot!.Destination.Name
                    : item.Service.ServiceSpots
                        .OrderBy(link => link.VisitOrder)
                        .Select(link => link.TouristSpot.Destination.Name)
                        .FirstOrDefault()
            })
            .ToListAsync();

        var topDestinations = topDestinationRows
            .Where(item => item.DestinationId.HasValue && !string.IsNullOrWhiteSpace(item.DestinationName))
            .GroupBy(item => new { item.DestinationId, item.DestinationName })
            .Select(group => new
            {
                destinationId = group.Key.DestinationId!.Value,
                name = group.Key.DestinationName!,
                bookingCount = group.Select(item => item.BookingId).Distinct().Count(),
                revenue = group.Sum(item => item.Revenue)
            })
            .OrderByDescending(item => item.bookingCount)
            .ThenByDescending(item => item.revenue)
            .Take(5)
            .ToList();

        var topServices = await _context.BookingItems
            .AsNoTracking()
            .Where(item => item.Booking.Status != BookingStatus.Cancelled)
            .GroupBy(item => new { item.ServiceId, item.Service.Name, item.Service.ServiceType })
            .Select(group => new
            {
                serviceId = group.Key.ServiceId,
                name = group.Key.Name,
                serviceType = group.Key.ServiceType.ToString(),
                quantitySold = group.Sum(item => item.Quantity),
                bookingCount = group.Select(item => item.BookingId).Distinct().Count(),
                revenue = group.Sum(item => item.Booking.Status == BookingStatus.Paid
                    ? item.PriceAtBooking * item.Quantity
                    : 0m)
            })
            .OrderByDescending(item => item.quantitySold)
            .ThenByDescending(item => item.revenue)
            .Take(5)
            .ToListAsync();

        return Ok(new
        {
            success = true,
            data = new
            {
                totalRevenue30Days,
                bookingStatusCounts = new
                {
                    paid = bookingStatusCounts.FirstOrDefault(item => item.status == BookingStatus.Paid.ToString())?.count ?? 0,
                    pending = bookingStatusCounts.FirstOrDefault(item => item.status == BookingStatus.Pending.ToString())?.count ?? 0,
                    cancelled = bookingStatusCounts.FirstOrDefault(item => item.status == BookingStatus.Cancelled.ToString())?.count ?? 0
                },
                topDestinations,
                topServices,
                revenueByDay
            }
        });
    }

    [HttpGet("ai-usage-stats")]
    public async Task<IActionResult> GetAiUsageStats()
    {
        var totalAiItineraries = await _context.AISuggestionLogs
            .AsNoTracking()
            .CountAsync();

        var totalBookings = await _context.Bookings
            .AsNoTracking()
            .CountAsync(booking => booking.Status != BookingStatus.Cancelled);

        var conversionRate = totalAiItineraries == 0
            ? 0
            : Math.Round(Math.Min(100, totalBookings * 100.0 / totalAiItineraries), 2);

        return Ok(new
        {
            success = true,
            data = new
            {
                totalAiItineraries,
                conversionRatePercent = conversionRate,
                averageResponseTimeMs = 0,
                isResponseTimeTracked = false
            }
        });
    }

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
        
        // Log audit
        await _auditLogService.LogAsync(adminUserId, "BAN", "Users", id);

        return Ok(new { success = true, message = "Da khoa tai khoan nguoi dung." });
    }

    [HttpPost("users/{id}/unban")]
    public async Task<IActionResult> UnbanUser(int id)
    {
        var adminUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        
        var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == id);
        if (user == null)
        {
            return NotFound(new { message = "Khong tim thay nguoi dung." });
        }

        user.IsActive = true;
        await _context.SaveChangesAsync();
        
        // Log audit
        await _auditLogService.LogAsync(adminUserId, "UNBAN", "Users", id);

        return Ok(new { success = true, message = "Da mo khoa tai khoan nguoi dung." });
    }

    [HttpGet("users/{userId}/activity-log")]
    public async Task<IActionResult> GetUserActivityLog(int userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
        if (user == null)
        {
            return NotFound(new { message = "Khong tim thay nguoi dung." });
        }

        var query = _context.AuditLogs
            .AsNoTracking()
            .Where(log => log.UserId == userId)
            .OrderByDescending(log => log.Timestamp);

        var totalCount = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var logs = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(log => new UserActivityLogDto
            {
                LogId = log.LogId,
                Action = log.Action,
                TableName = log.TableName,
                RecordId = log.RecordId,
                Timestamp = log.Timestamp
            })
            .ToListAsync();

        return Ok(new
        {
            userId,
            userName = user.FullName,
            items = logs,
            totalCount,
            totalPages,
            currentPage = page
        });
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
        profile.ReviewedAt = DateTimeHelper.Now;
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
        profile.ReviewedAt = DateTimeHelper.Now;
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
        profile.ReviewedAt = DateTimeHelper.Now;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Da yeu cau doi tac bo sung thong tin." });
    }

    // New endpoints using userId instead of profileId
    [HttpGet("partners/{userId}/profile")]
    public async Task<IActionResult> GetPartnerProfileByUserId(int userId)
    {
        var profile = await _context.PartnerProfiles
            .AsNoTracking()
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile == null)
        {
            return NotFound(new { message = "Khong tim thay ho so doi tac." });
        }

        var dto = new AdminPartnerReviewDto
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
        };

        return Ok(dto);
    }

    [HttpPost("partners/{userId}/approve")]
    public async Task<IActionResult> ApprovePartnerByUserId(int userId, [FromBody] PartnerApprovalActionRequest? request)
    {
        var profile = await _context.PartnerProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null)
        {
            return NotFound(new { message = "Khong tim thay ho so doi tac." });
        }

        profile.VerificationStatus = PartnerVerificationStatus.Approved;
        profile.ReviewNote = NormalizeOptionalText(request?.ReviewNote);
        profile.ReviewedAt = DateTimeHelper.Now;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Da duyet doi tac." });
    }

    [HttpPost("partners/{userId}/reject")]
    public async Task<IActionResult> RejectPartnerByUserId(int userId, [FromBody] PartnerApprovalActionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ReviewNote))
        {
            return BadRequest(new { message = "Vui long nhap ly do tu choi." });
        }

        var profile = await _context.PartnerProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null)
        {
            return NotFound(new { message = "Khong tim thay ho so doi tac." });
        }

        profile.VerificationStatus = PartnerVerificationStatus.Rejected;
        profile.ReviewNote = request.ReviewNote.Trim();
        profile.ReviewedAt = DateTimeHelper.Now;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Da tu choi doi tac." });
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
