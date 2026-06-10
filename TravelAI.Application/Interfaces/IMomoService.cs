using TravelAI.Application.DTOs.Payment;

namespace TravelAI.Application.Interfaces;

public interface IMomoService
{
    Task<MomoPaymentResponse> CreatePaymentAsync(int bookingId, decimal amount, string? orderId = null);

    MomoIpnResult ValidateIPN(IReadOnlyDictionary<string, string> ipnData);

    Task<MomoRefundResponse> RefundTransactionAsync(string transactionId, decimal amount);
}
