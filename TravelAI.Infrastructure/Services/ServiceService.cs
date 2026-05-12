using Microsoft.EntityFrameworkCore;
using TravelAI.Application.DTOs.Service;
using TravelAI.Application.Interfaces;
using TravelAI.Domain.Entities;
using TravelAI.Domain.Enums;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.Infrastructure.Services;

public class ServiceService : IServiceService
{
    private readonly ApplicationDbContext _context;
    private readonly TravelAI.Infrastructure.ExternalServices.GeminiService _geminiService;

    public ServiceService(ApplicationDbContext context, TravelAI.Infrastructure.ExternalServices.GeminiService geminiService)
    {
        _context = context;
        _geminiService = geminiService;
    }

    public async Task<IEnumerable<ServiceDto>> GetAllAsync(int? type)
    {
        var query = BuildServiceQuery()
            .Where(s => s.IsActive);

        if (type.HasValue)
        {
            query = query.Where(s => (int)s.ServiceType == type.Value);
        }

        var data = await query.ToListAsync();
        return data.Select(MapToDto);
    }

    public async Task<IEnumerable<ServiceDto>> GetPartnerServicesAsync(int partnerId)
    {
        var data = await BuildServiceQuery()
            .Where(s => s.PartnerId == partnerId)
            .ToListAsync();

        return data.Select(MapToDto);
    }

    public async Task<IEnumerable<ServiceDto>> AdminGetAllServicesAsync()
    {
        var data = await BuildServiceQuery().ToListAsync();
        return data.Select(MapToDto);
    }

    public async Task<IEnumerable<ServiceDto>> GetPendingServicesAsync()
    {
        var data = await BuildServiceQuery()
            .Where(s => !s.IsActive)
            .OrderByDescending(s => s.ServiceId)
            .ToListAsync();

        return data.Select(MapToDto);
    }

    public async Task<bool> ApproveAsync(int id)
    {
        var service = await _context.Services.FindAsync(id);
        if (service == null)
        {
            return false;
        }

        service.IsActive = true;
        return await _context.SaveChangesAsync() > 0;
    }

    public async Task<bool> RejectAsync(int id, string reason, int adminUserId)
    {
        var service = await _context.Services.FindAsync(id);
        if (service == null)
        {
            return false;
        }

        service.IsActive = false;
        _context.AuditLogs.Add(new AuditLog
        {
            UserId = adminUserId,
            TableName = "Services",
            RecordId = service.ServiceId,
            Action = BuildRejectAuditMessage(reason)
        });

        return await _context.SaveChangesAsync() > 0;
    }

    public async Task<bool> ToggleStatusAsync(int id)
    {
        var service = await _context.Services.FindAsync(id);
        if (service == null)
        {
            return false;
        }

        service.IsActive = !service.IsActive;
        return await _context.SaveChangesAsync() > 0;
    }

    public async Task<ServiceDto?> GetByIdAsync(int id)
    {
        var service = await BuildServiceQuery()
            .FirstOrDefaultAsync(x => x.ServiceId == id);

        return service == null ? null : MapToDto(service);
    }
public async Task<ServiceDto> CreateAsync(int partnerId, CreateServiceRequest request, string webRootPath)
    {
        await EnsurePartnerApprovedAsync(partnerId);
        var validatedSpotId = await GetValidatedSpotIdAsync(request.SpotId);

        var service = new Service
        {
            PartnerId = partnerId,
            Name = request.Name,
            Description = request.Description ?? string.Empty,
            BasePrice = request.BasePrice,
            ServiceType = (ServiceType)request.ServiceType,
            SpotId = validatedSpotId,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            IsActive = false
        };

        if (request.Images != null)
        {
            foreach (var file in request.Images)
            {
                var fileName = Guid.NewGuid() + Path.GetExtension(file.FileName);
                var folderPath = Path.Combine(webRootPath, "uploads", "services");
                if (!Directory.Exists(folderPath))
                {
                    Directory.CreateDirectory(folderPath);
                }

                var filePath = Path.Combine(folderPath, fileName);
                using var stream = new FileStream(filePath, FileMode.Create);
                await file.CopyToAsync(stream);

                service.Images.Add(new ServiceImage
                {
                    ImageUrl = $"/uploads/services/{fileName}"
                });
            }
        }

        _context.Services.Add(service);
        await _context.SaveChangesAsync();

        var createdService = await BuildServiceQuery()
            .FirstAsync(s => s.ServiceId == service.ServiceId);

        return MapToDto(createdService);
    }

    public async Task<bool> UpdateAsync(int id, CreateServiceRequest request, string webRootPath)
    {
        var service = await _context.Services
            .Include(x => x.Images)
            .FirstOrDefaultAsync(x => x.ServiceId == id);

        if (service == null)
        {
            return false;
        }

        await EnsurePartnerApprovedAsync(service.PartnerId);
        var validatedSpotId = await GetValidatedSpotIdAsync(request.SpotId);

        service.Name = request.Name;
        service.Description = request.Description ?? string.Empty;
        service.BasePrice = request.BasePrice;
        service.ServiceType = (ServiceType)request.ServiceType;
        service.SpotId = validatedSpotId;
        service.Latitude = request.Latitude;
        service.Longitude = request.Longitude;
        service.IsActive = false;

        if (request.Images != null && request.Images.Count > 0)
        {
            var folderPath = Path.Combine(webRootPath, "uploads", "services");
            if (!Directory.Exists(folderPath))
            {
                Directory.CreateDirectory(folderPath);
            }

            foreach (var file in request.Images)
            {
var fileName = Guid.NewGuid() + Path.GetExtension(file.FileName);
                var filePath = Path.Combine(folderPath, fileName);
                using var stream = new FileStream(filePath, FileMode.Create);
                await file.CopyToAsync(stream);

                service.Images.Add(new ServiceImage
                {
                    ImageUrl = $"/uploads/services/{fileName}"
                });
            }
        }

        return await _context.SaveChangesAsync() > 0;
    }

    public async Task<bool> DeleteAsync(int id, string webRootPath)
    {
        var service = await _context.Services
            .Include(x => x.Images)
            .FirstOrDefaultAsync(x => x.ServiceId == id);

        if (service == null)
        {
            return false;
        }

        foreach (var image in service.Images)
        {
            var fullPath = Path.Combine(webRootPath, image.ImageUrl.TrimStart('/'));
            if (File.Exists(fullPath))
            {
                File.Delete(fullPath);
            }
        }

        _context.Services.Remove(service);
        return await _context.SaveChangesAsync() > 0;
    }

    private IQueryable<Service> BuildServiceQuery()
    {
        return _context.Services
            .Include(s => s.Partner)
                .ThenInclude(p => p.PartnerProfile)
            .Include(s => s.TouristSpot)
            .Include(s => s.Images)
            .AsNoTracking();
    }

    private static string BuildRejectAuditMessage(string reason)
    {
        var normalizedReason = string.IsNullOrWhiteSpace(reason) ? "Khong co ly do" : reason.Trim();
        var message = $"Rejected: {normalizedReason}";
        return message.Length <= 100 ? message : message[..100];
    }

    private static ServiceDto MapToDto(Service service)
    {
        var partnerName = !string.IsNullOrWhiteSpace(service.Partner?.PartnerProfile?.BusinessName)
            ? service.Partner.PartnerProfile.BusinessName
            : service.Partner?.FullName ?? "N/A";

        return new ServiceDto(
            service.ServiceId,
            service.PartnerId,
            partnerName,
            service.Name,
            service.Description ?? string.Empty,
            service.BasePrice,
            service.ServiceType.ToString(),
            service.RatingAvg,
            service.SpotId,
            service.TouristSpot?.Name,
            service.Images.Select(img => img.ImageUrl).ToList(),
            service.IsActive
        );
    }

    private async Task EnsurePartnerApprovedAsync(int partnerId)
    {
        var partnerProfile = await _context.PartnerProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == partnerId);

        if (partnerProfile == null || partnerProfile.VerificationStatus != PartnerVerificationStatus.Approved)
        {
            throw new InvalidOperationException("Partner must be approved before publishing services.");
        }
    }
private async Task<int> GetValidatedSpotIdAsync(int? spotId)
    {
        if (spotId is null or <= 0)
        {
            throw new InvalidOperationException("Vui long chon dia diem cho dich vu.");
        }

        var exists = await _context.TouristSpots
            .AsNoTracking()
            .AnyAsync(spot => spot.SpotId == spotId.Value);

        if (!exists)
        {
            throw new InvalidOperationException("Dia diem duoc chon khong ton tai.");
        }

        return spotId.Value;
    }

    public async Task<string?> GetReviewSummaryAsync(int serviceId)
    {
        var service = await _context.Services
            .Include(s => s.Reviews)
            .FirstOrDefaultAsync(s => s.ServiceId == serviceId);

        if (service == null)
        {
            return null;
        }

        // Nếu đã có cache, trả về luôn
        if (!string.IsNullOrWhiteSpace(service.ReviewSummary))
        {
            return service.ReviewSummary;
        }

        // Nếu chưa có review, trả về message mặc định
        if (service.Reviews == null || service.Reviews.Count == 0)
        {
            return "Dịch vụ này chưa có đánh giá nào.";
        }

        // Gọi AI để tạo summary
        var comments = service.Reviews
            .Where(r => !string.IsNullOrWhiteSpace(r.Comment))
            .Select(r => $"- Rating {r.Rating}/5: {r.Comment}")
            .ToList();

        if (comments.Count == 0)
        {
            return "Các đánh giá chưa có nội dung chi tiết.";
        }

        var prompt = $@"Tóm tắt các đánh giá sau thành 2-3 câu ngắn gọn, nêu rõ điểm mạnh và điểm yếu chính (nếu có):

{string.Join("\n", comments)}

Chỉ trả về đoạn tóm tắt, không thêm tiêu đề hay giải thích.";

        try
        {
            var summary = await _geminiService.CallApiAsync(
                prompt,
                systemPrompt: "Bạn là trợ lý tóm tắt đánh giá. Chỉ trả về đoạn tóm tắt ngắn gọn, không thêm markdown hay giải thích.",
                requireJsonResponse: false
            );

            // Cache lại kết quả
            service.ReviewSummary = summary.Trim();
            await _context.SaveChangesAsync();

            return service.ReviewSummary;
        }
        catch
        {
            return "Không thể tạo tóm tắt đánh giá lúc này.";
        }
    }
}
