using Microsoft.EntityFrameworkCore;
using TravelAI.Application.Helpers;
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

        if (data.Count == 0)
            return Enumerable.Empty<ServiceAvailabilityDto>();

        // Load tất cả pricing rules cho service trong khoảng ngày — một lần duy nhất
        var rules = await _context.PricingRules
            .Where(r => r.ServiceId == serviceId
                     && r.StartDate <= endDate.Date
                     && r.EndDate   >= startDate.Date)
            .ToListAsync();

        var result = data.Select(a =>
        {
            int remaining = a.TotalStock - (a.BookedCount + a.HeldCount);

            // Áp dụng pricing rules in-memory (không query DB trong vòng lặp)
            var applicableRules = rules.Where(r => r.StartDate <= a.Date && r.EndDate >= a.Date);
            var finalPrice = applicableRules.Aggregate(a.Price, (price, rule) => price * rule.PriceMultiplier);

            return new ServiceAvailabilityDto(
                a.Date,
                finalPrice,
                remaining < 0 ? 0 : remaining,
                remaining > 0
            );
        });

        return result.OrderBy(x => x.Date);
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
        ValidatePriceAndStock(price, stock);

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
    public async Task<bool> BulkSetAvailabilityAsync(int serviceId, int requestingUserId, bool isAdmin, DateTime startDate, DateTime endDate, decimal price, int stock)
    {
        ValidateDateRange(startDate, endDate);
        ValidatePriceAndStock(price, stock);

        // Kiểm tra service thuộc về partner
        var service = await _context.Services.FindAsync(serviceId);
        if (service == null || (!isAdmin && service.PartnerId != requestingUserId))
        {
            return false;
        }

        var currentDate = startDate.Date;
        while (currentDate <= endDate.Date)
        {
            var existing = await _context.ServiceAvailabilities
                .FirstOrDefaultAsync(a => a.ServiceId == serviceId && a.Date == currentDate);

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
                    Date = currentDate,
                    Price = price,
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
    public async Task<bool> UpdateAvailabilityAsync(int availId, int requestingUserId, bool isAdmin, decimal? price, int? stock)
    {
        ValidateOptionalPriceAndStock(price, stock);

        var avail = await _context.ServiceAvailabilities
            .Include(a => a.Service)
            .FirstOrDefaultAsync(a => a.AvailId == availId);

        if (avail == null || (!isAdmin && avail.Service.PartnerId != requestingUserId))
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

        if (services.Count == 0)
            return Enumerable.Empty<MyServicesAvailabilityDto>();

        var serviceIds = services.Select(s => s.ServiceId).ToList();

        // Load tất cả pricing rules cho tất cả services — một lần duy nhất
        var allRules = await _context.PricingRules
            .Where(r => serviceIds.Contains(r.ServiceId)
                     && r.StartDate <= end
                     && r.EndDate   >= start)
            .ToListAsync();

        var result = new List<MyServicesAvailabilityDto>();

        foreach (var s in services)
        {
            var serviceRules = allRules.Where(r => r.ServiceId == s.ServiceId).ToList();

            var availabilities = s.Availabilities.OrderBy(x => x.Date).Select(a =>
            {
                // Áp dụng pricing rules in-memory
                var applicableRules = serviceRules.Where(r => r.StartDate <= a.Date && r.EndDate >= a.Date);
                var finalPrice = applicableRules.Aggregate(a.Price, (price, rule) => price * rule.PriceMultiplier);

                return new ServiceAvailabilityDetailDto
                {
                    AvailId = a.AvailId,
                    Date = a.Date,
                    Price = finalPrice,
                    BasePrice = a.Price,
                    TotalStock = a.TotalStock,
                    BookedCount = a.BookedCount,
                    HeldCount = a.HeldCount,
                    Remaining = a.TotalStock - (a.BookedCount + a.HeldCount)
                };
            }).ToList();

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
    public async Task<bool> ApplyWeekendPricingAsync(int serviceId, int requestingUserId, bool isAdmin, DateTime startDate, DateTime endDate, decimal weekendMultiplier)
    {
        ValidateDateRange(startDate, endDate);
        if (weekendMultiplier < 1)
        {
            throw new InvalidOperationException("He so gia cuoi tuan phai lon hon hoac bang 1.");
        }

        // Kiểm tra service thuộc về partner
        var service = await _context.Services.FindAsync(serviceId);
        if (service == null || (!isAdmin && service.PartnerId != requestingUserId))
        {
            return false;
        }

        var weekendDates = EnumerateDates(startDate.Date, endDate.Date)
            .Where(IsWeekend)
            .ToList();

        if (weekendDates.Count == 0)
        {
            return true;
        }

        var rangeStart = weekendDates.Min();
        var rangeEnd = weekendDates.Max();
        var existingAutoWeekendRules = await _context.PricingRules
            .Where(rule =>
                rule.ServiceId == serviceId &&
                rule.Description != null &&
                rule.Description.StartsWith("Auto weekend pricing") &&
                rule.StartDate >= rangeStart &&
                rule.EndDate <= rangeEnd)
            .ToListAsync();

        _context.PricingRules.RemoveRange(existingAutoWeekendRules);

        foreach (var weekendDate in weekendDates)
        {
            _context.PricingRules.Add(new PricingRule
            {
                ServiceId = serviceId,
StartDate = weekendDate,
                EndDate = weekendDate,
                PriceMultiplier = weekendMultiplier,
                Description = $"Auto weekend pricing x{weekendMultiplier}",
                CreatedAt = DateTimeHelper.Now
            });
        }

        return await _context.SaveChangesAsync() > 0;
    }

    private static IEnumerable<DateTime> EnumerateDates(DateTime startDate, DateTime endDate)
    {
        var currentDate = startDate.Date;
        while (currentDate <= endDate.Date)
        {
            yield return currentDate;
            currentDate = currentDate.AddDays(1);
        }
    }

    private static bool IsWeekend(DateTime date)
        => date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday;

    private static void ValidateDateRange(DateTime startDate, DateTime endDate)
    {
        if (startDate.Date > endDate.Date)
        {
            throw new InvalidOperationException("Ngay bat dau phai nho hon hoac bang ngay ket thuc.");
        }
    }

    private static void ValidatePriceAndStock(decimal price, int stock)
    {
        if (price < 0)
        {
            throw new InvalidOperationException("Gia khong duoc am.");
        }

        if (stock < 0)
        {
            throw new InvalidOperationException("So luong ton kho khong duoc am.");
        }
    }

    private static void ValidateOptionalPriceAndStock(decimal? price, int? stock)
    {
        if (price.HasValue && price.Value < 0)
        {
            throw new InvalidOperationException("Gia khong duoc am.");
        }

        if (stock.HasValue && stock.Value < 0)
        {
            throw new InvalidOperationException("So luong ton kho khong duoc am.");
        }
    }
}