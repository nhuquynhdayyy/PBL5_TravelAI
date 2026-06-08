using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using QRCoder;
using TravelAI.Application.DTOs.Ticket;
using TravelAI.Application.Helpers;
using TravelAI.Application.Interfaces;
using TravelAI.Domain.Entities;
using TravelAI.Domain.Enums;
using TravelAI.Infrastructure.Persistence;

namespace TravelAI.Infrastructure.Services;

public class ElectronicTicketService : IElectronicTicketService
{
    private const string DefaultFrontendBaseUrl = "https://travelai.vn";
    private const string TicketPathSegment = "/e-ticket/";
    private static readonly Regex TicketCodePattern = new(
        "^TA-\\d{8}-[A-Z0-9]{6}$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private readonly ApplicationDbContext _context;
    private readonly string _frontendBaseUrl;

    public ElectronicTicketService(ApplicationDbContext context, IConfiguration configuration)
    {
        _context = context;
        _frontendBaseUrl = NormalizeFrontendBaseUrl(
            configuration["Ticket:FrontendBaseUrl"]
            ?? configuration["Frontend:BaseUrl"]
            ?? DefaultFrontendBaseUrl);
    }

    public async Task<IReadOnlyList<ElectronicTicketDto>> GenerateForBookingAsync(
        int bookingId,
        CancellationToken cancellationToken = default)
    {
        var booking = await _context.Bookings
            .Include(item => item.User)
            .Include(item => item.BookingItems)
                .ThenInclude(item => item.Service)
            .Include(item => item.ElectronicTickets)
            .FirstOrDefaultAsync(item => item.BookingId == bookingId, cancellationToken);

        if (booking == null || booking.Status != BookingStatus.Paid)
        {
            return Array.Empty<ElectronicTicketDto>();
        }

        var existingItemIds = booking.ElectronicTickets
            .Select(ticket => ticket.BookingItemId)
            .ToHashSet();
        var newTickets = new List<ElectronicTicket>();

        foreach (var bookingItem in booking.BookingItems.OrderBy(item => item.ItemId))
        {
            if (existingItemIds.Contains(bookingItem.ItemId))
            {
                continue;
            }

            var ticket = new ElectronicTicket
            {
                TicketCode = await CreateTicketCodeAsync(cancellationToken),
                BookingId = booking.BookingId,
                BookingItemId = bookingItem.ItemId,
                UserId = booking.UserId,
                ServiceId = bookingItem.ServiceId,
                CustomerName = booking.User.FullName,
                ServiceName = bookingItem.Service.Name,
                ServiceType = bookingItem.Service.ServiceType.ToString(),
                BookingDate = booking.CreatedAt.Date,
                TravelDate = bookingItem.CheckInDate.Date,
                Quantity = bookingItem.Quantity,
                TotalAmount = bookingItem.PriceAtBooking * bookingItem.Quantity,
                Status = TicketStatus.Unused,
                CreatedAt = DateTimeHelper.Now
            };

            ticket.QrPayloadJson = BuildTicketUrl(ticket.TicketCode);
            ticket.QrImageBase64 = GenerateQrImageBase64(ticket.QrPayloadJson);
            newTickets.Add(ticket);
            _context.ElectronicTickets.Add(ticket);
        }

        if (newTickets.Count > 0)
        {
            await _context.SaveChangesAsync(cancellationToken);
        }

        var tickets = booking.ElectronicTickets
            .Concat(newTickets)
            .OrderBy(ticket => ticket.TicketId)
            .ThenBy(ticket => ticket.TicketCode)
            .Select(MapToDto)
            .ToList();

        return tickets;
    }

    public async Task<IReadOnlyList<ElectronicTicketDto>> GetByUserAsync(
        int userId,
        CancellationToken cancellationToken = default)
    {
        var tickets = await _context.ElectronicTickets
            .AsNoTracking()
            .Where(ticket => ticket.UserId == userId)
            .OrderByDescending(ticket => ticket.CreatedAt)
            .ToListAsync(cancellationToken);

        return tickets.Select(MapToDto).ToList();
    }

    public async Task<ElectronicTicketDto?> GetByCodeAsync(
        string ticketCode,
        CancellationToken cancellationToken = default)
    {
        var normalizedCode = NormalizeTicketCode(ticketCode);
        if (normalizedCode == null)
        {
            return null;
        }

        var ticket = await _context.ElectronicTickets
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.TicketCode == normalizedCode, cancellationToken);

        return ticket == null ? null : MapToDto(ticket);
    }

    public async Task<PublicTicketDto?> GetPublicByCodeAsync(
        string ticketCode,
        CancellationToken cancellationToken = default)
    {
        var normalizedCode = NormalizeTicketCode(ticketCode);
        if (normalizedCode == null)
        {
            return null;
        }

        var ticket = await _context.ElectronicTickets
            .AsNoTracking()
            .Include(item => item.User)
            .FirstOrDefaultAsync(item => item.TicketCode == normalizedCode, cancellationToken);

        return ticket == null ? null : MapToPublicDto(ticket);
    }

    public async Task<VerifyTicketResponse> VerifyAsync(
        string qrPayload,
        int verifierUserId,
        bool markAsUsed,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(qrPayload))
        {
            return new VerifyTicketResponse { IsValid = false, Message = "QR payload is empty." };
        }

        var ticketCode = ExtractTicketCode(qrPayload);
        if (string.IsNullOrWhiteSpace(ticketCode))
        {
            return new VerifyTicketResponse { IsValid = false, Message = "QR payload does not contain a valid ticket URL or ticketCode." };
        }

        var ticket = await _context.ElectronicTickets
            .Include(item => item.Service)
            .FirstOrDefaultAsync(item => item.TicketCode == ticketCode, cancellationToken);

        if (ticket == null)
        {
            return new VerifyTicketResponse { IsValid = false, Message = "Ticket does not exist." };
        }

        var verifier = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(user => user.UserId == verifierUserId, cancellationToken);

        if (verifier == null)
        {
            return new VerifyTicketResponse { IsValid = false, Message = "Verifier account does not exist." };
        }

        var isAdmin = verifier.RoleId == (int)RoleName.Admin;
        var isOwningPartner = verifier.RoleId == (int)RoleName.Partner
            && ticket.Service.PartnerId == verifierUserId;

        if (!isAdmin && !isOwningPartner)
        {
            return new VerifyTicketResponse { IsValid = false, Message = "You are not allowed to verify this ticket." };
        }

        if (ticket.Status == TicketStatus.Cancelled)
        {
            return new VerifyTicketResponse { IsValid = false, Message = "Ticket has been cancelled.", Ticket = MapToDto(ticket) };
        }

        if (ticket.Status == TicketStatus.Used)
        {
            return new VerifyTicketResponse { IsValid = false, Message = "Ticket was already used.", Ticket = MapToDto(ticket) };
        }

        if (markAsUsed)
        {
            ticket.Status = TicketStatus.Used;
            ticket.UsedAt = DateTimeHelper.Now;
            ticket.VerifiedByUserId = verifierUserId;
            ticket.QrPayloadJson = BuildTicketUrl(ticket.TicketCode);
            ticket.QrImageBase64 = GenerateQrImageBase64(ticket.QrPayloadJson);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return new VerifyTicketResponse
        {
            IsValid = true,
            Message = markAsUsed ? "Ticket verified and marked as used." : "Ticket is valid.",
            Ticket = MapToDto(ticket)
        };
    }

    private async Task<string> CreateTicketCodeAsync(CancellationToken cancellationToken)
    {
        var today = DateTimeHelper.Now.Date;
        var prefix = $"TA-{today:yyyyMMdd}-";
        var count = await _context.ElectronicTickets
            .CountAsync(ticket => ticket.TicketCode.StartsWith(prefix), cancellationToken);

        for (var sequence = count + 1; sequence < count + 1000; sequence++)
        {
            var code = FormattableString.Invariant($"{prefix}{sequence:000000}");
            var exists = await _context.ElectronicTickets
                .AnyAsync(ticket => ticket.TicketCode == code, cancellationToken);

            if (!exists)
            {
                return code;
            }
        }

        return $"TA-{today:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";
    }

    private string BuildTicketUrl(string ticketCode)
    {
        return $"{_frontendBaseUrl}{TicketPathSegment}{Uri.EscapeDataString(ticketCode)}";
    }

    private static string GenerateQrImageBase64(string qrContent)
    {
        using var generator = new QRCodeGenerator();
        using var qrData = generator.CreateQrCode(qrContent, QRCodeGenerator.ECCLevel.Q);
        var pngQrCode = new PngByteQRCode(qrData);
        var qrCodeBytes = pngQrCode.GetGraphic(20);
        return Convert.ToBase64String(qrCodeBytes);
    }

    private ElectronicTicketDto MapToDto(ElectronicTicket ticket)
    {
        var qrCodeUrl = BuildTicketUrl(ticket.TicketCode);

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
            QrPayloadJson = qrCodeUrl,
            QrCodeUrl = qrCodeUrl,
            QrImageBase64 = GetQrImageBase64(ticket, qrCodeUrl),
            CreatedAt = ticket.CreatedAt,
            UsedAt = ticket.UsedAt
        };
    }

    private PublicTicketDto MapToPublicDto(ElectronicTicket ticket)
    {
        var qrCodeUrl = BuildTicketUrl(ticket.TicketCode);

        return new PublicTicketDto
        {
            TicketCode = ticket.TicketCode,
            BookingId = ticket.BookingId,
            CustomerName = ticket.CustomerName,
            CustomerEmail = ticket.User.Email,
            CustomerPhone = ticket.User.Phone ?? string.Empty,
            ServiceName = ticket.ServiceName,
            Quantity = ticket.Quantity,
            UseDate = ticket.TravelDate,
            Status = ticket.Status.ToString(),
            QrCodeUrl = qrCodeUrl
        };
    }

    private static string GetQrImageBase64(ElectronicTicket ticket, string qrCodeUrl)
    {
        return string.Equals(ticket.QrPayloadJson, qrCodeUrl, StringComparison.OrdinalIgnoreCase)
            && !string.IsNullOrWhiteSpace(ticket.QrImageBase64)
            ? ticket.QrImageBase64
            : GenerateQrImageBase64(qrCodeUrl);
    }

    private static string NormalizeFrontendBaseUrl(string value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? DefaultFrontendBaseUrl
            : value.Trim().TrimEnd('/');
    }

    private static string? NormalizeTicketCode(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var normalized = value.Trim().ToUpperInvariant();
        return TicketCodePattern.IsMatch(normalized) ? normalized : null;
    }

    private static bool IsTicketUrl(string value)
    {
        return Uri.TryCreate(value, UriKind.Absolute, out var uri)
            && uri.Scheme is "http" or "https"
            && uri.AbsolutePath.Contains(TicketPathSegment, StringComparison.OrdinalIgnoreCase);
    }

    private static string ExtractTicketCode(string qrContent)
    {
        var raw = qrContent.Trim();

        if (Uri.TryCreate(raw, UriKind.Absolute, out var uri))
        {
            var index = uri.AbsolutePath.IndexOf(TicketPathSegment, StringComparison.OrdinalIgnoreCase);
            if (index >= 0)
            {
                return NormalizeTicketCode(Uri.UnescapeDataString(uri.AbsolutePath[(index + TicketPathSegment.Length)..]).Trim('/'))
                    ?? string.Empty;
            }
        }

        try
        {
            var payload = JsonSerializer.Deserialize<TicketPayload>(
                raw,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (!string.IsNullOrWhiteSpace(payload?.TicketCode))
            {
                return NormalizeTicketCode(payload.TicketCode) ?? string.Empty;
            }
        }
        catch (JsonException)
        {
            // New production QR codes are URLs. JSON parsing is kept only for older tickets.
        }

        return NormalizeTicketCode(raw) ?? string.Empty;
    }

    private sealed class TicketPayload
    {
        public string TicketCode { get; set; } = string.Empty;
    }
}
