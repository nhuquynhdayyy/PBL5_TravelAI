using Microsoft.Extensions.Configuration;
using System.Text;
using System.Text.Json;
using TravelAI.Application.Services.AI;

namespace TravelAI.Infrastructure.ExternalServices;

public class GeminiService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly string _apiUrl;

    public GeminiService(HttpClient httpClient, IConfiguration config)
    {
        _httpClient = httpClient;
        _apiKey = config["Gemini:ApiKey"] ?? throw new Exception("Thiếu API Key Gemini");
        _apiUrl = config["Gemini:ApiUrl"] ?? throw new Exception("Thiếu API URL Gemini");
    }

    public async Task<string> GenerateItineraryRawAsync(string userPrompt)
    {
        // --- CHẾ ĐỘ PHÁT TRIỂN (MOCK MODE) ---
        // Bật true: Trả về data giả lập ngay lập tức (Tiết kiệm Quota, không cần mạng)
        // Bật false: Gọi trực tiếp đến Google Gemini API
        // bool isDevMode = true; 

        // if (isDevMode)
        // {
        //     // Dấu mở đầu nằm riêng, KHÔNG có dấu ; ở đây
        //     return """
        //     {
        //       "candidates": [
        //         {
        //           "content": {
        //             "parts": [
        //               {
        //                 "text": "{\"trip_title\": \"Hành trình trải nghiệm Đà Nẵng thư giãn 2 ngày\", \"destination\": \"Đà Nẵng\", \"total_estimated_cost\": 3000000, \"currency\": \"VND\", \"days\": [ { \"day\": 1, \"daily_cost\": 1500000, \"activities\": { \"morning\": [ { \"title\": \"Tắm biển Mỹ Khê\", \"location\": \"Bãi biển Mỹ Khê\", \"description\": \"Bắt đầu ngày mới nhẹ nhàng với việc tắm biển, đi dạo và tận hưởng không khí trong lành.\", \"duration\": \"2-3 giờ\", \"estimated_cost\": 50000 }, { \"title\": \"Ăn sáng đặc sản địa phương\", \"location\": \"Quán bún chả cá gần biển\", \"description\": \"Thưởng thức bún chả cá hoặc mì Quảng\", \"duration\": \"1 giờ\", \"estimated_cost\": 50000 } ], \"afternoon\": [ { \"title\": \"Tham quan Bán đảo Sơn Trà\", \"location\": \"Chùa Linh Ứng\", \"description\": \"Khám phá thiên nhiên, viếng chùa Linh Ứng.\", \"duration\": \"3 giờ\", \"estimated_cost\": 150000 } ], \"evening\": [ { \"title\": \"Dạo cầu Rồng\", \"location\": \"Cầu Rồng\", \"description\": \"Tản bộ ngắm cảnh thành phố về đêm.\", \"duration\": \"2 giờ\", \"estimated_cost\": 50000 } ] } } ] }"
        //               }
        //             ]
        //           }
        //         }
        //       ]
        //     }
        //     """; // Dấu đóng nằm riêng một dòng, sau đó mới đến dấu ;
        // }

        // --- CHẾ ĐỘ CHẠY THẬT (GỌI GOOGLE API) ---
        var fullPrompt = $"{AIPrompts.ItinerarySystemPrompt}\n\n Yêu cầu khách hàng: {userPrompt}";

        var requestBody = new
        {
            contents = new[]
            {
                new { parts = new[] { new { text = fullPrompt } } }
            }
        };

        var jsonPayload = JsonSerializer.Serialize(requestBody);
        var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

        try
        {
            var response = await _httpClient.PostAsync($"{_apiUrl}?key={_apiKey}", content);
            var rawResponse = await response.Content.ReadAsStringAsync();

            Console.WriteLine("======= GEMINI RAW RESPONSE =======");
            Console.WriteLine(rawResponse);
            Console.WriteLine("===================================");

            return rawResponse;
        }
        catch (Exception ex)
        {
            return $"{{\"error\": \"Lỗi kết nối API: {ex.Message}\"}}";
        }
    }
}