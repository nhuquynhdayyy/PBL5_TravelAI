namespace TravelAI.Application.DTOs.Partner;

public class PartnerRevenueSummaryDto
{
    public decimal TotalRevenue { get; set; }
    public int TotalBookings { get; set; }
    public DateTime RangeStart { get; set; }
    public DateTime RangeEnd { get; set; }
    public string Period { get; set; } = string.Empty;
    public List<PartnerServiceRevenueDto> RevenueByService { get; set; } = new();
    public List<PartnerDailyRevenueDto> RevenueByDay { get; set; } = new();
}

public class PartnerServiceRevenueDto
{
    public string ServiceName { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public int BookingCount { get; set; }
}

public class PartnerDailyRevenueDto
{
    public DateTime Date { get; set; }
    public decimal Revenue { get; set; }
}
