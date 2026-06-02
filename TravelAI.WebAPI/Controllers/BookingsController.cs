using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Globalization;
using TravelAI.Application.DTOs.Booking;
using TravelAI.Application.DTOs.Notification;
using TravelAI.Application.DTOs.Payment;
using TravelAI.Application.DTOs.Ticket;
using TravelAI.Application.Helpers;
using TravelAI.Application.Interfaces;
using TravelAI.Domain.Entities;
using TravelAI.Domain.Enums;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BookingsController : ControllerBase
{
    private readonly IBookingService _bookingService;
    private readonly IPaymentService _paymentService;
    private readonly IMomoService _momoService;
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<BookingsController> _logger;
    private readonly IAuditLogService _auditLogService;
    private readonly IRealtimeNotificationService _notificationService;
    private readonly INotificationService _persistentNotificationService;
    private readonly IElectronicTicketService _ticketService;

    public BookingsController(
        IBookingService bookingService,
        IPaymentService paymentService,
        IMomoService momoService,
        ApplicationDbContext context,
        IConfiguration configuration,
        ILogger<BookingsController> logger,
        IAuditLogService auditLogService,
        IRealtimeNotificationService notificationService,
        INotificationService persistentNotificationService,
        IElectronicTicketService ticketService)
    {
        _bookingService = bookingService;
        _paymentService = paymentService;
        _momoService = momoService;
        _context = context;
        _configuration = configuration;
        _logger = logger;
        _auditLogService = auditLogService;
        _notificationService = notificationService;
        _persistentNotificationService = persistentNotificationService;
        _ticketService = ticketService;
    }

    [HttpGet("my-bookings")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> GetMyBookings()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap!" });
        }

        var userId = int.Parse(userIdClaim.Value);

        var bookings = await _context.Bookings
            .AsNoTracking()
            .Where(b => b.UserId == userId)
            .Include(b => b.BookingItems)
                .ThenInclude(bi => bi.Service)
            .Include(b => b.Payments)
                .ThenInclude(payment => payment.Refunds)
            .Include(b => b.ElectronicTickets)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

        var result = bookings
            .Select(MapToBookingSummary)
            .ToList();

        return Ok(result);
    }

    [HttpPost("draft")]
    public async Task<IActionResult> CreateDraft([FromBody] CreateBookingRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap!" });
        }

        int userId = int.Parse(userIdClaim.Value);
        int? bookingId;
        try
        {
            bookingId = await _bookingService.CreateDraftBookingAsync(userId, request);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }

        if (bookingId == null)
        {
            return BadRequest(new
            {
                message = "Xin loi, ngay nay da het cho hoac khong du so luong ban yeu cau!"
            });
        }

        // Log audit
        await _auditLogService.LogAsync(userId, "CREATE", "Bookings", bookingId.Value);
        await _persistentNotificationService.CreateAsync(new CreateNotificationRequest
        {
            UserId = userId,
            Title = "Dat tour thanh cong",
            Message = $"Don dat tour #{bookingId.Value} da duoc tao va dang cho thanh toan.",
            Type = "Booking"
        });

        return Ok(new
        {
            bookingId,
            message = "Da tao don hang nhap va giu cho thanh cong!"
        });
    }

    [HttpPost("draft-cart")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> CreateDraftFromCart([FromBody] CreateCartBookingRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap!" });
        }

        if (request.Items.Count == 0)
        {
            return BadRequest(new { message = "Gio hang dang trong." });
        }

        if (request.Items.Any(item => item.ServiceId <= 0 || item.Quantity <= 0))
        {
            return BadRequest(new { message = "Thong tin gio hang khong hop le." });
        }

        var userId = int.Parse(userIdClaim.Value, CultureInfo.InvariantCulture);
        var requestedItems = request.Items
            .GroupBy(item => new { item.ServiceId, CheckInDate = item.CheckInDate.Date, CheckOutDate = item.CheckOutDate?.Date })
            .Select(group => new CreateBookingRequest(
                group.Key.ServiceId,
                group.Sum(item => item.Quantity),
                group.Key.CheckInDate,
                group.Key.CheckOutDate))
            .ToList();

        if (requestedItems.Any(item => item.CheckOutDate.HasValue && item.CheckOutDate.Value.Date < item.CheckInDate.Date))
        {
            return BadRequest(new { message = "Ngay tra xe phai lon hon hoac bang ngay nhan xe." });
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var serviceIds = requestedItems.Select(item => item.ServiceId).Distinct().ToList();
        var services = await _context.Services
            .Where(service => serviceIds.Contains(service.ServiceId))
            .ToDictionaryAsync(service => service.ServiceId);

        if (services.Count != serviceIds.Count)
        {
            return BadRequest(new { message = "Thong tin dich vu trong gio hang khong hop le." });
        }

        var requestedAvailabilityKeys = requestedItems
            .SelectMany(item => EnumerateBookingDates(item)
                .Select(date => new { item.ServiceId, Date = date }))
            .ToList();
        var bookingDates = requestedAvailabilityKeys.Select(item => item.Date).Distinct().ToList();
        var availabilities = await _context.ServiceAvailabilities
            .Where(a => serviceIds.Contains(a.ServiceId) && bookingDates.Contains(a.Date))
            .ToListAsync();

        foreach (var item in requestedItems)
        {
            foreach (var bookingDate in EnumerateBookingDates(item))
            {
                var availability = availabilities.FirstOrDefault(a =>
                    a.ServiceId == item.ServiceId && a.Date == bookingDate);

                if (availability == null
                    || availability.TotalStock - availability.BookedCount - availability.HeldCount < item.Quantity)
                {
                    return BadRequest(new
                    {
                        message = $"Xe da het cho trong ngay {bookingDate:dd/MM/yyyy}"
                    });
                }
            }
        }

        var totalAmount = requestedItems.Sum(item =>
        {
            var service = services[item.ServiceId];
            var days = (item.CheckOutDate?.Date - item.CheckInDate.Date)?.Days + 1 ?? 1;

            if (service.ServiceType == ServiceType.Transport && item.CheckOutDate.HasValue)
            {
                return service.BasePrice * days * item.Quantity;
            }

            var availability = availabilities.First(a =>
                a.ServiceId == item.ServiceId && a.Date == item.CheckInDate.Date);
            return availability.Price * item.Quantity;
        });

        var booking = new Booking
        {
            UserId = userId,
            TotalAmount = totalAmount,
            Status = BookingStatus.Pending,
            CreatedAt = DateTimeHelper.Now
        };

        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync();

        foreach (var item in requestedItems)
        {
            var service = services[item.ServiceId];
            var days = (item.CheckOutDate?.Date - item.CheckInDate.Date)?.Days + 1 ?? 1;
            var priceAtBooking = service.ServiceType == ServiceType.Transport && item.CheckOutDate.HasValue
                ? service.BasePrice * days
                : availabilities.First(a => a.ServiceId == item.ServiceId && a.Date == item.CheckInDate.Date).Price;

            _context.BookingItems.Add(new BookingItem
            {
                BookingId = booking.BookingId,
                ServiceId = item.ServiceId,
                Quantity = item.Quantity,
                PriceAtBooking = priceAtBooking,
                CheckInDate = item.CheckInDate.Date,
                CheckOutDate = item.CheckOutDate?.Date
            });

            foreach (var bookingDate in EnumerateBookingDates(item))
            {
                var availability = availabilities.First(a =>
                    a.ServiceId == item.ServiceId && a.Date == bookingDate);
                availability.HeldCount += item.Quantity;
            }
        }

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();
        await _persistentNotificationService.CreateAsync(new CreateNotificationRequest
        {
            UserId = userId,
            Title = "Dat tour thanh cong",
            Message = $"Don dat tour #{booking.BookingId} tu gio hang da duoc tao va dang cho thanh toan.",
            Type = "Booking"
        });

        return Ok(new
        {
            bookingId = booking.BookingId,
            message = "Da tao don hang tu gio hang va giu cho thanh cong!"
        });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var booking = await _context.Bookings
            .AsNoTracking()
            .Include(b => b.BookingItems)
                .ThenInclude(bi => bi.Service)
            .Include(b => b.Payments)
                .ThenInclude(payment => payment.Refunds)
            .Include(b => b.ElectronicTickets)
            .FirstOrDefaultAsync(b => b.BookingId == id);

        if (booking == null)
        {
            return NotFound(new { message = "Don hang khong ton tai hoac da bi huy." });
        }

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap!" });
        }

        var userId = int.Parse(userIdClaim.Value);
        var isOwner = booking.UserId == userId;
        var isAdmin = User.IsInRole("Admin");
        var isPartnerOfBooking = User.IsInRole("Partner")
            && booking.BookingItems.Any(item => item.Service.PartnerId == userId);

        if (!isOwner && !isAdmin && !isPartnerOfBooking)
        {
            return Forbid();
        }

        return Ok(MapToBookingDetail(booking));
    }

    [HttpGet("partner-orders")]
    [Authorize(Roles = "Partner")]
    public async Task<IActionResult> GetPartnerOrders()
    {
        var partnerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var orders = await _context.BookingItems
            .AsNoTracking()
            .Include(bi => bi.Service)
            .Include(bi => bi.Booking)
                .ThenInclude(b => b.User)
            .Where(bi => bi.Service.PartnerId == partnerId)
            .Select(bi => new
            {
                bookingId = bi.BookingId,
                serviceName = bi.Service.Name,
                customerName = bi.Booking.User.FullName,
                checkInDate = bi.CheckInDate,
                quantity = bi.Quantity,
                totalAmount = bi.PriceAtBooking * bi.Quantity,
                status = bi.Booking.Status
            })
            .OrderByDescending(x => x.checkInDate)
            .ToListAsync();

        return Ok(orders);
    }

    [HttpPost("{id}/confirm")]
    [Obsolete("Use POST /api/bookings/{id}/pay and gateway callback/IPN confirmation instead.")]
    public async Task<IActionResult> ConfirmBooking(int id)
    {
        var booking = await _context.Bookings
            .Include(b => b.BookingItems)
                .ThenInclude(item => item.Service)
            .FirstOrDefaultAsync(b => b.BookingId == id);
        if (booking == null)
        {
            return NotFound(new { message = "Khong tim thay don hang." });
        }

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap!" });
        }

        if (booking.UserId != int.Parse(userIdClaim.Value))
        {
            return Forbid();
        }

        if (booking.Status != BookingStatus.Pending)
        {
            return BadRequest(new { message = "Chi co the thanh toan don hang dang cho xu ly." });
        }

        booking.Status = BookingStatus.Paid;
        booking.ApprovalDeadline = DateTimeHelper.Now.AddHours(24); // Partner có 24h để duyệt kể từ khi thanh toán

        var items = await _context.BookingItems
            .Where(bi => bi.BookingId == id)
            .ToListAsync();

        foreach (var item in items)
        {
            foreach (var bookingDate in EnumerateBookingDates(item))
            {
                var availability = await _context.ServiceAvailabilities
                    .FirstOrDefaultAsync(a => a.ServiceId == item.ServiceId && a.Date == bookingDate);

                if (availability == null)
                {
                    continue;
                }

                availability.BookedCount += item.Quantity;
                availability.HeldCount = Math.Max(0, availability.HeldCount - item.Quantity);
            }
        }

        _context.Payments.Add(new Payment
        {
            BookingId = id,
            Method = "Mock",
            Provider = "Mock",
            TransactionRef = Guid.NewGuid().ToString("N")[..12].ToUpper(),
            Amount = booking.TotalAmount,
            Status = PaymentStatus.Paid,
            CreatedAt = DateTimeHelper.Now,
            PaidAt = DateTimeHelper.Now,
            PaymentTime = DateTimeHelper.Now
        });

        var result = await _context.SaveChangesAsync();

        if (result > 0)
        {
            var generatedTickets = await _ticketService.GenerateForBookingAsync(booking.BookingId);
            // 1. Phần Log Audit của bạn
            int userId = int.Parse(userIdClaim.Value);
            await _auditLogService.LogAsync(userId, "UPDATE", "Bookings", id);
            
            // 2. Phần Gửi thông báo của Main
            var firstItem = items.FirstOrDefault();
            var partnerId = booking.BookingItems
                .Select(item => item.Service.PartnerId)
                .FirstOrDefault();

            await _notificationService.NotifyUserAsync(booking.UserId, "booking_confirmed", new
            {
                bookingId = booking.BookingId,
                status = booking.Status.ToString(),
                totalAmount = booking.TotalAmount,
                message = "Don hang cua ban da duoc xac nhan thanh toan."
            });
            await _persistentNotificationService.CreateAsync(new CreateNotificationRequest
            {
                UserId = booking.UserId,
                Title = "Thanh toan thanh cong",
                Message = $"Don dat tour #{booking.BookingId} da duoc thanh toan thanh cong.",
                Type = "Payment"
            });
            if (generatedTickets.Count > 0)
            {
                await _persistentNotificationService.CreateAsync(new CreateNotificationRequest
                {
                    UserId = booking.UserId,
                    Title = "Vé điện tử đã được phát hành",
                    Message = "Thanh toán thành công. Vé điện tử của bạn đã sẵn sàng. Bạn có thể xem mã QR trong mục Dịch vụ đã đặt.",
                    Type = "Ticket"
                });
            }

            if (partnerId > 0)
            {
                await _notificationService.NotifyPartnerAsync(partnerId, "partner_booking_confirmed", new
                {
                    bookingId = booking.BookingId,
                    serviceId = firstItem?.ServiceId,
                    quantity = firstItem?.Quantity,
                    checkInDate = firstItem?.CheckInDate,
                    message = "Co don hang moi da thanh toan cho dich vu cua ban."
                });
                await _persistentNotificationService.CreateAsync(new CreateNotificationRequest
                {
                    UserId = partnerId,
                    Title = "Co booking moi",
                    Message = $"Don #{booking.BookingId} da thanh toan cho dich vu cua ban.",
                    Type = "Booking"
                });
            }

            return Ok(new
            {
                success = true,
                message = "Xac nhan thanh toan thanh cong! Don hang cua ban da hoan tat."
            });
        }

        return BadRequest(new { message = "Co loi xay ra khi cap nhat don hang." });
    }

    [HttpPost("{id:int}/pay")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> InitiatePayment(int id, [FromBody] PaymentMethodRequest req)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap!" });
        }

        var userId = int.Parse(userIdClaim.Value, CultureInfo.InvariantCulture);
        var booking = await _context.Bookings
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.BookingId == id && b.UserId == userId);

        if (booking == null)
        {
            return NotFound(new { message = "Khong tim thay don hang." });
        }

        if (booking.Status != BookingStatus.Pending)
        {
            return BadRequest(new { message = "Chi co the thanh toan don hang dang cho xu ly." });
        }

        var method = req.Method.Trim();
        if (!method.Equals("VNPay", StringComparison.OrdinalIgnoreCase)
            && !method.Equals("Momo", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Phuong thuc thanh toan khong hop le. Chi ho tro VNPay hoac Momo." });
        }

        var provider = method.Equals("VNPay", StringComparison.OrdinalIgnoreCase) ? "VNPay" : "MoMo";
        var transactionRef = CreateTransactionRef(booking.BookingId, provider.ToUpperInvariant());
        await CreatePendingPaymentAsync(booking.BookingId, provider, transactionRef, booking.TotalAmount);

        if (provider == "VNPay")
        {
            var returnUrl = req.ReturnUrl
                ?? _configuration["VnPay:ReturnUrl"]
                ?? Url.ActionLink("VnPayCallback", "Payment")
                ?? string.Empty;
            var paymentUrl = _paymentService.CreatePaymentUrl(
                booking.BookingId,
                booking.TotalAmount,
                returnUrl,
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                transactionRef);

            return Ok(new
            {
                success = true,
                provider,
                transactionRef,
                paymentUrl
            });
        }

        var momoResult = await _momoService.CreatePaymentRequestAsync(
            booking.BookingId,
            booking.TotalAmount,
            transactionRef);

        return Ok(new
        {
            success = momoResult.IsSuccess,
            provider,
            transactionRef,
            paymentUrl = momoResult.PaymentUrl ?? momoResult.PayUrl,
            momoResult.PayUrl,
            momoResult.Deeplink,
            momoResult.QrCodeUrl,
            momoResult.Message
        });
    }

    [HttpPost("{id:int}/confirm-payment")]
    [AllowAnonymous]
    public async Task<IActionResult> ConfirmPayment(int id, [FromBody] PaymentCallbackDto callback)
    {
        if (callback.Provider.Equals("VNPay", StringComparison.OrdinalIgnoreCase))
        {
            var result = _paymentService.ValidateCallback(callback.Data);
            if (!result.IsValidSignature)
            {
                return BadRequest(new { message = "Chu ky VNPay khong hop le." });
            }

            if (TryGetBookingId(result.TransactionRef) != id)
            {
                return BadRequest(new { message = "Ma giao dich khong khop booking." });
            }

            if (!result.IsSuccess)
            {
                await MarkPaymentFailedAsync(result.TransactionRef, "VNPay callback response is not success.");
                return BadRequest(new { message = "Thanh toan VNPay khong thanh cong." });
            }

            var updateResult = await MarkBookingAsPaidAsync(
                id,
                result.TransactionRef,
                result.Amount,
                "VNPay",
                "So tien VNPay tra ve khong khop voi don hang.");

            return updateResult.Success
                ? Ok(new { success = true, message = updateResult.Message })
                : BadRequest(new { message = updateResult.Message });
        }

        if (callback.Provider.Equals("Momo", StringComparison.OrdinalIgnoreCase)
            || callback.Provider.Equals("MoMo", StringComparison.OrdinalIgnoreCase))
        {
            var result = _momoService.ValidateIPN(callback.Data);
            if (!result.IsValidSignature)
            {
                return BadRequest(new { message = "Chu ky IPN MoMo khong hop le." });
            }

            if (TryGetBookingId(result.OrderId) != id)
            {
                return BadRequest(new { message = "Ma giao dich khong khop booking." });
            }

            if (!result.IsSuccess)
            {
                await MarkPaymentFailedAsync(result.OrderId, "MoMo IPN result is not success.");
                return BadRequest(new { message = "Thanh toan MoMo khong thanh cong." });
            }

            var updateResult = await MarkBookingAsPaidAsync(
                id,
                result.OrderId,
                result.Amount,
                "MoMo",
                "So tien MoMo tra ve khong khop voi don hang.");

            return updateResult.Success
                ? Ok(new { success = true, message = updateResult.Message })
                : BadRequest(new { message = updateResult.Message });
        }

        return BadRequest(new { message = "Provider khong hop le." });
    }

    [HttpPost("{id:int}/cancel")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> CancelBooking(int id)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
        {
            return Unauthorized(new { message = "Vui long dang nhap!" });
        }

        var userId = int.Parse(userIdClaim.Value);

        var booking = await _context.Bookings
            .Include(b => b.BookingItems)
                .ThenInclude(item => item.Service)
            .Include(b => b.Payments)
                .ThenInclude(payment => payment.Refunds)
            .FirstOrDefaultAsync(b => b.BookingId == id && b.UserId == userId);

        if (booking == null)
        {
            return NotFound(new { message = "Khong tim thay don hang." });
        }

        var evaluation = EvaluateCancellationPolicy(booking, DateTimeHelper.Now);
        if (!evaluation.CanCancel)
        {
            return BadRequest(new { message = evaluation.PolicyMessage });
        }

        var latestPayment = booking.Payments
            .OrderByDescending(payment => payment.PaidAt ?? payment.CreatedAt)
            .FirstOrDefault();

        if (booking.Status == BookingStatus.Paid && latestPayment == null)
        {
            return BadRequest(new { message = "Khong tim thay giao dich thanh toan de tao hoan tien." });
        }

        var requestedAvailabilityKeys = booking.BookingItems
            .SelectMany(item => EnumerateBookingDates(item)
                .Select(date => new { item.ServiceId, Date = date }))
            .ToList();
        var serviceIds = requestedAvailabilityKeys.Select(item => item.ServiceId).Distinct().ToList();
        var bookingDates = requestedAvailabilityKeys.Select(item => item.Date).Distinct().ToList();

        var availabilities = await _context.ServiceAvailabilities
            .Where(a => serviceIds.Contains(a.ServiceId) && bookingDates.Contains(a.Date))
            .ToListAsync();

        foreach (var item in booking.BookingItems)
        {
            foreach (var bookingDate in EnumerateBookingDates(item))
            {
                var availability = availabilities.FirstOrDefault(a =>
                    a.ServiceId == item.ServiceId && a.Date == bookingDate);

                if (availability == null)
                {
                    continue;
                }

                if (booking.Status == BookingStatus.Pending)
                {
                    availability.HeldCount = Math.Max(0, availability.HeldCount - item.Quantity);
                }
                else
                {
                    availability.BookedCount = Math.Max(0, availability.BookedCount - item.Quantity);
                }
            }
        }

        var refundAmount = evaluation.EstimatedRefundAmount;

        if (latestPayment != null && refundAmount > 0)
        {
            _context.Refunds.Add(new Refund
            {
                PaymentId = latestPayment.PaymentId,
                RefundAmount = refundAmount,
                RefundRef = Guid.NewGuid().ToString("N")[..12].ToUpper(),
                Reason = evaluation.PolicyMessage,
                RefundTime = DateTimeHelper.Now
            });
        }

        booking.Status = BookingStatus.Cancelled;
        var tickets = await _context.ElectronicTickets
            .Where(ticket => ticket.BookingId == id)
            .ToListAsync();
        foreach (var ticket in tickets)
        {
            ticket.Status = TicketStatus.Cancelled;
        }

        await _context.SaveChangesAsync();
        
        // Log audit
        await _auditLogService.LogAsync(userId, "DELETE", "Bookings", id);
        await _persistentNotificationService.CreateAsync(new CreateNotificationRequest
        {
            UserId = userId,
            Title = "Huy tour thanh cong",
            Message = $"Don dat tour #{id} da duoc huy.",
            Type = "Booking"
        });

        var partnerIds = booking.BookingItems
            .Select(item => item.Service.PartnerId)
            .Distinct()
            .ToList();
        foreach (var partnerId in partnerIds)
        {
            await _persistentNotificationService.CreateAsync(new CreateNotificationRequest
            {
                UserId = partnerId,
                Title = "Khach hang huy booking",
                Message = $"Don #{id} cho dich vu cua ban da bi huy.",
                Type = "Booking"
            });
        }

        return Ok(new
        {
            success = true,
            message = "Da huy don hang thanh cong.",
            status = (int)booking.Status,
            refundAmount,
            refundPolicy = evaluation.PolicyMessage
        });
    }

    private static BookingDetailResponse MapToBookingDetail(Booking booking)
    {
        var evaluation = EvaluateCancellationPolicy(booking, DateTimeHelper.Now);
        var item = booking.BookingItems
            .OrderBy(bi => bi.ItemId)
            .FirstOrDefault();

        var latestPayment = booking.Payments
            .OrderByDescending(payment => payment.PaidAt ?? payment.CreatedAt)
            .FirstOrDefault();
        var latestRefund = booking.Payments
            .SelectMany(payment => payment.Refunds)
            .OrderByDescending(refund => refund.RefundTime)
            .FirstOrDefault();

        // Xác định lý do hủy
        string? cancellationReason = null;
        if (booking.Status == BookingStatus.Cancelled || booking.Status == BookingStatus.Refunded)
        {
            // Nếu có refund reason thì dùng
            cancellationReason = latestRefund?.Reason;
            
            // Đối với customer: Ẩn lý do "Quá hạn duyệt", chỉ hiện lý do từ customer hoặc partner
            // "Quá hạn duyệt" là lý do hệ thống tự động, không cần hiện cho customer
            if (cancellationReason == "Quá hạn duyệt")
            {
                cancellationReason = null; // Không hiển thị lý do này cho customer
            }
        }

        return new BookingDetailResponse
        {
            BookingId = booking.BookingId,
            ServiceName = item?.Service?.Name ?? "Dich vu du lich",
            CheckInDate = item?.CheckInDate ?? booking.CreatedAt,
            Quantity = item?.Quantity ?? 0,
            TotalAmount = booking.TotalAmount,
            Status = (int)booking.Status,
            PaymentMethod = latestPayment?.Provider ?? latestPayment?.Method,
            CreatedAt = booking.CreatedAt,
            RefundedAmount = latestRefund?.RefundAmount ?? 0,
            EstimatedRefundAmount = evaluation.EstimatedRefundAmount,
            CanCancel = evaluation.CanCancel,
            CancelPolicy = evaluation.PolicyMessage,
            CancellationReason = cancellationReason,
            Tickets = booking.ElectronicTickets
                .OrderBy(ticket => ticket.TicketId)
                .Select(MapTicketToDto)
                .ToList()
        };
    }

    private static MyBookingSummaryDto MapToBookingSummary(Booking booking)
    {
        var detail = MapToBookingDetail(booking);

        return new MyBookingSummaryDto
        {
            BookingId = detail.BookingId,
            ServiceName = detail.ServiceName,
            CheckInDate = detail.CheckInDate,
            Quantity = detail.Quantity,
            TotalAmount = detail.TotalAmount,
            Status = detail.Status,
            PaymentMethod = detail.PaymentMethod,
            CreatedAt = detail.CreatedAt,
            RefundedAmount = detail.RefundedAmount,
            EstimatedRefundAmount = detail.EstimatedRefundAmount,
            CanCancel = detail.CanCancel,
            CancelPolicy = detail.CancelPolicy,
            CancellationReason = detail.CancellationReason,
            Tickets = detail.Tickets
        };
    }

    private static ElectronicTicketDto MapTicketToDto(ElectronicTicket ticket)
    {
        return new ElectronicTicketDto
        {
            TicketId = ticket.TicketId,
            TicketCode = ticket.TicketCode,
            BookingId = ticket.BookingId,
            BookingItemId = ticket.BookingItemId,
            CustomerName = ticket.CustomerName,
            ServiceName = ticket.ServiceName,
            ServiceType = ticket.ServiceType,
            BookingDate = ticket.BookingDate,
            TravelDate = ticket.TravelDate,
            Quantity = ticket.Quantity,
            TotalAmount = ticket.TotalAmount,
            Status = ticket.Status.ToString(),
            QrPayloadJson = ticket.QrPayloadJson,
            QrImageBase64 = ticket.QrImageBase64,
            CreatedAt = ticket.CreatedAt,
            UsedAt = ticket.UsedAt
        };
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

    private async Task<(bool Success, string Message)> MarkBookingAsPaidAsync(
        int bookingId,
        string transactionRef,
        decimal amount,
        string provider,
        string amountMismatchMessage)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync();

        var booking = await _context.Bookings
            .Include(b => b.BookingItems)
                .ThenInclude(item => item.Service)
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
            .FirstOrDefault(p => p.TransactionRef == transactionRef && p.Provider == provider);

        if (payment?.Status == PaymentStatus.Paid)
        {
            await _ticketService.GenerateForBookingAsync(booking.BookingId);
            await transaction.CommitAsync();
            return (true, "Giao dich da duoc ghi nhan truoc do.");
        }

        if (booking.Status == BookingStatus.Cancelled)
        {
            return (false, "Don hang da bi huy, khong the ghi nhan thanh toan.");
        }

        if (booking.Status == BookingStatus.Pending)
        {
            var requestedAvailabilityKeys = booking.BookingItems
                .SelectMany(item => EnumerateBookingDates(item)
                    .Select(date => new { item.ServiceId, Date = date }))
                .ToList();
            var serviceIds = requestedAvailabilityKeys.Select(item => item.ServiceId).Distinct().ToList();
            var bookingDates = requestedAvailabilityKeys.Select(item => item.Date).Distinct().ToList();
            var availabilities = await _context.ServiceAvailabilities
                .Where(a => serviceIds.Contains(a.ServiceId) && bookingDates.Contains(a.Date))
                .ToListAsync();

            foreach (var item in booking.BookingItems)
            {
                foreach (var bookingDate in EnumerateBookingDates(item))
                {
                    var availability = availabilities.FirstOrDefault(a =>
                        a.ServiceId == item.ServiceId && a.Date == bookingDate);

                    if (availability == null)
                    {
                        continue;
                    }

                    availability.BookedCount += item.Quantity;
                    availability.HeldCount = Math.Max(0, availability.HeldCount - item.Quantity);
                }
            }

            booking.Status = BookingStatus.Paid;
        }

        payment ??= new Payment
        {
            BookingId = booking.BookingId,
            Method = provider,
            Provider = provider,
            TransactionRef = transactionRef,
            Amount = amount,
            Status = PaymentStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            PaymentTime = DateTime.UtcNow
        };

        payment.Method = provider;
        payment.Provider = provider;
        payment.Amount = amount;
        payment.Status = PaymentStatus.Paid;
        payment.PaidAt = DateTime.UtcNow;
        payment.PaymentTime = payment.PaidAt.Value;

        if (payment.PaymentId == 0)
        {
            _context.Payments.Add(payment);
        }

        await _context.SaveChangesAsync();
        var paidTickets = await _ticketService.GenerateForBookingAsync(booking.BookingId);
        await transaction.CommitAsync();
        await _persistentNotificationService.CreateAsync(new CreateNotificationRequest
        {
            UserId = booking.UserId,
            Title = "Thanh toan thanh cong",
            Message = $"Don dat tour #{booking.BookingId} da duoc thanh toan qua {provider}.",
            Type = "Payment"
        });
        if (paidTickets.Count > 0)
        {
            await _persistentNotificationService.CreateAsync(new CreateNotificationRequest
            {
                UserId = booking.UserId,
                Title = "Vé điện tử đã được phát hành",
                Message = "Thanh toán thành công. Vé điện tử của bạn đã sẵn sàng. Bạn có thể xem mã QR trong mục Dịch vụ đã đặt.",
                Type = "Ticket"
            });
        }

        var partnerIds = booking.BookingItems
            .Select(item => item.Service.PartnerId)
            .Distinct()
            .ToList();
        foreach (var partnerId in partnerIds)
        {
            await _persistentNotificationService.CreateAsync(new CreateNotificationRequest
            {
                UserId = partnerId,
                Title = "Co booking moi da thanh toan",
                Message = $"Don #{booking.BookingId} da thanh toan cho dich vu cua ban.",
                Type = "Booking"
            });
        }

        _logger.LogInformation(
            "Payment {Provider} {TransactionRef} marked paid for booking {BookingId}.",
            provider,
            transactionRef,
            bookingId);

        return (true, $"Da ghi nhan thanh toan {provider}.");
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
        var booking = await _context.Bookings
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.BookingId == payment.BookingId);
        if (booking != null)
        {
            await _persistentNotificationService.CreateAsync(new CreateNotificationRequest
            {
                UserId = booking.UserId,
                Title = "Thanh toan that bai",
                Message = $"Giao dich cho don #{booking.BookingId} khong thanh cong.",
                Type = "Payment"
            });
        }

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

    private static IEnumerable<DateTime> EnumerateBookingDates(BookingItem item)
    {
        var startDate = item.CheckInDate.Date;
        var endDate = item.CheckOutDate?.Date ?? startDate;

        for (var date = startDate; date <= endDate; date = date.AddDays(1))
        {
            yield return date;
        }
    }

    private static IEnumerable<DateTime> EnumerateBookingDates(CreateBookingRequest item)
    {
        var startDate = item.CheckInDate.Date;
        var endDate = item.CheckOutDate?.Date ?? startDate;

        for (var date = startDate; date <= endDate; date = date.AddDays(1))
        {
            yield return date;
        }
    }

    private static CancellationEvaluation EvaluateCancellationPolicy(Booking booking, DateTime nowUtc)
    {
        if (booking.Status == BookingStatus.Cancelled)
        {
            return new CancellationEvaluation(false, 0, "Don hang nay da bi huy truoc do.");
        }

        if (booking.Status == BookingStatus.Refunded)
        {
            return new CancellationEvaluation(false, 0, "Don hang nay da duoc hoan tien truoc do.");
        }

        var hasRefund = booking.Payments.Any(payment => payment.Refunds.Any());
        if (hasRefund)
        {
            return new CancellationEvaluation(false, 0, "Don hang nay da co giao dich hoan tien.");
        }

        if (booking.Status == BookingStatus.Pending)
        {
            return new CancellationEvaluation(true, 0, "Booking dang cho thanh toan, he thong se giai phong cho giu.");
        }

        if (booking.Status != BookingStatus.Paid)
        {
            return new CancellationEvaluation(false, 0, "Trang thai hien tai khong ho tro huy booking.");
        }

        var earliestCheckInDate = booking.BookingItems
            .Select(item => item.CheckInDate)
            .DefaultIfEmpty(booking.CreatedAt)
            .Min();

        if (earliestCheckInDate <= nowUtc.AddHours(24))
        {
            return new CancellationEvaluation(false, 0, "Chi duoc huy booking da thanh toan khi check-in con hon 24 gio.");
        }

        var refundAmount = booking.Payments
            .OrderByDescending(payment => payment.PaymentTime)
            .Select(payment => payment.Amount)
            .FirstOrDefault();

        if (refundAmount <= 0)
        {
            refundAmount = booking.TotalAmount;
        }

        return new CancellationEvaluation(
            true,
            refundAmount,
            "Huy truoc 24 gio: hoan 100% gia tri thanh toan."
        );
    }

    private sealed record CancellationEvaluation(bool CanCancel, decimal EstimatedRefundAmount, string PolicyMessage);
}
