using Microsoft.EntityFrameworkCore;
using TravelAI.Application.Interfaces;
using TravelAI.Application.DTOs.Spot;
using TravelAI.Domain.Entities;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.Infrastructure.Services;

public class SpotService : ISpotService
{
    private readonly ApplicationDbContext _context;
    public SpotService(ApplicationDbContext context) => _context = context;

    // 1. Lấy danh sách theo tỉnh
    public async Task<IEnumerable<SpotDto>> GetSpotsByDestinationAsync(int destinationId)
    {
        return await _context.TouristSpots
            .Where(s => s.DestinationId == destinationId)
            .Select(s => new SpotDto(s.SpotId, s.Name, s.Description, s.ImageUrl, s.Latitude, s.Longitude, s.AvgTimeSpent, s.OpeningHours))
            .ToListAsync();
    }

    // 2. Lấy chi tiết theo ID
    public async Task<SpotDto?> GetByIdAsync(int id)
    {
        var s = await _context.TouristSpots.FindAsync(id);
        if (s == null) return null;
        return new SpotDto(s.SpotId, s.Name, s.Description, s.ImageUrl, s.Latitude, s.Longitude, s.AvgTimeSpent, s.OpeningHours);
    }

    // 3. Thêm mới Spot (Có xử lý upload ảnh)
    public async Task<SpotDto> CreateSpotAsync(CreateSpotRequest request, string webRootPath)
    {
        string? imageUrl = null;

        if (request.Image != null)
        {
            string fileName = Guid.NewGuid().ToString() + Path.GetExtension(request.Image.FileName);
            string filePath = Path.Combine(webRootPath, "uploads", fileName);
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await request.Image.CopyToAsync(stream);
            }
            imageUrl = $"/uploads/{fileName}";
        }

        var spot = new TouristSpot
        {
            Name = request.Name,
            Description = request.Description,
            DestinationId = request.DestinationId,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            AvgTimeSpent = request.AvgTimeSpent,
            OpeningHours = request.OpeningHours,
            ImageUrl = imageUrl
        };

        _context.TouristSpots.Add(spot);
        await _context.SaveChangesAsync();

        return new SpotDto(spot.SpotId, spot.Name, spot.Description, spot.ImageUrl, spot.Latitude, spot.Longitude, spot.AvgTimeSpent, spot.OpeningHours);
    }

    // 4. Cập nhật Spot (Có xử lý đổi ảnh)
    public async Task<bool> UpdateSpotAsync(int id, UpdateSpotRequest request, string webRootPath)
    {
        var spot = await _context.TouristSpots.FindAsync(id);
        if (spot == null) return false;

        spot.Name = request.Name ?? string.Empty;
        spot.Description = request.Description ?? string.Empty;
        spot.Latitude = request.Latitude.GetValueOrDefault();
        spot.Longitude = request.Longitude.GetValueOrDefault();
        spot.AvgTimeSpent = request.AvgTimeSpent.GetValueOrDefault();
        spot.OpeningHours = request.OpeningHours;

        if (request.Image != null)
        {
            // Xóa ảnh cũ nếu có
            DeletePhysicalFile(spot.ImageUrl, webRootPath);

            // Lưu ảnh mới
            string fileName = Guid.NewGuid().ToString() + Path.GetExtension(request.Image.FileName);
            string filePath = Path.Combine(webRootPath, "uploads", fileName);
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await request.Image.CopyToAsync(stream);
            }
            spot.ImageUrl = $"/uploads/{fileName}";
        }

        return await _context.SaveChangesAsync() > 0;
    }

    // 5. Xóa Spot
    public async Task<bool> DeleteSpotAsync(int id, string webRootPath)
    {
        var spot = await _context.TouristSpots.FindAsync(id);
        if (spot == null) return false;

        DeletePhysicalFile(spot.ImageUrl, webRootPath);
        _context.TouristSpots.Remove(spot);
        return await _context.SaveChangesAsync() > 0;
    }

    // Hàm phụ trợ xóa file vật lý trên ổ cứng
    private void DeletePhysicalFile(string? relativePath, string webRootPath)
    {
        if (string.IsNullOrEmpty(relativePath) || relativePath.StartsWith("http")) return;
        var fullPath = Path.Combine(webRootPath, relativePath.TrimStart('/'));
        if (File.Exists(fullPath)) File.Delete(fullPath);
    }
}