using System.Text.Json;
using System.Text.Json.Serialization;
using TravelAI.Application.DTOs.AI;

namespace TravelAI.Application.Services.AI;

public class AIParserService 
{
    public ItineraryResponseDto? ParseAndValidate(string rawJson) 
    {
        try 
        {
            // --- PHẦN 1: CLEANING (Bóc tách JSON từ đống rác text) ---
            string cleanedJson = rawJson;
            if (rawJson.Contains("```json"))
                cleanedJson = rawJson.Split("```json")[1].Split("```")[0].Trim();
            else if (rawJson.Contains("```"))
                cleanedJson = rawJson.Split("```")[1].Split("```")[0].Trim();

            // --- PHẦN 2: PARSING (Chuyển sang Object) ---
            var options = new JsonSerializerOptions { 
                PropertyNameCaseInsensitive = true,
                NumberHandling = JsonNumberHandling.AllowReadingFromString
            };

            var result = JsonSerializer.Deserialize<ItineraryResponseDto>(cleanedJson, options);

            // --- PHẦN 3: VALIDATION (Kiểm tra chất lượng dữ liệu) ---
            if (result == null || string.IsNullOrEmpty(result.TripTitle) || result.Days.Count == 0)
            {
                Console.WriteLine("--> VALIDATION FAILED: AI trả về JSON đúng format nhưng nội dung rỗng/thiếu.");
                return null;
            }

            Console.WriteLine($"--> VALIDATION SUCCESS: Đã nhận lịch trình '{result.TripTitle}'");
            return result;
        } 
        catch (Exception ex) 
        { 
            Console.WriteLine("--> CRITICAL ERROR: AI trả về format không phải JSON. Lỗi: " + ex.Message);
            return null; 
        }
    }
}