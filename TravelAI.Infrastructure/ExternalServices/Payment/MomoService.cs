using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using TravelAI.Application.DTOs.Payment;
using TravelAI.Application.Interfaces;

namespace TravelAI.Infrastructure.ExternalServices.Payment;

public sealed class MomoOptions
{
    public string Endpoint { get; set; } = string.Empty;
    public string CreatePaymentUrl { get; set; } = "https://test-payment.momo.vn/v2/gateway/api/create";
    public string RefundUrl { get; set; } = "https://test-payment.momo.vn/v2/gateway/api/refund";
    public string PartnerCode { get; set; } = string.Empty;
    public string AccessKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
    public string RedirectUrl { get; set; } = string.Empty;
    public string IpnUrl { get; set; } = string.Empty;
    public string RequestType { get; set; } = "captureWallet";
    public string Lang { get; set; } = "vi";
    public string PartnerName { get; set; } = "MoMo Payment";
    public string StoreId { get; set; } = "TravelAI";
    public bool AutoCapture { get; set; } = true;
    public string OrderGroupId { get; set; } = string.Empty;
}

public sealed class MomoService : IMomoService
{
    private readonly HttpClient _httpClient;
    private readonly MomoOptions _options;

    public MomoService(HttpClient httpClient, IOptions<MomoOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public async Task<MomoPaymentResponse> CreatePaymentRequestAsync(int bookingId, decimal amount, string? orderId = null)
    {
        if (bookingId <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(bookingId));
        }

        if (amount <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(amount));
        }

        EnsureCreateConfig();

        var amountValue = ToVndAmount(amount);
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        orderId ??= $"{bookingId}-{timestamp}";
        var requestId = $"REQ-{orderId}";
        var orderInfo = $"Thanh toan booking {bookingId}";
        const string extraData = "";

        var rawSignature = string.Join('&',
            $"accessKey={_options.AccessKey}",
            $"amount={amountValue}",
            $"extraData={extraData}",
            $"ipnUrl={_options.IpnUrl}",
            $"orderId={orderId}",
            $"orderInfo={orderInfo}",
            $"partnerCode={_options.PartnerCode}",
            $"redirectUrl={_options.RedirectUrl}",
            $"requestId={requestId}",
            $"requestType={_options.RequestType}");

        var payload = new Dictionary<string, object?>
        {
            ["partnerCode"] = _options.PartnerCode,
            ["partnerName"] = _options.PartnerName,
            ["storeId"] = _options.StoreId,
            ["requestType"] = _options.RequestType,
            ["ipnUrl"] = _options.IpnUrl,
            ["redirectUrl"] = _options.RedirectUrl,
            ["orderId"] = orderId,
            ["amount"] = amountValue,
            ["orderInfo"] = orderInfo,
            ["requestId"] = requestId,
            ["extraData"] = extraData,
            ["orderGroupId"] = _options.OrderGroupId,
            ["autoCapture"] = _options.AutoCapture,
            ["lang"] = _options.Lang,
            ["signature"] = ComputeHmacSha256(_options.SecretKey, rawSignature)
        };

        var rawData = await PostJsonAsync(GetCreatePaymentUrl(), payload);

        return new MomoPaymentResponse
        {
            IsSuccess = GetInt(rawData, "resultCode") == 0,
            PartnerCode = GetString(rawData, "partnerCode"),
            RequestId = GetString(rawData, "requestId"),
            OrderId = GetString(rawData, "orderId"),
            Amount = GetLong(rawData, "amount") ?? amountValue,
            ResultCode = GetInt(rawData, "resultCode") ?? -1,
            Message = GetString(rawData, "message"),
            PaymentUrl = GetString(rawData, "payUrl"),
            PayUrl = GetString(rawData, "payUrl"),
            Deeplink = GetString(rawData, "deeplink"),
            QrCodeUrl = GetString(rawData, "qrCodeUrl"),
            DeeplinkMiniApp = GetString(rawData, "deeplinkMiniApp"),
            RawData = rawData
        };
    }

    public MomoIpnResult ValidateIPN(IReadOnlyDictionary<string, string> ipnData)
    {
        if (ipnData.Count == 0)
        {
            return new MomoIpnResult { Message = "IPN khong co du lieu." };
        }

        EnsureSecretKey();

        var rawSignature = string.Join('&',
            $"accessKey={_options.AccessKey}",
            $"amount={GetValue(ipnData, "amount") ?? string.Empty}",
            $"extraData={GetValue(ipnData, "extraData") ?? string.Empty}",
            $"message={GetValue(ipnData, "message") ?? string.Empty}",
            $"orderId={GetValue(ipnData, "orderId") ?? string.Empty}",
            $"orderInfo={GetValue(ipnData, "orderInfo") ?? string.Empty}",
            $"orderType={GetValue(ipnData, "orderType") ?? string.Empty}",
            $"partnerCode={GetValue(ipnData, "partnerCode") ?? string.Empty}",
            $"payType={GetValue(ipnData, "payType") ?? string.Empty}",
            $"requestId={GetValue(ipnData, "requestId") ?? string.Empty}",
            $"responseTime={GetValue(ipnData, "responseTime") ?? string.Empty}",
            $"resultCode={GetValue(ipnData, "resultCode") ?? string.Empty}",
            $"transId={GetValue(ipnData, "transId") ?? string.Empty}");

        var signature = GetValue(ipnData, "signature");
        var computedSignature = ComputeHmacSha256(_options.SecretKey, rawSignature);
        var validSignature = !string.IsNullOrWhiteSpace(signature)
            && string.Equals(signature, computedSignature, StringComparison.OrdinalIgnoreCase);
        var resultCode = ToInt(GetValue(ipnData, "resultCode")) ?? -1;

        return new MomoIpnResult
        {
            IsValidSignature = validSignature,
            IsSuccess = validSignature && resultCode == 0,
            OrderId = GetValue(ipnData, "orderId") ?? string.Empty,
            RequestId = GetValue(ipnData, "requestId") ?? string.Empty,
            PartnerCode = GetValue(ipnData, "partnerCode"),
            Amount = ToLong(GetValue(ipnData, "amount")) ?? 0,
            TransactionId = ToLong(GetValue(ipnData, "transId")),
            ResultCode = resultCode,
            Message = GetValue(ipnData, "message"),
            PayType = GetValue(ipnData, "payType"),
            RawData = ipnData.ToDictionary(x => x.Key, x => x.Value, StringComparer.OrdinalIgnoreCase)
        };
    }

    public async Task<MomoRefundResponse> RefundTransactionAsync(string transactionId, decimal amount)
    {
        if (string.IsNullOrWhiteSpace(transactionId))
        {
            throw new ArgumentException("TransactionId is required.", nameof(transactionId));
        }

        if (amount <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(amount));
        }

        EnsureRefundConfig();

        var amountValue = ToVndAmount(amount);
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var orderId = $"RF-{timestamp}";
        var requestId = $"RFREQ-{timestamp}";
        var description = $"Hoan tien giao dich MoMo {transactionId}";

        var rawSignature = string.Join('&',
            $"accessKey={_options.AccessKey}",
            $"amount={amountValue}",
            $"description={description}",
            $"orderId={orderId}",
            $"partnerCode={_options.PartnerCode}",
            $"requestId={requestId}",
            $"transId={transactionId}");

        var payload = new Dictionary<string, object?>
        {
            ["partnerCode"] = _options.PartnerCode,
            ["orderId"] = orderId,
            ["requestId"] = requestId,
            ["amount"] = amountValue,
            ["transId"] = transactionId,
            ["lang"] = _options.Lang,
            ["description"] = description,
            ["signature"] = ComputeHmacSha256(_options.SecretKey, rawSignature)
        };

        var rawData = await PostJsonAsync(_options.RefundUrl, payload);

        return new MomoRefundResponse
        {
            IsSuccess = GetInt(rawData, "resultCode") == 0,
            PartnerCode = GetString(rawData, "partnerCode"),
            OrderId = GetString(rawData, "orderId"),
            RequestId = GetString(rawData, "requestId"),
            Amount = GetLong(rawData, "amount") ?? amountValue,
            TransactionId = GetLong(rawData, "transId"),
            ResultCode = GetInt(rawData, "resultCode") ?? -1,
            Message = GetString(rawData, "message"),
            RawData = rawData
        };
    }

    private async Task<Dictionary<string, string>> PostJsonAsync(string url, Dictionary<string, object?> payload)
    {
        using var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        using var response = await _httpClient.PostAsync(url, content);
        var responseBody = await response.Content.ReadAsStringAsync();

        Dictionary<string, string> rawData;
        try
        {
            using var document = JsonDocument.Parse(responseBody);
            rawData = document.RootElement.EnumerateObject()
                .ToDictionary(x => x.Name, x => x.Value.ValueKind == JsonValueKind.String ? x.Value.GetString() ?? string.Empty : x.Value.ToString(), StringComparer.OrdinalIgnoreCase);
        }
        catch (JsonException)
        {
            rawData = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["raw"] = responseBody
            };
        }

        rawData["httpStatusCode"] = ((int)response.StatusCode).ToString(CultureInfo.InvariantCulture);
        return rawData;
    }

    private static long ToVndAmount(decimal amount)
    {
        return (long)Math.Round(amount, MidpointRounding.AwayFromZero);
    }

    private static string? GetValue(IReadOnlyDictionary<string, string> values, string key)
    {
        return values.TryGetValue(key, out var value)
            ? value
            : values.FirstOrDefault(x => string.Equals(x.Key, key, StringComparison.OrdinalIgnoreCase)).Value;
    }

    private static string? GetString(IReadOnlyDictionary<string, string> values, string key)
    {
        return GetValue(values, key);
    }

    private static int? GetInt(IReadOnlyDictionary<string, string> values, string key)
    {
        return ToInt(GetValue(values, key));
    }

    private static long? GetLong(IReadOnlyDictionary<string, string> values, string key)
    {
        return ToLong(GetValue(values, key));
    }

    private static int? ToInt(string? value)
    {
        return int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var result)
            ? result
            : null;
    }

    private static long? ToLong(string? value)
    {
        return long.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var result)
            ? result
            : null;
    }

    private static string ComputeHmacSha256(string key, string input)
    {
        var keyBytes = Encoding.UTF8.GetBytes(key);
        var inputBytes = Encoding.UTF8.GetBytes(input);
        using var hmac = new HMACSHA256(keyBytes);
        return Convert.ToHexString(hmac.ComputeHash(inputBytes)).ToLowerInvariant();
    }

    private void EnsureCreateConfig()
    {
        EnsureSecretKey();
        if (string.IsNullOrWhiteSpace(GetCreatePaymentUrl())
            || string.IsNullOrWhiteSpace(_options.PartnerCode)
            || string.IsNullOrWhiteSpace(_options.AccessKey)
            || string.IsNullOrWhiteSpace(_options.RedirectUrl)
            || string.IsNullOrWhiteSpace(_options.IpnUrl))
        {
            throw new InvalidOperationException("Cau hinh MoMo Endpoint/PartnerCode/AccessKey/RedirectUrl/IpnUrl chua day du.");
        }
    }

    private void EnsureRefundConfig()
    {
        EnsureSecretKey();
        if (string.IsNullOrWhiteSpace(_options.RefundUrl)
            || string.IsNullOrWhiteSpace(_options.PartnerCode)
            || string.IsNullOrWhiteSpace(_options.AccessKey))
        {
            throw new InvalidOperationException("Cau hinh MoMo RefundUrl/PartnerCode/AccessKey chua day du.");
        }
    }

    private void EnsureSecretKey()
    {
        if (string.IsNullOrWhiteSpace(_options.SecretKey))
        {
            throw new InvalidOperationException("Cau hinh MoMo SecretKey chua day du.");
        }
    }

    private string GetCreatePaymentUrl()
    {
        return string.IsNullOrWhiteSpace(_options.Endpoint) ? _options.CreatePaymentUrl : _options.Endpoint;
    }
}
