using Microsoft.EntityFrameworkCore;
using TravelAI.Application.DTOs.Notification;
using TravelAI.Application.Helpers;
using TravelAI.Application.Interfaces;
using TravelAI.Domain.Entities;
using TravelAI.Domain.Enums;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.Infrastructure.Services;

public class PartnerOrderService : IPartnerOrderService
{
    private readonly ApplicationDbContext _context;
    private readonly IEmailService _emailService;
    private readonly INotificationService _notificationService;

    public PartnerOrderService(
        ApplicationDbContext context,
        IEmailService emailService,
        INotificationService notificationService)
    {
        _context = context;
        _emailService = emailService;
        _notificationService = notificationService;
    }

    public async Task<bool> ApproveOrderAsync(int bookingId, int partnerId)
    {
        var booking = await _context.Bookings
            .Include(b => b.User)
            .Include(b => b.BookingItems)
                .ThenInclude(bi => bi.Service)
            .FirstOrDefaultAsync(b => b.BookingId == bookingId);

        if (booking == null)
        {
            return false;
        }

        if (!booking.BookingItems.Any(item => item.Service.PartnerId == partnerId))
        {
            return false;
        }

        if (booking.Status != BookingStatus.Paid || booking.IsApprovedByPartner)
        {
            return false;
        }

        var availabilityKeys = booking.BookingItems
            .SelectMany(item => EnumerateBookingDates(item).Select(date => new { item.ServiceId, Date = date }))
            .ToList();
        var serviceIds = availabilityKeys.Select(item => item.ServiceId).Distinct().ToList();
        var bookingDates = availabilityKeys.Select(item => item.Date).Distinct().ToList();
        var availabilities = await _context.ServiceAvailabilities
            .Where(a => serviceIds.Contains(a.ServiceId) && bookingDates.Contains(a.Date))
            .ToListAsync();

        foreach (var item in booking.BookingItems)
        {
            foreach (var bookingDate in EnumerateBookingDates(item))
            {
                var availability = availabilities.FirstOrDefault(a =>
                    a.ServiceId == item.ServiceId && a.Date == bookingDate);

                if (availability == null)
                {
                    continue;
                }

                availability.HeldCount = Math.Max(0, availability.HeldCount - item.Quantity);
                availability.BookedCount += item.Quantity;
            }
        }

        booking.IsApprovedByPartner = true;
        booking.ApprovedAt = DateTimeHelper.Now;
        await _context.SaveChangesAsync();

        var firstService = booking.BookingItems.FirstOrDefault()?.Service;
        if (firstService != null)
        {
            await _emailService.SendOrderApprovedAsync(
                booking.User.Email,
                booking.User.FullName,
                bookingId,
                firstService.Name);
            await _notificationService.CreateAsync(new CreateNotificationRequest
            {
                UserId = booking.UserId,
                Title = "Don dat tour da duoc xac nhan",
                Message = $"Partner da xac nhan don #{bookingId} cho dich vu {firstService.Name}.",
                Type = "Booking"
            });
        }

        return true;
    }

    public async Task<bool> RejectOrderAsync(int bookingId, int partnerId, string reason)
    {
        var booking = await _context.Bookings
            .Include(b => b.User)
            .Include(b => b.BookingItems)
                .ThenInclude(bi => bi.Service)
            .Include(b => b.Payments)
                .ThenInclude(p => p.Refunds)
            .FirstOrDefaultAsync(b => b.BookingId == bookingId);

        if (booking == null)
        {
            return false;
        }

        if (!booking.BookingItems.Any(item => item.Service.PartnerId == partnerId))
        {
            return false;
        }

        if (booking.Status != BookingStatus.Paid)
        {
            return false;
        }

        booking.Status = BookingStatus.Cancelled;

        var latestPayment = booking.Payments
            .OrderByDescending(p => p.PaymentTime)
            .FirstOrDefault();

        if (latestPayment != null)
        {
            _context.Refunds.Add(new Refund
            {
                PaymentId = latestPayment.PaymentId,
                RefundAmount = latestPayment.Amount,
                RefundRef = Guid.NewGuid().ToString("N")[..12].ToUpper(),
                Reason = reason,
                RefundTime = DateTimeHelper.Now
            });
        }

        var availabilityKeys = booking.BookingItems
            .SelectMany(item => EnumerateBookingDates(item).Select(date => new { item.ServiceId, Date = date }))
            .ToList();
        var serviceIds = availabilityKeys.Select(item => item.ServiceId).Distinct().ToList();
        var bookingDates = availabilityKeys.Select(item => item.Date).Distinct().ToList();
        var availabilities = await _context.ServiceAvailabilities
            .Where(a => serviceIds.Contains(a.ServiceId) && bookingDates.Contains(a.Date))
            .ToListAsync();

        foreach (var item in booking.BookingItems)
        {
            foreach (var bookingDate in EnumerateBookingDates(item))
            {
                var availability = availabilities.FirstOrDefault(a =>
                    a.ServiceId == item.ServiceId && a.Date == bookingDate);

                if (availability != null)
                {
                    availability.BookedCount = Math.Max(0, availability.BookedCount - item.Quantity);
                }
            }
        }

        var firstService = booking.BookingItems.FirstOrDefault()?.Service;
        if (firstService != null)
        {
            await _emailService.SendOrderRejectedAsync(
                booking.User.Email,
                booking.User.FullName,
                bookingId,
                firstService.Name,
                reason);
            await _notificationService.CreateAsync(new CreateNotificationRequest
            {
                UserId = booking.UserId,
                Title = "Don dat tour bi tu choi",
                Message = $"Partner da tu choi don #{bookingId} cho dich vu {firstService.Name}. Ly do: {reason}",
                Type = "Booking"
            });
        }

        await _context.SaveChangesAsync();
        return true;
    }

    private static IEnumerable<DateTime> EnumerateBookingDates(BookingItem item)
    {
        var startDate = item.CheckInDate.Date;
        var endDate = item.CheckOutDate?.Date ?? startDate;

        for (var date = startDate; date <= endDate; date = date.AddDays(1))
        {
            yield return date;
        }
    }
}
