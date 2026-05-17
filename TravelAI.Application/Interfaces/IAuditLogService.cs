namespace TravelAI.Application.Interfaces;

public interface IAuditLogService
{
    Task LogAsync(int userId, string action, string tableName, int recordId);
}
