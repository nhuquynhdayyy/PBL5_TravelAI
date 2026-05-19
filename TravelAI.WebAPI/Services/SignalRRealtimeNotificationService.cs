using Microsoft.AspNetCore.SignalR;
using TravelAI.Application.Interfaces;
using TravelAI.WebAPI.Hubs;

namespace TravelAI.WebAPI.Services;

public sealed class SignalRRealtimeNotificationService : IRealtimeNotificationService
{
    private readonly IHubContext<NotificationsHub> _hubContext;
    private readonly ILogger<SignalRRealtimeNotificationService> _logger;

    public SignalRRealtimeNotificationService(
        IHubContext<NotificationsHub> hubContext,
        ILogger<SignalRRealtimeNotificationService> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public Task NotifyUserAsync(int userId, string eventName, object payload, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Sending realtime notification {EventName} to {Group}.", eventName, NotificationGroups.User(userId));
        return _hubContext.Clients
            .Group(NotificationGroups.User(userId))
            .SendAsync(eventName, payload, cancellationToken);
    }

    public Task NotifyPartnerAsync(int partnerId, string eventName, object payload, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Sending realtime notification {EventName} to {Group}.", eventName, NotificationGroups.Partner(partnerId));
        return _hubContext.Clients
            .Group(NotificationGroups.Partner(partnerId))
            .SendAsync(eventName, payload, cancellationToken);
    }

    public Task NotifyAdminAsync(string eventName, object payload, CancellationToken cancellationToken = default)
    {
        return _hubContext.Clients
            .Group(NotificationGroups.Admin)
            .SendAsync(eventName, payload, cancellationToken);
    }

    public Task NotifyAllAsync(string eventName, object payload, CancellationToken cancellationToken = default)
    {
        return _hubContext.Clients
            .All
            .SendAsync(eventName, payload, cancellationToken);
    }
}
