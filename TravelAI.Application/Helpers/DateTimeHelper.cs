namespace TravelAI.Application.Helpers;

/// <summary>
/// Helper class để quản lý timezone tập trung cho toàn bộ hệ thống
/// Tất cả datetime trong hệ thống sẽ sử dụng giờ Việt Nam (UTC+7)
/// </summary>
public static class DateTimeHelper
{
    private static readonly TimeZoneInfo VietnamTimeZone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");

    /// <summary>
    /// Lấy thời gian hiện tại theo giờ Việt Nam (UTC+7)
    /// </summary>
    public static DateTime Now => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, VietnamTimeZone);

    /// <summary>
    /// Lấy ngày hiện tại theo giờ Việt Nam (UTC+7)
    /// </summary>
    public static DateTime Today => Now.Date;

    /// <summary>
    /// Chuyển đổi từ UTC sang giờ Việt Nam
    /// </summary>
    public static DateTime ToVietnamTime(DateTime utcDateTime)
    {
        if (utcDateTime.Kind == DateTimeKind.Unspecified)
        {
            utcDateTime = DateTime.SpecifyKind(utcDateTime, DateTimeKind.Utc);
        }
        return TimeZoneInfo.ConvertTimeFromUtc(utcDateTime, VietnamTimeZone);
    }

    /// <summary>
    /// Chuyển đổi từ giờ Việt Nam sang UTC
    /// </summary>
    public static DateTime ToUtc(DateTime vietnamDateTime)
    {
        if (vietnamDateTime.Kind == DateTimeKind.Unspecified)
        {
            vietnamDateTime = DateTime.SpecifyKind(vietnamDateTime, DateTimeKind.Unspecified);
        }
        return TimeZoneInfo.ConvertTimeToUtc(vietnamDateTime, VietnamTimeZone);
    }
}
