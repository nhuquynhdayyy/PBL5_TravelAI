using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TravelAI.Application.Interfaces;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TestNotificationController : ControllerBase
{
    private readonly IRealtimeNotificationService _notificationService;
    private readonly ILogger<TestNotificationController> _logger;

    public TestNotificationController(
        IRealtimeNotificationService notificationService,
        ILogger<TestNotificationController> logger)
    {
        _notificationService = notificationService;
        _logger = logger;
    }

    /// <summary>
    /// TEST: Gửi thông báo booking_confirmed cho chính mình
    /// </summary>
    [HttpPost("test-booking-confirmed")]
    public async Task<IActionResult> TestBookingConfirmed([FromBody] TestNotificationRequest? request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
        {
            return Unauthorized(new { message = "Vui lòng đăng nhập!" });
        }

        var userId = int.Parse(userIdClaim.Value);
        var message = request?.Message ?? "Đơn hàng #TEST123 đã được xác nhận thanh toán.";

        _logger.LogInformation("Testing booking_confirmed notification for user {UserId}", userId);

        await _notificationService.NotifyUserAsync(userId, "booking_confirmed", new
        {
            bookingId = 99999,
            status = "Paid",
            totalAmount = 1000000,
            provider = "VietQR",
            message = message
        });

        return Ok(new
        {
            success = true,
            message = "Đã gửi thông báo booking_confirmed",
            userId = userId,
            eventName = "booking_confirmed"
        });
    }

    /// <summary>
    /// TEST: Gửi thông báo partner_booking_confirmed cho Partner
    /// </summary>
    [HttpPost("test-partner-booking")]
    public async Task<IActionResult> TestPartnerBooking([FromBody] TestPartnerNotificationRequest? request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        var roleClaim = User.FindFirst(ClaimTypes.Role);
        
        if (userIdClaim == null)
        {
            return Unauthorized(new { message = "Vui lòng đăng nhập!" });
        }

        var userId = int.Parse(userIdClaim.Value);
        var partnerId = request?.PartnerId ?? userId; // Mặc định gửi cho chính mình
        var message = request?.Message ?? $"Có đơn hàng mới #TEST456 đã thanh toán.";

        _logger.LogInformation("Testing partner_booking_confirmed notification for partner {PartnerId}", partnerId);

        await _notificationService.NotifyPartnerAsync(partnerId, "partner_booking_confirmed", new
        {
            bookingId = 88888,
            serviceId = 123,
            quantity = 2,
            message = message
        });

        return Ok(new
        {
            success = true,
            message = "Đã gửi thông báo partner_booking_confirmed",
            partnerId = partnerId,
            requesterId = userId,
            role = roleClaim?.Value,
            eventName = "partner_booking_confirmed"
        });
    }

    /// <summary>
    /// TEST: Gửi thông báo itinerary_processing
    /// </summary>
    [HttpPost("test-itinerary-processing")]
    public async Task<IActionResult> TestItineraryProcessing([FromBody] TestItineraryRequest? request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
        {
            return Unauthorized(new { message = "Vui lòng đăng nhập!" });
        }

        var userId = int.Parse(userIdClaim.Value);
        var status = request?.Status ?? "processing";
        var message = request?.Message ?? "TravelAI đang xử lý lịch trình của bạn...";

        _logger.LogInformation("Testing itinerary_processing notification for user {UserId}", userId);

        await _notificationService.NotifyUserAsync(userId, "itinerary_processing", new
        {
            status = status,
            message = message
        });

        return Ok(new
        {
            success = true,
            message = "Đã gửi thông báo itinerary_processing",
            userId = userId,
            status = status,
            eventName = "itinerary_processing"
        });
    }

    /// <summary>
    /// TEST: Gửi thông báo completed cho itinerary
    /// </summary>
    [HttpPost("test-itinerary-completed")]
    public async Task<IActionResult> TestItineraryCompleted([FromBody] TestNotificationRequest? request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
        {
            return Unauthorized(new { message = "Vui lòng đăng nhập!" });
        }

        var userId = int.Parse(userIdClaim.Value);
        var message = request?.Message ?? "Lịch trình của bạn đã sẵn sàng!";

        _logger.LogInformation("Testing itinerary completed notification for user {UserId}", userId);

        await _notificationService.NotifyUserAsync(userId, "itinerary_processing", new
        {
            status = "completed",
            message = message
        });

        return Ok(new
        {
            success = true,
            message = "Đã gửi thông báo itinerary completed",
            userId = userId,
            eventName = "itinerary_processing"
        });
    }
}

public class TestNotificationRequest
{
    public string? Message { get; set; }
}

public class TestPartnerNotificationRequest
{
    public int? PartnerId { get; set; }
    public string? Message { get; set; }
}

public class TestItineraryRequest
{
    public string? Status { get; set; }
    public string? Message { get; set; }
}
