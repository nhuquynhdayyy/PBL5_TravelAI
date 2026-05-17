using Microsoft.AspNetCore.SignalR;
using TravelAI.Application.Interfaces;
using TravelAI.WebAPI.Hubs;

namespace TravelAI.WebAPI.Services;

public sealed class SignalRNotificationService : IRealtimeNotificationService
{
    private readonly IHubContext<NotificationHub> _hubContext;

    public SignalRNotificationService(IHubContext<NotificationHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public Task NotifyUserAsync(int userId, string eventName, object payload, CancellationToken cancellationToken = default)
        => _hubContext.Clients
            .Group(NotificationHub.UserGroup(userId))
            .SendAsync(eventName, payload, cancellationToken);

    public Task NotifyPartnerAsync(int partnerId, string eventName, object payload, CancellationToken cancellationToken = default)
        => _hubContext.Clients
            .Group(NotificationHub.PartnerGroup(partnerId))
            .SendAsync(eventName, payload, cancellationToken);

    public Task NotifyAllAsync(string eventName, object payload, CancellationToken cancellationToken = default)
        => _hubContext.Clients.All.SendAsync(eventName, payload, cancellationToken);
}
