using System.Text.Json;
using System.Text.Json.Serialization;
using TravelAI.Application.DTOs.AI;

namespace TravelAI.Application.Services.AI;

public class AIParserService 
{
    public ItineraryResponseDto? ParseAndValidate(string rawJson) 
    {
        if (string.IsNullOrWhiteSpace(rawJson)) return null;

        try 
        {
            // 1. CLEANING: Loại bỏ các ký tự thừa của Markdown (```json ... ```)
            string cleanedJson = CleanMarkdown(rawJson);

            // 2. CONFIG: Thiết lập bộ đọc JSON "dễ tính"
            var options = new JsonSerializerOptions 
            { 
                // Chấp nhận cả TripTitle và tripTitle
                PropertyNameCaseInsensitive = true,
                // Cho phép đọc số từ chuỗi (AI hay trả về "500000" thay vì 500000)
                NumberHandling = JsonNumberHandling.AllowReadingFromString,
                // Bỏ qua các dấu phẩy dư thừa ở cuối mảng (nếu có)
                AllowTrailingCommas = true
            };

            // 3. PARSING: Chuyển chuỗi sang Object C#
            var result = JsonSerializer.Deserialize<ItineraryResponseDto>(cleanedJson, options);

            // 4. VALIDATION: Kiểm tra xem dữ liệu có "ruột" không
            if (result == null || result.Days == null || result.Days.Count == 0)
            {
                Console.WriteLine("--> [ERROR] AI trả về JSON rỗng hoặc thiếu danh sách ngày.");
                return null;
            }

            Console.WriteLine($"--> [SUCCESS] Đã bóc tách thành công lịch trình: {result.TripTitle}");
            return result;
        } 
        catch (JsonException ex) 
        { 
            // Nếu AI trả về JSON lỗi cú pháp (thiếu ngoặc, sai dấu phẩy)
            Console.WriteLine("--> [CRITICAL] Lỗi cú pháp JSON từ AI: " + ex.Message);
            return null; 
        }
    }

    /// <summary>
    /// Hàm cắt bỏ phần text thừa và ký hiệu Markdown bao quanh JSON
    /// </summary>
    private string CleanMarkdown(string raw)
    {
        string result = raw.Trim();

        // Xử lý dấu nháy Markdown ```json ... ```
        if (result.Contains("```json"))
        {
            var startIndex = result.IndexOf("```json") + 7;
            var endIndex = result.LastIndexOf("```");
            if (endIndex > startIndex)
            {
                result = result.Substring(startIndex, endIndex - startIndex);
            }
        }
        else if (result.Contains("```")) // Trường hợp AI chỉ bọc ``` mà không có chữ json
        {
            var startIndex = result.IndexOf("```") + 3;
            var endIndex = result.LastIndexOf("```");
            if (endIndex > startIndex)
            {
                result = result.Substring(startIndex, endIndex - startIndex);
            }
        }

        // Tìm vị trí dấu { đầu tiên và } cuối cùng để chắc chắn chỉ lấy JSON
        var firstBrace = result.IndexOf('{');
        var lastBrace = result.LastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace)
        {
            result = result.Substring(firstBrace, lastBrace - firstBrace + 1);
        }

        return result.Trim();
    }
}