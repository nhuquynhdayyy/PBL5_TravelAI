using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TravelAI.Application.Interfaces;
using TravelAI.Domain.Enums;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.Infrastructure.BackgroundJobs;

/// <summary>
/// Background job để tự động xử lý các đơn hàng quá hạn duyệt (24-48h)
/// </summary>
public class OrderApprovalTimeoutJob : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<OrderApprovalTimeoutJob> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(10); // Kiểm tra mỗi 10 phút

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

        var now = DateTime.UtcNow;

        // Tìm các đơn hàng đã thanh toán, chưa được duyệt, và đã quá deadline
        var expiredOrders = await context.Bookings
            .Include(b => b.User)
            .Include(b => b.BookingItems)
                .ThenInclude(bi => bi.Service)
                    .ThenInclude(s => s.Partner)
            .Where(b => b.Status == BookingStatus.Paid
                && !b.IsApprovedByPartner
                && b.ApprovalDeadline.HasValue
                && b.ApprovalDeadline.Value <= now)
            .ToListAsync(cancellationToken);

        if (expiredOrders.Any())
        {
            _logger.LogInformation($"Found {expiredOrders.Count} expired orders to process.");

            foreach (var booking in expiredOrders)
            {
                try
                {
                    // Tự động duyệt đơn hàng
                    booking.IsApprovedByPartner = true;
                    booking.ApprovedAt = DateTime.UtcNow;

                    _logger.LogInformation($"Auto-approved booking #{booking.BookingId} after deadline.");

                    // Gửi email thông báo cho khách hàng
                    var firstService = booking.BookingItems.FirstOrDefault()?.Service;
                    if (firstService != null)
                    {
                        await emailService.SendOrderApprovedAsync(
                            booking.User.Email,
                            booking.User.FullName,
                            booking.BookingId,
                            firstService.Name
                        );
                    }

                    // Gửi email cảnh báo cho partner về việc tự động duyệt
                    var partner = booking.BookingItems.FirstOrDefault()?.Service?.Partner;
                    if (partner != null)
                    {
                        await emailService.SendEmailAsync(
                            partner.Email,
                            $"Đơn hàng #{booking.BookingId} đã được tự động duyệt",
                            $@"
                                <h2>Xin chào {partner.FullName},</h2>
                                <p>Đơn hàng <strong>#{booking.BookingId}</strong> đã quá thời hạn duyệt (48 giờ) và được hệ thống tự động phê duyệt.</p>
                                <p>Vui lòng kiểm tra và chuẩn bị dịch vụ cho khách hàng.</p>
                                <p><strong>Lưu ý:</strong> Hãy duyệt đơn hàng kịp thời để tránh tự động duyệt trong tương lai.</p>
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
            _logger.LogInformation($"Successfully processed {expiredOrders.Count} expired orders.");
        }
    }
}
