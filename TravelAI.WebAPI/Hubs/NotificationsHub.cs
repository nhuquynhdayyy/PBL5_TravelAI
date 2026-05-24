using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace TravelAI.WebAPI.Hubs;

[Authorize]
public sealed class NotificationsHub : Hub
{
    private readonly ILogger<NotificationsHub> _logger;

    public NotificationsHub(ILogger<NotificationsHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!string.IsNullOrWhiteSpace(userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, NotificationGroups.User(userId));
            _logger.LogInformation("Notification connection {ConnectionId} joined {Group}.", Context.ConnectionId, NotificationGroups.User(userId));

            if (Context.User?.IsInRole("Partner") == true)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, NotificationGroups.Partner(userId));
                _logger.LogInformation("Notification connection {ConnectionId} joined {Group}.", Context.ConnectionId, NotificationGroups.Partner(userId));
            }

            if (Context.User?.IsInRole("Admin") == true)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, NotificationGroups.Admin);
            }
        }

        await base.OnConnectedAsync();
    }
}

public static class NotificationGroups
{
    public static string User(int userId) => User(userId.ToString());
    public static string User(string userId) => $"user_{userId}";
    public static string Partner(int partnerId) => $"partner_{partnerId}";
    public static string Partner(string partnerId) => $"partner_{partnerId}";
    public const string Admin = "admin";
}
