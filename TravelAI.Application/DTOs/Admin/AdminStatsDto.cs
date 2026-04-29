namespace TravelAI.Application.DTOs.Admin;

public class AdminStatsDto
{
    public int TotalUsers { get; set; }
    public int TotalPartners { get; set; }
    public int TotalBookings { get; set; }
    public decimal TotalRevenue { get; set; }
    public List<AdminTopDestinationDto> TopDestinations { get; set; } = new();
    public List<AdminBookingStatusDto> BookingStatusBreakdown { get; set; } = new();
    public List<AdminRecentBookingDto> RecentBookings { get; set; } = new();
    public List<AdminDailyRevenueDto> RevenueByDay { get; set; } = new();
}

public class AdminTopDestinationDto
{
    public int DestinationId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int BookingCount { get; set; }
    public decimal Revenue { get; set; }
}

public class AdminRecentBookingDto
{
    public int BookingId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public int ItemCount { get; set; }
    public string? PrimaryServiceName { get; set; }
    public string? PrimaryDestinationName { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AdminDailyRevenueDto
{
    public DateTime Date { get; set; }
    public decimal Revenue { get; set; }
}

public class AdminBookingStatusDto
{
    public string Status { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal Amount { get; set; }
}
