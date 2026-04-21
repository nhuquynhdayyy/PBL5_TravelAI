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
            .Include(b => b.BookingItems)
            .ThenInclude(bi => bi.Service)
            .FirstOrDefaultAsync(b => b.BookingId == id);

        if (booking == null)
        {
            return NotFound(new { message = "Don hang khong ton tai hoac da bi huy." });
        }

        var item = booking.BookingItems.FirstOrDefault();

        return Ok(new
        {
            bookingId = booking.BookingId,
            totalAmount = booking.TotalAmount,
            status = (int)booking.Status,
            serviceName = item?.Service?.Name ?? "Dich vu du lich",
            checkInDate = item?.CheckInDate,
            quantity = item?.Quantity
        });
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

        if (booking.Status == BookingStatus.Paid)
        {
            return BadRequest(new { message = "Don hang nay da duoc thanh toan truoc do." });
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
}
