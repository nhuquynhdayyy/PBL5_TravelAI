using System.Text.Json;
using System.Text.Json.Serialization;
using TravelAI.Application.DTOs.AI;
namespace TravelAI.Application.Services.AI;

public class AIParserService {
    public ItineraryResponseDto? Parse(string rawJson) {
        try {
            var cleanJson = rawJson.Replace("```json", "").Replace("```", "").Trim();
            
            var options = new JsonSerializerOptions { 
                PropertyNameCaseInsensitive = true, 
                
                PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
                
                NumberHandling = JsonNumberHandling.AllowReadingFromString 
            };

            var result = JsonSerializer.Deserialize<ItineraryResponseDto>(cleanJson, options);
            
            Console.WriteLine("--> PARSE THÀNH CÔNG: " + (result?.TripTitle ?? "Không có tiêu đề"));
            
            return result;
        } catch (Exception ex) { 
            Console.WriteLine("--> LỖI PARSE: " + ex.Message);
            return null; 
        }
    }
}