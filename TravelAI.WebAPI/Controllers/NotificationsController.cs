using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public NotificationsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetNotifications(int page = 0, int pageSize = 50)
    {
        var userClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userClaim == null) return Unauthorized();

        var userId = int.Parse(userClaim.Value);
        var isPartner = User.IsInRole("Partner");

        var query = _context.Notifications.AsNoTracking().OrderByDescending(n => n.CreatedAt).AsQueryable();

        if (isPartner)
        {
            query = query.Where(n => n.PartnerId == userId);
        }
        else
        {
            query = query.Where(n => n.UserId == userId);
        }

        var items = await query.Skip(page * pageSize).Take(pageSize).ToListAsync();

        var result = items.Select(n => new
        {
            id = n.NotificationId,
            type = n.Type,
            message = n.Message,
            createdAt = n.CreatedAt,
            isRead = n.IsRead,
            metadata = string.IsNullOrWhiteSpace(n.MetadataJson) ? null : JsonSerializer.Deserialize<object>(n.MetadataJson)
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

        var count = isPartner
            ? await _context.Notifications.CountAsync(n => n.PartnerId == userId && !n.IsRead)
            : await _context.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead);

        return Ok(new { unread = count });
    }

    [HttpPost("{id}/mark-read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        var userClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userClaim == null) return Unauthorized();

        var userId = int.Parse(userClaim.Value);
        var isPartner = User.IsInRole("Partner");

        var notification = await _context.Notifications.FirstOrDefaultAsync(n => n.NotificationId == id);
        if (notification == null) return NotFound();

        if (isPartner)
        {
            if (notification.PartnerId != userId) return Forbid();
        }
        else
        {
            if (notification.UserId != userId) return Forbid();
        }

        notification.IsRead = true;
        await _context.SaveChangesAsync();

        return Ok();
    }

    [HttpPost("mark-all-read")]
    public async Task<IActionResult> MarkAllRead()
    {
        var userClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userClaim == null) return Unauthorized();

        var userId = int.Parse(userClaim.Value);
        var isPartner = User.IsInRole("Partner");

        var query = isPartner
            ? _context.Notifications.Where(n => n.PartnerId == userId && !n.IsRead)
            : _context.Notifications.Where(n => n.UserId == userId && !n.IsRead);

        await query.ExecuteUpdateAsync(updates => updates.SetProperty(n => n.IsRead, true));

        return Ok();
    }
}
