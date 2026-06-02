using TravelAI.Domain.Enums;

namespace TravelAI.Domain.Entities;

public class ElectronicTicket
{
    public int TicketId { get; set; }
    public string TicketCode { get; set; } = string.Empty;
    public int BookingId { get; set; }
    public int BookingItemId { get; set; }
    public int UserId { get; set; }
    public int ServiceId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public string ServiceType { get; set; } = string.Empty;
    public DateTime BookingDate { get; set; }
    public DateTime TravelDate { get; set; }
    public int Quantity { get; set; }
    public decimal TotalAmount { get; set; }
    public TicketStatus Status { get; set; } = TicketStatus.Unused;
    public string QrPayloadJson { get; set; } = string.Empty;
    public string QrImageBase64 { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UsedAt { get; set; }
    public int? VerifiedByUserId { get; set; }

    public Booking Booking { get; set; } = null!;
    public BookingItem BookingItem { get; set; } = null!;
    public User User { get; set; } = null!;
    public Service Service { get; set; } = null!;
    public User? VerifiedByUser { get; set; }
}
