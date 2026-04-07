using Microsoft.EntityFrameworkCore;
using TravelAI.Application.Interfaces;
using TravelAI.Application.DTOs.Availability;
using TravelAI.Domain.Entities;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.Infrastructure.Services;

public class AvailabilityService : IAvailabilityService
{
    private readonly ApplicationDbContext _context;

    public AvailabilityService(ApplicationDbContext context)
    {
        _context = context;
    }

    // 1. Lấy danh sách ngày còn trống để hiện lên lịch cho Khách xem
    public async Task<IEnumerable<ServiceAvailabilityDto>> GetAvailabilityAsync(int serviceId, DateTime startDate, DateTime endDate)
    {
        var data = await _context.ServiceAvailabilities
            .Where(a => a.ServiceId == serviceId && a.Date >= startDate.Date && a.Date <= endDate.Date)
            .ToListAsync();

        return data.Select(a => {
            // CÔNG THỨC CHÍNH: Còn lại = Tổng - (Đã thanh toán + Đang giữ chỗ tạm thời)
            int remaining = a.TotalStock - (a.BookedCount + a.HeldCount);
            
            return new ServiceAvailabilityDto(
                a.Date,
                a.Price,
                remaining < 0 ? 0 : remaining, // Đảm bảo không bị số âm
                remaining > 0                  // Còn chỗ thì là true
            );
        }).OrderBy(x => x.Date);
    }

    // 2. Kiểm tra chặt chẽ số lượng ngay lúc khách bấm nút "Đặt"
    public async Task<bool> CheckStockAsync(int serviceId, DateTime date, int requestedQuantity)
    {
        var avail = await _context.ServiceAvailabilities
            .FirstOrDefaultAsync(a => a.ServiceId == serviceId && a.Date == date.Date);

        if (avail == null) return false; // Ngày này không có dữ liệu bán

        int remaining = avail.TotalStock - (avail.BookedCount + avail.HeldCount);
        
        // Trả về true nếu số lượng còn lại đủ cho số lượng khách yêu cầu
        return remaining >= requestedQuantity;
    }

    // 3. Dành cho Partner: Cập nhật giá và số lượng cho một ngày cụ thể
    public async Task<bool> SetAvailabilityAsync(int serviceId, DateTime date, decimal price, int stock)
    {
        var existing = await _context.ServiceAvailabilities
            .FirstOrDefaultAsync(a => a.ServiceId == serviceId && a.Date == date.Date);

        if (existing != null)
        {
            existing.Price = price;
            existing.TotalStock = stock;
        }
        else
        {
            var newAvail = new ServiceAvailability 
            {
                ServiceId = serviceId,
                Date = date.Date,
                Price = price,
                TotalStock = stock,
                BookedCount = 0,
                HeldCount = 0
            };
            _context.ServiceAvailabilities.Add(newAvail);
        }

        return await _context.SaveChangesAsync() > 0;
    }
}