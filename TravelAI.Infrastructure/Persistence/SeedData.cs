using Microsoft.EntityFrameworkCore;
using TravelAI.Domain.Entities;

namespace TravelAI.Infrastructure.Persistence;

public static class SeedData
{
    public static async Task InitializeAsync(ApplicationDbContext context)
    {
        // 1. Kiểm tra nếu đã có dữ liệu thì không seed nữa (Idempotency)
        if (await context.Destinations.AnyAsync())
        {
            return; 
        }

        // 2. Tạo danh sách dữ liệu mẫu
        var destinations = new List<Destination>
        {
            new Destination
            {
                Name = "Đà Nẵng",
                Description = "Thành phố đáng sống nhất Việt Nam với bãi biển Mỹ Khê và Cầu Rồng.",
                ImageUrl = "https://images.unsplash.com/photo-1559592442-9e54238a2e07?q=80&w=1000",
                TouristSpots = new List<TouristSpot>
                {
                    new TouristSpot { Name = "Cầu Vàng (Bà Nà Hills)", Description = "Biểu tượng du lịch nằm giữa mây trời.", OpeningHours = "08:00 - 17:00", Latitude = 15.9967, Longitude = 107.9874, AvgTimeSpent = 180 },
                    new TouristSpot { Name = "Ngũ Hành Sơn", Description = "Quần thể 5 ngọn núi đá vôi tâm linh.", OpeningHours = "07:00 - 17:30", Latitude = 15.9906, Longitude = 108.2635, AvgTimeSpent = 120 },
                    new TouristSpot { Name = "Bán đảo Sơn Trà", Description = "Lá phổi xanh của thành phố.", OpeningHours = "24/7", Latitude = 16.1213, Longitude = 108.2771, AvgTimeSpent = 150 }
                }
            },
            new Destination
            {
                Name = "Hà Nội",
                Description = "Thủ đô ngàn năm văn hiến với nét đẹp cổ kính.",
                ImageUrl = "https://images.unsplash.com/photo-1509030464150-1b921633003c?q=80&w=1000",
                TouristSpots = new List<TouristSpot>
                {
                    new TouristSpot { Name = "Hồ Hoàn Kiếm", Description = "Trái tim của thủ đô.", OpeningHours = "24/7", Latitude = 21.0285, Longitude = 105.8522, AvgTimeSpent = 60 },
                    new TouristSpot { Name = "Văn Miếu Quốc Tử Giám", Description = "Trường đại học đầu tiên của Việt Nam.", OpeningHours = "08:00 - 17:00", Latitude = 21.0294, Longitude = 105.8355, AvgTimeSpent = 90 },
                    new TouristSpot { Name = "Lăng Chủ tịch Hồ Chí Minh", Description = "Nơi an nghỉ của vị lãnh đạo vĩ đại.", OpeningHours = "07:30 - 10:30", Latitude = 21.0368, Longitude = 105.8347, AvgTimeSpent = 120 }
                }
            },
            new Destination
            {
                Name = "TP. Hồ Chí Minh",
                Description = "Thành phố năng động, hòn ngọc Viễn Đông.",
                ImageUrl = "https://images.unsplash.com/photo-1555944191-23d8819360e7?q=80&w=1000",
                TouristSpots = new List<TouristSpot>
                {
                    new TouristSpot { Name = "Dinh Độc Lập", Description = "Di tích lịch sử đặc biệt cấp quốc gia.", OpeningHours = "08:00 - 16:00", Latitude = 10.7770, Longitude = 106.6953, AvgTimeSpent = 120 },
                    new TouristSpot { Name = "Bưu điện Trung tâm Thành phố", Description = "Kiến trúc Pháp cổ kính tuyệt đẹp.", OpeningHours = "07:00 - 19:00", Latitude = 10.7798, Longitude = 106.6999, AvgTimeSpent = 45 },
                    new TouristSpot { Name = "Phố đi bộ Nguyễn Huệ", Description = "Nơi tụ họp sầm uất nhất về đêm.", OpeningHours = "24/7", Latitude = 10.7741, Longitude = 106.7020, AvgTimeSpent = 90 }
                }
            },
            new Destination
            {
                Name = "Lâm Đồng (Đà Lạt)",
                Description = "Thành phố ngàn hoa với khí hậu ôn đới quanh năm.",
                ImageUrl = "https://images.unsplash.com/photo-1621240215701-b0e6878f830d?q=80&w=1000",
                TouristSpots = new List<TouristSpot>
                {
                    new TouristSpot { Name = "Thung lũng Tình Yêu", Description = "Địa điểm lãng mạn bậc nhất Đà Lạt.", OpeningHours = "07:30 - 17:00", Latitude = 11.9790, Longitude = 108.4502, AvgTimeSpent = 150 },
                    new TouristSpot { Name = "Hồ Tuyền Lâm", Description = "Hồ nước ngọt lớn nhất Đà Lạt.", OpeningHours = "24/7", Latitude = 11.8906, Longitude = 108.4316, AvgTimeSpent = 180 },
                    new TouristSpot { Name = "Núi Langbiang", Description = "Nóc nhà của cao nguyên Lâm Viên.", OpeningHours = "07:00 - 17:00", Latitude = 12.0433, Longitude = 108.4411, AvgTimeSpent = 240 }
                }
            },
            new Destination { Name = "Quảng Ninh (Hạ Long)", Description = "Kỳ quan thiên nhiên thế giới.", ImageUrl = "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=1000", 
                TouristSpots = new List<TouristSpot> { new TouristSpot { Name = "Vịnh Hạ Long", Description = "Hàng ngàn đảo đá vôi kỳ vĩ.", OpeningHours = "06:30 - 18:30", AvgTimeSpent = 360 } } 
            },
            new Destination { Name = "Kiên Giang (Phú Quốc)", Description = "Đảo ngọc với những bãi cát trắng mịn.", ImageUrl = "https://images.unsplash.com/photo-1589785834420-72782b14686c?q=80&w=1000",
                TouristSpots = new List<TouristSpot> { new TouristSpot { Name = "Bãi Sao", Description = "Bãi biển đẹp nhất Phú Quốc.", OpeningHours = "24/7", AvgTimeSpent = 240 } }
            },
            new Destination { Name = "Thừa Thiên Huế", Description = "Cố đô tĩnh lặng và mộng mơ.", ImageUrl = "https://images.unsplash.com/photo-1585123334904-845d60e97b29?q=80&w=1000",
                TouristSpots = new List<TouristSpot> { new TouristSpot { Name = "Đại Nội Huế", Description = "Hoàng cung của triều đại nhà Nguyễn.", OpeningHours = "08:00 - 17:30", AvgTimeSpent = 180 } }
            },
            new Destination { Name = "Quảng Nam (Hội An)", Description = "Phố cổ lung linh với lồng đèn.", ImageUrl = "https://images.unsplash.com/photo-1599708153386-62e245789645?q=80&w=1000",
                TouristSpots = new List<TouristSpot> { new TouristSpot { Name = "Chùa Cầu", Description = "Biểu tượng lịch sử của Hội An.", OpeningHours = "24/7", AvgTimeSpent = 30 } }
            },
            new Destination { Name = "Lào Cai (Sapa)", Description = "Thị trấn trong sương với ruộng bậc thang kỳ vĩ.", ImageUrl = "https://images.unsplash.com/photo-1508804494830-d331593c18f9?q=80&w=1000",
                TouristSpots = new List<TouristSpot> { new TouristSpot { Name = "Đỉnh Fansipan", Description = "Nóc nhà Đông Dương.", OpeningHours = "08:00 - 17:00", AvgTimeSpent = 240 } }
            },
            new Destination { Name = "Khánh Hòa (Nha Trang)", Description = "Vịnh biển đẹp bậc nhất hành tinh.", ImageUrl = "https://images.unsplash.com/photo-1583417319070-4a69db38a482?q=80&w=1000",
                TouristSpots = new List<TouristSpot> { new TouristSpot { Name = "VinWonders Nha Trang", Description = "Công viên giải trí ven biển.", OpeningHours = "08:00 - 20:00", AvgTimeSpent = 480 } }
            }
        };

        // 3. Thêm vào DB và lưu thay đổi
        await context.Destinations.AddRangeAsync(destinations);
        await context.SaveChangesAsync();
    }
}