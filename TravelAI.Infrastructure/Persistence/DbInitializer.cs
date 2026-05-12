using Bogus;
using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using TravelAI.Domain.Entities;
using TravelAI.Domain.Enums;

namespace TravelAI.Infrastructure.Persistence;

/// <summary>
/// DbInitializer — Seed dữ liệu mẫu toàn diện cho hệ thống TravelAI.
/// Bao gồm: Roles, Users (Admin/Partner/Customer), Destinations, TouristSpots,
/// Services, ServiceAvailability, Promotions, Bookings, Payments,
/// Itineraries, Reviews, AISuggestionLogs.
/// </summary>
public static class DbInitializer
{
    // Mật khẩu mặc định cho tất cả tài khoản seed
    private const string DefaultPassword = "123456";

    // Seed cố định để dữ liệu Bogus nhất quán mỗi lần chạy
    private const int FakerSeed = 2024;

    public static async Task SeedAsync(ApplicationDbContext context)
    {
        // Idempotency: chỉ seed khi chưa có dữ liệu
        if (await context.Roles.AnyAsync())
        {
            return;
        }

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(DefaultPassword);

        // =====================================================================
        // BƯỚC 1: ROLES
        // =====================================================================
        var roleAdmin   = new Role { RoleName = "Admin" };
        var rolePartner = new Role { RoleName = "Partner" };
        var roleCustomer = new Role { RoleName = "Customer" };

        await context.Roles.AddRangeAsync(roleAdmin, rolePartner, roleCustomer);
        await context.SaveChangesAsync();

        // =====================================================================
        // BƯỚC 2: USERS — Admin
        // =====================================================================
        var adminUser = new User
        {
            RoleId       = roleAdmin.RoleId,
            Email        = "admin@travelai.vn",
            PasswordHash = passwordHash,
            FullName     = "Quản Trị Viên",
            Phone        = "0901000001",
            IsActive     = true,
            AvatarUrl    = "https://api.dicebear.com/7.x/initials/svg?seed=Admin",
            CreatedAt    = DateTime.UtcNow.AddMonths(-6),
        };
        await context.Users.AddAsync(adminUser);
        await context.SaveChangesAsync();

        // =====================================================================
        // BƯỚC 3: USERS — Partners (2 đối tác)
        // =====================================================================
        var partner1 = new User
        {
            RoleId       = rolePartner.RoleId,
            Email        = "partner.danang@travelai.vn",
            PasswordHash = passwordHash,
            FullName     = "Trần Minh Khoa",
            Phone        = "0902000001",
            IsActive     = true,
            AvatarUrl    = "https://api.dicebear.com/7.x/initials/svg?seed=TranMinhKhoa",
            CreatedAt    = DateTime.UtcNow.AddMonths(-5),
        };
        var partner2 = new User
        {
            RoleId       = rolePartner.RoleId,
            Email        = "partner.hanoi@travelai.vn",
            PasswordHash = passwordHash,
            FullName     = "Nguyễn Thị Lan",
            Phone        = "0902000002",
            IsActive     = true,
            AvatarUrl    = "https://api.dicebear.com/7.x/initials/svg?seed=NguyenThiLan",
            CreatedAt    = DateTime.UtcNow.AddMonths(-4),
        };
        await context.Users.AddRangeAsync(partner1, partner2);
        await context.SaveChangesAsync();

        // PartnerProfiles
        var profile1 = new PartnerProfile
        {
            UserId             = partner1.UserId,
            BusinessName       = "Công ty Du lịch Biển Xanh Đà Nẵng",
            TaxCode            = "0401234567",
            BankAccount        = "9704229123456789",
            Address            = "123 Nguyễn Văn Linh, Đà Nẵng",
            Description        = "Chuyên cung cấp dịch vụ khách sạn và tour tham quan tại Đà Nẵng và Hội An.",
            ContactPhone       = "02363123456",
            VerificationStatus = PartnerVerificationStatus.Approved,
            SubmittedAt        = DateTime.UtcNow.AddMonths(-5),
            ReviewedAt         = DateTime.UtcNow.AddMonths(-4),
        };
        var profile2 = new PartnerProfile
        {
            UserId             = partner2.UserId,
            BusinessName       = "Hà Nội Discovery Travel",
            TaxCode            = "0100987654",
            BankAccount        = "9704229987654321",
            Address            = "45 Hàng Bông, Hoàn Kiếm, Hà Nội",
            Description        = "Đơn vị lữ hành uy tín tại Hà Nội, chuyên tour miền Bắc và vé xe khách.",
            ContactPhone       = "02432123456",
            VerificationStatus = PartnerVerificationStatus.Approved,
            SubmittedAt        = DateTime.UtcNow.AddMonths(-4),
            ReviewedAt         = DateTime.UtcNow.AddMonths(-3),
        };
        await context.PartnerProfiles.AddRangeAsync(profile1, profile2);
        await context.SaveChangesAsync();

        // =====================================================================
        // BƯỚC 4: USERS — Customers (3 khách hàng) dùng Bogus
        // =====================================================================
        var fakerVi = new Faker("vi");
        Randomizer.Seed = new Random(FakerSeed);

        var customerNames = new[]
        {
            ("Lê Thị Hương",   "huong.le@gmail.com",   "0903000001"),
            ("Phạm Văn Đức",   "duc.pham@gmail.com",   "0903000002"),
            ("Võ Thị Mai Anh", "maianh.vo@gmail.com",  "0903000003"),
        };

        var customers = customerNames.Select((c, i) => new User
        {
            RoleId       = roleCustomer.RoleId,
            Email        = c.Item2,
            PasswordHash = passwordHash,
            FullName     = c.Item1,
            Phone        = c.Item3,
            IsActive     = true,
            AvatarUrl    = $"https://api.dicebear.com/7.x/initials/svg?seed={Uri.EscapeDataString(c.Item1)}",
            CreatedAt    = DateTime.UtcNow.AddMonths(-(3 - i)),
        }).ToList();

        await context.Users.AddRangeAsync(customers);
        await context.SaveChangesAsync();

        // UserPreferences cho từng customer
        var prefData = new[]
        {
            (BudgetLevel.Medium, TravelPace.Balanced,  "Văn hóa & Lịch sử", "Ẩm thực địa phương"),
            (BudgetLevel.High,   TravelPace.FastPaced, "Khám phá & Mạo hiểm", "Hải sản"),
            (BudgetLevel.Low,    TravelPace.Relaxed,   "Nghỉ dưỡng & Biển", "Chay & Thuần chay"),
        };
        var preferences = customers.Select((c, i) => new UserPreference
        {
            UserId       = c.UserId,
            TravelStyle  = prefData[i].Item3,
            BudgetLevel  = prefData[i].Item1,
            TravelPace   = prefData[i].Item2,
            CuisinePref  = prefData[i].Item4,
        }).ToList();
        await context.UserPreferences.AddRangeAsync(preferences);
        await context.SaveChangesAsync();

        // =====================================================================
        // BƯỚC 5: DESTINATIONS & TOURIST SPOTS
        // =====================================================================
        var destinations = new List<Destination>
        {
            new Destination
            {
                Name        = "Đà Nẵng",
                Description = "Thành phố đáng sống nhất Việt Nam với bãi biển Mỹ Khê và Cầu Rồng nổi tiếng.",
                ImageUrl    = "https://images.unsplash.com/photo-1559592442-9e54238a2e07?w=800",
            },
            new Destination
            {
                Name        = "Hà Nội",
                Description = "Thủ đô ngàn năm văn hiến với kiến trúc cổ kính và ẩm thực phong phú.",
                ImageUrl    = "https://images.unsplash.com/photo-1509030464150-1b921633003c?w=800",
            },
            new Destination
            {
                Name        = "TP. Hồ Chí Minh",
                Description = "Thành phố năng động nhất Việt Nam, trung tâm kinh tế và văn hóa phía Nam.",
                ImageUrl    = "https://images.unsplash.com/photo-1555944191-23d8819360e7?w=800",
            },
            new Destination
            {
                Name        = "Lâm Đồng (Đà Lạt)",
                Description = "Thành phố ngàn hoa với khí hậu ôn đới mát mẻ quanh năm.",
                ImageUrl    = "https://images.unsplash.com/photo-1621240215701-b0e6878f830d?w=800",
            },
        };
        await context.Destinations.AddRangeAsync(destinations);
        await context.SaveChangesAsync();

        // Tourist Spots
        var spotsDaNang = new List<TouristSpot>
        {
            new TouristSpot { DestinationId = destinations[0].DestinationId, Name = "Cầu Vàng – Bà Nà Hills",    Description = "Biểu tượng du lịch nằm giữa mây trời, được đỡ bởi đôi bàn tay khổng lồ.", OpeningHours = "08:00–17:00", Latitude = 15.9967, Longitude = 107.9874, AvgTimeSpent = 180, ImageUrl = "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=600" },
            new TouristSpot { DestinationId = destinations[0].DestinationId, Name = "Ngũ Hành Sơn",              Description = "Quần thể 5 ngọn núi đá vôi linh thiêng với nhiều hang động và chùa chiền.", OpeningHours = "07:00–17:30", Latitude = 15.9906, Longitude = 108.2635, AvgTimeSpent = 120, ImageUrl = "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=600" },
            new TouristSpot { DestinationId = destinations[0].DestinationId, Name = "Bán đảo Sơn Trà",           Description = "Lá phổi xanh của thành phố với rừng nguyên sinh và bãi biển hoang sơ.", OpeningHours = "24/7",       Latitude = 16.1213, Longitude = 108.2771, AvgTimeSpent = 150, ImageUrl = "https://images.unsplash.com/photo-1589785834420-72782b14686c?w=600" },
        };
        var spotsHaNoi = new List<TouristSpot>
        {
            new TouristSpot { DestinationId = destinations[1].DestinationId, Name = "Hồ Hoàn Kiếm",              Description = "Trái tim của thủ đô, nơi gắn liền với truyền thuyết Rùa Vàng.", OpeningHours = "24/7",       Latitude = 21.0285, Longitude = 105.8522, AvgTimeSpent = 60,  ImageUrl = "https://images.unsplash.com/photo-1508804494830-d331593c18f9?w=600" },
            new TouristSpot { DestinationId = destinations[1].DestinationId, Name = "Văn Miếu – Quốc Tử Giám",   Description = "Trường đại học đầu tiên của Việt Nam, biểu tượng của hiếu học.", OpeningHours = "08:00–17:00", Latitude = 21.0294, Longitude = 105.8355, AvgTimeSpent = 90,  ImageUrl = "https://images.unsplash.com/photo-1585123334904-845d60e97b29?w=600" },
            new TouristSpot { DestinationId = destinations[1].DestinationId, Name = "Phố cổ Hà Nội",             Description = "36 phố phường với kiến trúc cổ kính và ẩm thực đường phố đặc sắc.", OpeningHours = "24/7",       Latitude = 21.0340, Longitude = 105.8500, AvgTimeSpent = 120, ImageUrl = "https://images.unsplash.com/photo-1599708153386-62e245789645?w=600" },
        };
        var spotsHCM = new List<TouristSpot>
        {
            new TouristSpot { DestinationId = destinations[2].DestinationId, Name = "Dinh Độc Lập",               Description = "Di tích lịch sử đặc biệt cấp quốc gia, chứng nhân lịch sử thống nhất đất nước.", OpeningHours = "08:00–16:00", Latitude = 10.7770, Longitude = 106.6953, AvgTimeSpent = 120, ImageUrl = "https://images.unsplash.com/photo-1621240215701-b0e6878f830d?w=600" },
            new TouristSpot { DestinationId = destinations[2].DestinationId, Name = "Phố đi bộ Nguyễn Huệ",      Description = "Trung tâm sầm uất nhất Sài Gòn về đêm với nhiều sự kiện văn hóa.", OpeningHours = "24/7",       Latitude = 10.7741, Longitude = 106.7020, AvgTimeSpent = 90,  ImageUrl = "https://images.unsplash.com/photo-1509030464150-1b921633003c?w=600" },
        };
        var spotsDaLat = new List<TouristSpot>
        {
            new TouristSpot { DestinationId = destinations[3].DestinationId, Name = "Thung lũng Tình Yêu",        Description = "Địa điểm lãng mạn bậc nhất Đà Lạt với hồ nước xanh và đồi thông.", OpeningHours = "07:30–17:00", Latitude = 11.9790, Longitude = 108.4502, AvgTimeSpent = 150, ImageUrl = "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=600" },
            new TouristSpot { DestinationId = destinations[3].DestinationId, Name = "Núi Langbiang",              Description = "Nóc nhà của cao nguyên Lâm Viên, điểm trekking lý tưởng.", OpeningHours = "07:00–17:00", Latitude = 12.0433, Longitude = 108.4411, AvgTimeSpent = 240, ImageUrl = "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=600" },
        };

        var allSpots = spotsDaNang.Concat(spotsHaNoi).Concat(spotsHCM).Concat(spotsDaLat).ToList();
        await context.TouristSpots.AddRangeAsync(allSpots);
        await context.SaveChangesAsync();

        // =====================================================================
        // BƯỚC 6: SERVICES (Partner1 → Đà Nẵng, Partner2 → Hà Nội + HCM)
        // =====================================================================
        var today = DateTime.UtcNow.Date;

        // --- Partner 1: Khách sạn + Tour tại Đà Nẵng ---
        var svc1 = new Service
        {
            PartnerId   = partner1.UserId,
            SpotId      = spotsDaNang[0].SpotId,
            ServiceType = ServiceType.Hotel,
            Name        = "Khách sạn Mỹ Khê Sunrise",
            Description = "Khách sạn 4 sao view biển Mỹ Khê, cách trung tâm 5 phút. Bao gồm bữa sáng buffet và hồ bơi vô cực.",
            BasePrice   = 1_200_000m,
            RatingAvg   = 4.6,
            Latitude    = 16.0544,
            Longitude   = 108.2022,
            IsActive    = true,
        };
        var svc2 = new Service
        {
            PartnerId   = partner1.UserId,
            SpotId      = spotsDaNang[1].SpotId,
            ServiceType = ServiceType.Tour,
            Name        = "Tour Bà Nà Hills – Cầu Vàng 1 ngày",
            Description = "Trọn gói cáp treo + vé vào cửa Bà Nà Hills, tham quan Cầu Vàng, Làng Pháp và Fantasy Park. Khởi hành 7:30 sáng.",
            BasePrice   = 850_000m,
            RatingAvg   = 4.8,
            Latitude    = 15.9967,
            Longitude   = 107.9874,
            IsActive    = true,
        };
        var svc3 = new Service
        {
            PartnerId   = partner1.UserId,
            SpotId      = spotsDaNang[2].SpotId,
            ServiceType = ServiceType.Tour,
            Name        = "Tour Ngũ Hành Sơn – Làng đá Non Nước",
            Description = "Khám phá 5 ngọn núi đá vôi huyền bí, tham quan các hang động và làng nghề điêu khắc đá truyền thống.",
            BasePrice   = 350_000m,
            RatingAvg   = 4.4,
            Latitude    = 15.9906,
            Longitude   = 108.2635,
            IsActive    = true,
        };

        // --- Partner 2: Khách sạn + Vé xe + Tour tại Hà Nội & HCM ---
        var svc4 = new Service
        {
            PartnerId   = partner2.UserId,
            SpotId      = spotsHaNoi[0].SpotId,
            ServiceType = ServiceType.Hotel,
            Name        = "Khách sạn Hồ Gươm Boutique",
            Description = "Khách sạn boutique 3 sao ngay cạnh Hồ Hoàn Kiếm, thiết kế hiện đại kết hợp nét cổ kính Hà Nội.",
            BasePrice   = 950_000m,
            RatingAvg   = 4.3,
            Latitude    = 21.0285,
            Longitude   = 105.8522,
            IsActive    = true,
        };
        var svc5 = new Service
        {
            PartnerId   = partner2.UserId,
            SpotId      = spotsHaNoi[2].SpotId,
            ServiceType = ServiceType.Transport,
            Name        = "Vé xe limousine Hà Nội – Đà Nẵng (Giường nằm VIP)",
            Description = "Xe giường nằm VIP 34 chỗ, điều hòa, wifi, khởi hành 19:00 hàng ngày từ bến xe Giáp Bát.",
            BasePrice   = 450_000m,
            RatingAvg   = 4.2,
            Latitude    = 20.9800,
            Longitude   = 105.8400,
            IsActive    = true,
        };
        var svc6 = new Service
        {
            PartnerId   = partner2.UserId,
            SpotId      = spotsHCM[1].SpotId,
            ServiceType = ServiceType.Tour,
            Name        = "Tour Sài Gòn về đêm – Ẩm thực đường phố",
            Description = "Khám phá Sài Gòn về đêm bằng xe máy, thưởng thức các món ăn đường phố nổi tiếng tại quận 1 và quận 3.",
            BasePrice   = 550_000m,
            RatingAvg   = 4.7,
            Latitude    = 10.7741,
            Longitude   = 106.7020,
            IsActive    = true,
        };

        var allServices = new List<Service> { svc1, svc2, svc3, svc4, svc5, svc6 };
        await context.Services.AddRangeAsync(allServices);
        await context.SaveChangesAsync();

        // =====================================================================
        // BƯỚC 7: SERVICE ATTRIBUTES
        // =====================================================================
        var attributes = new List<ServiceAttribute>
        {
            // svc1 – Khách sạn Mỹ Khê
            new ServiceAttribute { ServiceId = svc1.ServiceId, AttrKey = "Wifi",          AttrValue = "Miễn phí" },
            new ServiceAttribute { ServiceId = svc1.ServiceId, AttrKey = "Hồ bơi",        AttrValue = "Vô cực view biển" },
            new ServiceAttribute { ServiceId = svc1.ServiceId, AttrKey = "Bữa sáng",      AttrValue = "Buffet miễn phí" },
            new ServiceAttribute { ServiceId = svc1.ServiceId, AttrKey = "Loại phòng",    AttrValue = "Deluxe, Suite, Family" },
            new ServiceAttribute { ServiceId = svc1.ServiceId, AttrKey = "Bãi đỗ xe",     AttrValue = "Miễn phí" },
            // svc2 – Tour Bà Nà Hills
            new ServiceAttribute { ServiceId = svc2.ServiceId, AttrKey = "Bao gồm",       AttrValue = "Vé cáp treo + vé vào cửa" },
            new ServiceAttribute { ServiceId = svc2.ServiceId, AttrKey = "Thời gian",     AttrValue = "1 ngày (7:30 – 18:00)" },
            new ServiceAttribute { ServiceId = svc2.ServiceId, AttrKey = "Xe đưa đón",    AttrValue = "Có (từ trung tâm ĐN)" },
            new ServiceAttribute { ServiceId = svc2.ServiceId, AttrKey = "Hướng dẫn viên",AttrValue = "Tiếng Việt & Tiếng Anh" },
            // svc3 – Tour Ngũ Hành Sơn
            new ServiceAttribute { ServiceId = svc3.ServiceId, AttrKey = "Bao gồm",       AttrValue = "Vé thang máy + hướng dẫn viên" },
            new ServiceAttribute { ServiceId = svc3.ServiceId, AttrKey = "Thời gian",     AttrValue = "Nửa ngày (3–4 tiếng)" },
            // svc4 – Khách sạn Hồ Gươm
            new ServiceAttribute { ServiceId = svc4.ServiceId, AttrKey = "Wifi",          AttrValue = "Miễn phí" },
            new ServiceAttribute { ServiceId = svc4.ServiceId, AttrKey = "View",          AttrValue = "Hồ Hoàn Kiếm" },
            new ServiceAttribute { ServiceId = svc4.ServiceId, AttrKey = "Bữa sáng",      AttrValue = "Á – Âu" },
            // svc5 – Vé xe limousine
            new ServiceAttribute { ServiceId = svc5.ServiceId, AttrKey = "Loại xe",       AttrValue = "Giường nằm VIP 34 chỗ" },
            new ServiceAttribute { ServiceId = svc5.ServiceId, AttrKey = "Tiện ích",      AttrValue = "Wifi, điều hòa, chăn gối" },
            new ServiceAttribute { ServiceId = svc5.ServiceId, AttrKey = "Hành lý",       AttrValue = "Tối đa 20kg" },
            // svc6 – Tour Sài Gòn về đêm
            new ServiceAttribute { ServiceId = svc6.ServiceId, AttrKey = "Phương tiện",   AttrValue = "Xe máy điện" },
            new ServiceAttribute { ServiceId = svc6.ServiceId, AttrKey = "Bao gồm",       AttrValue = "Hướng dẫn viên + 5 điểm ăn" },
            new ServiceAttribute { ServiceId = svc6.ServiceId, AttrKey = "Thời gian",     AttrValue = "19:00 – 22:30" },
        };
        await context.ServiceAttributes.AddRangeAsync(attributes);

        // =====================================================================
        // BƯỚC 8: SERVICE IMAGES
        // =====================================================================
        var images = new List<ServiceImage>
        {
            new ServiceImage { ServiceId = svc1.ServiceId, ImageUrl = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800", IsThumbnail = true },
            new ServiceImage { ServiceId = svc1.ServiceId, ImageUrl = "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800", IsThumbnail = false },
            new ServiceImage { ServiceId = svc1.ServiceId, ImageUrl = "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800", IsThumbnail = false },
            new ServiceImage { ServiceId = svc2.ServiceId, ImageUrl = "https://images.unsplash.com/photo-1559592442-9e54238a2e07?w=800",   IsThumbnail = true },
            new ServiceImage { ServiceId = svc2.ServiceId, ImageUrl = "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800", IsThumbnail = false },
            new ServiceImage { ServiceId = svc3.ServiceId, ImageUrl = "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800", IsThumbnail = true },
            new ServiceImage { ServiceId = svc4.ServiceId, ImageUrl = "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800",   IsThumbnail = true },
            new ServiceImage { ServiceId = svc4.ServiceId, ImageUrl = "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800", IsThumbnail = false },
            new ServiceImage { ServiceId = svc5.ServiceId, ImageUrl = "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800",   IsThumbnail = true },
            new ServiceImage { ServiceId = svc6.ServiceId, ImageUrl = "https://images.unsplash.com/photo-1555944191-23d8819360e7?w=800",   IsThumbnail = true },
            new ServiceImage { ServiceId = svc6.ServiceId, ImageUrl = "https://images.unsplash.com/photo-1509030464150-1b921633003c?w=800", IsThumbnail = false },
        };
        await context.ServiceImages.AddRangeAsync(images);
        await context.SaveChangesAsync();

        // =====================================================================
        // BƯỚC 9: SERVICE AVAILABILITY (30 ngày tới cho mỗi dịch vụ)
        // =====================================================================
        var availabilities = new List<ServiceAvailability>();
        var rng = new Random(FakerSeed);

        foreach (var svc in allServices)
        {
            for (int d = 0; d < 30; d++)
            {
                var date       = today.AddDays(d);
                var basePrice  = svc.BasePrice;
                // Cuối tuần tăng giá 20%
                var isWeekend  = date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;
                var price      = isWeekend ? basePrice * 1.2m : basePrice;
                var totalStock = svc.ServiceType == ServiceType.Hotel ? rng.Next(5, 20)
                               : svc.ServiceType == ServiceType.Transport ? rng.Next(10, 34)
                               : rng.Next(8, 25);
                var booked     = d < 5 ? rng.Next(0, totalStock / 2) : 0; // Vài ngày đầu đã có booking

                availabilities.Add(new ServiceAvailability
                {
                    ServiceId  = svc.ServiceId,
                    Date       = date,
                    Price      = Math.Round(price, 0),
                    TotalStock = totalStock,
                    BookedCount = booked,
                    HeldCount  = 0,
                });
            }
        }
        await context.ServiceAvailabilities.AddRangeAsync(availabilities);
        await context.SaveChangesAsync();

        // =====================================================================
        // BƯỚC 10: PROMOTIONS
        // =====================================================================
        var promos = new List<Promotion>
        {
            new Promotion
            {
                Code            = "SUMMER2025",
                DiscountPercent = 0.15,
                MaxAmount       = 300_000m,
                ExpiryDate      = today.AddMonths(3),
                IsActive        = true,
            },
            new Promotion
            {
                Code            = "NEWUSER10",
                DiscountPercent = 0.10,
                MaxAmount       = 150_000m,
                ExpiryDate      = today.AddMonths(6),
                IsActive        = true,
            },
            new Promotion
            {
                Code            = "EXPIRED50",
                DiscountPercent = 0.50,
                MaxAmount       = 500_000m,
                ExpiryDate      = today.AddDays(-10), // Đã hết hạn
                IsActive        = false,
            },
        };
        await context.Promotions.AddRangeAsync(promos);
        await context.SaveChangesAsync();

        // =====================================================================
        // BƯỚC 11: BOOKINGS + BOOKING ITEMS + PAYMENTS
        // =====================================================================

        // Booking 1: customer[0] đặt Tour Bà Nà Hills → ĐÃ THANH TOÁN
        var booking1 = new Booking
        {
            UserId      = customers[0].UserId,
            PromoId     = promos[0].PromoId,
            TotalAmount = 850_000m * 2 * (1 - (decimal)promos[0].DiscountPercent),
            Status      = BookingStatus.Paid,
            CreatedAt   = today.AddDays(-10),
        };
        await context.Bookings.AddAsync(booking1);
        await context.SaveChangesAsync();

        await context.BookingItems.AddAsync(new BookingItem
        {
            BookingId      = booking1.BookingId,
            ServiceId      = svc2.ServiceId,
            Quantity       = 2,
            PriceAtBooking = 850_000m,
            CheckInDate    = today.AddDays(5),
            Notes          = "2 người lớn, yêu cầu hướng dẫn viên tiếng Anh",
        });
        await context.Payments.AddAsync(new Payment
        {
            BookingId      = booking1.BookingId,
            Method         = "VNPay",
            TransactionRef = $"VNP{today.AddDays(-10):yyyyMMdd}001",
            Amount         = booking1.TotalAmount,
            PaymentTime    = today.AddDays(-10).AddHours(2),
        });
        await context.SaveChangesAsync();

        // Booking 2: customer[0] đặt Khách sạn Mỹ Khê → ĐANG CHỜ THANH TOÁN
        var booking2 = new Booking
        {
            UserId      = customers[0].UserId,
            TotalAmount = 1_200_000m * 3, // 3 đêm
            Status      = BookingStatus.Pending,
            CreatedAt   = today.AddDays(-1),
        };
        await context.Bookings.AddAsync(booking2);
        await context.SaveChangesAsync();

        await context.BookingItems.AddAsync(new BookingItem
        {
            BookingId      = booking2.BookingId,
            ServiceId      = svc1.ServiceId,
            Quantity       = 1,
            PriceAtBooking = 1_200_000m,
            CheckInDate    = today.AddDays(7),
            Notes          = "Phòng Deluxe view biển, tầng cao",
        });
        await context.SaveChangesAsync();

        // Booking 3: customer[1] đặt Vé xe limousine → ĐÃ THANH TOÁN
        var booking3 = new Booking
        {
            UserId      = customers[1].UserId,
            PromoId     = promos[1].PromoId,
            TotalAmount = 450_000m * 2 * (1 - (decimal)promos[1].DiscountPercent),
            Status      = BookingStatus.Paid,
            CreatedAt   = today.AddDays(-5),
        };
        await context.Bookings.AddAsync(booking3);
        await context.SaveChangesAsync();

        await context.BookingItems.AddAsync(new BookingItem
        {
            BookingId      = booking3.BookingId,
            ServiceId      = svc5.ServiceId,
            Quantity       = 2,
            PriceAtBooking = 450_000m,
            CheckInDate    = today.AddDays(3),
            Notes          = "2 vé giường nằm VIP, hàng ghế giữa",
        });
        await context.Payments.AddAsync(new Payment
        {
            BookingId      = booking3.BookingId,
            Method         = "Momo",
            TransactionRef = $"MOMO{today.AddDays(-5):yyyyMMdd}002",
            Amount         = booking3.TotalAmount,
            PaymentTime    = today.AddDays(-5).AddHours(1),
        });
        await context.SaveChangesAsync();

        // Booking 4: customer[1] đặt Tour Sài Gòn về đêm → ĐÃ HỦY
        var booking4 = new Booking
        {
            UserId      = customers[1].UserId,
            TotalAmount = 550_000m * 3,
            Status      = BookingStatus.Cancelled,
            CreatedAt   = today.AddDays(-15),
        };
        await context.Bookings.AddAsync(booking4);
        await context.SaveChangesAsync();

        await context.BookingItems.AddAsync(new BookingItem
        {
            BookingId      = booking4.BookingId,
            ServiceId      = svc6.ServiceId,
            Quantity       = 3,
            PriceAtBooking = 550_000m,
            CheckInDate    = today.AddDays(-8),
        });
        await context.SaveChangesAsync();

        // Booking 5: customer[2] đặt Khách sạn Hồ Gươm + Tour Bà Nà Hills → ĐÃ THANH TOÁN (combo)
        var booking5 = new Booking
        {
            UserId      = customers[2].UserId,
            TotalAmount = 950_000m * 2 + 850_000m * 2,
            Status      = BookingStatus.Paid,
            CreatedAt   = today.AddDays(-20),
        };
        await context.Bookings.AddAsync(booking5);
        await context.SaveChangesAsync();

        await context.BookingItems.AddRangeAsync(
            new BookingItem { BookingId = booking5.BookingId, ServiceId = svc4.ServiceId, Quantity = 1, PriceAtBooking = 950_000m, CheckInDate = today.AddDays(-14), Notes = "2 đêm" },
            new BookingItem { BookingId = booking5.BookingId, ServiceId = svc2.ServiceId, Quantity = 2, PriceAtBooking = 850_000m, CheckInDate = today.AddDays(-13) }
        );
        await context.Payments.AddAsync(new Payment
        {
            BookingId      = booking5.BookingId,
            Method         = "VNPay",
            TransactionRef = $"VNP{today.AddDays(-20):yyyyMMdd}003",
            Amount         = booking5.TotalAmount,
            PaymentTime    = today.AddDays(-20).AddMinutes(30),
        });
        await context.SaveChangesAsync();

        // =====================================================================
        // BƯỚC 12: ITINERARIES + ITINERARY ITEMS
        // =====================================================================

        // Itinerary 1: customer[0] – Đà Nẵng 3 ngày (Confirmed)
        var itinerary1 = new Itinerary
        {
            UserId        = customers[0].UserId,
            Title         = "Khám phá Đà Nẵng – Hội An 3N2Đ",
            StartDate     = today.AddDays(5),
            EndDate       = today.AddDays(7),
            EstimatedCost = 3_500_000m,
            Status        = ItineraryStatus.Confirmed,
            CreatedAt     = today.AddDays(-10),
        };
        await context.Itineraries.AddAsync(itinerary1);
        await context.SaveChangesAsync();

        await context.ItineraryItems.AddRangeAsync(
            // Ngày 1
            new ItineraryItem { ItineraryId = itinerary1.ItineraryId, ServiceId = svc2.ServiceId, SpotId = spotsDaNang[0].SpotId, StartTime = today.AddDays(5).AddHours(7).AddMinutes(30), EndTime = today.AddDays(5).AddHours(18), ActivityOrder = 1 },
            new ItineraryItem { ItineraryId = itinerary1.ItineraryId, ServiceId = svc1.ServiceId, SpotId = null,                  StartTime = today.AddDays(5).AddHours(19),               EndTime = today.AddDays(5).AddHours(20), ActivityOrder = 2 },
            // Ngày 2
            new ItineraryItem { ItineraryId = itinerary1.ItineraryId, ServiceId = null,           SpotId = spotsDaNang[1].SpotId, StartTime = today.AddDays(6).AddHours(8),                EndTime = today.AddDays(6).AddHours(11), ActivityOrder = 3 },
            new ItineraryItem { ItineraryId = itinerary1.ItineraryId, ServiceId = svc3.ServiceId, SpotId = spotsDaNang[2].SpotId, StartTime = today.AddDays(6).AddHours(14),               EndTime = today.AddDays(6).AddHours(17), ActivityOrder = 4 },
            // Ngày 3
            new ItineraryItem { ItineraryId = itinerary1.ItineraryId, ServiceId = null,           SpotId = spotsDaNang[0].SpotId, StartTime = today.AddDays(7).AddHours(9),                EndTime = today.AddDays(7).AddHours(12), ActivityOrder = 5 }
        );
        await context.SaveChangesAsync();

        // Itinerary 2: customer[1] – Hà Nội 2 ngày (Draft)
        var itinerary2 = new Itinerary
        {
            UserId        = customers[1].UserId,
            Title         = "Hà Nội cuối tuần – Phố cổ & Ẩm thực",
            StartDate     = today.AddDays(14),
            EndDate       = today.AddDays(15),
            EstimatedCost = 2_000_000m,
            Status        = ItineraryStatus.Draft,
            CreatedAt     = today.AddDays(-3),
        };
        await context.Itineraries.AddAsync(itinerary2);
        await context.SaveChangesAsync();

        await context.ItineraryItems.AddRangeAsync(
            new ItineraryItem { ItineraryId = itinerary2.ItineraryId, ServiceId = null,           SpotId = spotsHaNoi[0].SpotId, StartTime = today.AddDays(14).AddHours(8),  EndTime = today.AddDays(14).AddHours(10), ActivityOrder = 1 },
            new ItineraryItem { ItineraryId = itinerary2.ItineraryId, ServiceId = null,           SpotId = spotsHaNoi[1].SpotId, StartTime = today.AddDays(14).AddHours(10), EndTime = today.AddDays(14).AddHours(12), ActivityOrder = 2 },
            new ItineraryItem { ItineraryId = itinerary2.ItineraryId, ServiceId = svc4.ServiceId, SpotId = null,                 StartTime = today.AddDays(14).AddHours(14), EndTime = today.AddDays(14).AddHours(15), ActivityOrder = 3 },
            new ItineraryItem { ItineraryId = itinerary2.ItineraryId, ServiceId = null,           SpotId = spotsHaNoi[2].SpotId, StartTime = today.AddDays(15).AddHours(9),  EndTime = today.AddDays(15).AddHours(12), ActivityOrder = 4 }
        );
        await context.SaveChangesAsync();

        // Itinerary 3: customer[2] – Đà Lạt 4 ngày (Completed – chuyến đã qua)
        var itinerary3 = new Itinerary
        {
            UserId        = customers[2].UserId,
            Title         = "Đà Lạt mùa hoa – Nghỉ dưỡng 4N3Đ",
            StartDate     = today.AddDays(-14),
            EndDate       = today.AddDays(-11),
            EstimatedCost = 4_200_000m,
            Status        = ItineraryStatus.Completed,
            CreatedAt     = today.AddDays(-20),
        };
        await context.Itineraries.AddAsync(itinerary3);
        await context.SaveChangesAsync();

        await context.ItineraryItems.AddRangeAsync(
            new ItineraryItem { ItineraryId = itinerary3.ItineraryId, ServiceId = null, SpotId = spotsDaLat[0].SpotId, StartTime = today.AddDays(-14).AddHours(9),  EndTime = today.AddDays(-14).AddHours(12), ActivityOrder = 1 },
            new ItineraryItem { ItineraryId = itinerary3.ItineraryId, ServiceId = null, SpotId = spotsDaLat[1].SpotId, StartTime = today.AddDays(-13).AddHours(7),  EndTime = today.AddDays(-13).AddHours(13), ActivityOrder = 2 }
        );
        await context.SaveChangesAsync();

        // =====================================================================
        // BƯỚC 13: REVIEWS (dùng Bogus để tạo comment thực tế)
        // =====================================================================
        var reviewFaker = new Faker("vi") { Random = new Randomizer(FakerSeed) };

        var reviewComments = new Dictionary<int, (int rating, string comment, string? reply)>
        {
            // svc1 – Khách sạn Mỹ Khê
            [0] = (5, "Khách sạn tuyệt vời! View biển cực đẹp, nhân viên thân thiện. Bữa sáng buffet rất phong phú. Chắc chắn sẽ quay lại!", "Cảm ơn bạn đã tin tưởng lựa chọn chúng tôi! Hẹn gặp lại bạn lần sau nhé 😊"),
            [1] = (4, "Phòng sạch sẽ, thoáng mát. Vị trí thuận tiện, đi bộ ra biển chỉ 2 phút. Trừ điểm vì wifi hơi chậm vào buổi tối.", null),
            // svc2 – Tour Bà Nà Hills
            [2] = (5, "Tour rất chuyên nghiệp! Hướng dẫn viên nhiệt tình, vui tính. Cầu Vàng đẹp hơn trong ảnh rất nhiều. Cực kỳ recommend!", "Cảm ơn bạn đã có những trải nghiệm tuyệt vời cùng chúng tôi!"),
            [3] = (4, "Trải nghiệm tốt, đáng tiền. Chỉ hơi đông khách vào cuối tuần nên phải xếp hàng chụp ảnh khá lâu.", null),
            // svc3 – Tour Ngũ Hành Sơn
            [4] = (4, "Địa điểm rất có giá trị lịch sử và tâm linh. Hướng dẫn viên giải thích rõ ràng. Nên đi vào buổi sáng sớm để tránh nắng.", "Cảm ơn góp ý của bạn! Chúng tôi sẽ lưu ý thêm về thời điểm tham quan."),
            // svc4 – Khách sạn Hồ Gươm
            [5] = (5, "Vị trí không thể tốt hơn! Nhìn ra Hồ Hoàn Kiếm từ phòng ngủ là trải nghiệm không thể quên. Nhân viên rất chu đáo.", "Cảm ơn bạn rất nhiều! Chúng tôi rất vui khi bạn hài lòng với dịch vụ."),
            // svc5 – Vé xe limousine
            [6] = (4, "Xe sạch sẽ, đúng giờ. Ghế nằm thoải mái, ngủ được suốt đêm. Tài xế lái ổn định. Sẽ đặt lại cho chuyến sau.", null),
            // svc6 – Tour Sài Gòn về đêm
            [7] = (5, "Tour cực kỳ thú vị! Được ăn đủ thứ ngon từ bánh mì, hủ tiếu đến chè. Hướng dẫn viên rất am hiểu văn hóa Sài Gòn.", "Cảm ơn bạn! Chúng tôi rất vui khi bạn thích tour ẩm thực của chúng tôi 🍜"),
        };

        // Phân công review: mỗi customer review các service khác nhau
        var reviewAssignments = new[]
        {
            (customers[0].UserId, svc1.ServiceId, reviewComments[0]),
            (customers[1].UserId, svc1.ServiceId, reviewComments[1]),
            (customers[0].UserId, svc2.ServiceId, reviewComments[2]),
            (customers[1].UserId, svc2.ServiceId, reviewComments[3]),
            (customers[2].UserId, svc3.ServiceId, reviewComments[4]),
            (customers[2].UserId, svc4.ServiceId, reviewComments[5]),
            (customers[0].UserId, svc5.ServiceId, reviewComments[6]),
            (customers[1].UserId, svc6.ServiceId, reviewComments[7]),
        };

        var reviews = reviewAssignments.Select((r, i) => new Review
        {
            ServiceId = r.Item2,
            UserId    = r.Item1,
            Rating    = r.Item3.rating,
            Comment   = r.Item3.comment,
            ReplyText = r.Item3.reply,
            CreatedAt = today.AddDays(-(15 - i * 2)),
        }).ToList();

        await context.Reviews.AddRangeAsync(reviews);
        await context.SaveChangesAsync();

        // =====================================================================
        // BƯỚC 14: AI SUGGESTION LOGS
        // =====================================================================
        var aiLogs = new List<AISuggestionLog>
        {
            new AISuggestionLog
            {
                UserId     = customers[0].UserId,
                UserPrompt = "Lên lịch trình 3 ngày tại Đà Nẵng cho 2 người, ngân sách 5 triệu, thích biển và ẩm thực địa phương",
                AiResponseJson = """
                {
                  "title": "Khám phá Đà Nẵng – Hội An 3N2Đ",
                  "days": [
                    {
                      "day": 1,
                      "activities": [
                        { "time": "07:30", "name": "Tour Bà Nà Hills – Cầu Vàng", "type": "Tour", "duration": 600 },
                        { "time": "19:00", "name": "Ăn tối tại phố ẩm thực Trần Phú", "type": "Restaurant", "duration": 90 }
                      ]
                    },
                    {
                      "day": 2,
                      "activities": [
                        { "time": "08:00", "name": "Ngũ Hành Sơn", "type": "Spot", "duration": 120 },
                        { "time": "14:00", "name": "Bán đảo Sơn Trà – Chùa Linh Ứng", "type": "Spot", "duration": 150 }
                      ]
                    },
                    {
                      "day": 3,
                      "activities": [
                        { "time": "09:00", "name": "Phố cổ Hội An", "type": "Spot", "duration": 240 },
                        { "time": "15:00", "name": "Mua sắm và về", "type": "Activity", "duration": 120 }
                      ]
                    }
                  ],
                  "estimatedCost": 3500000,
                  "tips": "Nên đặt vé Bà Nà Hills trước 1 tuần vào mùa hè để tránh hết vé."
                }
                """,
                CreatedAt  = today.AddDays(-10),
            },
            new AISuggestionLog
            {
                UserId     = customers[1].UserId,
                UserPrompt = "Gợi ý tour Hà Nội 2 ngày cuối tuần, thích lịch sử và ẩm thực, ngân sách tiết kiệm",
                AiResponseJson = """
                {
                  "title": "Hà Nội cuối tuần – Phố cổ & Ẩm thực",
                  "days": [
                    {
                      "day": 1,
                      "activities": [
                        { "time": "08:00", "name": "Hồ Hoàn Kiếm & Đền Ngọc Sơn", "type": "Spot", "duration": 60 },
                        { "time": "10:00", "name": "Văn Miếu – Quốc Tử Giám", "type": "Spot", "duration": 90 },
                        { "time": "12:00", "name": "Bún chả Hương Liên (Obama)", "type": "Restaurant", "duration": 60 },
                        { "time": "14:00", "name": "Khách sạn Hồ Gươm Boutique – nhận phòng", "type": "Hotel", "duration": 30 }
                      ]
                    },
                    {
                      "day": 2,
                      "activities": [
                        { "time": "09:00", "name": "Phố cổ 36 phố phường", "type": "Spot", "duration": 180 },
                        { "time": "12:00", "name": "Phở Thìn Lò Đúc", "type": "Restaurant", "duration": 60 }
                      ]
                    }
                  ],
                  "estimatedCost": 2000000,
                  "tips": "Đi bộ quanh Hồ Hoàn Kiếm vào sáng sớm để tránh đông và có không khí trong lành nhất."
                }
                """,
                CreatedAt  = today.AddDays(-3),
            },
            new AISuggestionLog
            {
                UserId     = customers[2].UserId,
                UserPrompt = "Lên kế hoạch nghỉ dưỡng Đà Lạt 4 ngày cho cặp đôi, thích thiên nhiên và cà phê, ngân sách cao",
                AiResponseJson = """
                {
                  "title": "Đà Lạt mùa hoa – Nghỉ dưỡng 4N3Đ",
                  "days": [
                    {
                      "day": 1,
                      "activities": [
                        { "time": "09:00", "name": "Thung lũng Tình Yêu", "type": "Spot", "duration": 150 },
                        { "time": "15:00", "name": "Cà phê The Married Beans", "type": "Activity", "duration": 90 }
                      ]
                    },
                    {
                      "day": 2,
                      "activities": [
                        { "time": "07:00", "name": "Trekking Núi Langbiang", "type": "Spot", "duration": 360 }
                      ]
                    },
                    {
                      "day": 3,
                      "activities": [
                        { "time": "09:00", "name": "Hồ Tuyền Lâm – Thiền viện Trúc Lâm", "type": "Spot", "duration": 180 },
                        { "time": "15:00", "name": "Chợ Đà Lạt – mua đặc sản", "type": "Activity", "duration": 120 }
                      ]
                    },
                    {
                      "day": 4,
                      "activities": [
                        { "time": "09:00", "name": "Vườn hoa thành phố", "type": "Spot", "duration": 90 }
                      ]
                    }
                  ],
                  "estimatedCost": 4200000,
                  "tips": "Tháng 11–12 là mùa hoa dã quỳ nở rộ, rất đẹp. Nên mang áo ấm vì đêm Đà Lạt lạnh."
                }
                """,
                CreatedAt  = today.AddDays(-20),
            },
        };
        await context.AISuggestionLogs.AddRangeAsync(aiLogs);
        await context.SaveChangesAsync();

        // =====================================================================
        // BƯỚC 15: AUDIT LOGS (một vài hành động mẫu)
        // =====================================================================
        var auditLogs = new List<AuditLog>
        {
            new AuditLog { UserId = partner1.UserId, Action = "Create Service",  TableName = "Services",  RecordId = svc1.ServiceId, Timestamp = today.AddDays(-30) },
            new AuditLog { UserId = partner1.UserId, Action = "Create Service",  TableName = "Services",  RecordId = svc2.ServiceId, Timestamp = today.AddDays(-30) },
            new AuditLog { UserId = partner1.UserId, Action = "Update Price",    TableName = "Services",  RecordId = svc1.ServiceId, Timestamp = today.AddDays(-5)  },
            new AuditLog { UserId = partner2.UserId, Action = "Create Service",  TableName = "Services",  RecordId = svc4.ServiceId, Timestamp = today.AddDays(-25) },
            new AuditLog { UserId = partner2.UserId, Action = "Cancel Booking",  TableName = "Bookings",  RecordId = booking4.BookingId, Timestamp = today.AddDays(-14) },
            new AuditLog { UserId = adminUser.UserId, Action = "Approve Partner", TableName = "PartnerProfiles", RecordId = profile1.ProfileId, Timestamp = today.AddDays(-120) },
            new AuditLog { UserId = adminUser.UserId, Action = "Approve Partner", TableName = "PartnerProfiles", RecordId = profile2.ProfileId, Timestamp = today.AddDays(-90)  },
        };
        await context.AuditLogs.AddRangeAsync(auditLogs);
        await context.SaveChangesAsync();
    }
}
