using TravelAI.Application.DTOs.Payment;

namespace TravelAI.Application.Interfaces;

public interface IPaymentService
{
    string CreatePaymentUrl(int bookingId, decimal amount, string returnUrl, string? clientIpAddress = null, string? transactionRef = null);

    PaymentResult ValidateCallback(IReadOnlyDictionary<string, string> queryParams);

    Task<VnPayQueryResult> QueryTransactionAsync(string transactionRef, DateTime? transactionDate = null, string? clientIpAddress = null);
}
