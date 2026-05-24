namespace TravelAI.Application.DTOs.User;

public class UserActivityLogDto
{
    public int LogId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string TableName { get; set; } = string.Empty;
    public int RecordId { get; set; }
    public DateTime Timestamp { get; set; }
}
