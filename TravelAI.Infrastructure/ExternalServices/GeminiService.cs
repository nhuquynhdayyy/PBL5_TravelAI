using Microsoft.Extensions.Configuration;
using System.Net.Http.Headers; 
using System.Text;
using System.Text.Json;
using TravelAI.Application.Services.AI; 

namespace TravelAI.Infrastructure.ExternalServices;

public class GeminiService 
{
    private readonly HttpClient _http;
    private readonly string _apiKey;
    private readonly string _apiUrl;

    public GeminiService(HttpClient http, IConfiguration config) 
    {
        _http = http;
        _apiKey = config["Groq:ApiKey"] ?? ""; 
        _apiUrl = config["Groq:ApiUrl"] ?? "https://api.groq.com/openai/v1/chat/completions";
    }
    
    public async Task<string> CallApiAsync(string prompt) 
    {
        bool isDevMode = string.IsNullOrWhiteSpace(_apiKey);
        string jsonMockResponse = @"
        {
            ""tripTitle"": ""Hành trình khám phá Đà Nẵng tuyệt vời"",
            ""destination"": ""Đà Nẵng"",
            ""totalEstimatedCost"": 3500000,
            ""days"": [
                {
                ""day"": 1,
                ""activities"": [
                    {
                    ""title"": ""Đón bình minh tại Biển Mỹ Khê"",
                    ""location"": ""Bãi biển Mỹ Khê"",
                    ""description"": ""Tận hưởng không khí trong lành và đi dạo trên bãi cát trắng mịn."",
                    ""duration"": ""2 giờ"",
                    ""estimatedCost"": 50000
                    },
                    {
                    ""title"": ""Tham quan Ngũ Hành Sơn"",
                    ""location"": ""Ngũ Hành Sơn"",
                    ""description"": ""Khám phá các hang động kỳ bí và chùa Tam Thai cổ kính."",
                    ""duration"": ""3 giờ"",
                    ""estimatedCost"": 150000
                    }
                ]
                },
                {
                ""day"": 2,
                ""activities"": [
                    {
                    ""title"": ""Vui chơi tại Bà Nà Hills"",
                    ""location"": ""Bà Nà Hills"",
                    ""description"": ""Check-in Cầu Vàng nổi tiếng và tham gia các trò chơi cảm giác mạnh."",
                    ""duration"": ""6 giờ"",
                    ""estimatedCost"": 1200000
                    }
                ]
                }
            ]
            }";
        if (isDevMode) {
            return jsonMockResponse;
        }

        var requestBody = new {
            model = "llama-3.3-70b-versatile",
            messages = new object[] { 
                new { role = "system", content = AIPrompts.ItinerarySystemPrompt },
                new { role = "user", content = prompt }
            },
            response_format = new { type = "json_object" }
        };

        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
        
        var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
        
        try 
        {
            var resp = await _http.PostAsync(_apiUrl, content);
            var rawResponse = await resp.Content.ReadAsStringAsync();

            if (!resp.IsSuccessStatusCode)
            {
                return $"{{\"error\": \"Groq API Error: {resp.StatusCode}\", \"details\": {JsonSerializer.Serialize(rawResponse)}}}";
            }

            using var doc = JsonDocument.Parse(rawResponse);
            return doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? "";
        }
        catch (Exception ex)
        {
            return $"{{\"error\": \"Connection Error: {ex.Message}\"}}";
        }
    }
}