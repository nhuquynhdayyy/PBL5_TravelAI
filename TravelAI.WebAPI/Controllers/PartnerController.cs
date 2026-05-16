using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelAI.Application.DTOs.Partner;
using TravelAI.Application.Interfaces;
using TravelAI.Domain.Entities;
using TravelAI.Domain.Enums;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/partner")]
[Authorize(Roles = "Partner")]
public class PartnerController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _environment;
    private readonly IPartnerOrderService _partnerOrderService;

    public PartnerController(
        ApplicationDbContext context, 
        IWebHostEnvironment environment,
        IPartnerOrderService partnerOrderService)
    {
        _context = context;
        _environment = environment;
        _partnerOrderService = partnerOrderService;
    }

    // Helper method to convert UTC to Vietnam time (UTC+7)
    private static DateTime ToVietnamTime(DateTime utcTime)
    {
        return utcTime.AddHours(7);
    }

    private static DateTime? ToVietnamTime(DateTime? utcTime)
    {
        return utcTime?.AddHours(7);
    }

    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var partnerIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (partnerIdClaim == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap!" });
        }

        var partnerId = int.Parse(partnerIdClaim.Value);

        var profile = await _context.PartnerProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.UserId == partnerId);

        if (profile == null)
        {
            return Ok(new PartnerProfileDto());
        }

        return Ok(MapToPartnerProfileDto(profile));
    }

    [HttpPut("profile")]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> UpdateProfile([FromForm] UpdatePartnerProfileRequest request)
    {
        var partnerIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (partnerIdClaim == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap!" });
        }

        var partnerId = int.Parse(partnerIdClaim.Value);

        var profile = await _context.PartnerProfiles
            .FirstOrDefaultAsync(item => item.UserId == partnerId);

        if (profile == null)
        {
            profile = new PartnerProfile
            {
                UserId = partnerId
            };
            _context.PartnerProfiles.Add(profile);
        }

        profile.BusinessName = (request.BusinessName ?? string.Empty).Trim();
        profile.TaxCode = NormalizeOptionalText(request.TaxCode);
        profile.BankAccount = NormalizeOptionalText(request.BankAccount);
        profile.Address = NormalizeOptionalText(request.Address);
        profile.Description = NormalizeOptionalText(request.Description);
        profile.ContactPhone = NormalizeOptionalText(request.ContactPhone);

        if (string.IsNullOrWhiteSpace(profile.BusinessName))
        {
            return BadRequest(new { message = "Ten doanh nghiep khong duoc de trong." });
        }

        if (string.IsNullOrWhiteSpace(profile.ContactPhone))
        {
            return BadRequest(new { message = "So dien thoai lien he khong duoc de trong." });
        }

        if (request.BusinessLicenseFile != null)
        {
            profile.BusinessLicenseUrl = await SaveBusinessLicenseAsync(request.BusinessLicenseFile);
        }

        if (string.IsNullOrWhiteSpace(profile.BusinessLicenseUrl))
        {
            return BadRequest(new { message = "Vui long tai len giay phep kinh doanh." });
        }

        profile.VerificationStatus = PartnerVerificationStatus.Pending;
        profile.ReviewNote = null;
        profile.SubmittedAt = DateTime.UtcNow;
        profile.ReviewedAt = null;

        await _context.SaveChangesAsync();

        return Ok(MapToPartnerProfileDto(profile));
    }

    [HttpGet("revenue-summary")]
    public async Task<IActionResult> GetRevenueSummary(
        [FromQuery] string? period,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        var partnerIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (partnerIdClaim == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap!" });
        }

        var partnerId = int.Parse(partnerIdClaim.Value);
        var utcToday = DateTime.UtcNow.Date;
        var normalizedPeriod = (period ?? "month").Trim().ToLowerInvariant();

        if (normalizedPeriod is not ("day" or "week" or "month" or "custom"))
        {
            return BadRequest(new { message = "Bo loc thoi gian khong hop le." });
        }

        DateTime rangeStart;
        DateTime rangeEnd;

        switch (normalizedPeriod)
        {
            case "day":
                rangeStart = utcToday;
                rangeEnd = utcToday;
                break;
            case "week":
                var diff = ((int)utcToday.DayOfWeek + 6) % 7;
                rangeStart = utcToday.AddDays(-diff);
                rangeEnd = rangeStart.AddDays(6);
                break;
            case "custom":
                if (startDate == null || endDate == null)
                {
                    return BadRequest(new { message = "Vui long chon ngay bat dau va ngay ket thuc." });
                }

                rangeStart = startDate.Value.Date;
                rangeEnd = endDate.Value.Date;
                break;
            default:
                rangeStart = new DateTime(utcToday.Year, utcToday.Month, 1);
                rangeEnd = rangeStart.AddMonths(1).AddDays(-1);
                break;
        }

        if (rangeStart > rangeEnd)
        {
            return BadRequest(new { message = "Ngay bat dau phai nho hon hoac bang ngay ket thuc." });
        }

        if ((rangeEnd - rangeStart).TotalDays > 366)
        {
            return BadRequest(new { message = "Khoang thoi gian toi da la 367 ngay." });
        }

        var rangeEndExclusive = rangeEnd.AddDays(1);

        var partnerBookingItems = await _context.BookingItems
            .AsNoTracking()
            .Where(item =>
                item.Service.PartnerId == partnerId &&
                item.Booking.Status == BookingStatus.Paid)
            .Select(item => new
            {
                item.BookingId,
                ServiceName = item.Service.Name,
                Revenue = item.PriceAtBooking * item.Quantity,
                RevenueDate = item.Booking.Payments
                    .OrderByDescending(payment => payment.PaymentTime)
                    .Select(payment => (DateTime?)payment.PaymentTime)
                    .FirstOrDefault() ?? item.Booking.CreatedAt
            })
            .ToListAsync();

        var filteredItems = partnerBookingItems
            .Where(item => item.RevenueDate >= rangeStart && item.RevenueDate < rangeEndExclusive)
            .ToList();

        var revenueByService = filteredItems
            .GroupBy(item => item.ServiceName)
            .Select(group => new PartnerServiceRevenueDto
            {
                ServiceName = group.Key,
                Revenue = group.Sum(item => item.Revenue),
                BookingCount = group.Select(item => item.BookingId).Distinct().Count()
            })
            .OrderByDescending(item => item.Revenue)
            .ToList();

        var dailyRevenueLookup = filteredItems
            .GroupBy(item => item.RevenueDate.Date)
            .ToDictionary(group => group.Key, group => group.Sum(item => item.Revenue));

        var totalDays = (rangeEnd - rangeStart).Days + 1;

        var revenueByDay = Enumerable.Range(0, totalDays)
            .Select(offset => rangeStart.AddDays(offset))
            .Select(date => new PartnerDailyRevenueDto
            {
                Date = date,
                Revenue = dailyRevenueLookup.GetValueOrDefault(date, 0m)
            })
            .ToList();

        var response = new PartnerRevenueSummaryDto
        {
            TotalRevenue = filteredItems.Sum(item => item.Revenue),
            TotalBookings = filteredItems.Select(item => item.BookingId).Distinct().Count(),
            RangeStart = rangeStart,
            RangeEnd = rangeEnd,
            Period = normalizedPeriod,
            RevenueByService = revenueByService,
            RevenueByDay = revenueByDay
        };

        return Ok(response);
    }

    private async Task<string> SaveBusinessLicenseAsync(IFormFile file)
    {
        var folderPath = Path.Combine(_environment.WebRootPath, "uploads", "partner-documents");
        if (!Directory.Exists(folderPath))
        {
            Directory.CreateDirectory(folderPath);
        }

        var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
        var filePath = Path.Combine(folderPath, fileName);

        await using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        return $"/uploads/partner-documents/{fileName}";
    }

    private static PartnerProfileDto MapToPartnerProfileDto(PartnerProfile profile)
    {
        return new PartnerProfileDto
        {
            BusinessName = profile.BusinessName,
            TaxCode = profile.TaxCode,
            BankAccount = profile.BankAccount,
            Address = profile.Address,
            Description = profile.Description,
            ContactPhone = profile.ContactPhone,
            BusinessLicenseUrl = profile.BusinessLicenseUrl,
            VerificationStatus = profile.VerificationStatus.ToString(),
            ReviewNote = profile.ReviewNote,
            SubmittedAt = profile.SubmittedAt,
            ReviewedAt = profile.ReviewedAt,
            CanCreateServices = profile.VerificationStatus == PartnerVerificationStatus.Approved
        };
    }

    private static string? NormalizeOptionalText(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }

    // ──────────────────────────────────────────────
    //  ORDER MANAGEMENT
    // ──────────────────────────────────────────────

    [HttpGet("orders")]
    public async Task<IActionResult> GetOrders(
        [FromQuery] int? status,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] int? serviceId)
    {
        var partnerIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (partnerIdClaim == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap!" });
        }

        var partnerId = int.Parse(partnerIdClaim.Value);

        // TỰ ĐỘNG HỦY CÁC ĐƠN QUÁ HẠN TRƯỚC KHI LOAD
        var now = DateTime.UtcNow;
        var expiredOrders = await _context.Bookings
            .Include(b => b.BookingItems)
            .Include(b => b.Payments)
            .Where(b => b.Status == BookingStatus.Paid
                && !b.IsApprovedByPartner
                && b.ApprovalDeadline.HasValue
                && b.ApprovalDeadline.Value <= now
                && b.BookingItems.Any(bi => bi.Service.PartnerId == partnerId))
            .ToListAsync();

        if (expiredOrders.Any())
        {
            foreach (var booking in expiredOrders)
            {
                // Hủy đơn
                booking.Status = BookingStatus.Cancelled;

                // Tạo refund
                var latestPayment = booking.Payments.OrderByDescending(p => p.PaymentTime).FirstOrDefault();
                if (latestPayment != null)
                {
                    _context.Refunds.Add(new Domain.Entities.Refund
                    {
                        PaymentId = latestPayment.PaymentId,
                        RefundAmount = latestPayment.Amount,
                        RefundRef = Guid.NewGuid().ToString("N")[..12].ToUpper(),
                        Reason = "Quá hạn duyệt",
                        RefundTime = DateTime.UtcNow
                    });
                }

                // Giải phóng inventory
                foreach (var item in booking.BookingItems)
                {
                    var availability = await _context.ServiceAvailabilities
                        .FirstOrDefaultAsync(a => a.ServiceId == item.ServiceId && a.Date == item.CheckInDate.Date);
                    if (availability != null)
                    {
                        availability.BookedCount = Math.Max(0, availability.BookedCount - item.Quantity);
                    }
                }
            }

            await _context.SaveChangesAsync();
        }

        var query = _context.BookingItems
            .AsNoTracking()
            .Include(bi => bi.Service)
            .Include(bi => bi.Booking)
                .ThenInclude(b => b.User)
            .Where(bi => bi.Service.PartnerId == partnerId);

        // Filter by status
        if (status.HasValue)
        {
            var bookingStatus = (BookingStatus)status.Value;
            query = query.Where(bi => bi.Booking.Status == bookingStatus);
        }

        // Filter by date range
        if (startDate.HasValue)
        {
            query = query.Where(bi => bi.CheckInDate >= startDate.Value.Date);
        }

        if (endDate.HasValue)
        {
            query = query.Where(bi => bi.CheckInDate <= endDate.Value.Date);
        }

        // Filter by serviceId
        if (serviceId.HasValue)
        {
            query = query.Where(bi => bi.ServiceId == serviceId.Value);
        }

        var orders = await query
            .Select(bi => new
            {
                bookingId = bi.BookingId,
                serviceName = bi.Service.Name,
                serviceId = bi.ServiceId,
                customerName = bi.Booking.User.FullName,
                customerEmail = bi.Booking.User.Email,
                checkInDate = bi.CheckInDate,
                quantity = bi.Quantity,
                totalAmount = bi.PriceAtBooking * bi.Quantity,
                status = bi.Booking.Status,
                createdAt = bi.Booking.CreatedAt,
                isApprovedByPartner = bi.Booking.IsApprovedByPartner,
                approvedAt = bi.Booking.ApprovedAt,
                approvalDeadline = bi.Booking.ApprovalDeadline,
                // Tính thời gian còn lại để duyệt (giờ)
                hoursUntilDeadline = bi.Booking.ApprovalDeadline.HasValue 
                    ? (bi.Booking.ApprovalDeadline.Value - now).TotalHours 
                    : (double?)null
            })
            .OrderByDescending(x => x.checkInDate)
            .ToListAsync();

        // Convert UTC to Vietnam time
        var ordersWithVnTime = orders.Select(o => new
        {
            o.bookingId,
            o.serviceName,
            o.serviceId,
            o.customerName,
            o.customerEmail,
            o.checkInDate,
            o.quantity,
            o.totalAmount,
            o.status,
            createdAt = ToVietnamTime(o.createdAt),
            o.isApprovedByPartner,
            approvedAt = ToVietnamTime(o.approvedAt),
            approvalDeadline = ToVietnamTime(o.approvalDeadline),
            o.hoursUntilDeadline
        }).ToList();

        return Ok(ordersWithVnTime);
    }

    [HttpGet("orders/{bookingId:int}")]
    public async Task<IActionResult> GetOrderDetail(int bookingId)
    {
        var partnerIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (partnerIdClaim == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap!" });
        }

        var partnerId = int.Parse(partnerIdClaim.Value);

        var booking = await _context.Bookings
            .AsNoTracking()
            .Include(b => b.User)
            .Include(b => b.BookingItems)
                .ThenInclude(bi => bi.Service)
            .Include(b => b.Payments)
                .ThenInclude(p => p.Refunds)
            .FirstOrDefaultAsync(b => b.BookingId == bookingId);

        if (booking == null)
        {
            return NotFound(new { message = "Khong tim thay don hang." });
        }

        // Kiểm tra quyền - booking phải có service của partner
        var hasPartnerService = booking.BookingItems
            .Any(item => item.Service.PartnerId == partnerId);

        if (!hasPartnerService)
        {
            return Forbid();
        }

        var latestPayment = booking.Payments
            .OrderByDescending(p => p.PaymentTime)
            .FirstOrDefault();

        var totalRefunded = booking.Payments
            .SelectMany(p => p.Refunds)
            .Sum(r => r.RefundAmount);

        var result = new
        {
            bookingId = booking.BookingId,
            customerName = booking.User.FullName,
            customerEmail = booking.User.Email,
            status = booking.Status,
            totalAmount = booking.TotalAmount,
            createdAt = ToVietnamTime(booking.CreatedAt),
            paymentMethod = latestPayment?.Method,
            paymentTime = ToVietnamTime(latestPayment?.PaymentTime),
            refundedAmount = totalRefunded,
            isApprovedByPartner = booking.IsApprovedByPartner,
            approvedAt = ToVietnamTime(booking.ApprovedAt),
            approvalDeadline = ToVietnamTime(booking.ApprovalDeadline),
            hoursUntilDeadline = booking.ApprovalDeadline.HasValue 
                ? (booking.ApprovalDeadline.Value - DateTime.UtcNow).TotalHours 
                : (double?)null,
            items = booking.BookingItems.Select(item => new
            {
                serviceId = item.ServiceId,
                serviceName = item.Service.Name,
                quantity = item.Quantity,
                priceAtBooking = item.PriceAtBooking,
                checkInDate = item.CheckInDate,
                notes = item.Notes
            }).ToList()
        };

        return Ok(result);
    }

    [HttpPost("orders/{bookingId:int}/approve")]
    public async Task<IActionResult> ApproveOrder(int bookingId)
    {
        var partnerIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (partnerIdClaim == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap!" });
        }

        var partnerId = int.Parse(partnerIdClaim.Value);

        var success = await _partnerOrderService.ApproveOrderAsync(bookingId, partnerId);

        if (!success)
        {
            return BadRequest(new { message = "Khong the duyet don hang nay. Vui long kiem tra lai." });
        }

        return Ok(new { message = "Da duyet don hang thanh cong!" });
    }

    [HttpPost("orders/{bookingId:int}/reject")]
    public async Task<IActionResult> RejectOrder(int bookingId, [FromBody] RejectOrderRequest request)
    {
        var partnerIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (partnerIdClaim == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap!" });
        }

        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            return BadRequest(new { message = "Vui long nhap ly do tu choi." });
        }

        var partnerId = int.Parse(partnerIdClaim.Value);

        var success = await _partnerOrderService.RejectOrderAsync(bookingId, partnerId, request.Reason);

        if (!success)
        {
            return BadRequest(new { message = "Khong the tu choi don hang nay. Vui long kiem tra lai." });
        }

        return Ok(new { message = "Da tu choi don hang va hoan tien cho khach hang." });
    }

    [HttpGet("orders/pending-count")]
    public async Task<IActionResult> GetPendingOrdersCount()
    {
        var partnerIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (partnerIdClaim == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap!" });
        }

        var partnerId = int.Parse(partnerIdClaim.Value);

        var pendingCount = await _context.BookingItems
            .AsNoTracking()
            .Where(bi => bi.Service.PartnerId == partnerId
                && bi.Booking.Status == BookingStatus.Paid
                && !bi.Booking.IsApprovedByPartner)
            .Select(bi => bi.BookingId)
            .Distinct()
            .CountAsync();

        return Ok(new { pendingCount });
    }
}

public record RejectOrderRequest(string Reason);
