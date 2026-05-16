using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TravelAI.Application.Interfaces;
using TravelAI.Domain.Enums;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.Infrastructure.BackgroundJobs;

/// <summary>
/// Background job để gửi email nhắc nhở partner duyệt đơn hàng
/// Gửi nhắc nhở khi còn 12h và 2h trước deadline
/// </summary>
public class OrderApprovalReminderJob : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<OrderApprovalReminderJob> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(30); // Kiểm tra mỗi 30 phút

    public OrderApprovalReminderJob(
        IServiceProvider serviceProvider,
        ILogger<OrderApprovalReminderJob> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("OrderApprovalReminderJob started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SendRemindersAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while sending reminders.");
            }

            await Task.Delay(_checkInterval, stoppingToken);
        }

        _logger.LogInformation("OrderApprovalReminderJob stopped.");
    }

    private async Task SendRemindersAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

        var now = DateTime.UtcNow;

        // Tìm các đơn hàng cần nhắc nhở (còn 12h hoặc 2h)
        var ordersNeedingReminder = await context.Bookings
            .Include(b => b.BookingItems)
                .ThenInclude(bi => bi.Service)
                    .ThenInclude(s => s.Partner)
            .Where(b => b.Status == BookingStatus.Paid
                && !b.IsApprovedByPartner
                && b.ApprovalDeadline.HasValue
                && b.ApprovalDeadline.Value > now)
            .ToListAsync(cancellationToken);

        foreach (var booking in ordersNeedingReminder)
        {
            var timeRemaining = booking.ApprovalDeadline!.Value - now;
            var partner = booking.BookingItems.FirstOrDefault()?.Service?.Partner;

            if (partner == null) continue;

            // Nhắc nhở khi còn 12h (11-13h range để tránh gửi nhiều lần)
            if (timeRemaining.TotalHours >= 11 && timeRemaining.TotalHours <= 13)
            {
                await SendReminderEmail(emailService, partner, booking, "12 giờ");
                _logger.LogInformation($"Sent 12-hour reminder for booking #{booking.BookingId}");
            }
            // Nhắc nhở khi còn 2h (1.5-2.5h range)
            else if (timeRemaining.TotalHours >= 1.5 && timeRemaining.TotalHours <= 2.5)
            {
                await SendReminderEmail(emailService, partner, booking, "2 giờ", isUrgent: true);
                _logger.LogInformation($"Sent 2-hour urgent reminder for booking #{booking.BookingId}");
            }
        }
    }

    private async Task SendReminderEmail(
        IEmailService emailService,
        Domain.Entities.User partner,
        Domain.Entities.Booking booking,
        string timeRemaining,
        bool isUrgent = false)
    {
        var urgentTag = isUrgent ? "[KHẨN CẤP] " : "";
        var subject = $"{urgentTag}Nhắc nhở: Duyệt đơn hàng #{booking.BookingId} - Còn {timeRemaining}";

        var body = $@"
            <h2>Xin chào {partner.FullName},</h2>
            <p style='color: {(isUrgent ? "red" : "orange")}; font-weight: bold;'>
                Đơn hàng <strong>#{booking.BookingId}</strong> cần được duyệt trong vòng {timeRemaining} nữa!
            </p>
            <p>Thông tin đơn hàng:</p>
            <ul>
                <li><strong>Mã đơn:</strong> #{booking.BookingId}</li>
                <li><strong>Tổng tiền:</strong> {booking.TotalAmount:N0} VND</li>
                <li><strong>Thời hạn duyệt:</strong> {booking.ApprovalDeadline:dd/MM/yyyy HH:mm}</li>
            </ul>
            <p>
                {(isUrgent 
                    ? "⚠️ <strong>Nếu không duyệt kịp, đơn hàng sẽ được tự động phê duyệt!</strong>" 
                    : "Vui lòng đăng nhập vào hệ thống để duyệt hoặc từ chối đơn hàng.")}
            </p>
            <p>Trân trọng,<br/>TravelAI Team</p>
        ";

        await emailService.SendEmailAsync(partner.Email, subject, body);
    }
}
