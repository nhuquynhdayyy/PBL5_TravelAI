using TravelAI.Application.DTOs.Ticket;

namespace TravelAI.Application.Interfaces;

public interface IElectronicTicketService
{
    Task<IReadOnlyList<ElectronicTicketDto>> GenerateForBookingAsync(int bookingId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ElectronicTicketDto>> GetByUserAsync(int userId, CancellationToken cancellationToken = default);
    Task<ElectronicTicketDto?> GetByCodeAsync(string ticketCode, CancellationToken cancellationToken = default);
    Task<VerifyTicketResponse> VerifyAsync(string qrPayloadJson, int verifierUserId, bool markAsUsed, CancellationToken cancellationToken = default);
}
