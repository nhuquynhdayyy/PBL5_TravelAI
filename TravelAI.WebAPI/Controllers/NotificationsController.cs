using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TravelAI.Application.Interfaces;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;

    public NotificationsController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    [HttpGet]
    public async Task<IActionResult> GetNotifications(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap." });
        }

        return Ok(await _notificationService.GetByUserAsync(userId.Value, cancellationToken));
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap." });
        }

        var count = await _notificationService.GetUnreadCountAsync(userId.Value, cancellationToken);
        return Ok(new { count });
    }

    [HttpPatch("{id:int}/read")]
    public async Task<IActionResult> MarkAsRead(int id, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap." });
        }

        var success = await _notificationService.MarkAsReadAsync(id, userId.Value, cancellationToken);
        return success
            ? Ok(new { success = true })
            : NotFound(new { message = "Khong tim thay thong bao." });
    }

    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllAsRead(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap." });
        }

        await _notificationService.MarkAllAsReadAsync(userId.Value, cancellationToken);
        return Ok(new { success = true });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap." });
        }

        var success = await _notificationService.DeleteAsync(id, userId.Value, cancellationToken);
        return success
            ? Ok(new { success = true })
            : NotFound(new { message = "Khong tim thay thong bao." });
    }

    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var userId) ? userId : null;
    }
}
