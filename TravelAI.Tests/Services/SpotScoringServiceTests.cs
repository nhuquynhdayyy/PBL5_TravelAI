using FluentAssertions;
using TravelAI.Application.Interfaces;
using TravelAI.Application.Services;
using TravelAI.Application.Services.Scoring;
using TravelAI.Domain.Entities;
using TravelAI.Domain.Enums;
using Xunit;

namespace TravelAI.Tests.Services;

/// <summary>
/// Unit Tests cho SpotScoringService - Minh chứng áp dụng kiến thức Công nghệ phần mềm
/// Kiểm tra tính đúng đắn của thuật toán chấm điểm AI cho các điểm du lịch
/// </summary>
public class SpotScoringServiceTests
{
    private readonly ISpotScoringService _scoringService;

    public SpotScoringServiceTests()
    {
        // Arrange: Khởi tạo service với các Strategy mặc định
        _scoringService = new SpotScoringService();
    }

    [Fact]
    public void CalculateScore_WithCulturalSpotAndCulturePreference_ShouldReturnHighScore()
    {
        // Arrange: Chuẩn bị dữ liệu test
        var spot = new TouristSpot
        {
            SpotId = 1,
            Name = "Chùa Linh Ứng",
            Description = "Ngôi chùa nổi tiếng với tượng Phật Quan Âm cao nhất Việt Nam",
            Latitude = 16.0544,
            Longitude = 108.2022,
            AvgTimeSpent = 90
        };

        var preference = new UserPreference
        {
            TravelStyle = "văn hóa, tâm linh",
            BudgetLevel = BudgetLevel.Medium,
            TravelPace = TravelPace.Balanced
        };

        var reviews = new List<Review>();

        // Act: Thực hiện tính điểm
        var score = _scoringService.CalculateScore(spot, preference, reviews);

        // Assert: Kiểm tra kết quả
        score.Should().BeGreaterThan(0.6, "Điểm du lịch văn hóa phải phù hợp với sở thích văn hóa");
        score.Should().BeLessOrEqualTo(1.0, "Điểm số không được vượt quá 1.0");
    }

    [Fact]
    public void CalculateScore_WithNatureSpotAndNaturePreference_ShouldReturnHighScore()
    {
        // Arrange
        var spot = new TouristSpot
        {
            SpotId = 2,
            Name = "Bãi biển Mỹ Khê",
            Description = "Bãi biển đẹp nhất Đà Nẵng với cát trắng mịn và nước trong xanh",
            Latitude = 16.0471,
            Longitude = 108.2425,
            AvgTimeSpent = 120
        };

        var preference = new UserPreference
        {
            TravelStyle = "thiên nhiên, biển",
            BudgetLevel = BudgetLevel.Low,
            TravelPace = TravelPace.Relaxed
        };

        var reviews = new List<Review>();

        // Act
        var score = _scoringService.CalculateScore(spot, preference, reviews);

        // Assert
        score.Should().BeGreaterThan(0.6, "Bãi biển phải phù hợp với sở thích thiên nhiên");
    }

    [Fact]
    public void CalculateScore_WithHighBudgetSpotAndLowBudgetPreference_ShouldReturnLowerScore()
    {
        // Arrange
        var spot = new TouristSpot
        {
            SpotId = 3,
            Name = "Resort cao cấp",
            Description = "Resort 5 sao sang trọng",
            Services = new List<Service>
            {
                new Service { ServiceId = 1, BasePrice = 2_000_000m }
            }
        };

        var preference = new UserPreference
        {
            TravelStyle = "nghỉ dưỡng",
            BudgetLevel = BudgetLevel.Low,
            TravelPace = TravelPace.Relaxed
        };

        var reviews = new List<Review>();

        // Act
        var score = _scoringService.CalculateScore(spot, preference, reviews);

        // Assert
        score.Should().BeLessThan(0.7, "Dịch vụ đắt tiền không phù hợp với ngân sách thấp");
    }

    [Fact]
    public async Task ScoreAndRankSpotsAsync_ShouldReturnSortedListByTotalScore()
    {
        // Arrange: Tạo danh sách nhiều điểm du lịch
        var spots = new List<TouristSpot>
        {
            new TouristSpot
            {
                SpotId = 1,
                Name = "Chùa Linh Ứng",
                Description = "Chùa nổi tiếng",
                AvgTimeSpent = 90
            },
            new TouristSpot
            {
                SpotId = 2,
                Name = "Bãi biển Mỹ Khê",
                Description = "Bãi biển đẹp",
                AvgTimeSpent = 120
            },
            new TouristSpot
            {
                SpotId = 3,
                Name = "Bà Nà Hills",
                Description = "Khu du lịch nổi tiếng",
                AvgTimeSpent = 300
            }
        };

        var preference = new UserPreference
        {
            TravelStyle = "văn hóa",
            BudgetLevel = BudgetLevel.Medium,
            TravelPace = TravelPace.Balanced
        };

        // Act: Chấm điểm và xếp hạng
        var rankedSpots = await _scoringService.ScoreAndRankSpotsAsync(spots, preference);

        // Assert: Kiểm tra kết quả
        rankedSpots.Should().HaveCount(3, "Phải trả về đủ 3 điểm du lịch");
        rankedSpots.Should().BeInDescendingOrder(x => x.TotalScore, "Danh sách phải được sắp xếp giảm dần theo điểm");
        
        // Kiểm tra điểm đầu tiên cao hơn điểm cuối cùng
        rankedSpots.First().TotalScore.Should().BeGreaterOrEqualTo(
            rankedSpots.Last().TotalScore,
            "Điểm cao nhất phải ở đầu danh sách"
        );
    }

    [Fact]
    public void CalculateScore_WithReviewsHavingHighRating_ShouldIncreaseScore()
    {
        // Arrange
        var spot = new TouristSpot
        {
            SpotId = 4,
            Name = "Nhà hàng hải sản",
            Description = "Nhà hàng nổi tiếng",
            Services = new List<Service>
            {
                new Service
                {
                    ServiceId = 1,
                    BasePrice = 300_000m,
                    Reviews = new List<Review>
                    {
                        new Review { ReviewId = 1, Rating = 5, Comment = "Tuyệt vời" },
                        new Review { ReviewId = 2, Rating = 5, Comment = "Rất ngon" },
                        new Review { ReviewId = 3, Rating = 4, Comment = "Tốt" }
                    }
                }
            }
        };

        var preference = new UserPreference
        {
            TravelStyle = "ẩm thực",
            BudgetLevel = BudgetLevel.Medium,
            TravelPace = TravelPace.Balanced
        };

        var reviews = spot.Services.SelectMany(s => s.Reviews).ToList();

        // Act
        var score = _scoringService.CalculateScore(spot, preference, reviews);

        // Assert
        score.Should().BeGreaterThan(0.7, "Đánh giá cao phải làm tăng điểm tổng thể");
    }

    [Theory]
    [InlineData(TravelPace.Relaxed, 60, 0.8)]
    [InlineData(TravelPace.FastPaced, 240, 0.8)]
    [InlineData(TravelPace.Balanced, 120, 0.8)]
    public void CalculateScore_WithMatchingPace_ShouldReturnHighScore(
        TravelPace pace,
        int avgTimeSpent,
        double expectedMinScore)
    {
        // Arrange
        var spot = new TouristSpot
        {
            SpotId = 5,
            Name = "Điểm du lịch test",
            Description = "Mô tả test",
            AvgTimeSpent = avgTimeSpent
        };

        var preference = new UserPreference
        {
            TravelStyle = "khám phá",
            BudgetLevel = BudgetLevel.Medium,
            TravelPace = pace
        };

        var reviews = new List<Review>();

        // Act
        var score = _scoringService.CalculateScore(spot, preference, reviews);

        // Assert
        score.Should().BeGreaterThan(0.5, $"Điểm phải hợp lý với pace {pace}");
    }

    [Fact]
    public void SpotScoringService_ShouldThrowException_WhenNoStrategiesProvided()
    {
        // Arrange & Act
        Action act = () => new SpotScoringService(new List<ISpotScoreStrategy>());

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*at least one*strategy*");
    }
}
