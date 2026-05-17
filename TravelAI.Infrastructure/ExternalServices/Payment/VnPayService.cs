using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using TravelAI.Application.DTOs.Payment;
using TravelAI.Application.Interfaces;

namespace TravelAI.Infrastructure.ExternalServices.Payment;

public sealed class VnPayOptions
{
    public string BaseUrl { get; set; } = string.Empty;
    public string PaymentUrl { get; set; } = string.Empty;
    public string ApiUrl { get; set; } = "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction";
    public string TmnCode { get; set; } = string.Empty;
    public string HashSecret { get; set; } = string.Empty;
    public string? BankCode { get; set; }
    public string? ReturnUrl { get; set; }
}

public sealed class VnPayService : IPaymentService
{
    private const string Version = "2.1.0";
    private readonly HttpClient _httpClient;
    private readonly VnPayOptions _options;

    public VnPayService(HttpClient httpClient, IOptions<VnPayOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public string CreatePaymentUrl(int bookingId, decimal amount, string returnUrl, string? clientIpAddress = null, string? transactionRef = null)
    {
        if (bookingId <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(bookingId));
        }

        if (amount <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(amount));
        }

        EnsurePaymentConfig();

        var now = DateTime.UtcNow.AddHours(7);
        transactionRef ??= $"{bookingId}-{now:yyyyMMddHHmmss}";
        var parameters = new SortedDictionary<string, string>(StringComparer.Ordinal)
        {
            ["vnp_Version"] = Version,
            ["vnp_Command"] = "pay",
            ["vnp_TmnCode"] = _options.TmnCode,
            ["vnp_Amount"] = ((long)Math.Round(amount * 100, MidpointRounding.AwayFromZero)).ToString(CultureInfo.InvariantCulture),
            ["vnp_CreateDate"] = now.ToString("yyyyMMddHHmmss", CultureInfo.InvariantCulture),
            ["vnp_CurrCode"] = "VND",
            ["vnp_IpAddr"] = string.IsNullOrWhiteSpace(clientIpAddress) ? "127.0.0.1" : clientIpAddress,
            ["vnp_Locale"] = "vn",
            ["vnp_OrderInfo"] = $"Thanh toan booking {bookingId}",
            ["vnp_OrderType"] = "other",
            ["vnp_ReturnUrl"] = returnUrl,
            ["vnp_TxnRef"] = transactionRef,
            ["vnp_ExpireDate"] = now.AddMinutes(15).ToString("yyyyMMddHHmmss", CultureInfo.InvariantCulture)
        };

        if (!string.IsNullOrWhiteSpace(_options.BankCode))
        {
            parameters["vnp_BankCode"] = _options.BankCode;
        }

        var hashData = BuildQueryString(parameters);
        var secureHash = ComputeHmacSha512(_options.HashSecret, hashData);

        return $"{GetPaymentUrl()}?{hashData}&vnp_SecureHash={secureHash}";
    }

    public PaymentResult ValidateCallback(IReadOnlyDictionary<string, string> queryParams)
    {
        if (queryParams.Count == 0)
        {
            return new PaymentResult { Message = "Callback khong co du lieu." };
        }

        EnsureHashSecret();

        var receivedHash = GetValue(queryParams, "vnp_SecureHash");
        var signedParameters = queryParams
            .Where(x => x.Key.StartsWith("vnp_", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(x.Key, "vnp_SecureHash", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(x.Key, "vnp_SecureHashType", StringComparison.OrdinalIgnoreCase)
                && !string.IsNullOrWhiteSpace(x.Value))
            .ToDictionary(x => x.Key, x => x.Value, StringComparer.Ordinal);

        var hashData = BuildQueryString(new SortedDictionary<string, string>(signedParameters, StringComparer.Ordinal));
        var computedHash = ComputeHmacSha512(_options.HashSecret, hashData);
        var validSignature = !string.IsNullOrWhiteSpace(receivedHash)
            && string.Equals(computedHash, receivedHash, StringComparison.OrdinalIgnoreCase);

        var responseCode = GetValue(queryParams, "vnp_ResponseCode");
        var transactionStatus = GetValue(queryParams, "vnp_TransactionStatus");
        var amountValue = GetValue(queryParams, "vnp_Amount");
        var amount = long.TryParse(amountValue, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsedAmount)
            ? parsedAmount / 100m
            : 0m;

        return new PaymentResult
        {
            IsValidSignature = validSignature,
            IsSuccess = validSignature && responseCode == "00" && transactionStatus == "00",
            TransactionRef = GetValue(queryParams, "vnp_TxnRef") ?? string.Empty,
            VnPayTransactionNo = GetValue(queryParams, "vnp_TransactionNo"),
            ResponseCode = responseCode,
            TransactionStatus = transactionStatus,
            Amount = amount,
            BankCode = GetValue(queryParams, "vnp_BankCode"),
            Message = validSignature ? "Da xac thuc callback VNPay." : "Chu ky callback VNPay khong hop le.",
            RawData = queryParams.ToDictionary(x => x.Key, x => x.Value, StringComparer.OrdinalIgnoreCase)
        };
    }

    public async Task<VnPayQueryResult> QueryTransactionAsync(string transactionRef, DateTime? transactionDate = null, string? clientIpAddress = null)
    {
        if (string.IsNullOrWhiteSpace(transactionRef))
        {
            throw new ArgumentException("TransactionRef is required.", nameof(transactionRef));
        }

        EnsureQueryConfig();

        var now = DateTime.UtcNow.AddHours(7);
        var requestId = Guid.NewGuid().ToString("N");
        var createDate = now.ToString("yyyyMMddHHmmss", CultureInfo.InvariantCulture);
        var orderInfo = $"Truy van giao dich {transactionRef}";
        var transDate = (transactionDate ?? now).AddHours(transactionDate?.Kind == DateTimeKind.Utc ? 7 : 0)
            .ToString("yyyyMMddHHmmss", CultureInfo.InvariantCulture);
        var ipAddress = string.IsNullOrWhiteSpace(clientIpAddress) ? "127.0.0.1" : clientIpAddress;
        var secureHashData = string.Join('|', requestId, Version, "querydr", _options.TmnCode, transactionRef, transDate, createDate, ipAddress, orderInfo);
        var secureHash = ComputeHmacSha512(_options.HashSecret, secureHashData);

        var payload = new Dictionary<string, string>
        {
            ["vnp_RequestId"] = requestId,
            ["vnp_Version"] = Version,
            ["vnp_Command"] = "querydr",
            ["vnp_TmnCode"] = _options.TmnCode,
            ["vnp_TxnRef"] = transactionRef,
            ["vnp_OrderInfo"] = orderInfo,
            ["vnp_TransactionDate"] = transDate,
            ["vnp_CreateDate"] = createDate,
            ["vnp_IpAddr"] = ipAddress,
            ["vnp_SecureHash"] = secureHash
        };

        using var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        using var response = await _httpClient.PostAsync(_options.ApiUrl, content);
        var responseBody = await response.Content.ReadAsStringAsync();

        Dictionary<string, string> rawData;
        try
        {
            rawData = JsonSerializer.Deserialize<Dictionary<string, string>>(responseBody) ?? new Dictionary<string, string>();
        }
        catch (JsonException)
        {
            rawData = new Dictionary<string, string> { ["raw"] = responseBody };
        }

        rawData["httpStatusCode"] = ((int)response.StatusCode).ToString(CultureInfo.InvariantCulture);

        rawData.TryGetValue("vnp_ResponseCode", out var responseCode);
        rawData.TryGetValue("vnp_Message", out var message);

        return new VnPayQueryResult
        {
            IsSuccess = response.IsSuccessStatusCode && responseCode == "00",
            ResponseCode = responseCode,
            Message = message,
            RawData = rawData
        };
    }

    private static string? GetValue(IReadOnlyDictionary<string, string> values, string key)
    {
        return values.TryGetValue(key, out var value)
            ? value
            : values.FirstOrDefault(x => string.Equals(x.Key, key, StringComparison.OrdinalIgnoreCase)).Value;
    }

    private static string BuildQueryString(SortedDictionary<string, string> parameters)
    {
        return string.Join('&', parameters
            .Where(x => !string.IsNullOrWhiteSpace(x.Value))
            .Select(x => $"{WebUtility.UrlEncode(x.Key)}={WebUtility.UrlEncode(x.Value)}"));
    }

    private static string ComputeHmacSha512(string key, string input)
    {
        var keyBytes = Encoding.UTF8.GetBytes(key);
        var inputBytes = Encoding.UTF8.GetBytes(input);
        using var hmac = new HMACSHA512(keyBytes);
        return Convert.ToHexString(hmac.ComputeHash(inputBytes)).ToLowerInvariant();
    }

    private void EnsurePaymentConfig()
    {
        EnsureHashSecret();
        if (string.IsNullOrWhiteSpace(GetPaymentUrl()) || string.IsNullOrWhiteSpace(_options.TmnCode))
        {
            throw new InvalidOperationException("Cau hinh VNPay BaseUrl/TmnCode chua day du.");
        }
    }

    private void EnsureQueryConfig()
    {
        EnsurePaymentConfig();
        if (string.IsNullOrWhiteSpace(_options.ApiUrl))
        {
            throw new InvalidOperationException("Cau hinh VNPay ApiUrl chua day du.");
        }
    }

    private void EnsureHashSecret()
    {
        if (string.IsNullOrWhiteSpace(_options.HashSecret))
        {
            throw new InvalidOperationException("Cau hinh VNPay HashSecret chua day du.");
        }
    }

    private string GetPaymentUrl()
    {
        return string.IsNullOrWhiteSpace(_options.BaseUrl) ? _options.PaymentUrl : _options.BaseUrl;
    }
}
