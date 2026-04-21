namespace TravelAI.Application.DTOs.Booking;

public class BookingDetailResponse
{
    public int BookingId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public DateTime CheckInDate { get; set; }
    public int Quantity { get; set; }
    public decimal TotalAmount { get; set; }
    public int Status { get; set; }
    public string? PaymentMethod { get; set; }
    public DateTime CreatedAt { get; set; }
}
