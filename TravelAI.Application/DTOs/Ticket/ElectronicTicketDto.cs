namespace TravelAI.Application.DTOs.Ticket;

public class ElectronicTicketDto
{
    public int TicketId { get; set; }
    public string TicketCode { get; set; } = string.Empty;
    public int BookingId { get; set; }
    public int BookingItemId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public string ServiceType { get; set; } = string.Empty;
    public DateTime BookingDate { get; set; }
    public DateTime TravelDate { get; set; }
    public int Quantity { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = string.Empty;
    public string QrPayloadJson { get; set; } = string.Empty;
    public string QrImageBase64 { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UsedAt { get; set; }
}
