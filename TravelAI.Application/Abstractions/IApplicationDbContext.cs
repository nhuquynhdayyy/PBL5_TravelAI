using Microsoft.EntityFrameworkCore;
using TravelAI.Domain.Entities;

namespace TravelAI.Application.Abstractions;

public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<Booking> Bookings { get; }
    // ... Thêm đủ 21 DbSet vào đây
    DbSet<Spot> Spots { get; }
    DbSet<TouristSpot> TouristSpots { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}