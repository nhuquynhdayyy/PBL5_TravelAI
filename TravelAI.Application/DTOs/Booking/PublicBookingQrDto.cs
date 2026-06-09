namespace TravelAI.Application.DTOs.Booking;

public class PublicBookingQrDto
{
    public string BookingCode { get; set; } = string.Empty;
    public int BookingId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public string ServiceType { get; set; } = string.Empty;
    public DateTime UseDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public int Quantity { get; set; }
    public decimal TotalAmount { get; set; }
    public string PaymentStatus { get; set; } = string.Empty;
    public string TicketType { get; set; } = "Booking QR";
    public string QrPayloadJson { get; set; } = string.Empty;
    public string QrImageBase64 { get; set; } = string.Empty;
}
