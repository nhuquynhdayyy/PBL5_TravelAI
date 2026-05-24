using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TravelAI.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;
    private readonly ApplicationDbContext _context;

    public NotificationsController(
        INotificationService notificationService, 
        ApplicationDbContext context)
    {
        _notificationService = notificationService;
        _context = context;
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

        // Sử dụng logic safe page từ nhánh gio-hang
        var safePage = Math.Max(0, page);
        var safePageSize = Math.Clamp(pageSize, 1, 100);

        // Lấy dữ liệu thông qua Service (Kiến trúc sạch)
        var notifications = await _notificationService.GetMyNotificationsAsync(userId, isPartner, safePage, safePageSize);

        // Map dữ liệu: Kết hợp tất cả các trường từ cả 2 nhánh
        var result = notifications.Select(n => new
        {
            id = n.NotificationId,
            notificationId = n.NotificationId,
            userId = n.UserId,
            title = n.Title,       // Từ gio-hang
            type = n.Type,         // Từ main
            message = n.Message,   // Từ main
            createdAt = n.CreatedAt,
            isRead = n.IsRead,
            // Logic xử lý MetadataJson từ nhánh main để đảm bảo API trả về object thay vì string JSON
            metadata = string.IsNullOrWhiteSpace(n.MetadataJson) 
                ? null 
                : JsonSerializer.Deserialize<object>(n.MetadataJson)
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

        // Ưu tiên dùng Service của gio-hang
        var count = await _notificationService.GetUnreadCountAsync(userId, isPartner);

        return Ok(new { unread = count });
    }

    // Giữ cả 2 Alias cho hành động Read (từ gio-hang)
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

        // Dùng Service để xử lý (Service đã bao gồm logic kiểm tra quyền sở hữu notificationId)
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

        // Dùng Service của gio-hang (logic ExecuteUpdate thường đã được bọc trong Service này)
        await _notificationService.MarkAllAsReadAsync(userId, isPartner);

        return Ok();
    }
}