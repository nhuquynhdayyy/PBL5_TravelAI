namespace TravelAI.Domain.Entities;

public class AuditLog {
    public int LogId { get; set; }
    public int UserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string TableName { get; set; } = string.Empty;
    public int RecordId { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}