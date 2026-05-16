using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TravelAI.Application.DTOs.Review;
using TravelAI.Domain.Entities;
using TravelAI.Domain.Enums;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReviewsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ReviewsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> Create([FromBody] CreateReviewRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap." });
        }

        if (request.Rating < 1 || request.Rating > 5)
        {
            return BadRequest(new { message = "Rating phai trong khoang tu 1 den 5." });
        }

        var service = await _context.Services
            .FirstOrDefaultAsync(s => s.ServiceId == request.ServiceId);

        if (service == null)
        {
            return NotFound(new { message = "Khong tim thay dich vu." });
        }

        var hasPaidBooking = await HasPaidBookingAsync(userId.Value, request.ServiceId);
        if (!hasPaidBooking)
        {
            return BadRequest(new { message = "Ban chi co the review sau khi da thanh toan dich vu nay." });
        }

        var hasReviewed = await _context.Reviews
            .AnyAsync(r => r.ServiceId == request.ServiceId && r.UserId == userId.Value);

        if (hasReviewed)
        {
            return BadRequest(new { message = "Ban da review dich vu nay truoc do." });
        }

        var review = new Review
        {
            ServiceId = request.ServiceId,
            UserId = userId.Value,
            Rating = request.Rating,
            Comment = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment.Trim(),
            CreatedAt = DateTime.Now // Giờ local (Việt Nam)
        };

        _context.Reviews.Add(review);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
        {
            return BadRequest(new { message = "Ban da review dich vu nay truoc do." });
        }

        await RecalculateRatingAsync(request.ServiceId);

        return Ok(new { success = true, message = "Da gui danh gia thanh cong." });
    }

    [HttpGet("service/{serviceId:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetByService(int serviceId)
    {
        var reviews = await _context.Reviews
            .AsNoTracking()
            .Where(r => r.ServiceId == serviceId)
            .Include(r => r.User)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new ReviewItemDto
            {
                ReviewId = r.ReviewId,
                CustomerName = r.User.FullName,
                CustomerAvatarUrl = r.User.AvatarUrl,
                Rating = r.Rating,
                Comment = r.Comment,
                ReplyText = r.ReplyText,
                ReplyTime = r.ReplyTime,
                CreatedAt = r.CreatedAt
            })
            .ToListAsync();

        return Ok(reviews);
    }

    [HttpGet("service/{serviceId:int}/eligibility")]
    [Authorize]
    public async Task<IActionResult> GetEligibility(int serviceId)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap." });
        }

        var service = await _context.Services
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.ServiceId == serviceId);

        if (service == null)
        {
            return NotFound(new { message = "Khong tim thay dich vu." });
        }

        var hasPaidBooking = await HasPaidBookingAsync(userId.Value, serviceId);
        var hasReviewed = await _context.Reviews
            .AsNoTracking()
            .AnyAsync(r => r.ServiceId == serviceId && r.UserId == userId.Value);

        var dto = new ReviewEligibilityDto
        {
            HasPaidBooking = hasPaidBooking,
            HasReviewed = hasReviewed,
            CanReview = User.IsInRole("Customer") && hasPaidBooking && !hasReviewed,
            IsOwnerPartner = User.IsInRole("Partner") && service.PartnerId == userId.Value
        };

        return Ok(dto);
    }

    [HttpGet("my-service-reviews")]
    [Authorize(Roles = "Partner")]
    public async Task<IActionResult> GetMyServiceReviews(
        [FromQuery] int? serviceId = null,
        [FromQuery] int? rating = null,
        [FromQuery] bool? hasReply = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap." });
        }

        var query = _context.Reviews
            .AsNoTracking()
            .Where(r => r.Service.PartnerId == userId.Value);

        // Filter by serviceId
        if (serviceId.HasValue)
        {
            query = query.Where(r => r.ServiceId == serviceId.Value);
        }

        // Filter by rating
        if (rating.HasValue && rating.Value >= 1 && rating.Value <= 5)
        {
            query = query.Where(r => r.Rating == rating.Value);
        }

        // Filter by reply status
        if (hasReply.HasValue)
        {
            if (hasReply.Value)
            {
                query = query.Where(r => r.ReplyText != null);
            }
            else
            {
                query = query.Where(r => r.ReplyText == null);
            }
        }

        var totalCount = await query.CountAsync();

        var reviews = await query
            .Include(r => r.User)
            .Include(r => r.Service)
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new PartnerReviewDto
            {
                ReviewId = r.ReviewId,
                ServiceId = r.ServiceId,
                ServiceName = r.Service.Name,
                CustomerName = r.User.FullName,
                CustomerAvatarUrl = r.User.AvatarUrl,
                Rating = r.Rating,
                Comment = r.Comment,
                ReplyText = r.ReplyText,
                ReplyTime = r.ReplyTime,
                CreatedAt = r.CreatedAt
            })
            .ToListAsync();

        return Ok(new
        {
            reviews,
            totalCount,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        });
    }

    [HttpGet("my-service-reviews/stats")]
    [Authorize(Roles = "Partner")]
    public async Task<IActionResult> GetMyReviewStats([FromQuery] int? serviceId = null)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap." });
        }

        var query = _context.Reviews
            .AsNoTracking()
            .Where(r => r.Service.PartnerId == userId.Value);

        if (serviceId.HasValue)
        {
            query = query.Where(r => r.ServiceId == serviceId.Value);
        }

        var reviews = await query.ToListAsync();

        var stats = new ReviewStatsDto
        {
            TotalReviews = reviews.Count,
            AverageRating = reviews.Any() ? reviews.Average(r => r.Rating) : 0,
            FiveStars = reviews.Count(r => r.Rating == 5),
            FourStars = reviews.Count(r => r.Rating == 4),
            ThreeStars = reviews.Count(r => r.Rating == 3),
            TwoStars = reviews.Count(r => r.Rating == 2),
            OneStar = reviews.Count(r => r.Rating == 1),
            RepliedCount = reviews.Count(r => !string.IsNullOrWhiteSpace(r.ReplyText)),
            UnrepliedCount = reviews.Count(r => string.IsNullOrWhiteSpace(r.ReplyText))
        };

        return Ok(stats);
    }

    [HttpPost("{id:int}/reply")]
    [Authorize(Roles = "Partner")]
    public async Task<IActionResult> Reply(int id, [FromBody] ReplyReviewRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap." });
        }

        if (string.IsNullOrWhiteSpace(request.ReplyText))
        {
            return BadRequest(new { message = "Noi dung phan hoi khong duoc de trong." });
        }

        var review = await _context.Reviews
            .Include(r => r.Service)
            .FirstOrDefaultAsync(r => r.ReviewId == id);

        if (review == null)
        {
            return NotFound(new { message = "Khong tim thay review." });
        }

        if (review.Service.PartnerId != userId.Value)
        {
            return Forbid();
        }

        review.ReplyText = request.ReplyText.Trim();
        review.ReplyTime = DateTime.Now; // Giờ local (Việt Nam)
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Da phan hoi review thanh cong." });
    }

    [HttpPut("{id:int}/reply")]
    [Authorize(Roles = "Partner")]
    public async Task<IActionResult> UpdateReply(int id, [FromBody] UpdateReplyRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap." });
        }

        if (string.IsNullOrWhiteSpace(request.ReplyText))
        {
            return BadRequest(new { message = "Noi dung phan hoi khong duoc de trong." });
        }

        var review = await _context.Reviews
            .Include(r => r.Service)
            .FirstOrDefaultAsync(r => r.ReviewId == id);

        if (review == null)
        {
            return NotFound(new { message = "Khong tim thay review." });
        }

        if (review.Service.PartnerId != userId.Value)
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(review.ReplyText))
        {
            return BadRequest(new { message = "Chua co phan hoi de chinh sua." });
        }

        review.ReplyText = request.ReplyText.Trim();
        review.ReplyTime = DateTime.Now; // Giờ local (Việt Nam)
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Da cap nhat phan hoi thanh cong." });
    }

    [HttpDelete("{id:int}/reply")]
    [Authorize(Roles = "Partner")]
    public async Task<IActionResult> DeleteReply(int id)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap." });
        }

        var review = await _context.Reviews
            .Include(r => r.Service)
            .FirstOrDefaultAsync(r => r.ReviewId == id);

        if (review == null)
        {
            return NotFound(new { message = "Khong tim thay review." });
        }

        if (review.Service.PartnerId != userId.Value)
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(review.ReplyText))
        {
            return BadRequest(new { message = "Khong co phan hoi de xoa." });
        }

        review.ReplyText = null;
        review.ReplyTime = null;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Da xoa phan hoi thanh cong." });
    }

    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var userId) ? userId : null;
    }

    private Task<bool> HasPaidBookingAsync(int userId, int serviceId)
    {
        return _context.BookingItems
            .AsNoTracking()
            .AnyAsync(item =>
                item.ServiceId == serviceId &&
                item.Booking.UserId == userId &&
                item.Booking.Status == BookingStatus.Paid);
    }

    private async Task RecalculateRatingAsync(int serviceId)
    {
        var service = await _context.Services.FirstOrDefaultAsync(s => s.ServiceId == serviceId);
        if (service == null)
        {
            return;
        }

        service.RatingAvg = await _context.Reviews
            .Where(r => r.ServiceId == serviceId)
            .Select(r => (double?)r.Rating)
            .AverageAsync() ?? 0;

        await _context.SaveChangesAsync();
    }
}
