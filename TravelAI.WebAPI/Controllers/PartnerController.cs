using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelAI.Application.DTOs.Partner;
using TravelAI.Domain.Enums;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/partner")]
[Authorize(Roles = "Partner")]
public class PartnerController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public PartnerController(ApplicationDbContext context)
    {
        _context = context;
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
}
