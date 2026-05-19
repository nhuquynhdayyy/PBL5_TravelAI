using Microsoft.EntityFrameworkCore;
using TravelAI.Application.Helpers;
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
        // 1. Lấy thông tin dịch vụ để kiểm tra loại
        var service = await _context.Services.FindAsync(request.ServiceId);
        if (service == null) return null;

        // 2. Xử lý logic khác nhau cho Transport (thuê xe nhiều ngày) vs các dịch vụ khác
        if (service.ServiceType == ServiceType.Transport && request.CheckOutDate.HasValue)
        {
            return await CreateTransportBookingAsync(userId, request, service);
        }
        else
        {
            return await CreateStandardBookingAsync(userId, request, service);
        }
    }

    // Logic cho dịch vụ thường (Hotel, Tour, etc.) - chỉ 1 ngày
    private async Task<int?> CreateStandardBookingAsync(int userId, CreateBookingRequest request, Service service)
    {
        // Kiểm tra kho trực tiếp
        var avail = await _context.ServiceAvailabilities
            .FirstOrDefaultAsync(a => a.ServiceId == request.ServiceId && a.Date == request.CheckInDate.Date);

        if (avail == null || (avail.TotalStock - (avail.BookedCount + avail.HeldCount)) < request.Quantity)
            return null; // Không đủ chỗ

        // Tạo đơn hàng (Booking)
        var booking = new Booking {
            UserId = userId,
            TotalAmount = avail.Price * request.Quantity,
            Status = BookingStatus.Pending,
            CreatedAt = DateTimeHelper.Now
        };

        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync();

        // Tạo chi tiết đơn hàng (BookingItem)
        var item = new BookingItem {
            BookingId = booking.BookingId,
            ServiceId = request.ServiceId,
            Quantity = request.Quantity,
            PriceAtBooking = avail.Price,
            CheckInDate = request.CheckInDate,
        };

        _context.BookingItems.Add(item);

        // Tăng HeldCount trong kho để giữ chỗ
        avail.HeldCount += request.Quantity;

        await _context.SaveChangesAsync();
        return booking.BookingId;
    }

    // Logic cho dịch vụ Transport (thuê xe nhiều ngày)
    private async Task<int?> CreateTransportBookingAsync(int userId, CreateBookingRequest request, Service service)
    {
        if (!request.CheckOutDate.HasValue)
            return null;

        var checkInDate = request.CheckInDate.Date;
        var checkOutDate = request.CheckOutDate.Value.Date;

        if (checkOutDate <= checkInDate)
            return null; // Ngày trả phải sau ngày nhận

        // Tính số ngày thuê (bao gồm cả ngày nhận và ngày trả - 1)
        // Ví dụ: Thuê từ ngày 1 đến ngày 3 = 2 ngày (ngày 1 và ngày 2)
        var rentalDays = (checkOutDate - checkInDate).Days;
        
        // Lấy tất cả availability trong khoảng thời gian thuê
        var availabilities = await _context.ServiceAvailabilities
            .Where(a => a.ServiceId == request.ServiceId 
                     && a.Date >= checkInDate 
                     && a.Date < checkOutDate)  // Không bao gồm ngày trả
            .OrderBy(a => a.Date)
            .ToListAsync();

        // Kiểm tra đủ dữ liệu availability cho tất cả các ngày
        if (availabilities.Count != rentalDays)
            return null; // Thiếu dữ liệu availability

        // Kiểm tra tồn kho cho TẤT CẢ các ngày
        foreach (var avail in availabilities)
        {
            int remaining = avail.TotalStock - (avail.BookedCount + avail.HeldCount);
            if (remaining < request.Quantity)
                return null; // Không đủ xe trong ít nhất 1 ngày
        }

        // Tính tổng tiền = BasePrice * Số ngày * Số lượng xe
        // Sử dụng giá trung bình hoặc giá của ngày đầu tiên
        var totalAmount = availabilities.Sum(a => a.Price) * request.Quantity;

        // Tạo đơn hàng
        var booking = new Booking {
            UserId = userId,
            TotalAmount = totalAmount,
            Status = BookingStatus.Pending,
            CreatedAt = DateTimeHelper.Now
        };

        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync();

        // Tạo chi tiết đơn hàng với CheckOutDate
        var item = new BookingItem {
            BookingId = booking.BookingId,
            ServiceId = request.ServiceId,
            Quantity = request.Quantity,
            PriceAtBooking = totalAmount / rentalDays, // Giá trung bình mỗi ngày
            CheckInDate = checkInDate,
            CheckOutDate = checkOutDate,
            Notes = $"Thue xe {rentalDays} ngay"
        };

        _context.BookingItems.Add(item);

        // QUAN TRỌNG: Trừ tồn kho cho TẤT CẢ các ngày thuê
        foreach (var avail in availabilities)
        {
            avail.HeldCount += request.Quantity;
        }

        await _context.SaveChangesAsync();
        return booking.BookingId;
    }
}