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
                .ThenInclude(t => t!.Destination)
            .Include(s => s.Images)
            .Include(s => s.Attributes)
            .Include(s => s.Availabilities)
            .Include(s => s.Reviews)
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

        return new ServiceDto
        {
            ServiceId = service.ServiceId,
            PartnerId = service.PartnerId,
            PartnerName = partnerName,
            Name = service.Name,
            Description = service.Description ?? string.Empty,
            BasePrice = service.BasePrice,
            ServiceType = service.ServiceType.ToString(),
            RatingAvg = service.RatingAvg,
            ReviewCount = service.Reviews?.Count ?? 0,
            IsActive = service.IsActive,
            SpotId = service.SpotId,
            SpotName = service.TouristSpot?.Name,
            Latitude = service.Latitude,
            Longitude = service.Longitude,
            ImageUrls = service.Images.Select(img => img.ImageUrl).ToList(),
            Attributes = ToAttributeDictionary(service.Attributes),
            HasAvailability = service.Availabilities?.Any() ?? false
        };
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

    // ==================== NEW FILTERING METHODS ====================
    
    public async Task<ServiceFilterResponse> FilterServicesAsync(ServiceFilterRequest request)
    {
        // Start with base query
        var query = BuildServiceQuery()
            .Where(s => s.IsActive)
            .AsQueryable();

        // Apply filters
        query = ApplyFilters(query, request);

        // Get total count before pagination
        var totalCount = await query.CountAsync();

        // Apply sorting
        query = ApplySorting(query, request.SortBy, request.SortDescending);

        // Apply pagination
        var services = await query
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync();

        // Map to DTOs
        var serviceDtos = services.Select(MapToDtoWithAttributes).ToList();

        return new ServiceFilterResponse
        {
            Services = serviceDtos,
            TotalCount = totalCount,
            PageNumber = request.PageNumber,
            PageSize = request.PageSize
        };
    }

    public async Task<ServiceFilterMetadata> GetFilterMetadataAsync(string? serviceType = null)
    {
        var query = _context.Services
            .Where(s => s.IsActive)
            .AsQueryable();

        if (TryParseServiceType(serviceType, out var parsedServiceType))
        {
            query = query.Where(s => s.ServiceType == parsedServiceType);
        }

        var metadata = new ServiceFilterMetadata
        {
            MinPrice = await query.MinAsync(s => (decimal?)s.BasePrice) ?? 0,
            MaxPrice = await query.MaxAsync(s => (decimal?)s.BasePrice) ?? 0,
            AvailableServiceTypes = await _context.Services
                .Where(s => s.IsActive)
                .Select(s => s.ServiceType.ToString())
                .Distinct()
                .ToListAsync(),
            AvailableDestinations = await _context.Services
                .Where(s => s.IsActive && s.TouristSpot != null && s.TouristSpot.Destination != null)
                .Select(s => s.TouristSpot!.Destination!.Name)
                .Distinct()
                .ToListAsync()
        };

        // Get available attributes for the service type
        if (parsedServiceType.HasValue)
        {
            var attributes = await _context.ServiceAttributes
                .Where(a => a.Service.IsActive && a.Service.ServiceType == parsedServiceType.Value)
                .GroupBy(a => a.AttrKey)
                .Select(g => new
                {
                    Key = g.Key,
                    Values = g.Select(a => a.AttrValue).Distinct().ToList()
                })
                .ToListAsync();

            metadata.AvailableAttributes = attributes.ToDictionary(
                a => a.Key,
                a => a.Values
            );
        }

        return metadata;
    }

    // ==================== PRIVATE HELPER METHODS ====================

    private IQueryable<Service> ApplyFilters(IQueryable<Service> query, ServiceFilterRequest request)
    {
        // Service Type filter
        if (TryParseServiceType(request.ServiceType, out var serviceType))
        {
            query = query.Where(s => s.ServiceType == serviceType);
        }

        // Price range filter
        if (request.MinPrice.HasValue)
        {
            query = query.Where(s => s.BasePrice >= request.MinPrice.Value);
        }
        if (request.MaxPrice.HasValue)
        {
            query = query.Where(s => s.BasePrice <= request.MaxPrice.Value);
        }

        // Rating filter
        var rating = request.MinRating ?? request.Rating;
        if (rating.HasValue)
        {
            query = query.Where(s => s.RatingAvg >= rating.Value);
        }

        // Destination filter
        if (request.DestinationId.HasValue)
        {
            query = query.Where(s => s.TouristSpot != null && 
                                    s.TouristSpot.DestinationId == request.DestinationId.Value);
        }

        // Spot filter
        if (request.SpotId.HasValue)
        {
            query = query.Where(s => s.SpotId == request.SpotId.Value);
        }

        // Search keyword
        if (!string.IsNullOrWhiteSpace(request.SearchKeyword))
        {
            var keyword = request.SearchKeyword.Trim().ToLower();
            query = query.Where(s => 
                s.Name.ToLower().Contains(keyword) || 
                s.Description.ToLower().Contains(keyword));
        }

        // Dynamic attribute filters
        if (request.Attributes != null && request.Attributes.Any())
        {
            foreach (var attr in request.Attributes)
            {
                var key = attr.Key;
                var value = attr.Value;
                query = query.Where(s => s.Attributes.Any(a =>
                    a.AttrKey.ToLower() == key.ToLower()
                    && (a.AttrValue.ToLower().Contains(value.ToLower()) || value.ToLower() == "true")));
            }
        }

        // Hotel-specific filters
        if (request.HotelStars.HasValue)
        {
            var stars = request.HotelStars.Value.ToString();
            query = query.Where(s => s.Attributes.Any(a =>
                (a.AttrKey == "Star" || a.AttrKey == "Số sao" || a.AttrKey == "So sao")
                && a.AttrValue.Contains(stars)));
        }
        if (request.HotelAmenities != null && request.HotelAmenities.Any())
        {
            foreach (var amenity in request.HotelAmenities)
            {
                var normalizedAmenity = amenity.Trim().ToLower();
                query = query.Where(s => s.Attributes.Any(a =>
                    a.AttrKey.ToLower().Contains(normalizedAmenity)
                    || a.AttrValue.ToLower().Contains(normalizedAmenity)
                    || (normalizedAmenity == "pool" && (a.AttrKey.Contains("Hồ bơi") || a.AttrValue.Contains("hồ bơi")))
                    || (normalizedAmenity == "breakfast" && (a.AttrKey.Contains("Bữa sáng") || a.AttrValue.Contains("bữa sáng")))
                    || (normalizedAmenity == "wifi" && (a.AttrKey.ToLower().Contains("wifi") || a.AttrValue.ToLower().Contains("wifi")))));
            }
        }

        // Tour-specific filters
        if (request.TourThemes != null && request.TourThemes.Any())
        {
            var themes = request.TourThemes.Select(t => t.ToLower()).ToList();
            query = query.Where(s => s.Attributes.Any(a =>
                (a.AttrKey == "Theme" || a.AttrKey == "Chủ đề" || a.AttrKey == "Chu de")
                && themes.Any(theme => a.AttrValue.ToLower().Contains(theme))));
        }
        if (!string.IsNullOrWhiteSpace(request.TourDuration))
        {
            var duration = NormalizeDurationFilter(request.TourDuration);
            query = query.Where(s => s.Attributes.Any(a =>
                (a.AttrKey == "Duration" || a.AttrKey == "Thời gian" || a.AttrKey == "Thời lượng")
                && a.AttrValue.ToLower().Contains(duration)));
        }

        // Transport-specific filters
        if (!string.IsNullOrWhiteSpace(request.TransportType))
        {
            var transportType = request.TransportType.Trim().ToLower();
            query = query.Where(s => s.Attributes.Any(a =>
                (a.AttrKey == "TransportType" || a.AttrKey == "Loại xe" || a.AttrKey == "Phương tiện")
                && a.AttrValue.ToLower().Contains(transportType)));
        }
        if (!string.IsNullOrWhiteSpace(request.DepartureTime))
        {
            var departureTime = NormalizeDepartureFilter(request.DepartureTime);
            query = query.Where(s => s.Attributes.Any(a =>
                (a.AttrKey == "DepartureTime" || a.AttrKey == "Giờ khởi hành" || a.AttrKey == "Khởi hành" || a.AttrKey == "Thời gian")
                && a.AttrValue.ToLower().Contains(departureTime)));
        }
        if (!string.IsNullOrWhiteSpace(request.DepartureLocation))
        {
            query = query.Where(s => s.Attributes.Any(a => 
                a.AttrKey == "DepartureLocation" && a.AttrValue.Contains(request.DepartureLocation)));
        }
        if (!string.IsNullOrWhiteSpace(request.ArrivalLocation))
        {
            query = query.Where(s => s.Attributes.Any(a => 
                a.AttrKey == "ArrivalLocation" && a.AttrValue.Contains(request.ArrivalLocation)));
        }

        // Restaurant-specific filters
        if (request.CuisineTypes != null && request.CuisineTypes.Any())
        {
            query = query.Where(s => s.Attributes.Any(a => 
                a.AttrKey == "Cuisine" && request.CuisineTypes.Contains(a.AttrValue)));
        }
        if (!string.IsNullOrWhiteSpace(request.MealType))
        {
            query = query.Where(s => s.Attributes.Any(a => 
                a.AttrKey == "MealType" && a.AttrValue == request.MealType));
        }

        return query;
    }

    private IQueryable<Service> ApplySorting(IQueryable<Service> query, string? sortBy, bool descending)
    {
        return sortBy?.ToLower() switch
        {
            "price" => descending 
                ? query.OrderByDescending(s => s.BasePrice) 
                : query.OrderBy(s => s.BasePrice),
            "rating" => descending 
                ? query.OrderByDescending(s => s.RatingAvg) 
                : query.OrderBy(s => s.RatingAvg),
            "name" => descending 
                ? query.OrderByDescending(s => s.Name) 
                : query.OrderBy(s => s.Name),
            _ => query.OrderByDescending(s => s.ServiceId) // Default: newest first
        };
    }

    private static ServiceDto MapToDtoWithAttributes(Service service)
    {
        var partnerName = !string.IsNullOrWhiteSpace(service.Partner?.PartnerProfile?.BusinessName)
            ? service.Partner.PartnerProfile.BusinessName
            : service.Partner?.FullName ?? "N/A";

        return new ServiceDto
        {
            ServiceId = service.ServiceId,
            PartnerId = service.PartnerId,
            PartnerName = partnerName,
            Name = service.Name,
            Description = service.Description ?? string.Empty,
            BasePrice = service.BasePrice,
            ServiceType = service.ServiceType.ToString(),
            RatingAvg = service.RatingAvg,
            ReviewCount = service.Reviews?.Count ?? 0,
            IsActive = service.IsActive,
            SpotId = service.SpotId,
            SpotName = service.TouristSpot?.Name,
            Latitude = service.Latitude,
            Longitude = service.Longitude,
            ImageUrls = service.Images.Select(img => img.ImageUrl).ToList(),
            Attributes = ToAttributeDictionary(service.Attributes),
            HasAvailability = service.Availabilities?.Any() ?? false
        };
    }

    private static Dictionary<string, string> ToAttributeDictionary(IEnumerable<ServiceAttribute> attributes)
    {
        return attributes
            .GroupBy(attribute => attribute.AttrKey)
            .ToDictionary(
                group => group.Key,
                group => string.Join(", ", group.Select(attribute => attribute.AttrValue).Distinct()));
    }

    private static bool TryParseServiceType(string? serviceType, out ServiceType? parsedType)
    {
        parsedType = null;

        if (string.IsNullOrWhiteSpace(serviceType))
        {
            return false;
        }

        if (Enum.TryParse<ServiceType>(serviceType, true, out var enumType))
        {
            parsedType = enumType;
            return true;
        }

        if (int.TryParse(serviceType, out var numericType) && Enum.IsDefined(typeof(ServiceType), numericType))
        {
            parsedType = (ServiceType)numericType;
            return true;
        }

        return false;
    }

    private static string NormalizeDurationFilter(string duration)
    {
        return duration.ToLowerInvariant() switch
        {
            "1day" => "1 ngày",
            "2days1night" => "2 ngày",
            "3days2nights" => "3 ngày",
            "4days3nights" => "4 ngày",
            _ => duration.Trim().ToLowerInvariant()
        };
    }

    private static string NormalizeDepartureFilter(string departureTime)
    {
        return departureTime.ToLowerInvariant() switch
        {
            "morning" => "sáng",
            "afternoon" => "chiều",
            "evening" => "tối",
            _ => departureTime.Trim().ToLowerInvariant()
        };
    }
}
