namespace TravelAI.Application.DTOs.Payment;

public sealed class CreateVnPayPaymentRequest
{
    public int BookingId { get; set; }
    public decimal? Amount { get; set; }
    public string? ReturnUrl { get; set; }
}

public sealed class CreateMomoPaymentRequest
{
    public int BookingId { get; set; }
    public decimal? Amount { get; set; }
}

public sealed class CreateVietQrPaymentRequest
{
    public int BookingId { get; set; }
    public decimal? Amount { get; set; }
}

public sealed class CreateCounterPaymentRequest
{
    public int BookingId { get; set; }
    public decimal? Amount { get; set; }
}

public sealed class MomoRefundRequest
{
    public string TransactionId { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}

public sealed class PaymentMethodRequest
{
    public string Method { get; set; } = string.Empty;
    public string? ReturnUrl { get; set; }
}

public sealed class PaymentCallbackDto
{
    public string Provider { get; set; } = string.Empty;
    public Dictionary<string, string> Data { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class PaymentResult
{
    public bool IsValidSignature { get; set; }
    public bool IsSuccess { get; set; }
    public string TransactionRef { get; set; } = string.Empty;
    public string? VnPayTransactionNo { get; set; }
    public string? ResponseCode { get; set; }
    public string? TransactionStatus { get; set; }
    public decimal Amount { get; set; }
    public string? BankCode { get; set; }
    public string? Message { get; set; }
    public IReadOnlyDictionary<string, string> RawData { get; set; } = new Dictionary<string, string>();
}

public sealed class PaymentStatusResponse
{
    public int BookingId { get; set; }
    public string Status { get; set; } = "None";
    public string? Provider { get; set; }
    public string? TransactionRef { get; set; }
    public decimal Amount { get; set; }
    public DateTime? PaidAt { get; set; }
    public string? Message { get; set; }
}

public sealed class VnPayQueryResult
{
    public bool IsSuccess { get; set; }
    public string? ResponseCode { get; set; }
    public string? Message { get; set; }
    public IReadOnlyDictionary<string, string> RawData { get; set; } = new Dictionary<string, string>();
}

public sealed class MomoPaymentResponse
{
    public bool IsSuccess { get; set; }
    public string? PartnerCode { get; set; }
    public string? RequestId { get; set; }
    public string? OrderId { get; set; }
    public long Amount { get; set; }
    public int ResultCode { get; set; }
    public string? Message { get; set; }
    public string? PaymentUrl { get; set; }
    public string? PayUrl { get; set; }
    public string? Deeplink { get; set; }
    public string? QrCodeUrl { get; set; }
    public string? DeeplinkMiniApp { get; set; }
    public IReadOnlyDictionary<string, string> RawData { get; set; } = new Dictionary<string, string>();
}

public sealed class VietQrPaymentResponse
{
    public bool IsSuccess { get; set; }
    public int BookingId { get; set; }
    public decimal Amount { get; set; }
    public string BankCode { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string TransferContent { get; set; } = string.Empty;
    public string TransactionRef { get; set; } = string.Empty;
    public string QrImageUrl { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public sealed class CounterPaymentResponse
{
    public bool IsSuccess { get; set; }
    public int BookingId { get; set; }
    public decimal Amount { get; set; }
    public string TransactionRef { get; set; } = string.Empty;
    public string PaymentLocation { get; set; } = string.Empty;
    public string PaymentCode { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public sealed class MomoIpnResult
{
    public bool IsValidSignature { get; set; }
    public bool IsSuccess { get; set; }
    public string OrderId { get; set; } = string.Empty;
    public string RequestId { get; set; } = string.Empty;
    public string? PartnerCode { get; set; }
    public long Amount { get; set; }
    public long? TransactionId { get; set; }
    public int ResultCode { get; set; }
    public string? Message { get; set; }
    public string? PayType { get; set; }
    public IReadOnlyDictionary<string, string> RawData { get; set; } = new Dictionary<string, string>();
}

public sealed class MomoRefundResponse
{
    public bool IsSuccess { get; set; }
    public string? PartnerCode { get; set; }
    public string? OrderId { get; set; }
    public string? RequestId { get; set; }
    public long Amount { get; set; }
    public long? TransactionId { get; set; }
    public int ResultCode { get; set; }
    public string? Message { get; set; }
    public IReadOnlyDictionary<string, string> RawData { get; set; } = new Dictionary<string, string>();
}
