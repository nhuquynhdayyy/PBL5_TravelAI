using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
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
    private readonly ApplicationDbContext _context;

    public ElectronicTicketService(ApplicationDbContext context)
    {
        _context = context;
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

            ticket.QrPayloadJson = BuildQrPayloadJson(ticket);
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
        var normalizedCode = ticketCode.Trim();
        var ticket = await _context.ElectronicTickets
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.TicketCode == normalizedCode, cancellationToken);

        return ticket == null ? null : MapToDto(ticket);
    }

    public async Task<VerifyTicketResponse> VerifyAsync(
        string qrPayloadJson,
        int verifierUserId,
        bool markAsUsed,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(qrPayloadJson))
        {
            return new VerifyTicketResponse { IsValid = false, Message = "QR payload is empty." };
        }

        TicketPayload? payload;
        try
        {
            payload = JsonSerializer.Deserialize<TicketPayload>(
                qrPayloadJson,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch (JsonException)
        {
            return new VerifyTicketResponse { IsValid = false, Message = "QR payload is not valid JSON." };
        }

        if (payload == null || string.IsNullOrWhiteSpace(payload.TicketCode))
        {
            return new VerifyTicketResponse { IsValid = false, Message = "QR payload does not contain ticketCode." };
        }

        var ticket = await _context.ElectronicTickets
            .Include(item => item.Service)
            .FirstOrDefaultAsync(item => item.TicketCode == payload.TicketCode, cancellationToken);

        if (ticket == null)
        {
            return new VerifyTicketResponse { IsValid = false, Message = "Ticket does not exist." };
        }

        if (ticket.BookingId != payload.BookingId)
        {
            return new VerifyTicketResponse { IsValid = false, Message = "Ticket payload does not match booking." };
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
            ticket.QrPayloadJson = BuildQrPayloadJson(ticket);
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

    private static string BuildQrPayloadJson(ElectronicTicket ticket)
    {
        var payload = new
        {
            ticketCode = ticket.TicketCode,
            bookingId = ticket.BookingId,
            customerName = ticket.CustomerName,
            serviceName = ticket.ServiceName,
            serviceType = ticket.ServiceType,
            bookingDate = ticket.BookingDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            travelDate = ticket.TravelDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            quantity = ticket.Quantity,
            totalAmount = ticket.TotalAmount,
            status = ticket.Status.ToString()
        };

        return JsonSerializer.Serialize(payload);
    }

    private static string GenerateQrImageBase64(string payloadJson)
    {
        using var generator = new QRCodeGenerator();
        using var qrData = generator.CreateQrCode(payloadJson, QRCodeGenerator.ECCLevel.Q);
        var pngQrCode = new PngByteQRCode(qrData);
        var qrCodeBytes = pngQrCode.GetGraphic(20);
        return Convert.ToBase64String(qrCodeBytes);
    }

    private static ElectronicTicketDto MapToDto(ElectronicTicket ticket)
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

    private sealed class TicketPayload
    {
        public string TicketCode { get; set; } = string.Empty;
        public int BookingId { get; set; }
    }
}
