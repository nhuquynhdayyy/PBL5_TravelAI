using System;

namespace TravelAI.Domain.Entities;

public class Notification
{
    public int NotificationId { get; set; }

    public int? UserId { get; set; }

    public int? PartnerId { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Type { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public bool IsRead { get; set; }

    public DateTime CreatedAt { get; set; }

    public string? MetadataJson { get; set; }
}