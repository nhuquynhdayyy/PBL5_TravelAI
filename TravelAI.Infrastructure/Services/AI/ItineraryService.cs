using Microsoft.EntityFrameworkCore;
using TravelAI.Application.DTOs.AI;
using TravelAI.Application.Interfaces;
using TravelAI.Application.Services.AI;
using TravelAI.Infrastructure.Persistence;
using TravelAI.Infrastructure.ExternalServices;
using TravelAI.Domain.Entities;

namespace TravelAI.Infrastructure.Services.AI;

public class ItineraryService : IItineraryService 
{
    private readonly ApplicationDbContext _db;
    private readonly GeminiService _gemini;
    private readonly AIParserService _parser;

    public ItineraryService(ApplicationDbContext db, GeminiService gemini, AIParserService parser) 
    {
        _db = db; 
        _gemini = gemini; 
        _parser = parser;
    }

    public async Task<ItineraryResponseDto?> GenerateAndLogItineraryAsync(int userId, GenerateItineraryRequest request)
    {
        var pref = await _db.UserPreferences.FirstOrDefaultAsync(u => u.UserId == userId)
                ?? new UserPreference { TravelStyle = "Khám phá", BudgetLevel = Domain.Enums.BudgetLevel.Medium };

        var dest = await _db.Destinations.FindAsync(request.DestinationId);
        if (dest == null) return null;

        var spots = await _db.TouristSpots
            .Include(s => s.Services) 
            .Where(s => s.DestinationId == request.DestinationId)
            .ToListAsync();

        var prompt = new PromptBuilder().Build(pref, dest, spots, request.NumberOfDays);
        
        var rawAiResponse = await _gemini.CallApiAsync(prompt);

        _db.AISuggestionLogs.Add(new AISuggestionLog {
            UserId = userId, UserPrompt = prompt, AiResponseJson = rawAiResponse, CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        string cleanedJson = rawAiResponse;
        if (rawAiResponse.Contains("```json"))
        {
            cleanedJson = rawAiResponse.Split("```json")[1].Split("```")[0].Trim();
        }
        else if (rawAiResponse.Contains("```"))
        {
            cleanedJson = rawAiResponse.Split("```")[1].Split("```")[0].Trim();
        }

        return _parser.Parse(cleanedJson);
    }

    private string CleanAiResponse(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "{}";
        if (raw.Contains("```json"))
        {
            return raw.Split("```json")[1].Split("```")[0].Trim();
        }
        if (raw.Contains("```"))
        {
            return raw.Split("```")[1].Split("```")[0].Trim();
        }
        return raw.Trim();
    }
}