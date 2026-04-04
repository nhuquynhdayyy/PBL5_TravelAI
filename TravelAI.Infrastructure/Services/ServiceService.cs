using Microsoft.EntityFrameworkCore;
using TravelAI.Application.Interfaces;
using TravelAI.Application.DTOs.Service;
using TravelAI.Domain.Entities;
using TravelAI.Domain.Enums; // Thêm cái này
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.Infrastructure.Services;

public class ServiceService : IServiceService
{
    private readonly ApplicationDbContext _context;
    public ServiceService(ApplicationDbContext context) => _context = context;

    public async Task<IEnumerable<ServiceDto>> GetAllAsync(int? type)
    {
        var query = _context.Services
            .Include(s => s.TouristSpot)
            .Include(s => s.Images)
            .AsQueryable();

        // Sửa logic lọc: So sánh trực tiếp giá trị int của Enum
        if (type.HasValue)
        {
            query = query.Where(s => (int)s.ServiceType == type.Value);
        }

        var data = await query.ToListAsync();
        return data.Select(s => MapToDto(s));
    }

    public async Task<ServiceDto?> GetByIdAsync(int id)
    {
        var s = await _context.Services
            .Include(s => s.TouristSpot)
            .Include(s => s.Images)
            .FirstOrDefaultAsync(x => x.ServiceId == id);
        return s == null ? null : MapToDto(s);
    }

    public async Task<ServiceDto> CreateAsync(int partnerId, CreateServiceRequest request, string webRootPath)
    {
        var service = new Service {
            PartnerId = partnerId,
            Name = request.Name,
            Description = request.Description ?? "",
            BasePrice = request.BasePrice,
            ServiceType = (ServiceType)request.ServiceType, // Ép kiểu int sang Enum
            SpotId = request.SpotId > 0 ? request.SpotId : null,
            Latitude = request.Latitude,
            Longitude = request.Longitude
        };

        if (request.Images != null) {
            foreach (var file in request.Images) {
                string fileName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);
                string filePath = Path.Combine(webRootPath, "uploads", "services", fileName);
                Directory.CreateDirectory(Path.GetDirectoryName(filePath)!);
                using (var stream = new FileStream(filePath, FileMode.Create)) { await file.CopyToAsync(stream); }
                service.Images.Add(new ServiceImage { ImageUrl = $"/uploads/services/{fileName}" });
            }
        }
        _context.Services.Add(service);
        await _context.SaveChangesAsync();
        return MapToDto(service);
    }

    public async Task<bool> UpdateAsync(int id, CreateServiceRequest request, string webRootPath)
    {
        var s = await _context.Services.Include(x => x.Images).FirstOrDefaultAsync(x => x.ServiceId == id);
        if (s == null) return false;

        s.Name = request.Name;
        s.Description = request.Description ?? "";
        s.BasePrice = request.BasePrice;
        s.ServiceType = (ServiceType)request.ServiceType; // Ép kiểu int sang Enum
        s.SpotId = request.SpotId > 0 ? request.SpotId : null;

        // Nếu có ảnh mới thì xử lý thêm (tùy chọn xóa cũ hoặc cộng dồn)
        if (request.Images != null && request.Images.Count > 0) {
             foreach (var file in request.Images) {
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
        var s = await _context.Services.FindAsync(id);
        if (s == null) return false;
        _context.Services.Remove(s);
        return await _context.SaveChangesAsync() > 0;
    }

    private ServiceDto MapToDto(Service s) => new ServiceDto(
        s.ServiceId, s.PartnerId, s.Name, s.Description ?? "", s.BasePrice,
        s.ServiceType.ToString(), s.RatingAvg, s.SpotId, s.TouristSpot?.Name,
        s.Images.Select(img => img.ImageUrl).ToList()
    );
}