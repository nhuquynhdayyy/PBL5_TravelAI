using FluentAssertions;
using TravelAI.Application.Services.Scoring;
using Xunit;

namespace TravelAI.Tests.Services;

/// <summary>
/// Unit Tests cho SpotScoreMath - Kiểm tra các hàm toán học hỗ trợ
/// Minh chứng áp dụng kiến thức Lập trình hướng đối tượng và Công nghệ phần mềm
/// </summary>
public class SpotScoreMathTests
{
    [Theory]
    [InlineData(0.5, 0.5)]
    [InlineData(-0.5, 0.0)]
    [InlineData(1.5, 1.0)]
    [InlineData(0.0, 0.0)]
    [InlineData(1.0, 1.0)]
    public void Clamp_ShouldReturnValueBetweenZeroAndOne(double input, double expected)
    {
        // Act
        var result = SpotScoreMath.Clamp(input);

        // Assert
        result.Should().Be(expected);
    }

    [Fact]
    public void NormalizeText_ShouldRemoveVietnameseAccents()
    {
        // Arrange
        var input = "Đà Nẵng - Thành phố đáng sống";

        // Act
        var result = SpotScoreMath.NormalizeText(input);

        // Assert
        result.Should().NotContain("ă");
        result.Should().NotContain("ằ");
        result.Should().Contain("da nang");
    }

    [Fact]
    public void NormalizeText_WithNullOrEmpty_ShouldReturnEmptyString()
    {
        // Act
        var resultNull = SpotScoreMath.NormalizeText(null);
        var resultEmpty = SpotScoreMath.NormalizeText("");
        var resultWhitespace = SpotScoreMath.NormalizeText("   ");

        // Assert
        resultNull.Should().BeEmpty();
        resultEmpty.Should().BeEmpty();
        resultWhitespace.Should().BeEmpty();
    }

    [Fact]
    public void CalculateHaversineDistance_BetweenDaNangAndHoiAn_ShouldReturnApproximately30Km()
    {
        // Arrange: Tọa độ Đà Nẵng và Hội An
        double daNangLat = 16.0544;
        double daNangLon = 108.2022;
        double hoiAnLat = 15.8801;
        double hoiAnLon = 108.3380;

        // Act
        var distance = SpotScoreMath.CalculateHaversineDistance(
            daNangLat, daNangLon,
            hoiAnLat, hoiAnLon
        );

        // Assert: Khoảng cách thực tế khoảng 25-30km
        distance.Should().BeInRange(20, 35, "Khoảng cách Đà Nẵng - Hội An khoảng 25-30km");
    }

    [Fact]
    public void CalculateHaversineDistance_SameLocation_ShouldReturnZero()
    {
        // Arrange
        double lat = 16.0544;
        double lon = 108.2022;

        // Act
        var distance = SpotScoreMath.CalculateHaversineDistance(lat, lon, lat, lon);

        // Assert
        distance.Should().Be(0);
    }

    [Fact]
    public void CalculateHaversineDistance_BetweenHanoiAndHCM_ShouldReturnApproximately1200Km()
    {
        // Arrange: Tọa độ Hà Nội và TP.HCM
        double hanoiLat = 21.0285;
        double hanoiLon = 105.8542;
        double hcmLat = 10.8231;
        double hcmLon = 106.6297;

        // Act
        var distance = SpotScoreMath.CalculateHaversineDistance(
            hanoiLat, hanoiLon,
            hcmLat, hcmLon
        );

        // Assert: Khoảng cách thực tế khoảng 1150-1200km
        distance.Should().BeInRange(1100, 1250, "Khoảng cách Hà Nội - TP.HCM khoảng 1150-1200km");
    }
}
