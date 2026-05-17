using TravelAI.Application.Interfaces;
using TravelAI.Application.Helpers;
using TravelAI.Domain.Entities;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.Infrastructure.Application.Services;

public class AuditLogService : IAuditLogService
{
    private readonly ApplicationDbContext _context;

    public AuditLogService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task LogAsync(int userId, string action, string tableName, int recordId)
    {
        var log = new AuditLog
        {
            UserId = userId,
            Action = action,
            TableName = tableName,
            RecordId = recordId,
            Timestamp = DateTimeHelper.Now
        };

        _context.AuditLogs.Add(log);
        await _context.SaveChangesAsync();
    }
}
