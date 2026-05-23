using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace TravelAI.WebAPI.Hubs;

[Authorize]
public sealed class NotificationsHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!string.IsNullOrWhiteSpace(userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, NotificationGroups.User(userId));

            if (Context.User?.IsInRole("Partner") == true)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, NotificationGroups.Partner(userId));
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
    public static string User(string userId) => $"user-{userId}";
    public static string Partner(int partnerId) => $"partner-{partnerId}";
    public static string Partner(string partnerId) => $"partner-{partnerId}";
    public const string Admin = "role:admin";
}
