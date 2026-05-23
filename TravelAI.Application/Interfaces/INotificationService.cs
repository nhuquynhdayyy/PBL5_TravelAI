using TravelAI.Application.DTOs.Notification;

namespace TravelAI.Application.Interfaces;

public interface INotificationService
{
    Task<IReadOnlyList<NotificationDto>> GetMyNotificationsAsync(int userId, bool isPartner, int page, int pageSize);
    Task<int> GetUnreadCountAsync(int userId, bool isPartner);
    Task<bool> MarkAsReadAsync(int notificationId, int userId, bool isPartner);
    Task MarkAllAsReadAsync(int userId, bool isPartner);
}
