using System.Text.Json;
using TravelAI.Application.DTOs.AI;

namespace TravelAI.Application.Services.AI;

public class AIParserService
{
    public ItineraryResponseDto? ParseAndValidateItinerary(string rawJsonFromAI)
    {
        if (string.IsNullOrWhiteSpace(rawJsonFromAI)) return null;

        try
        {
            // Cấu hình để không phân biệt chữ hoa chữ thường nếu AI trả về nhầm
            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };

            // THỰC HIỆN VALIDATE: Thử chuyển String thành Object
            var result = JsonSerializer.Deserialize<ItineraryResponseDto>(rawJsonFromAI, options);

            // Nếu code chạy đến đây mà result không null tức là JSON chuẩn 100%
            return result;
        }
        catch (JsonException ex)
        {
            // Nếu AI trả về sai format (thiếu dấu phẩy, sai ngoặc...), nó sẽ nhảy vào đây
            Console.WriteLine($"Lỗi format AI: {ex.Message}");
            return null; // Hoặc bạn có thể throw lỗi tùy ý
        }
    }
}