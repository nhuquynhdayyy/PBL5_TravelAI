using Microsoft.EntityFrameworkCore;
using TravelAI.Application.Interfaces;
using TravelAI.Application.DTOs.Booking;
using TravelAI.Domain.Entities;
using TravelAI.Domain.Enums;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.Infrastructure.Services;

public class BookingService : IBookingService
{
    private readonly ApplicationDbContext _context;
    public BookingService(ApplicationDbContext context) => _context = context;

    public async Task<int?> CreateDraftBookingAsync(int userId, CreateBookingRequest request)
    {
        // 1. Kiểm tra kho trực tiếp
        var avail = await _context.ServiceAvailabilities
            .FirstOrDefaultAsync(a => a.ServiceId == request.ServiceId && a.Date == request.CheckInDate.Date);

        if (avail == null || (avail.TotalStock - (avail.BookedCount + avail.HeldCount)) < request.Quantity)
            return null; // Không đủ chỗ

        // 2. Lấy thông tin dịch vụ để lấy giá
        var service = await _context.Services.FindAsync(request.ServiceId);
        if (service == null) return null;

        // 3. Tạo đơn hàng (Booking)
        var booking = new Booking {
            UserId = userId,
            TotalAmount = avail.Price * request.Quantity,
            Status = BookingStatus.Pending, // Trạng thái chờ thanh toán
            CreatedAt = DateTime.UtcNow
            // ApprovalDeadline sẽ được set khi khách thanh toán (Status = Paid)
        };

        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync(); // Lưu để lấy BookingId

        // 4. Tạo chi tiết đơn hàng (BookingItem)
        var item = new BookingItem {
            BookingId = booking.BookingId,
            ServiceId = request.ServiceId,
            Quantity = request.Quantity,
            PriceAtBooking = avail.Price,
            CheckInDate = request.CheckInDate,
        };

        _context.BookingItems.Add(item);

        // 5. Quan trọng: Tăng HeldCount trong kho để giữ chỗ cho khách này
        avail.HeldCount += request.Quantity;

        await _context.SaveChangesAsync();
        return booking.BookingId;
    }
}