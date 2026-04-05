using Microsoft.EntityFrameworkCore;
using TravelAI.Application.Interfaces;
using TravelAI.Application.DTOs.Service;
using TravelAI.Domain.Entities;
using TravelAI.Domain.Enums;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.Infrastructure.Services;

public class ServiceService : IServiceService
{
    private readonly ApplicationDbContext _context;

    public ServiceService(ApplicationDbContext context)
    {
        _context = context;
    }

    // --- 1. DÀNH CHO CUSTOMER (TRANG PUBLIC) ---
    public async Task<IEnumerable<ServiceDto>> GetAllAsync(int? type)
    {
        var query = _context.Services
            .Include(s => s.Partner)       // Lấy thông tin người tạo (tên nick)
            .Include(s => s.TouristSpot)
            .Include(s => s.Images)
            .Where(s => s.IsActive == true) // QUAN TRỌNG: Chỉ khách mới thấy bài đã duyệt
            .AsQueryable();

        if (type.HasValue)
        {
            query = query.Where(s => (int)s.ServiceType == type.Value);
        }

        var data = await query.ToListAsync();
        return data.Select(s => MapToDto(s));
    }

    // --- 2. DÀNH CHO PARTNER (QUẢN LÝ DỊCH VỤ CỦA TÔI) ---
    public async Task<IEnumerable<ServiceDto>> GetPartnerServicesAsync(int partnerId)
    {
        var data = await _context.Services
            .Include(s => s.Partner)       // Lấy thông tin đối tác
            .Include(s => s.TouristSpot)
            .Include(s => s.Images)
            .Where(s => s.PartnerId == partnerId)
            .ToListAsync();

        return data.Select(s => MapToDto(s));
    }

    // --- 3. DÀNH CHO ADMIN (QUẢN TRỊ TOÀN HỆ THỐNG) ---
    public async Task<IEnumerable<ServiceDto>> AdminGetAllServicesAsync()
    {
        var data = await _context.Services
            .Include(s => s.Partner)       // Lấy tên Partner để Admin biết ai đăng
            .Include(s => s.TouristSpot)
            .Include(s => s.Images)
            .ToListAsync();

        return data.Select(s => MapToDto(s));
    }

    // Admin bấm nút Duyệt hoặc Khóa
    public async Task<bool> ToggleStatusAsync(int id)
    {
        var s = await _context.Services.FindAsync(id);
        if (s == null) return false;

        s.IsActive = !s.IsActive; // Đảo trạng thái
        return await _context.SaveChangesAsync() > 0;
    }

    // --- CRUD CƠ BẢN ---

    public async Task<ServiceDto?> GetByIdAsync(int id)
    {
        var s = await _context.Services
            .Include(s => s.Partner)
            .Include(s => s.TouristSpot)
            .Include(s => s.Images)
            .FirstOrDefaultAsync(x => x.ServiceId == id);

        return s == null ? null : MapToDto(s);
    }

    public async Task<ServiceDto> CreateAsync(int partnerId, CreateServiceRequest request, string webRootPath)
    {
        var service = new Service
        {
            PartnerId = partnerId,
            Name = request.Name,
            Description = request.Description ?? "",
            BasePrice = request.BasePrice,
            ServiceType = (ServiceType)request.ServiceType,
            SpotId = request.SpotId > 0 ? request.SpotId : null,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            IsActive = false // Luôn là false khi mới tạo, chờ Admin duyệt
        };

        if (request.Images != null)
        {
            foreach (var file in request.Images)
            {
                string fileName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);
                string folderPath = Path.Combine(webRootPath, "uploads", "services");
                if (!Directory.Exists(folderPath)) Directory.CreateDirectory(folderPath);

                string filePath = Path.Combine(folderPath, fileName);
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }
                service.Images.Add(new ServiceImage { ImageUrl = $"/uploads/services/{fileName}" });
            }
        }

        _context.Services.Add(service);
        await _context.SaveChangesAsync();

        // Load lại để có đầy đủ thông tin Partner khi trả về DTO
        await _context.Entry(service).Reference(s => s.Partner).LoadAsync();
        
        return MapToDto(service);
    }

    public async Task<bool> UpdateAsync(int id, CreateServiceRequest request, string webRootPath)
    {
        var s = await _context.Services.Include(x => x.Images).FirstOrDefaultAsync(x => x.ServiceId == id);
        if (s == null) return false;

        s.Name = request.Name;
        s.Description = request.Description ?? "";
        s.BasePrice = request.BasePrice;
        s.ServiceType = (ServiceType)request.ServiceType;
        s.SpotId = request.SpotId > 0 ? request.SpotId : null;

        if (request.Images != null && request.Images.Count > 0)
        {
            foreach (var file in request.Images)
            {
                string fileName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);
                string filePath = Path.Combine(webRootPath, "uploads", "services", fileName);
                using (var stream = new FileStream(filePath, FileMode.Create)) { await file.CopyToAsync(stream); }
                s.Images.Add(new ServiceImage { ImageUrl = $"/uploads/services/{fileName}" });
            }
        }

        return await _context.SaveChangesAsync() > 0;
    }

    public async Task<bool> DeleteAsync(int id, string webRootPath)
    {
        var s = await _context.Services.Include(x => x.Images).FirstOrDefaultAsync(x => x.ServiceId == id);
        if (s == null) return false;

        foreach (var img in s.Images)
        {
            var fullPath = Path.Combine(webRootPath, img.ImageUrl.TrimStart('/'));
            if (File.Exists(fullPath)) File.Delete(fullPath);
        }

        _context.Services.Remove(s);
        return await _context.SaveChangesAsync() > 0;
    }

    // --- HÀM ÁNH XẠ (MAPPING) ---
    // Phải khớp với cấu trúc ServiceDto(ServiceId, PartnerId, PartnerName, Name...)
    private ServiceDto MapToDto(Service s) => new ServiceDto(
        s.ServiceId,
        s.PartnerId,
        s.Partner?.FullName ?? "N/A", // Gán tên đối tác vào PartnerName
        s.Name,
        s.Description ?? "",
        s.BasePrice,
        s.ServiceType.ToString(),
        s.RatingAvg,
        s.SpotId,
        s.TouristSpot?.Name,
        s.Images.Select(img => img.ImageUrl).ToList(),
        s.IsActive
    );
}