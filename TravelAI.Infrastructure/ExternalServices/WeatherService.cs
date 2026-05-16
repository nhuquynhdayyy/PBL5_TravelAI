using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Configuration;

namespace TravelAI.Infrastructure.ExternalServices;

public class WeatherService
{
    private const string DefaultApiKey = "bca837d361353ebad4c7131e60784d30";
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;

    public WeatherService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _apiKey = configuration["OpenWeather:ApiKey"] ?? DefaultApiKey;
    }

    public async Task<WeatherInfo?> GetWeatherAsync(double latitude, double longitude, CancellationToken cancellationToken = default)
    {
        if (latitude == 0 && longitude == 0)
        {
            return null;
        }

        var url = string.Create(
            CultureInfo.InvariantCulture,
            $"https://api.openweathermap.org/data/2.5/weather?lat={latitude}&lon={longitude}&appid={_apiKey}&units=metric&lang=vi");

        try
        {
            using var response = await _httpClient.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            var root = document.RootElement;

            var temperature = root.TryGetProperty("main", out var main)
                && main.TryGetProperty("temp", out var temp)
                && temp.TryGetDouble(out var parsedTemp)
                    ? parsedTemp
                    : 0;

            var status = string.Empty;
            var description = string.Empty;
            if (root.TryGetProperty("weather", out var weather)
                && weather.ValueKind == JsonValueKind.Array
                && weather.GetArrayLength() > 0)
            {
                var first = weather[0];
                status = first.TryGetProperty("main", out var mainStatus)
                    ? mainStatus.GetString() ?? string.Empty
                    : string.Empty;
                description = first.TryGetProperty("description", out var desc)
                    ? desc.GetString() ?? string.Empty
                    : string.Empty;
            }

            return new WeatherInfo(temperature, status, description);
        }
        catch (HttpRequestException)
        {
            return null;
        }
        catch (JsonException)
        {
            return null;
        }
        catch (TaskCanceledException)
        {
            return null;
        }
    }
}

public sealed record WeatherInfo(double TemperatureCelsius, string Status, string Description);
