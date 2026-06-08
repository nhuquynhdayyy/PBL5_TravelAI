using TravelAI.Application.DTOs.Notification;

namespace TravelAI.Application.Interfaces;

public interface INotificationService
{
    Task<NotificationDto> CreateAsync(CreateNotificationRequest request, CancellationToken cancellationToken = default);
    Task NotifyAdminsAsync(string title, string message, string type, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<NotificationDto>> GetByUserAsync(int userId, CancellationToken cancellationToken = default);
    Task<int> GetUnreadCountAsync(int userId, CancellationToken cancellationToken = default);
    Task<bool> MarkAsReadAsync(int notificationId, int userId, CancellationToken cancellationToken = default);
    Task MarkAllAsReadAsync(int userId, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(int notificationId, int userId, CancellationToken cancellationToken = default);
}
