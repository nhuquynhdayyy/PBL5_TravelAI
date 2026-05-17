using Microsoft.EntityFrameworkCore;
using TravelAI.Application.Interfaces;
using TravelAI.Application.DTOs.Availability;
using TravelAI.Domain.Entities;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.Infrastructure.Services;

public class AvailabilityService : IAvailabilityService
{
    private readonly ApplicationDbContext _context;
    private readonly IPricingService _pricingService;

    public AvailabilityService(ApplicationDbContext context, IPricingService pricingService)
    {
        _context = context;
        _pricingService = pricingService;
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

    // 4. Bulk set availability cho nhiều ngày
    public async Task<bool> BulkSetAvailabilityAsync(int serviceId, int partnerId, DateTime startDate, DateTime endDate, decimal price, int stock)
    {
        // Kiểm tra service thuộc về partner
        var service = await _context.Services.FindAsync(serviceId);
        if (service == null || service.PartnerId != partnerId)
        {
            return false;
        }

        var currentDate = startDate.Date;
        while (currentDate <= endDate.Date)
        {
            var existing = await _context.ServiceAvailabilities
                .FirstOrDefaultAsync(a => a.ServiceId == serviceId && a.Date == currentDate);

            var finalPrice = price;

            // Tự động tăng giá 20% cho cuối tuần (Thứ 7 và Chủ nhật)
            if (currentDate.DayOfWeek == DayOfWeek.Saturday || currentDate.DayOfWeek == DayOfWeek.Sunday)
            {
                finalPrice = price * 1.2m;
            }

            if (existing != null)
            {
                existing.Price = finalPrice;
                existing.TotalStock = stock;
            }
            else
            {
                var newAvail = new ServiceAvailability
                {
                    ServiceId = serviceId,
                    Date = currentDate,
                    Price = finalPrice,
                    TotalStock = stock,
                    BookedCount = 0,
                    HeldCount = 0
                };
                _context.ServiceAvailabilities.Add(newAvail);
            }

            currentDate = currentDate.AddDays(1);
        }

        return await _context.SaveChangesAsync() > 0;
    }

    // 5. Cập nhật availability cho 1 ngày cụ thể
    public async Task<bool> UpdateAvailabilityAsync(int availId, int partnerId, decimal? price, int? stock)
    {
        var avail = await _context.ServiceAvailabilities
            .Include(a => a.Service)
            .FirstOrDefaultAsync(a => a.AvailId == availId);

        if (avail == null || avail.Service.PartnerId != partnerId)
        {
            return false;
        }

        if (price.HasValue)
        {
            avail.Price = price.Value;
        }

        if (stock.HasValue)
        {
            avail.TotalStock = stock.Value;
        }

        return await _context.SaveChangesAsync() > 0;
    }

    // 6. Lấy tất cả availability của services thuộc partner
    public async Task<IEnumerable<MyServicesAvailabilityDto>> GetMyServicesAvailabilityAsync(int partnerId, DateTime? startDate, DateTime? endDate)
    {
        var start = startDate?.Date ?? DateTime.Today;
        var end = endDate?.Date ?? DateTime.Today.AddMonths(1);

        var services = await _context.Services
            .Where(s => s.PartnerId == partnerId)
            .Include(s => s.Availabilities.Where(a => a.Date >= start && a.Date <= end))
            .ToListAsync();

        var result = new List<MyServicesAvailabilityDto>();

        foreach (var s in services)
        {
            var availabilities = new List<ServiceAvailabilityDetailDto>();

            foreach (var a in s.Availabilities.OrderBy(x => x.Date))
            {
                // Áp dụng pricing rules để tính giá cuối cùng
                var finalPrice = await _pricingService.CalculateFinalPriceAsync(s.ServiceId, a.Date, a.Price);

                availabilities.Add(new ServiceAvailabilityDetailDto
                {
                    AvailId = a.AvailId,
                    Date = a.Date,
                    Price = finalPrice,  // Giá đã áp dụng pricing rules
                    BasePrice = a.Price,  // Giá gốc
                    TotalStock = a.TotalStock,
                    BookedCount = a.BookedCount,
                    HeldCount = a.HeldCount,
                    Remaining = a.TotalStock - (a.BookedCount + a.HeldCount)
                });
            }

            result.Add(new MyServicesAvailabilityDto
            {
                ServiceId = s.ServiceId,
                ServiceName = s.Name,
                ServiceType = s.ServiceType.ToString(),
                Availabilities = availabilities
            });
        }

        return result;
    }

    // 7. Áp dụng giá cuối tuần tự động
    public async Task<bool> ApplyWeekendPricingAsync(int serviceId, int partnerId, DateTime startDate, DateTime endDate, decimal weekendMultiplier)
    {
        // Kiểm tra service thuộc về partner
        var service = await _context.Services.FindAsync(serviceId);
        if (service == null || service.PartnerId != partnerId)
        {
            return false;
        }

        var currentDate = startDate.Date;
        while (currentDate <= endDate.Date)
        {
            // Chỉ áp dụng cho cuối tuần
            if (currentDate.DayOfWeek == DayOfWeek.Saturday || currentDate.DayOfWeek == DayOfWeek.Sunday)
            {
                var existing = await _context.ServiceAvailabilities
                    .FirstOrDefaultAsync(a => a.ServiceId == serviceId && a.Date == currentDate);

                if (existing != null)
                {
                    // Áp dụng multiplier lên giá hiện tại
                    existing.Price = existing.Price * weekendMultiplier;
                }
            }

            currentDate = currentDate.AddDays(1);
        }

        return await _context.SaveChangesAsync() > 0;
    }
}
