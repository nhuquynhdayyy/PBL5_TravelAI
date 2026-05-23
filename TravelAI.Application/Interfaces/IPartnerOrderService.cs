namespace TravelAI.Application.Interfaces;

public interface IPartnerOrderService
{
    Task<bool> ApproveOrderAsync(int bookingId, int partnerId);
    Task<bool> RejectOrderAsync(int bookingId, int partnerId, string reason);
}
