using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;

namespace TravelAI.WebAPI.Hubs;

public sealed class NotificationHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = Context.User?.FindFirst(ClaimTypes.Role)?.Value;

        if (!string.IsNullOrWhiteSpace(userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, UserGroup(userId));

            if (!string.IsNullOrWhiteSpace(role))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, RoleGroup(role, userId));
            }
        }

        await base.OnConnectedAsync();
    }

    public static string UserGroup(int userId) => UserGroup(userId.ToString());

    public static string PartnerGroup(int partnerId) => RoleGroup("Partner", partnerId.ToString());

    private static string UserGroup(string userId) => $"user:{userId}";

    private static string RoleGroup(string role, string userId) => $"{role.ToLowerInvariant()}:{userId}";
}
