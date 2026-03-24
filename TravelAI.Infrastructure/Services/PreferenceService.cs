namespace TravelAI.Infrastructure.Services; 

using Microsoft.EntityFrameworkCore;
using TravelAI.Application.Interfaces;
using TravelAI.Application.DTOs;
using TravelAI.Domain.Entities;
using TravelAI.Domain.Enums;
using TravelAI.Infrastructure.Persistence; 

public class PreferenceService : IPreferenceService
{
    private readonly ApplicationDbContext _context;
    public PreferenceService(ApplicationDbContext context) => _context = context;

    public async Task<UserPreference?> GetByUserIdAsync(int userId)
    {
        return await _context.UserPreferences.FirstOrDefaultAsync(p => p.UserId == userId);
    }

    public async Task<bool> UpsertPreferenceAsync(int userId, UserPreferenceDto dto)
    {
        var pref = await _context.UserPreferences.FirstOrDefaultAsync(p => p.UserId == userId);
        
        if (pref == null) {
            pref = new UserPreference { UserId = userId };
            await _context.UserPreferences.AddAsync(pref);
        }

        pref.TravelStyle = dto.TravelStyle;
        pref.BudgetLevel = (BudgetLevel)dto.BudgetLevel;
        pref.TravelPace = (TravelPace)dto.TravelPace;
        pref.CuisinePref = dto.CuisinePref;

        return await _context.SaveChangesAsync() > 0;
    }
}