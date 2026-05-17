using System.Globalization;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelAI.Application.DTOs.Payment;
using TravelAI.Application.Interfaces;
using TravelAI.Domain.Entities;
using TravelAI.Domain.Enums;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/payment")]
public sealed class PaymentController : ControllerBase
{
    private readonly IPaymentService _paymentService;
    private readonly IMomoService _momoService;
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PaymentController> _logger;

    public PaymentController(
        IPaymentService paymentService,
        IMomoService momoService,
        ApplicationDbContext context,
        IConfiguration configuration,
        ILogger<PaymentController> logger)
    {
        _paymentService = paymentService;
        _momoService = momoService;
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpPost("vnpay/create")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> CreateVnPayPayment([FromBody] CreateVnPayPaymentRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap!" });
        }

        var userId = int.Parse(userIdClaim.Value, CultureInfo.InvariantCulture);
        var booking = await _context.Bookings
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.BookingId == request.BookingId && b.UserId == userId);

        if (booking == null)
        {
            return NotFound(new { message = "Khong tim thay don hang." });
        }

        if (booking.Status != BookingStatus.Pending)
        {
            return BadRequest(new { message = "Chi co the thanh toan don hang dang cho xu ly." });
        }

        // Dùng amount từ request nếu có (đã áp dụng giảm giá), ngược lại dùng totalAmount của booking
        var paymentAmount = (request.Amount.HasValue && request.Amount.Value > 0)
            ? request.Amount.Value
            : booking.TotalAmount;

        if (paymentAmount > booking.TotalAmount)
        {
            return BadRequest(new { message = "So tien thanh toan khong hop le." });
        }

        if (UseMockGatewayWhenConfigured("VnPay"))
        {
            var mockTransactionRef = CreateTransactionRef(booking.BookingId, "MOCKVNPAY");
            await CreatePendingPaymentAsync(booking.BookingId, "VNPay", mockTransactionRef, paymentAmount);
            return Ok(new
            {
                success = true,
                transactionRef = mockTransactionRef,
                paymentUrl = BuildMockPaymentUrl("vnpay", booking.BookingId, paymentAmount)
            });
        }

        var transactionRef = CreateTransactionRef(booking.BookingId, "VNPAY");
        await CreatePendingPaymentAsync(booking.BookingId, "VNPay", transactionRef, paymentAmount);

        var returnUrl = request.ReturnUrl
            ?? _configuration["VnPay:ReturnUrl"]
            ?? Url.ActionLink(nameof(VnPayCallback), "Payment")
            ?? string.Empty;

        var paymentUrl = _paymentService.CreatePaymentUrl(
            booking.BookingId,
            paymentAmount,
            returnUrl,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            transactionRef);

        return Ok(new
        {
            success = true,
            transactionRef,
            paymentUrl
        });
    }

    [HttpGet("vnpay/callback")]
    [AllowAnonymous]
    public async Task<IActionResult> VnPayCallback()
    {
        var queryParams = Request.Query.ToDictionary(
            x => x.Key,
            x => x.Value.ToString(),
            StringComparer.OrdinalIgnoreCase);

        var result = _paymentService.ValidateCallback(queryParams);
        var bookingId = TryGetBookingId(result.TransactionRef);

        if (!result.IsValidSignature)
        {
            return BuildCallbackResponse(result, bookingId, "Chu ky VNPay khong hop le.");
        }

        if (bookingId == null)
        {
            return BuildCallbackResponse(result, null, "Ma giao dich khong xac dinh duoc don hang.");
        }

        if (result.IsSuccess)
        {
            var updateResult = await MarkBookingAsPaidAsync(bookingId.Value, result);
            if (!updateResult.Success)
            {
                return BuildCallbackResponse(result, bookingId, updateResult.Message);
            }
        }
        else
        {
            await MarkPaymentFailedAsync(result.TransactionRef, "VNPay callback response is not success.");
        }

        return BuildCallbackResponse(
            result,
            bookingId,
            result.IsSuccess ? "Thanh toan VNPay thanh cong." : "Thanh toan VNPay khong thanh cong.");
    }

    [HttpPost("vnpay/callback")]
    [AllowAnonymous]
    public async Task<IActionResult> VnPayCallbackPost([FromBody] Dictionary<string, string> callbackData)
    {
        var result = _paymentService.ValidateCallback(callbackData);
        var bookingId = TryGetBookingId(result.TransactionRef);

        if (!result.IsValidSignature)
        {
            return BadRequest(new { success = false, message = "Chu ky VNPay khong hop le." });
        }

        if (bookingId == null)
        {
            return BadRequest(new { success = false, message = "Ma giao dich khong xac dinh duoc don hang." });
        }

        if (!result.IsSuccess)
        {
            await MarkPaymentFailedAsync(result.TransactionRef, "VNPay callback response is not success.");
            return Ok(new { success = false, bookingId, message = "Thanh toan VNPay khong thanh cong." });
        }

        var updateResult = await MarkBookingAsPaidAsync(bookingId.Value, result);
        return updateResult.Success
            ? Ok(new { success = true, bookingId, result.TransactionRef, message = updateResult.Message })
            : BadRequest(new { success = false, bookingId, message = updateResult.Message });
    }

    [HttpGet("vnpay/query/{transactionRef}")]
    [Authorize]
    public async Task<IActionResult> QueryVnPayTransaction(string transactionRef)
    {
        var transactionDate = TryGetTransactionDate(transactionRef);
        var payment = await _context.Payments
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.TransactionRef == transactionRef);

        var result = await _paymentService.QueryTransactionAsync(
            transactionRef,
            transactionDate ?? payment?.PaymentTime,
            HttpContext.Connection.RemoteIpAddress?.ToString());

        return Ok(result);
    }

    [HttpPost("momo/create")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> CreateMomoPayment([FromBody] CreateMomoPaymentRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap!" });
        }

        var userId = int.Parse(userIdClaim.Value, CultureInfo.InvariantCulture);
        var booking = await _context.Bookings
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.BookingId == request.BookingId && b.UserId == userId);

        if (booking == null)
        {
            return NotFound(new { message = "Khong tim thay don hang." });
        }

        if (booking.Status != BookingStatus.Pending)
        {
            return BadRequest(new { message = "Chi co the thanh toan don hang dang cho xu ly." });
        }

        // Dùng amount từ request nếu có (đã áp dụng giảm giá), ngược lại dùng totalAmount của booking
        var paymentAmount = (request.Amount.HasValue && request.Amount.Value > 0)
            ? request.Amount.Value
            : booking.TotalAmount;

        // Đảm bảo số tiền không vượt quá giá gốc (tránh gian lận)
        if (paymentAmount > booking.TotalAmount)
        {
            return BadRequest(new { message = "So tien thanh toan khong hop le." });
        }

        if (UseMockGatewayWhenConfigured("Momo"))
        {
            var mockOrderId = CreateTransactionRef(booking.BookingId, "MOCKMOMO");
            await CreatePendingPaymentAsync(booking.BookingId, "MoMo", mockOrderId, paymentAmount);
            var mockPaymentUrl = BuildMockPaymentUrl("momo", booking.BookingId, paymentAmount);
            return Ok(new
            {
                isSuccess = true,
                orderId = mockOrderId,
                paymentUrl = mockPaymentUrl,
                payUrl = mockPaymentUrl,
                message = "Dang dung cong thanh toan demo vi MoMo chua cau hinh merchant credentials."
            });
        }

        var orderId = CreateTransactionRef(booking.BookingId, "MOMO");
        await CreatePendingPaymentAsync(booking.BookingId, "MoMo", orderId, paymentAmount);
        var result = await _momoService.CreatePaymentRequestAsync(booking.BookingId, paymentAmount, orderId);
        return Ok(result);
    }

    [HttpPost("vietqr/create")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> CreateVietQrPayment([FromBody] CreateVietQrPaymentRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap!" });
        }

        var userId = int.Parse(userIdClaim.Value, CultureInfo.InvariantCulture);
        var booking = await _context.Bookings
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.BookingId == request.BookingId && b.UserId == userId);

        if (booking == null)
        {
            return NotFound(new { message = "Khong tim thay don hang." });
        }

        if (booking.Status != BookingStatus.Pending)
        {
            return BadRequest(new { message = "Chi co the thanh toan don hang dang cho xu ly." });
        }

        // Dùng amount từ request nếu có (đã áp dụng giảm giá), ngược lại dùng totalAmount của booking
        var paymentAmountVietQr = (request.Amount.HasValue && request.Amount.Value > 0)
            ? request.Amount.Value
            : booking.TotalAmount;

        if (paymentAmountVietQr > booking.TotalAmount)
        {
            return BadRequest(new { message = "So tien thanh toan khong hop le." });
        }

        var accountNumber = _configuration["VietQr:AccountNumber"] ?? "0888233738";
        var bankCode = _configuration["VietQr:BankCode"] ?? "ICB";
        var bankName = _configuration["VietQr:BankName"] ?? "VietinBank";
        var accountName = _configuration["VietQr:AccountName"] ?? "TRAVELAI";
        var amount = decimal.ToInt64(decimal.Round(paymentAmountVietQr, 0, MidpointRounding.AwayFromZero));
        var transferContent = $"TRAVELAI BK{booking.BookingId}";
        var transactionRef = CreateTransactionRef(booking.BookingId, "VIETQR");
        await CreatePendingPaymentAsync(booking.BookingId, "VietQR", transactionRef, paymentAmountVietQr);
        var qrImageUrl = string.Concat(
            "https://img.vietqr.io/image/",
            Uri.EscapeDataString(bankCode),
            "-",
            Uri.EscapeDataString(accountNumber),
            "-compact2.png?amount=",
            amount.ToString(CultureInfo.InvariantCulture),
            "&addInfo=",
            Uri.EscapeDataString(transferContent),
            "&accountName=",
            Uri.EscapeDataString(accountName));

        return Ok(new VietQrPaymentResponse
        {
            IsSuccess = true,
            BookingId = booking.BookingId,
            Amount = paymentAmountVietQr,
            BankCode = bankCode,
            BankName = bankName,
            AccountNumber = accountNumber,
            AccountName = accountName,
            TransferContent = transferContent,
            TransactionRef = transactionRef,
            QrImageUrl = qrImageUrl,
            Message = "Quet ma VietQR hoac chuyen khoan dung noi dung de TravelAI doi soat."
        });
    }

    [HttpPost("vietqr/confirm")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ConfirmVietQrPayment([FromBody] CreateVietQrPaymentRequest request)
    {
        var booking = await _context.Bookings
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.BookingId == request.BookingId);

        if (booking == null)
        {
            return NotFound(new { message = "Khong tim thay don hang." });
        }

        if (booking.Status != BookingStatus.Pending)
        {
            return BadRequest(new { message = "Chi co the xac nhan thanh toan don hang dang cho xu ly." });
        }

        var latestVietQrPayment = await _context.Payments
            .Where(p => p.BookingId == booking.BookingId && p.Provider == "VietQR")
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefaultAsync();

        var transactionRef = latestVietQrPayment?.TransactionRef ?? CreateTransactionRef(booking.BookingId, "VIETQR");
        var updateResult = await MarkBookingAsPaidCoreAsync(
            booking.BookingId,
            transactionRef,
            booking.TotalAmount,
            "VietQR",
            "So tien VietQR khong khop voi don hang.");

        if (!updateResult.Success)
        {
            return BadRequest(new { message = updateResult.Message });
        }

        return Ok(new
        {
            success = true,
            transactionRef,
            message = "Da ghi nhan yeu cau thanh toan VietQR."
        });
    }

    [HttpGet("vietqr/pending")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetPendingVietQrPayments()
    {
        var pendingPayments = await _context.Payments
            .AsNoTracking()
            .Where(payment =>
                payment.Provider == "VietQR" &&
                payment.Status == PaymentStatus.Pending &&
                payment.Booking.Status == BookingStatus.Pending)
            .OrderByDescending(payment => payment.CreatedAt)
            .Select(payment => new
            {
                payment.PaymentId,
                payment.BookingId,
                payment.TransactionRef,
                payment.Amount,
                payment.CreatedAt,
                customerName = payment.Booking.User.FullName,
                customerEmail = payment.Booking.User.Email,
                serviceName = payment.Booking.BookingItems
                    .OrderBy(item => item.ItemId)
                    .Select(item => item.Service.Name)
                    .FirstOrDefault(),
                checkInDate = payment.Booking.BookingItems
                    .OrderBy(item => item.ItemId)
                    .Select(item => (DateTime?)item.CheckInDate)
                    .FirstOrDefault(),
                quantity = payment.Booking.BookingItems
                    .Select(item => (int?)item.Quantity)
                    .Sum() ?? 0
            })
            .ToListAsync();

        return Ok(pendingPayments);
    }

    [HttpPost("counter/create")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> CreateCounterPayment([FromBody] CreateCounterPaymentRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap!" });
        }

        var userId = int.Parse(userIdClaim.Value, CultureInfo.InvariantCulture);
        var booking = await _context.Bookings
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.BookingId == request.BookingId && b.UserId == userId);

        if (booking == null)
        {
            return NotFound(new { message = "Khong tim thay don hang." });
        }

        if (booking.Status != BookingStatus.Pending)
        {
            return BadRequest(new { message = "Chi co the thanh toan don hang dang cho xu ly." });
        }

        // Dùng amount từ request nếu có (đã áp dụng giảm giá), ngược lại dùng totalAmount của booking
        var paymentAmountCounter = (request.Amount.HasValue && request.Amount.Value > 0)
            ? request.Amount.Value
            : booking.TotalAmount;

        if (paymentAmountCounter > booking.TotalAmount)
        {
            return BadRequest(new { message = "So tien thanh toan khong hop le." });
        }

        var transactionRef = CreateTransactionRef(booking.BookingId, "COUNTER");
        await CreatePendingPaymentAsync(booking.BookingId, "Counter", transactionRef, paymentAmountCounter);

        return Ok(new CounterPaymentResponse
        {
            IsSuccess = true,
            BookingId = booking.BookingId,
            Amount = paymentAmountCounter,
            TransactionRef = transactionRef,
            PaymentCode = $"BK{booking.BookingId:000000}",
            PaymentLocation = _configuration["CounterPayment:Location"] ?? "TravelAI - Quay thanh toan",
            Message = _configuration["CounterPayment:Message"]
                ?? "Vui long cung cap ma thanh toan tai quay de nhan vien xac nhan."
        });
    }

    [HttpPost("counter/confirm")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ConfirmCounterPayment([FromBody] CreateCounterPaymentRequest request)
    {
        var booking = await _context.Bookings
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.BookingId == request.BookingId);

        if (booking == null)
        {
            return NotFound(new { message = "Khong tim thay don hang." });
        }

        if (booking.Status != BookingStatus.Pending)
        {
            return BadRequest(new { message = "Chi co the xac nhan thanh toan don hang dang cho xu ly." });
        }

        var latestCounterPayment = await _context.Payments
            .Where(p => p.BookingId == booking.BookingId && p.Provider == "Counter")
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefaultAsync();

        var transactionRef = latestCounterPayment?.TransactionRef ?? CreateTransactionRef(booking.BookingId, "COUNTER");
        var updateResult = await MarkBookingAsPaidCoreAsync(
            booking.BookingId,
            transactionRef,
            booking.TotalAmount,
            "Counter",
            "So tien thanh toan tai quay khong khop voi don hang.");

        if (!updateResult.Success)
        {
            return BadRequest(new { message = updateResult.Message });
        }

        return Ok(new
        {
            success = true,
            transactionRef,
            message = "Da xac nhan thanh toan tai quay."
        });
    }

    [HttpGet("status/{bookingId:int}")]
    [Authorize]
    public async Task<IActionResult> GetPaymentStatus(int bookingId)
    {
        var booking = await _context.Bookings
            .AsNoTracking()
            .Include(b => b.Payments)
            .FirstOrDefaultAsync(b => b.BookingId == bookingId);

        if (booking == null)
        {
            return NotFound(new { message = "Khong tim thay don hang." });
        }

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap!" });
        }

        var userId = int.Parse(userIdClaim.Value, CultureInfo.InvariantCulture);
        if (booking.UserId != userId && !User.IsInRole("Admin"))
        {
            return Forbid();
        }

        var latestPayment = booking.Payments
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefault();

        if (latestPayment == null)
        {
            return Ok(new PaymentStatusResponse
            {
                BookingId = booking.BookingId,
                Status = "None",
                Message = "Chua co giao dich thanh toan."
            });
        }

        return Ok(new PaymentStatusResponse
        {
            BookingId = booking.BookingId,
            Status = latestPayment.Status.ToString(),
            Provider = latestPayment.Provider,
            TransactionRef = latestPayment.TransactionRef,
            Amount = latestPayment.Amount,
            PaidAt = latestPayment.PaidAt,
            Message = latestPayment.Status == PaymentStatus.Paid
                ? "Thanh toan da duoc cong thanh toan xac nhan."
                : "Thanh toan dang cho xac nhan tu cong thanh toan."
        });
    }

    [HttpPost("momo/ipn")]
    [AllowAnonymous]
    public async Task<IActionResult> MomoIpn([FromBody] JsonElement body)
    {
        var ipnData = JsonElementToDictionary(body);
        var result = _momoService.ValidateIPN(ipnData);

        if (!result.IsValidSignature)
        {
            return BadRequest(new { message = "Chu ky IPN MoMo khong hop le." });
        }

        var bookingId = TryGetBookingId(result.OrderId);
        if (bookingId == null)
        {
            return BadRequest(new { message = "Ma giao dich khong xac dinh duoc don hang." });
        }

        if (result.IsSuccess)
        {
            var transactionRef = result.TransactionId?.ToString(CultureInfo.InvariantCulture) ?? result.OrderId;
            var updateResult = await MarkBookingAsPaidCoreAsync(
                bookingId.Value,
                result.OrderId,
                result.Amount,
                "MoMo",
                "So tien MoMo tra ve khong khop voi don hang.");

            if (!updateResult.Success)
            {
                return BadRequest(new { message = updateResult.Message });
            }
        }
        else
        {
            await MarkPaymentFailedAsync(result.OrderId, "MoMo IPN result is not success.");
        }

        return NoContent();
    }

    [HttpPost("momo/callback")]
    [AllowAnonymous]
    public async Task<IActionResult> MomoCallback([FromBody] Dictionary<string, string> callbackData)
    {
        var result = _momoService.ValidateIPN(callbackData);

        if (!result.IsValidSignature)
        {
            return BadRequest(new { success = false, message = "Chu ky MoMo khong hop le." });
        }

        var bookingId = TryGetBookingId(result.OrderId);
        if (bookingId == null)
        {
            return BadRequest(new { success = false, message = "Ma giao dich khong xac dinh duoc don hang." });
        }

        if (!result.IsSuccess)
        {
            await MarkPaymentFailedAsync(result.OrderId, "MoMo callback result is not success.");
            return Ok(new { success = false, bookingId, message = "Thanh toan MoMo khong thanh cong." });
        }

        var updateResult = await MarkBookingAsPaidCoreAsync(
            bookingId.Value,
            result.OrderId,
            result.Amount,
            "MoMo",
            "So tien MoMo tra ve khong khop voi don hang.");

        return updateResult.Success
            ? Ok(new { success = true, bookingId, transactionRef = result.OrderId, message = updateResult.Message })
            : BadRequest(new { success = false, bookingId, message = updateResult.Message });
    }

    [HttpPost("momo/refund")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> RefundMomoTransaction([FromBody] MomoRefundRequest request)
    {
        var result = await _momoService.RefundTransactionAsync(request.TransactionId, request.Amount);
        return Ok(result);
    }

    private async Task<(bool Success, string Message)> MarkBookingAsPaidAsync(int bookingId, PaymentResult result)
    {
        return await MarkBookingAsPaidCoreAsync(
            bookingId,
            result.TransactionRef,
            result.Amount,
            "VNPay",
            "So tien VNPay tra ve khong khop voi don hang.");
    }

    private async Task<(bool Success, string Message)> MarkBookingAsPaidCoreAsync(
        int bookingId,
        string transactionRef,
        decimal amount,
        string method,
        string amountMismatchMessage)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync();

        var booking = await _context.Bookings
            .Include(b => b.BookingItems)
            .Include(b => b.Payments)
            .FirstOrDefaultAsync(b => b.BookingId == bookingId);

        if (booking == null)
        {
            return (false, "Khong tim thay don hang.");
        }

        if (booking.TotalAmount != amount)
        {
            return (false, amountMismatchMessage);
        }

        var payment = booking.Payments
            .FirstOrDefault(p => p.TransactionRef == transactionRef && p.Provider == method);

        if (payment?.Status == PaymentStatus.Paid)
        {
            return (true, "Giao dich da duoc ghi nhan truoc do.");
        }

        if (booking.Status == BookingStatus.Cancelled)
        {
            return (false, "Don hang da bi huy, khong the ghi nhan thanh toan.");
        }

        if (booking.Status == BookingStatus.Pending)
        {
            var serviceIds = booking.BookingItems.Select(item => item.ServiceId).Distinct().ToList();
            var bookingDates = booking.BookingItems.Select(item => item.CheckInDate.Date).Distinct().ToList();
            var availabilities = await _context.ServiceAvailabilities
                .Where(a => serviceIds.Contains(a.ServiceId) && bookingDates.Contains(a.Date))
                .ToListAsync();

            foreach (var item in booking.BookingItems)
            {
                var availability = availabilities.FirstOrDefault(a =>
                    a.ServiceId == item.ServiceId && a.Date == item.CheckInDate.Date);

                if (availability == null)
                {
                    continue;
                }

                availability.BookedCount += item.Quantity;
                availability.HeldCount = Math.Max(0, availability.HeldCount - item.Quantity);
            }

            booking.Status = BookingStatus.Paid;
        }

        payment ??= new Payment
        {
            BookingId = booking.BookingId,
            Method = method,
            Provider = method,
            TransactionRef = transactionRef,
            Amount = amount,
            Status = PaymentStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            PaymentTime = DateTime.UtcNow
        };

        payment.Method = method;
        payment.Provider = method;
        payment.Amount = amount;
        payment.Status = PaymentStatus.Paid;
        payment.PaidAt = DateTime.UtcNow;
        payment.PaymentTime = payment.PaidAt.Value;

        if (payment.PaymentId == 0)
        {
            _context.Payments.Add(payment);
        }

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        _logger.LogInformation(
            "Payment {Provider} {TransactionRef} marked paid for booking {BookingId}.",
            method,
            transactionRef,
            bookingId);

        return (true, $"Da ghi nhan thanh toan {method}.");
    }

    private IActionResult BuildCallbackResponse(PaymentResult result, int? bookingId, string message)
    {
        var frontendReturnUrl = _configuration["VnPay:FrontendReturnUrl"];
        if (!string.IsNullOrWhiteSpace(frontendReturnUrl))
        {
            if (bookingId.HasValue && !frontendReturnUrl.TrimEnd('/').EndsWith(bookingId.Value.ToString(CultureInfo.InvariantCulture), StringComparison.Ordinal))
            {
                frontendReturnUrl = $"{frontendReturnUrl.TrimEnd('/')}/{bookingId.Value.ToString(CultureInfo.InvariantCulture)}";
            }

            var separator = frontendReturnUrl.Contains('?', StringComparison.Ordinal) ? '&' : '?';
            var redirectUrl = string.Concat(
                frontendReturnUrl,
                separator,
                "success=", result.IsSuccess.ToString().ToLowerInvariant(),
                "&bookingId=", bookingId?.ToString(CultureInfo.InvariantCulture) ?? string.Empty,
                "&transactionRef=", Uri.EscapeDataString(result.TransactionRef),
                "&responseCode=", Uri.EscapeDataString(result.ResponseCode ?? string.Empty));

            return Redirect(redirectUrl);
        }

        return Ok(new
        {
            success = result.IsSuccess,
            bookingId,
            result.TransactionRef,
            result.ResponseCode,
            result.TransactionStatus,
            message
        });
    }

    private async Task<Payment> CreatePendingPaymentAsync(int bookingId, string provider, string transactionRef, decimal amount)
    {
        var existingPayment = await _context.Payments
            .FirstOrDefaultAsync(p => p.TransactionRef == transactionRef && p.Provider == provider);

        if (existingPayment != null)
        {
            return existingPayment;
        }

        var payment = new Payment
        {
            BookingId = bookingId,
            Method = provider,
            Provider = provider,
            TransactionRef = transactionRef,
            Amount = amount,
            Status = PaymentStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            PaymentTime = DateTime.UtcNow
        };

        _context.Payments.Add(payment);
        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Created pending payment {Provider} {TransactionRef} for booking {BookingId}.",
            provider,
            transactionRef,
            bookingId);

        return payment;
    }

    private async Task MarkPaymentFailedAsync(string transactionRef, string reason)
    {
        if (string.IsNullOrWhiteSpace(transactionRef))
        {
            return;
        }

        var payment = await _context.Payments.FirstOrDefaultAsync(p => p.TransactionRef == transactionRef);
        if (payment == null || payment.Status == PaymentStatus.Paid)
        {
            return;
        }

        payment.Status = PaymentStatus.Failed;
        await _context.SaveChangesAsync();

        _logger.LogWarning(
            "Marked payment {TransactionRef} failed. Reason: {Reason}",
            transactionRef,
            reason);
    }

    private static string CreateTransactionRef(int bookingId, string provider)
    {
        return $"{bookingId}-{provider}-{DateTime.UtcNow:yyyyMMddHHmmssfff}";
    }

    private static int? TryGetBookingId(string transactionRef)
    {
        var bookingPart = transactionRef.Split('-', 2, StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
        return int.TryParse(bookingPart, NumberStyles.Integer, CultureInfo.InvariantCulture, out var bookingId)
            ? bookingId
            : null;
    }

    private static DateTime? TryGetTransactionDate(string transactionRef)
    {
        var parts = transactionRef.Split('-', 2, StringSplitOptions.RemoveEmptyEntries);
        return parts.Length == 2
            && DateTime.TryParseExact(parts[1], "yyyyMMddHHmmss", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date)
            ? date
            : null;
    }

    private bool UseMockGatewayWhenConfigured(string provider)
    {
        if (!bool.TryParse(_configuration["Payments:EnableMockGateway"], out var enableMockGateway) || !enableMockGateway)
        {
            return false;
        }

        return provider.Equals("Momo", StringComparison.OrdinalIgnoreCase)
            ? string.IsNullOrWhiteSpace(_configuration["Momo:PartnerCode"])
                || string.IsNullOrWhiteSpace(_configuration["Momo:AccessKey"])
                || string.IsNullOrWhiteSpace(_configuration["Momo:SecretKey"])
            : string.IsNullOrWhiteSpace(_configuration[$"{provider}:TmnCode"])
                || string.IsNullOrWhiteSpace(_configuration[$"{provider}:HashSecret"]);
    }

    private string BuildMockPaymentUrl(string provider, int bookingId, decimal amount)
    {
        var frontendBaseUrl = _configuration["Payments:MockGatewayFrontendUrl"];
        if (!string.IsNullOrWhiteSpace(frontendBaseUrl))
        {
            var origin = new Uri(frontendBaseUrl).GetLeftPart(UriPartial.Authority);
            return $"{origin}/mock-payment/{provider}/{bookingId}?amount={decimal.ToInt64(decimal.Round(amount, 0, MidpointRounding.AwayFromZero))}";
        }

        return $"http://localhost:5173/mock-payment/{provider}/{bookingId}?amount={decimal.ToInt64(decimal.Round(amount, 0, MidpointRounding.AwayFromZero))}";
    }

    private static Dictionary<string, string> JsonElementToDictionary(JsonElement element)
    {
        if (element.ValueKind != JsonValueKind.Object)
        {
            return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        }

        return element.EnumerateObject()
            .ToDictionary(
                x => x.Name,
                x => x.Value.ValueKind == JsonValueKind.String ? x.Value.GetString() ?? string.Empty : x.Value.ToString(),
                StringComparer.OrdinalIgnoreCase);
    }
}
