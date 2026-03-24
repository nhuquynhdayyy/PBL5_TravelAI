namespace TravelAI.Application.Interfaces;

using TravelAI.Domain.Entities;
using TravelAI.Application.DTOs;

public interface IPreferenceService
{
    Task<UserPreference?> GetByUserIdAsync(int userId);
    Task<bool> UpsertPreferenceAsync(int userId, UserPreferenceDto dto);
}