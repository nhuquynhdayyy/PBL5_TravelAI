using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TravelAI.Application.Interfaces;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;

    public NotificationsController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    [HttpGet]
    public async Task<IActionResult> GetNotifications(int page = 0, int pageSize = 50)
        => await GetMyNotifications(page, pageSize);

    [HttpGet("my")]
    public async Task<IActionResult> GetMyNotifications(int page = 0, int pageSize = 50)
    {
        var userClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userClaim == null) return Unauthorized();

        var userId = int.Parse(userClaim.Value);
        var isPartner = User.IsInRole("Partner");
        var safePage = Math.Max(0, page);
        var safePageSize = Math.Clamp(pageSize, 1, 100);

        var notifications = await _notificationService.GetMyNotificationsAsync(userId, isPartner, safePage, safePageSize);
        var result = notifications.Select(n => new
        {
            id = n.NotificationId,
            notificationId = n.NotificationId,
            userId = n.UserId,
            title = n.Title,
            type = n.Type,
            message = n.Message,
            createdAt = n.CreatedAt,
            isRead = n.IsRead,
            metadata = n.Metadata
        });

        return Ok(result);
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var userClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userClaim == null) return Unauthorized();

        var userId = int.Parse(userClaim.Value);
        var isPartner = User.IsInRole("Partner");

        var count = await _notificationService.GetUnreadCountAsync(userId, isPartner);

        return Ok(new { unread = count });
    }

    [HttpPut("{id:int}/read")]
    public async Task<IActionResult> Read(int id)
        => await MarkRead(id);

    [HttpPost("{id}/mark-read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        var userClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userClaim == null) return Unauthorized();

        var userId = int.Parse(userClaim.Value);
        var isPartner = User.IsInRole("Partner");

        var marked = await _notificationService.MarkAsReadAsync(id, userId, isPartner);
        if (!marked) return NotFound();

        return Ok();
    }

    [HttpPost("mark-all-read")]
    public async Task<IActionResult> MarkAllRead()
    {
        var userClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userClaim == null) return Unauthorized();

        var userId = int.Parse(userClaim.Value);
        var isPartner = User.IsInRole("Partner");

        await _notificationService.MarkAllAsReadAsync(userId, isPartner);

        return Ok();
    }
}
