using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TravelAI.Domain.Entities;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CartController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<CartController> _logger;

    public CartController(ApplicationDbContext context, ILogger<CartController> logger)
    {
        _context = context;
        _logger = logger;
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("User ID not found in token");
        }
        return userId;
    }

    /// <summary>
    /// GET /api/cart - Lấy danh sách items trong giỏ hàng của user hiện tại
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetCart()
    {
        try
        {
            var userId = GetUserId();

            var cartItems = await _context.CartItems
                .Include(ci => ci.Service)
                .Where(ci => ci.UserId == userId)
                .OrderByDescending(ci => ci.CreatedAt)
                .Select(ci => new
                {
                    ci.CartItemId,
                    ci.ServiceId,
                    ServiceName = ci.Service.Name,
                    ci.Quantity,
                    ci.PriceAtBooking,
                    CheckInDate = ci.CheckInDate.ToString("yyyy-MM-dd"),
                    CheckOutDate = ci.CheckOutDate.HasValue ? ci.CheckOutDate.Value.ToString("yyyy-MM-dd") : null,
                    ci.Notes,
                    ci.CreatedAt
                })
                .ToListAsync();

            return Ok(new { items = cartItems });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting cart items");
            return StatusCode(500, new { message = "Lỗi khi lấy giỏ hàng" });
        }
    }

    /// <summary>
    /// POST /api/cart - Thêm hoặc cập nhật item vào giỏ hàng
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> AddToCart([FromBody] AddToCartRequest request)
    {
        try
        {
            var userId = GetUserId();

            // Validate service exists
            var service = await _context.Services.FindAsync(request.ServiceId);
            if (service == null)
            {
                return NotFound(new { message = "Service không tồn tại" });
            }

            // Parse dates
            if (!DateTime.TryParse(request.CheckInDate, out var checkInDate))
            {
                return BadRequest(new { message = "CheckInDate không hợp lệ" });
            }

            DateTime? checkOutDate = null;
            if (!string.IsNullOrEmpty(request.CheckOutDate))
            {
                if (!DateTime.TryParse(request.CheckOutDate, out var parsedCheckOutDate))
                {
                    return BadRequest(new { message = "CheckOutDate không hợp lệ" });
                }
                checkOutDate = parsedCheckOutDate;
            }

            // Tìm cart item đã tồn tại (cùng userId, serviceId, checkInDate, checkOutDate)
            var existingCartItem = await _context.CartItems
                .FirstOrDefaultAsync(ci =>
                    ci.UserId == userId &&
                    ci.ServiceId == request.ServiceId &&
                    ci.CheckInDate == checkInDate &&
                    (ci.CheckOutDate == checkOutDate || (ci.CheckOutDate == null && checkOutDate == null)));

            if (existingCartItem != null)
            {
                // Cập nhật quantity và price
                existingCartItem.Quantity += request.Quantity;
                existingCartItem.PriceAtBooking = request.PriceAtBooking;
                existingCartItem.Notes = request.Notes;
                _context.CartItems.Update(existingCartItem);
            }
            else
            {
                // Tạo mới cart item
                var newCartItem = new CartItem
                {
                    UserId = userId,
                    ServiceId = request.ServiceId,
                    Quantity = request.Quantity,
                    PriceAtBooking = request.PriceAtBooking,
                    CheckInDate = checkInDate,
                    CheckOutDate = checkOutDate,
                    Notes = request.Notes,
                    CreatedAt = DateTime.UtcNow
                };
                await _context.CartItems.AddAsync(newCartItem);
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Đã thêm vào giỏ hàng thành công" });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Database error adding to cart");
            return StatusCode(500, new { message = "Lỗi khi thêm vào giỏ hàng" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding to cart");
            return StatusCode(500, new { message = "Lỗi khi thêm vào giỏ hàng" });
        }
    }

    /// <summary>
    /// DELETE /api/cart/{cartItemId} - Xóa item khỏi giỏ hàng
    /// </summary>
    [HttpDelete("{cartItemId}")]
    public async Task<IActionResult> RemoveFromCart(int cartItemId)
    {
        try
        {
            var userId = GetUserId();

            var cartItem = await _context.CartItems
                .FirstOrDefaultAsync(ci => ci.CartItemId == cartItemId && ci.UserId == userId);

            if (cartItem == null)
            {
                return NotFound(new { message = "Cart item không tồn tại" });
            }

            _context.CartItems.Remove(cartItem);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đã xóa khỏi giỏ hàng" });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing from cart");
            return StatusCode(500, new { message = "Lỗi khi xóa khỏi giỏ hàng" });
        }
    }

    /// <summary>
    /// DELETE /api/cart - Xóa toàn bộ giỏ hàng
    /// </summary>
    [HttpDelete]
    public async Task<IActionResult> ClearCart()
    {
        try
        {
            var userId = GetUserId();

            var cartItems = await _context.CartItems
                .Where(ci => ci.UserId == userId)
                .ToListAsync();

            _context.CartItems.RemoveRange(cartItems);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đã xóa toàn bộ giỏ hàng" });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing cart");
            return StatusCode(500, new { message = "Lỗi khi xóa giỏ hàng" });
        }
    }

    /// <summary>
    /// POST /api/cart/sync - Đồng bộ cart từ localStorage lên database (dùng khi login)
    /// </summary>
    [HttpPost("sync")]
    public async Task<IActionResult> SyncCart([FromBody] SyncCartRequest request)
    {
        try
        {
            var userId = GetUserId();

            foreach (var item in request.Items)
            {
                // Validate service exists
                var serviceExists = await _context.Services.AnyAsync(s => s.ServiceId == item.ServiceId);
                if (!serviceExists)
                {
                    continue; // Skip invalid services
                }

                // Parse dates
                if (!DateTime.TryParse(item.CheckInDate, out var checkInDate))
                {
                    continue; // Skip invalid dates
                }

                DateTime? checkOutDate = null;
                if (!string.IsNullOrEmpty(item.CheckOutDate))
                {
                    if (!DateTime.TryParse(item.CheckOutDate, out var parsedCheckOutDate))
                    {
                        continue;
                    }
                    checkOutDate = parsedCheckOutDate;
                }

                // Tìm cart item đã tồn tại
                var existingCartItem = await _context.CartItems
                    .FirstOrDefaultAsync(ci =>
                        ci.UserId == userId &&
                        ci.ServiceId == item.ServiceId &&
                        ci.CheckInDate == checkInDate &&
                        (ci.CheckOutDate == checkOutDate || (ci.CheckOutDate == null && checkOutDate == null)));

                if (existingCartItem != null)
                {
                    // Merge: cộng dồn quantity
                    existingCartItem.Quantity += item.Quantity;
                    existingCartItem.PriceAtBooking = item.PriceAtBooking;
                    _context.CartItems.Update(existingCartItem);
                }
                else
                {
                    // Tạo mới
                    var newCartItem = new CartItem
                    {
                        UserId = userId,
                        ServiceId = item.ServiceId,
                        Quantity = item.Quantity,
                        PriceAtBooking = item.PriceAtBooking,
                        CheckInDate = checkInDate,
                        CheckOutDate = checkOutDate,
                        CreatedAt = DateTime.UtcNow
                    };
                    await _context.CartItems.AddAsync(newCartItem);
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Đồng bộ giỏ hàng thành công" });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error syncing cart");
            return StatusCode(500, new { message = "Lỗi khi đồng bộ giỏ hàng" });
        }
    }

    /// <summary>
    /// PUT /api/cart/{cartItemId} - Cập nhật số lượng của item trong giỏ hàng
    /// </summary>
    [HttpPut("{cartItemId:int}")]
    public async Task<IActionResult> UpdateQuantity(int cartItemId, [FromBody] UpdateQuantityRequest request)
    {
        try
        {
            var userId = GetUserId();

            var cartItem = await _context.CartItems
                .FirstOrDefaultAsync(ci => ci.CartItemId == cartItemId && ci.UserId == userId);

            if (cartItem == null)
            {
                return NotFound(new { message = "Cart item không tồn tại" });
            }

            if (request.Quantity <= 0)
            {
                return BadRequest(new { message = "Số lượng phải lớn hơn 0" });
            }

            cartItem.Quantity = request.Quantity;
            _context.CartItems.Update(cartItem);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Cập nhật số lượng thành công" });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating cart item quantity");
            return StatusCode(500, new { message = "Lỗi khi cập nhật số lượng" });
        }
    }
}

// Request DTOs
public class AddToCartRequest
{
    public int ServiceId { get; set; }
    public int Quantity { get; set; }
    public decimal PriceAtBooking { get; set; }
    public string CheckInDate { get; set; } = string.Empty;
    public string? CheckOutDate { get; set; }
    public string? Notes { get; set; }
}

public class UpdateQuantityRequest
{
    public int Quantity { get; set; }
}

public class SyncCartRequest
{
    public List<SyncCartItem> Items { get; set; } = new();
}

public class SyncCartItem
{
    public int ServiceId { get; set; }
    public int Quantity { get; set; }
    public decimal PriceAtBooking { get; set; }
    public string CheckInDate { get; set; } = string.Empty;
    public string? CheckOutDate { get; set; }
}
