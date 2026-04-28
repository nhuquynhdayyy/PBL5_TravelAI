using Microsoft.Extensions.Configuration;
using System.Net;
using System.Net.Http.Headers; 
using System.Text;
using System.Text.Json;
using TravelAI.Application.DTOs.Chat;
using TravelAI.Application.Services.AI;

namespace TravelAI.Infrastructure.ExternalServices;

public class GeminiService 
{
    private readonly HttpClient _http;
    private readonly string _apiKey;
    private readonly string _apiUrl;
    private readonly string _model;

    public GeminiService(HttpClient http, IConfiguration config) 
    {
        _http = http;
        _apiKey = config["Groq:ApiKey"] ?? ""; 
        _apiUrl = config["Groq:ApiUrl"] ?? "https://api.groq.com/openai/v1/chat/completions";
        _model = config["Groq:Model"] ?? "llama-3.3-70b-versatile";
    }
    
    public async Task<string> CallApiAsync(
        string prompt,
        List<ChatMessage>? history = null,
        string? systemPrompt = null,
        bool requireJsonResponse = false) 
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
        if (isDevMode)
        {
            if (requireJsonResponse && string.Equals(systemPrompt, AIPrompts.IntentClassifierSystemPrompt, StringComparison.Ordinal))
            {
                return """
                {
                  "intent": "general_question",
                  "destination": null,
                  "days": null,
                  "budget": null
                }
                """;
            }

            return requireJsonResponse
                ? jsonMockResponse
                : "TravelAI dev mode: please configure Groq:ApiKey to enable chat responses.";
        }

        var messages = BuildMessages(prompt, history, systemPrompt);
        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);

        try
        {
            var result = await SendGroqRequestAsync(messages, requireJsonResponse);
            if (!result.Success && requireJsonResponse)
            {
                result = await SendGroqRequestAsync(messages, requireJsonResponse: false);
            }

            return result.Success
                ? result.Content
                : SerializeError(result.StatusCode, result.RawResponse);
        }
        catch (Exception ex)
        {
            return $"{{\"error\": \"Connection Error: {ex.Message}\"}}";
        }
    }

    public static bool TryExtractErrorMessage(string? rawResponse, out string errorMessage)
    {
        errorMessage = string.Empty;

        if (string.IsNullOrWhiteSpace(rawResponse))
        {
            return false;
        }

        try
        {
            using var document = JsonDocument.Parse(rawResponse);
            var root = document.RootElement;

            if (!root.TryGetProperty("error", out var error))
            {
                return false;
            }

            var details = root.TryGetProperty("details", out var detailElement)
                ? detailElement.GetString()
                : null;

            errorMessage = string.IsNullOrWhiteSpace(details)
                ? error.GetString() ?? "Unknown AI error"
                : $"{error.GetString()}: {details}";

            return true;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private async Task<GroqCallResult> SendGroqRequestAsync(List<object> messages, bool requireJsonResponse)
    {
        var requestBody = new Dictionary<string, object?>
        {
            ["model"] = _model,
            ["messages"] = messages
        };

        if (requireJsonResponse)
        {
            requestBody["response_format"] = new { type = "json_object" };
        }

        using var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
        using var response = await _http.PostAsync(_apiUrl, content);
        var rawResponse = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            return new GroqCallResult(false, string.Empty, response.StatusCode, rawResponse);
        }

        using var document = JsonDocument.Parse(rawResponse);
        var completion = document.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? string.Empty;

        return new GroqCallResult(true, completion, response.StatusCode, rawResponse);
    }

    private static string SerializeError(HttpStatusCode statusCode, string rawResponse)
    {
        var responseBody = JsonSerializer.Serialize(rawResponse);
        return $$"""
        {"error":"Groq API Error: {{statusCode}}","details":{{responseBody}}}
        """;
    }

    private static List<object> BuildMessages(
        string prompt,
        IEnumerable<ChatMessage>? history,
        string? systemPrompt)
    {
        var messages = new List<object>();

        if (!string.IsNullOrWhiteSpace(systemPrompt))
        {
            messages.Add(new { role = "system", content = systemPrompt });
        }

        if (history != null)
        {
            foreach (var item in history)
            {
                if (string.IsNullOrWhiteSpace(item.Content))
                {
                    continue;
                }

                messages.Add(new
                {
                    role = NormalizeRole(item.Role),
                    content = item.Content.Trim()
                });
            }
        }

        messages.Add(new { role = "user", content = prompt.Trim() });
        return messages;
    }

    private static string NormalizeRole(string? role)
    {
        return role?.Trim().ToLowerInvariant() switch
        {
            "assistant" => "assistant",
            _ => "user"
        };
    }

    private sealed record GroqCallResult(
        bool Success,
        string Content,
        HttpStatusCode StatusCode,
        string RawResponse);
}
