namespace TravelAI.Application.DTOs.Booking;

public class MyBookingSummaryDto
{
    public int BookingId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public DateTime CheckInDate { get; set; }
    public int Quantity { get; set; }
    public decimal TotalAmount { get; set; }
    public int Status { get; set; }
    public string? PaymentMethod { get; set; }
    public DateTime CreatedAt { get; set; }
    public decimal RefundedAmount { get; set; }
    public decimal EstimatedRefundAmount { get; set; }
    public bool CanCancel { get; set; }
    public string CancelPolicy { get; set; } = string.Empty;
    public string? CancellationReason { get; set; } // Lý do hủy đơn
}
