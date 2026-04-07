using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TravelAI.Application.DTOs.Booking;
using TravelAI.Application.Interfaces;
using TravelAI.Infrastructure.Persistence; // Để truy vấn trực tiếp nếu cần
using TravelAI.Domain.Enums;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] // Tất cả các hành động đặt chỗ đều yêu cầu đăng nhập
public class BookingsController : ControllerBase
{
    private readonly IBookingService _bookingService;
    private readonly ApplicationDbContext _context;

    public BookingsController(IBookingService bookingService, ApplicationDbContext context)
    {
        _bookingService = bookingService;
        _context = context;
    }

    // 1. TẠO ĐƠN HÀNG NHÁP (Draft Booking)
    // URL: POST /api/bookings/draft
    [HttpPost("draft")]
    public async Task<IActionResult> CreateDraft([FromBody] CreateBookingRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized(new { message = "Vui lòng đăng nhập!" });

        int userId = int.Parse(userIdClaim.Value);
        
        // Gọi Service xử lý logic: Check kho -> Trừ HeldCount -> Lưu đơn
        var bookingId = await _bookingService.CreateDraftBookingAsync(userId, request);

        if (bookingId == null)
        {
            return BadRequest(new { message = "Xin lỗi, ngày này đã hết chỗ hoặc không đủ số lượng bạn yêu cầu!" });
        }

        return Ok(new { 
            bookingId = bookingId, 
            message = "Đã tạo đơn hàng nháp và giữ chỗ thành công!" 
        });
    }

    // 2. LẤY CHI TIẾT ĐƠN HÀNG (Dùng cho trang Checkout)
    // URL: GET /api/bookings/5
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        // Truy vấn đơn hàng kèm theo thông tin dịch vụ (Service) để lấy tên và giá
        var booking = await _context.Bookings
            .Include(b => b.BookingItems)
            .ThenInclude(bi => bi.Service)
            .FirstOrDefaultAsync(b => b.BookingId == id);

        if (booking == null) 
            return NotFound(new { message = "Đơn hàng không tồn tại hoặc đã bị hủy." });

        // Lấy item đầu tiên (vì ở bản này ta mặc định mỗi lần đặt 1 dịch vụ)
        var item = booking.BookingItems.FirstOrDefault();

        // Trả về Object đúng cấu trúc mà React Checkout.tsx đang dùng
        return Ok(new {
            bookingId = booking.BookingId,
            totalAmount = booking.TotalAmount,
            status = (int)booking.Status, // Chuyển Enum sang số (1: Pending, 2: Paid)
            serviceName = item?.Service?.Name ?? "Dịch vụ du lịch",
            checkInDate = item?.CheckInDate,
            quantity = item?.Quantity
        });
    }

    // 3. XÁC NHẬN THANH TOÁN THÀNH CÔNG
    // URL: POST /api/bookings/5/confirm
    [HttpPost("{id}/confirm")]
    public async Task<IActionResult> ConfirmBooking(int id)
    {
        var booking = await _context.Bookings.FindAsync(id);
        if (booking == null) return NotFound(new { message = "Không tìm thấy đơn hàng." });

        if (booking.Status == BookingStatus.Paid)
            return BadRequest(new { message = "Đơn hàng này đã được thanh toán trước đó." });

        // Cập nhật trạng thái đơn hàng sang Paid (Đã thanh toán)
        booking.Status = BookingStatus.Paid;

        // Lưu thay đổi vào Database
        var result = await _context.SaveChangesAsync();

        if (result > 0)
        {
            return Ok(new { 
                success = true, 
                message = "Xác nhận thanh toán thành công! Đơn hàng của bạn đã hoàn tất." 
            });
        }

        return BadRequest(new { message = "Có lỗi xảy ra khi cập nhật đơn hàng." });
    }
}