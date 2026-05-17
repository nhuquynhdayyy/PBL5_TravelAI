using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TravelAI.Application.DTOs.Booking;
using TravelAI.Application.Helpers;
using TravelAI.Application.Interfaces;
using TravelAI.Domain.Entities;
using TravelAI.Domain.Enums;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BookingsController : ControllerBase
{
    private readonly IBookingService _bookingService;
    private readonly ApplicationDbContext _context;
    private readonly IAuditLogService _auditLogService;

    public BookingsController(IBookingService bookingService, ApplicationDbContext context, IAuditLogService auditLogService)
    {
        _bookingService = bookingService;
        _context = context;
        _auditLogService = auditLogService;
    }

    [HttpGet("my-bookings")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> GetMyBookings()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap!" });
        }

        var userId = int.Parse(userIdClaim.Value);

        var bookings = await _context.Bookings
            .AsNoTracking()
            .Where(b => b.UserId == userId)
            .Include(b => b.BookingItems)
                .ThenInclude(bi => bi.Service)
            .Include(b => b.Payments)
                .ThenInclude(payment => payment.Refunds)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

        var result = bookings
            .Select(MapToBookingSummary)
            .ToList();

        return Ok(result);
    }

    [HttpPost("draft")]
    public async Task<IActionResult> CreateDraft([FromBody] CreateBookingRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap!" });
        }

        int userId = int.Parse(userIdClaim.Value);
        var bookingId = await _bookingService.CreateDraftBookingAsync(userId, request);

        if (bookingId == null)
        {
            return BadRequest(new
            {
                message = "Xin loi, ngay nay da het cho hoac khong du so luong ban yeu cau!"
            });
        }

        // Log audit
        await _auditLogService.LogAsync(userId, "CREATE", "Bookings", bookingId.Value);

        return Ok(new
        {
            bookingId,
            message = "Da tao don hang nhap va giu cho thanh cong!"
        });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var booking = await _context.Bookings
            .AsNoTracking()
            .Include(b => b.BookingItems)
                .ThenInclude(bi => bi.Service)
            .Include(b => b.Payments)
                .ThenInclude(payment => payment.Refunds)
            .FirstOrDefaultAsync(b => b.BookingId == id);

        if (booking == null)
        {
            return NotFound(new { message = "Don hang khong ton tai hoac da bi huy." });
        }

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap!" });
        }

        var userId = int.Parse(userIdClaim.Value);
        var isOwner = booking.UserId == userId;
        var isAdmin = User.IsInRole("Admin");
        var isPartnerOfBooking = User.IsInRole("Partner")
            && booking.BookingItems.Any(item => item.Service.PartnerId == userId);

        if (!isOwner && !isAdmin && !isPartnerOfBooking)
        {
            return Forbid();
        }

        return Ok(MapToBookingDetail(booking));
    }

    [HttpGet("partner-orders")]
    [Authorize(Roles = "Partner")]
    public async Task<IActionResult> GetPartnerOrders()
    {
        var partnerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var orders = await _context.BookingItems
            .AsNoTracking()
            .Include(bi => bi.Service)
            .Include(bi => bi.Booking)
                .ThenInclude(b => b.User)
            .Where(bi => bi.Service.PartnerId == partnerId)
            .Select(bi => new
            {
                bookingId = bi.BookingId,
                serviceName = bi.Service.Name,
                customerName = bi.Booking.User.FullName,
                checkInDate = bi.CheckInDate,
                quantity = bi.Quantity,
                totalAmount = bi.PriceAtBooking * bi.Quantity,
                status = bi.Booking.Status
            })
            .OrderByDescending(x => x.checkInDate)
            .ToListAsync();

        return Ok(orders);
    }

    [HttpPost("{id}/confirm")]
    public async Task<IActionResult> ConfirmBooking(int id)
    {
        var booking = await _context.Bookings.FindAsync(id);
        if (booking == null)
        {
            return NotFound(new { message = "Khong tim thay don hang." });
        }

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap!" });
        }

        if (booking.UserId != int.Parse(userIdClaim.Value))
        {
            return Forbid();
        }

        if (booking.Status != BookingStatus.Pending)
        {
            return BadRequest(new { message = "Chi co the thanh toan don hang dang cho xu ly." });
        }

        booking.Status = BookingStatus.Paid;
        booking.ApprovalDeadline = DateTimeHelper.Now.AddHours(24); // Partner có 24h để duyệt kể từ khi thanh toán

        var items = await _context.BookingItems
            .Where(bi => bi.BookingId == id)
            .ToListAsync();

        foreach (var item in items)
        {
            var availability = await _context.ServiceAvailabilities
                .FirstOrDefaultAsync(a => a.ServiceId == item.ServiceId
                    && a.Date == item.CheckInDate.Date);

            if (availability == null)
            {
                continue;
            }

            availability.BookedCount += item.Quantity;
            availability.HeldCount = Math.Max(0, availability.HeldCount - item.Quantity);
        }

        _context.Payments.Add(new Payment
        {
            BookingId = id,
            Method = "Mock",
            TransactionRef = Guid.NewGuid().ToString("N")[..12].ToUpper(),
            Amount = booking.TotalAmount,
            PaymentTime = DateTimeHelper.Now
        });

        var result = await _context.SaveChangesAsync();

        if (result > 0)
        {
            // Log audit
            int userId = int.Parse(userIdClaim.Value);
            await _auditLogService.LogAsync(userId, "UPDATE", "Bookings", id);
            
            return Ok(new
            {
                success = true,
                message = "Xac nhan thanh toan thanh cong! Don hang cua ban da hoan tat."
            });
        }

        return BadRequest(new { message = "Co loi xay ra khi cap nhat don hang." });
    }

    [HttpPost("{id:int}/cancel")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> CancelBooking(int id)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap!" });
        }

        var userId = int.Parse(userIdClaim.Value);

        var booking = await _context.Bookings
            .Include(b => b.BookingItems)
            .Include(b => b.Payments)
                .ThenInclude(payment => payment.Refunds)
            .FirstOrDefaultAsync(b => b.BookingId == id && b.UserId == userId);

        if (booking == null)
        {
            return NotFound(new { message = "Khong tim thay don hang." });
        }

        var evaluation = EvaluateCancellationPolicy(booking, DateTimeHelper.Now);
        if (!evaluation.CanCancel)
        {
            return BadRequest(new { message = evaluation.PolicyMessage });
        }

        var latestPayment = booking.Payments
            .OrderByDescending(payment => payment.PaymentTime)
            .FirstOrDefault();

        if (booking.Status == BookingStatus.Paid && latestPayment == null)
        {
            return BadRequest(new { message = "Khong tim thay giao dich thanh toan de tao hoan tien." });
        }

        var serviceIds = booking.BookingItems
            .Select(item => item.ServiceId)
            .Distinct()
            .ToList();

        var bookingDates = booking.BookingItems
            .Select(item => item.CheckInDate.Date)
            .Distinct()
            .ToList();

        var availabilities = await _context.ServiceAvailabilities
            .Where(a => serviceIds.Contains(a.ServiceId) && bookingDates.Contains(a.Date))
            .ToListAsync();

        foreach (var item in booking.BookingItems)
        {
            var availability = availabilities.FirstOrDefault(a =>
                a.ServiceId == item.ServiceId && a.Date == item.CheckInDate.Date);

            if (availability == null)
            {
                continue;
            }

            if (booking.Status == BookingStatus.Pending)
            {
                availability.HeldCount = Math.Max(0, availability.HeldCount - item.Quantity);
            }
            else
            {
                availability.BookedCount = Math.Max(0, availability.BookedCount - item.Quantity);
            }
        }

        var refundAmount = evaluation.EstimatedRefundAmount;

        if (latestPayment != null && refundAmount > 0)
        {
            _context.Refunds.Add(new Refund
            {
                PaymentId = latestPayment.PaymentId,
                RefundAmount = refundAmount,
                RefundRef = Guid.NewGuid().ToString("N")[..12].ToUpper(),
                Reason = evaluation.PolicyMessage,
                RefundTime = DateTimeHelper.Now
            });
        }

        booking.Status = BookingStatus.Cancelled;

        await _context.SaveChangesAsync();
        
        // Log audit
        await _auditLogService.LogAsync(userId, "DELETE", "Bookings", id);

        return Ok(new
        {
            success = true,
            message = "Da huy don hang thanh cong.",
            status = (int)booking.Status,
            refundAmount,
            refundPolicy = evaluation.PolicyMessage
        });
    }

    private static BookingDetailResponse MapToBookingDetail(Booking booking)
    {
        var evaluation = EvaluateCancellationPolicy(booking, DateTimeHelper.Now);
        var item = booking.BookingItems
            .OrderBy(bi => bi.ItemId)
            .FirstOrDefault();

        var latestPayment = booking.Payments
            .OrderByDescending(payment => payment.PaymentTime)
            .FirstOrDefault();
        var latestRefund = booking.Payments
            .SelectMany(payment => payment.Refunds)
            .OrderByDescending(refund => refund.RefundTime)
            .FirstOrDefault();

        // Xác định lý do hủy
        string? cancellationReason = null;
        if (booking.Status == BookingStatus.Cancelled || booking.Status == BookingStatus.Refunded)
        {
            // Nếu có refund reason thì dùng
            cancellationReason = latestRefund?.Reason;
            
            // Đối với customer: Ẩn lý do "Quá hạn duyệt", chỉ hiện lý do từ customer hoặc partner
            // "Quá hạn duyệt" là lý do hệ thống tự động, không cần hiện cho customer
            if (cancellationReason == "Quá hạn duyệt")
            {
                cancellationReason = null; // Không hiển thị lý do này cho customer
            }
        }

        return new BookingDetailResponse
        {
            BookingId = booking.BookingId,
            ServiceName = item?.Service?.Name ?? "Dich vu du lich",
            CheckInDate = item?.CheckInDate ?? booking.CreatedAt,
            Quantity = item?.Quantity ?? 0,
            TotalAmount = booking.TotalAmount,
            Status = (int)booking.Status,
            PaymentMethod = latestPayment?.Method,
            CreatedAt = booking.CreatedAt,
            RefundedAmount = latestRefund?.RefundAmount ?? 0,
            EstimatedRefundAmount = evaluation.EstimatedRefundAmount,
            CanCancel = evaluation.CanCancel,
            CancelPolicy = evaluation.PolicyMessage,
            CancellationReason = cancellationReason
        };
    }

    private static MyBookingSummaryDto MapToBookingSummary(Booking booking)
    {
        var detail = MapToBookingDetail(booking);

        return new MyBookingSummaryDto
        {
            BookingId = detail.BookingId,
            ServiceName = detail.ServiceName,
            CheckInDate = detail.CheckInDate,
            Quantity = detail.Quantity,
            TotalAmount = detail.TotalAmount,
            Status = detail.Status,
            PaymentMethod = detail.PaymentMethod,
            CreatedAt = detail.CreatedAt,
            RefundedAmount = detail.RefundedAmount,
            EstimatedRefundAmount = detail.EstimatedRefundAmount,
            CanCancel = detail.CanCancel,
            CancelPolicy = detail.CancelPolicy,
            CancellationReason = detail.CancellationReason
        };
    }

    private static CancellationEvaluation EvaluateCancellationPolicy(Booking booking, DateTime nowUtc)
    {
        if (booking.Status == BookingStatus.Cancelled)
        {
            return new CancellationEvaluation(false, 0, "Don hang nay da bi huy truoc do.");
        }

        if (booking.Status == BookingStatus.Refunded)
        {
            return new CancellationEvaluation(false, 0, "Don hang nay da duoc hoan tien truoc do.");
        }

        var hasRefund = booking.Payments.Any(payment => payment.Refunds.Any());
        if (hasRefund)
        {
            return new CancellationEvaluation(false, 0, "Don hang nay da co giao dich hoan tien.");
        }

        if (booking.Status == BookingStatus.Pending)
        {
            return new CancellationEvaluation(true, 0, "Booking dang cho thanh toan, he thong se giai phong cho giu.");
        }

        if (booking.Status != BookingStatus.Paid)
        {
            return new CancellationEvaluation(false, 0, "Trang thai hien tai khong ho tro huy booking.");
        }

        var earliestCheckInDate = booking.BookingItems
            .Select(item => item.CheckInDate)
            .DefaultIfEmpty(booking.CreatedAt)
            .Min();

        if (earliestCheckInDate <= nowUtc.AddHours(24))
        {
            return new CancellationEvaluation(false, 0, "Chi duoc huy booking da thanh toan khi check-in con hon 24 gio.");
        }

        var refundAmount = booking.Payments
            .OrderByDescending(payment => payment.PaymentTime)
            .Select(payment => payment.Amount)
            .FirstOrDefault();

        if (refundAmount <= 0)
        {
            refundAmount = booking.TotalAmount;
        }

        return new CancellationEvaluation(
            true,
            refundAmount,
            "Huy truoc 24 gio: hoan 100% gia tri thanh toan."
        );
    }

    private sealed record CancellationEvaluation(bool CanCancel, decimal EstimatedRefundAmount, string PolicyMessage);
}
