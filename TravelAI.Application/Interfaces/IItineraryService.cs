using TravelAI.Application.DTOs.AI;

namespace TravelAI.Application.Interfaces;

public interface IItineraryService
{
    Task<ItineraryResponseDto?> GenerateAndLogItineraryAsync(int userId, GenerateItineraryRequest request);
}