using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TravelAI.Application.Helpers;
using TravelAI.Application.Interfaces;
using TravelAI.Domain.Enums;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.Infrastructure.BackgroundJobs;

/// <summary>
/// Background job để tự động HỦY các đơn hàng quá hạn duyệt (48h)
/// Partner không duyệt trong 48h → Tự động hủy + hoàn tiền 100%
/// </summary>
public class OrderApprovalTimeoutJob : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<OrderApprovalTimeoutJob> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(1); // Kiểm tra mỗi 1 phút

    public OrderApprovalTimeoutJob(
        IServiceProvider serviceProvider,
        ILogger<OrderApprovalTimeoutJob> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("OrderApprovalTimeoutJob started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessExpiredOrdersAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while processing expired orders.");
            }

            await Task.Delay(_checkInterval, stoppingToken);
        }

        _logger.LogInformation("OrderApprovalTimeoutJob stopped.");
    }

    private async Task ProcessExpiredOrdersAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

        var now = DateTimeHelper.Now;

        // Tìm các đơn hàng đã thanh toán, chưa được duyệt, và đã quá deadline
        var expiredOrders = await context.Bookings
            .Include(b => b.User)
            .Include(b => b.BookingItems)
                .ThenInclude(bi => bi.Service)
                    .ThenInclude(s => s.Partner)
            .Include(b => b.Payments)
                .ThenInclude(p => p.Refunds)
            .Where(b => b.Status == BookingStatus.Paid
                && !b.IsApprovedByPartner
                && b.ApprovalDeadline.HasValue
                && b.ApprovalDeadline.Value <= now)
            .ToListAsync(cancellationToken);

        if (expiredOrders.Any())
        {
            _logger.LogInformation($"Found {expiredOrders.Count} expired orders to auto-cancel.");

            foreach (var booking in expiredOrders)
            {
                try
                {
                    // TỰ ĐỘNG HỦY đơn hàng
                    booking.Status = BookingStatus.Cancelled;

                    _logger.LogInformation($"Auto-cancelled booking #{booking.BookingId} after deadline.");

                    // Tạo refund 100%
                    var latestPayment = booking.Payments
                        .OrderByDescending(p => p.PaymentTime)
                        .FirstOrDefault();

                    if (latestPayment != null)
                    {
                        var refundAmount = latestPayment.Amount;

                        context.Refunds.Add(new Domain.Entities.Refund
                        {
                            PaymentId = latestPayment.PaymentId,
                            RefundAmount = refundAmount,
                            RefundRef = Guid.NewGuid().ToString("N")[..12].ToUpper(),
                            Reason = "Quá hạn duyệt",
                            RefundTime = DateTimeHelper.Now
                        });

                        _logger.LogInformation($"Created refund of {refundAmount} for booking #{booking.BookingId}");
                    }

                    // Giải phóng inventory
                    var serviceIds = booking.BookingItems
                        .Select(item => item.ServiceId)
                        .Distinct()
                        .ToList();

                    var bookingDates = booking.BookingItems
                        .Select(item => item.CheckInDate.Date)
                        .Distinct()
                        .ToList();

                    var availabilities = await context.ServiceAvailabilities
                        .Where(a => serviceIds.Contains(a.ServiceId) && bookingDates.Contains(a.Date))
                        .ToListAsync(cancellationToken);

                    foreach (var item in booking.BookingItems)
                    {
                        var availability = availabilities.FirstOrDefault(a =>
                            a.ServiceId == item.ServiceId && a.Date == item.CheckInDate.Date);

                        if (availability != null)
                        {
                            availability.BookedCount = Math.Max(0, availability.BookedCount - item.Quantity);
                            _logger.LogInformation($"Released {item.Quantity} slots for service #{item.ServiceId} on {item.CheckInDate.Date:yyyy-MM-dd}");
                        }
                    }

                    // Gửi email thông báo cho khách hàng
                    await emailService.SendBookingCancellationAsync(
                        booking.User.Email,
                        booking.User.FullName,
                        booking.BookingId,
                        latestPayment?.Amount ?? 0
                    );

                    // Gửi email cảnh báo cho partner
                    var partner = booking.BookingItems.FirstOrDefault()?.Service?.Partner;
                    var firstService = booking.BookingItems.FirstOrDefault()?.Service;
                    
                    if (partner != null && firstService != null)
                    {
                        await emailService.SendEmailAsync(
                            partner.Email,
                            $"Đơn hàng #{booking.BookingId} đã bị hủy do quá hạn",
                            $@"
                                <h2>Xin chào {partner.FullName},</h2>
                                <p>Đơn hàng <strong>#{booking.BookingId}</strong> cho dịch vụ <strong>{firstService.Name}</strong> đã bị hủy do <strong>quá hạn duyệt</strong>.</p>
                                <p><strong>Khách hàng:</strong> {booking.User.FullName}</p>
                                <p><strong>Tổng tiền:</strong> {booking.TotalAmount:N0} VND</p>
                                <p><strong>Thời hạn duyệt:</strong> {booking.ApprovalDeadline:dd/MM/yyyy HH:mm}</p>
                                <p style='color: red;'>⚠️ Khách hàng đã được hoàn tiền 100%. Bạn đã mất doanh thu từ đơn hàng này.</p>
                                <p><strong>Lưu ý:</strong> Hãy duyệt đơn hàng kịp thời để tránh mất doanh thu.</p>
                                <p>Trân trọng,<br/>TravelAI Team</p>
                            "
                        );
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Error processing expired booking #{booking.BookingId}");
                }
            }

            await context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation($"Successfully auto-cancelled {expiredOrders.Count} expired orders.");
        }
    }
}
