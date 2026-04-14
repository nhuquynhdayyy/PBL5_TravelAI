using TravelAI.Application.DTOs.AI;
namespace TravelAI.Application.Interfaces;
public interface IItineraryService {
    Task<ItineraryResponseDto?> GenerateAndLogItineraryAsync(int userId, GenerateItineraryRequest request);
    Task<int> SaveItineraryAsync(int userId, ItineraryResponseDto dto);
    Task<IEnumerable<ItineraryResponseDto>> GetMyTripsAsync(int userId);
}