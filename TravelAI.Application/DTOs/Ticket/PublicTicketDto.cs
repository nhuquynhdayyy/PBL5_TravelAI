namespace TravelAI.Application.DTOs.Ticket;

public class PublicTicketDto
{
    public string TicketCode { get; set; } = string.Empty;
    public int BookingId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public DateTime UseDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string QrCodeUrl { get; set; } = string.Empty;
    public string QrImageBase64 { get; set; } = string.Empty;
}
