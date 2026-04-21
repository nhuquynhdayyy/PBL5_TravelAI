using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TravelAI.Application.DTOs.Booking;
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

    public BookingsController(IBookingService bookingService, ApplicationDbContext context)
    {
        _bookingService = bookingService;
        _context = context;
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
            PaymentTime = DateTime.UtcNow
        });

        var result = await _context.SaveChangesAsync();

        if (result > 0)
        {
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
            .FirstOrDefaultAsync(b => b.BookingId == id && b.UserId == userId);

        if (booking == null)
        {
            return NotFound(new { message = "Khong tim thay don hang." });
        }

        if (booking.Status != BookingStatus.Pending)
        {
            return BadRequest(new { message = "Chi co the huy don hang dang cho thanh toan." });
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

            availability.HeldCount = Math.Max(0, availability.HeldCount - item.Quantity);
        }

        booking.Status = BookingStatus.Cancelled;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Da huy don hang thanh cong.",
            status = (int)booking.Status
        });
    }

    private static BookingDetailResponse MapToBookingDetail(Booking booking)
    {
        var item = booking.BookingItems
            .OrderBy(bi => bi.ItemId)
            .FirstOrDefault();

        var latestPayment = booking.Payments
            .OrderByDescending(payment => payment.PaymentTime)
            .FirstOrDefault();

        return new BookingDetailResponse
        {
            BookingId = booking.BookingId,
            ServiceName = item?.Service?.Name ?? "Dich vu du lich",
            CheckInDate = item?.CheckInDate ?? booking.CreatedAt,
            Quantity = item?.Quantity ?? 0,
            TotalAmount = booking.TotalAmount,
            Status = (int)booking.Status,
            PaymentMethod = latestPayment?.Method,
            CreatedAt = booking.CreatedAt
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
            CreatedAt = detail.CreatedAt
        };
    }
}
