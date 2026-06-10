namespace TravelAI.Application.DTOs.Ticket;

public class BookingQrDto
{
    public string BookingCode { get; set; } = string.Empty;
    public int BookingId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public DateTime UseDate { get; set; }
    public int Quantity { get; set; }
    public string PaymentStatus { get; set; } = string.Empty;
    public string TicketType { get; set; } = "Booking QR";
    public string QrPayloadJson { get; set; } = string.Empty;
    public string QrImageBase64 { get; set; } = string.Empty;
}
