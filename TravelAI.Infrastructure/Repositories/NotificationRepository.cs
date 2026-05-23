using Microsoft.EntityFrameworkCore;
using TravelAI.Domain.Entities;
using TravelAI.Domain.Interfaces;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.Infrastructure.Repositories;

public sealed class NotificationRepository : INotificationRepository
{
    private readonly ApplicationDbContext _context;

    public NotificationRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<Notification>> GetForOwnerAsync(int ownerId, bool isPartner, int page, int pageSize)
    {
        var query = _context.Notifications.AsNoTracking().AsQueryable();
        query = isPartner
            ? query.Where(n => n.PartnerId == ownerId)
            : query.Where(n => n.UserId == ownerId);

        return await query
            .OrderByDescending(n => n.CreatedAt)
            .Skip(page * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public Task<int> CountUnreadAsync(int ownerId, bool isPartner)
    {
        return isPartner
            ? _context.Notifications.CountAsync(n => n.PartnerId == ownerId && !n.IsRead)
            : _context.Notifications.CountAsync(n => n.UserId == ownerId && !n.IsRead);
    }

    public Task<Notification?> FindForOwnerAsync(int notificationId, int ownerId, bool isPartner)
    {
        return isPartner
            ? _context.Notifications.FirstOrDefaultAsync(n => n.NotificationId == notificationId && n.PartnerId == ownerId)
            : _context.Notifications.FirstOrDefaultAsync(n => n.NotificationId == notificationId && n.UserId == ownerId);
    }

    public async Task MarkAllAsReadAsync(int ownerId, bool isPartner)
    {
        var query = isPartner
            ? _context.Notifications.Where(n => n.PartnerId == ownerId && !n.IsRead)
            : _context.Notifications.Where(n => n.UserId == ownerId && !n.IsRead);

        await query.ExecuteUpdateAsync(updates => updates.SetProperty(n => n.IsRead, true));
    }
}
