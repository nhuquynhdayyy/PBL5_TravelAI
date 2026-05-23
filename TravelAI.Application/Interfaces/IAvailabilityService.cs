using TravelAI.Application.DTOs.Availability;

namespace TravelAI.Application.Interfaces;

public interface IAvailabilityService
{
    Task<IEnumerable<ServiceAvailabilityDto>> GetAvailabilityAsync(int serviceId, DateTime startDate, DateTime endDate);
    Task<IEnumerable<DateTime>> GetAvailableDatesAsync(int serviceId);
    Task<bool> SetAvailabilityAsync(int serviceId, DateTime date, decimal price, int stock);
    Task<bool> CheckStockAsync(int serviceId, DateTime date, int requestedQuantity);
}
