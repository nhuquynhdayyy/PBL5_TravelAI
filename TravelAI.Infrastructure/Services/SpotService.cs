using Microsoft.EntityFrameworkCore;
using TravelAI.Application.Interfaces;
using TravelAI.Application.DTOs.Spot;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.Infrastructure.Services;

public class SpotService : ISpotService
{
    private readonly ApplicationDbContext _context;
    public SpotService(ApplicationDbContext context) => _context = context;

    public async Task<IEnumerable<SpotResponseDto>> GetByDestinationIdAsync(int destinationId)
    {
        return await _context.TouristSpots
            .Where(s => s.DestinationId == destinationId)
            .Select(s => new SpotResponseDto
            {
                SpotId = s.SpotId,
                Name = s.Name,
                Description = s.Description,
                ImageUrl = s.ImageUrl,
                OpeningHours = s.OpeningHours,
                AvgTimeSpent = s.AvgTimeSpent,
                Latitude = s.Latitude,
                Longitude = s.Longitude
            })
            .ToListAsync();
    }
}