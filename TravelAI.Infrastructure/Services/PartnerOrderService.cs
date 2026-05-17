using Microsoft.EntityFrameworkCore;
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

    public PartnerOrderService(ApplicationDbContext context, IEmailService emailService)
    {
        _context = context;
        _emailService = emailService;
    }

    public async Task<bool> ApproveOrderAsync(int bookingId, int partnerId)
    {
        // 1. Lấy booking và kiểm tra quyền
        var booking = await _context.Bookings
            .Include(b => b.User)
            .Include(b => b.BookingItems)
                .ThenInclude(bi => bi.Service)
            .FirstOrDefaultAsync(b => b.BookingId == bookingId);

        if (booking == null)
        {
            return false;
        }

        // 2. Kiểm tra booking có service của partner không
        var hasPartnerService = booking.BookingItems
            .Any(item => item.Service.PartnerId == partnerId);

        if (!hasPartnerService)
        {
            return false;
        }

        // 3. Kiểm tra trạng thái - chỉ approve được đơn đã thanh toán
        if (booking.Status != BookingStatus.Paid)
        {
            return false;
        }

        // 4. Kiểm tra đã được approve chưa
        if (booking.IsApprovedByPartner)
        {
            return false; // Đã được duyệt rồi
        }

        // 5. Cập nhật trạng thái approved
        booking.IsApprovedByPartner = true;
        booking.ApprovedAt = DateTimeHelper.Now;
        await _context.SaveChangesAsync();

        // 6. Gửi email thông báo cho khách hàng
        var firstService = booking.BookingItems.FirstOrDefault()?.Service;
        if (firstService != null)
        {
            await _emailService.SendOrderApprovedAsync(
                booking.User.Email,
                booking.User.FullName,
                bookingId,
                firstService.Name
            );
        }
        
        return true;
    }

    public async Task<bool> RejectOrderAsync(int bookingId, int partnerId, string reason)
    {
        // 1. Lấy booking và kiểm tra quyền
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

        // 2. Kiểm tra booking có service của partner không
        var hasPartnerService = booking.BookingItems
            .Any(item => item.Service.PartnerId == partnerId);

        if (!hasPartnerService)
        {
            return false;
        }

        // 3. Kiểm tra trạng thái - chỉ reject được đơn đã thanh toán
        if (booking.Status != BookingStatus.Paid)
        {
            return false;
        }

        // 4. Cập nhật status = Cancelled
        booking.Status = BookingStatus.Cancelled;

        // 5. Hoàn tiền tự động (nếu đã thanh toán)
        var latestPayment = booking.Payments
            .OrderByDescending(p => p.PaymentTime)
            .FirstOrDefault();

        if (latestPayment != null)
        {
            var refundAmount = latestPayment.Amount;

            _context.Refunds.Add(new Refund
            {
                PaymentId = latestPayment.PaymentId,
                RefundAmount = refundAmount,
                RefundRef = Guid.NewGuid().ToString("N")[..12].ToUpper(),
                Reason = reason, // Chỉ lưu lý do, không thêm prefix
                RefundTime = DateTimeHelper.Now
            });
        }

        // 6. Giải phóng inventory
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

            if (availability != null)
            {
                availability.BookedCount = Math.Max(0, availability.BookedCount - item.Quantity);
            }
        }

        // 7. Gửi email thông báo
        var firstService = booking.BookingItems.FirstOrDefault()?.Service;
        if (firstService != null)
        {
            await _emailService.SendOrderRejectedAsync(
                booking.User.Email,
                booking.User.FullName,
                bookingId,
                firstService.Name,
                reason
            );
        }

        await _context.SaveChangesAsync();
        return true;
    }
}
