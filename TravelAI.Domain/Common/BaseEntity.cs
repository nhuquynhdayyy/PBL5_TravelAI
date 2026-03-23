namespace TravelAI.Domain.Common;

public abstract class BaseEntity
{
    public int Id { get; set; } // Khóa chính chung
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
    public bool IsDeleted { get; set; } = false; // Hỗ trợ Soft Delete
}