using TravelAI.Domain.Entities;

namespace TravelAI.Domain.Interfaces;

public interface INotificationRepository
{
    Task<IReadOnlyList<Notification>> GetForOwnerAsync(int ownerId, bool isPartner, int page, int pageSize);
    Task<int> CountUnreadAsync(int ownerId, bool isPartner);
    Task<Notification?> FindForOwnerAsync(int notificationId, int ownerId, bool isPartner);
    Task MarkAllAsReadAsync(int ownerId, bool isPartner);
}
