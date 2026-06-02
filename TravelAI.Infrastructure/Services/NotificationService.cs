using Microsoft.EntityFrameworkCore;
using TravelAI.Application.DTOs.Notification;
using TravelAI.Application.Helpers;
using TravelAI.Application.Interfaces;
using TravelAI.Domain.Entities;
using TravelAI.Domain.Enums;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly ApplicationDbContext _context;
    private readonly IRealtimeNotificationService _realtimeNotificationService;

    public NotificationService(
        ApplicationDbContext context,
        IRealtimeNotificationService realtimeNotificationService)
    {
        _context = context;
        _realtimeNotificationService = realtimeNotificationService;
    }

    public async Task<NotificationDto> CreateAsync(
        CreateNotificationRequest request,
        CancellationToken cancellationToken = default)
    {
        var notification = new Notification
        {
            UserId = request.UserId,
            Title = Normalize(request.Title, 200),
            Message = Normalize(request.Message, 1000),
            Type = Normalize(string.IsNullOrWhiteSpace(request.Type) ? "System" : request.Type, 50),
            IsRead = false,
            CreatedAt = DateTimeHelper.Now
        };

        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync(cancellationToken);

        var dto = MapToDto(notification);
        await _realtimeNotificationService.NotifyUserAsync(
            request.UserId,
            "notification_created",
            dto,
            cancellationToken);

        return dto;
    }

    public async Task NotifyAdminsAsync(
        string title,
        string message,
        string type,
        CancellationToken cancellationToken = default)
    {
        var adminIds = await _context.Users
            .AsNoTracking()
            .Where(user => user.RoleId == (int)RoleName.Admin && user.IsActive)
            .Select(user => user.UserId)
            .ToListAsync(cancellationToken);

        foreach (var adminId in adminIds)
        {
            await CreateAsync(new CreateNotificationRequest
            {
                UserId = adminId,
                Title = title,
                Message = message,
                Type = type
            }, cancellationToken);
        }
    }

    public async Task<IReadOnlyList<NotificationDto>> GetByUserAsync(
        int userId,
        CancellationToken cancellationToken = default)
    {
        return await _context.Notifications
            .AsNoTracking()
            .Where(notification => notification.UserId == userId)
            .OrderByDescending(notification => notification.CreatedAt)
            .Take(100)
            .Select(notification => new NotificationDto
            {
                Id = notification.Id,
                UserId = notification.UserId,
                Title = notification.Title,
                Message = notification.Message,
                Type = notification.Type,
                IsRead = notification.IsRead,
                CreatedAt = notification.CreatedAt,
                UpdatedAt = notification.UpdatedAt
            })
            .ToListAsync(cancellationToken);
    }

    public Task<int> GetUnreadCountAsync(int userId, CancellationToken cancellationToken = default)
    {
        return _context.Notifications
            .AsNoTracking()
            .CountAsync(notification => notification.UserId == userId && !notification.IsRead, cancellationToken);
    }

    public async Task<bool> MarkAsReadAsync(
        int notificationId,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(item => item.Id == notificationId && item.UserId == userId, cancellationToken);

        if (notification == null)
        {
            return false;
        }

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            notification.UpdatedAt = DateTimeHelper.Now;
            await _context.SaveChangesAsync(cancellationToken);
        }

        return true;
    }

    public async Task MarkAllAsReadAsync(int userId, CancellationToken cancellationToken = default)
    {
        var notifications = await _context.Notifications
            .Where(notification => notification.UserId == userId && !notification.IsRead)
            .ToListAsync(cancellationToken);

        if (notifications.Count == 0)
        {
            return;
        }

        var now = DateTimeHelper.Now;
        foreach (var notification in notifications)
        {
            notification.IsRead = true;
            notification.UpdatedAt = now;
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> DeleteAsync(
        int notificationId,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(item => item.Id == notificationId && item.UserId == userId, cancellationToken);

        if (notification == null)
        {
            return false;
        }

        _context.Notifications.Remove(notification);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static NotificationDto MapToDto(Notification notification)
    {
        return new NotificationDto
        {
            Id = notification.Id,
            UserId = notification.UserId,
            Title = notification.Title,
            Message = notification.Message,
            Type = notification.Type,
            IsRead = notification.IsRead,
            CreatedAt = notification.CreatedAt,
            UpdatedAt = notification.UpdatedAt
        };
    }

    private static string Normalize(string value, int maxLength)
    {
        var normalized = value.Trim();
        return normalized.Length <= maxLength ? normalized : normalized[..maxLength];
    }
}
