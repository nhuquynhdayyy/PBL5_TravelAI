namespace TravelAI.Application.Interfaces;

public interface IRealtimeNotificationService
{
    Task NotifyUserAsync(int userId, string eventName, object payload, CancellationToken cancellationToken = default);

    Task NotifyPartnerAsync(int partnerId, string eventName, object payload, CancellationToken cancellationToken = default);

    Task NotifyAllAsync(string eventName, object payload, CancellationToken cancellationToken = default);
}
