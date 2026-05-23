using System.Text.Json;
using TravelAI.Application.DTOs.Notification;
using TravelAI.Application.Interfaces;
using TravelAI.Domain.Interfaces;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.Infrastructure.Services;

public sealed class NotificationService : INotificationService
{
    private readonly INotificationRepository _repository;
    private readonly ApplicationDbContext _context;

    public NotificationService(INotificationRepository repository, ApplicationDbContext context)
    {
        _repository = repository;
        _context = context;
    }

    public async Task<IReadOnlyList<NotificationDto>> GetMyNotificationsAsync(int userId, bool isPartner, int page, int pageSize)
    {
        var notifications = await _repository.GetForOwnerAsync(userId, isPartner, page, pageSize);
        return notifications.Select(n => new NotificationDto
        {
            NotificationId = n.NotificationId,
            UserId = n.UserId,
            Title = n.Title,
            Message = n.Message,
            Type = n.Type,
            IsRead = n.IsRead,
            CreatedAt = n.CreatedAt,
            Metadata = string.IsNullOrWhiteSpace(n.MetadataJson)
                ? null
                : JsonSerializer.Deserialize<object>(n.MetadataJson)
        }).ToList();
    }

    public Task<int> GetUnreadCountAsync(int userId, bool isPartner)
        => _repository.CountUnreadAsync(userId, isPartner);

    public async Task<bool> MarkAsReadAsync(int notificationId, int userId, bool isPartner)
    {
        var notification = await _repository.FindForOwnerAsync(notificationId, userId, isPartner);
        if (notification == null)
        {
            return false;
        }

        notification.IsRead = true;
        await _context.SaveChangesAsync();
        return true;
    }

    public Task MarkAllAsReadAsync(int userId, bool isPartner)
        => _repository.MarkAllAsReadAsync(userId, isPartner);
}
