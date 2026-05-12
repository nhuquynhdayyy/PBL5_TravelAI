# 🌏 TravelAI — Hệ Thống Lập Kế Hoạch & Đặt Dịch Vụ Du Lịch Thông Minh

> **Đồ án PBL5 — Dự án Công nghệ Phần mềm**
> Giảng viên phụ trách: **Mai Văn Hà**

---

## 📋 Mục Lục

- [Giới thiệu chung](#-giới-thiệu-chung)
- [Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Các tính năng chính](#-các-tính-năng-chính)
- [Cấu trúc cơ sở dữ liệu](#-cấu-trúc-cơ-sở-dữ-liệu)
- [Cấu trúc thư mục dự án](#-cấu-trúc-thư-mục-dự-án)
- [Hướng dẫn cài đặt & chạy dự án](#-hướng-dẫn-cài-đặt--chạy-dự-án)
- [Tài khoản dùng thử](#-tài-khoản-dùng-thử)
- [Dữ liệu mẫu đã seed](#-dữ-liệu-mẫu-đã-seed)
- [Thành viên nhóm](#-thành-viên-nhóm)

---

## 🎯 Giới Thiệu Chung

**TravelAI** là một nền tảng web tích hợp AI, được xây dựng nhằm giải quyết các bất cập trong trải nghiệm du lịch hiện đại:

- Thông tin du lịch bị phân tán trên nhiều website và ứng dụng khác nhau.
- Người dùng phải dùng nhiều nền tảng riêng lẻ để tìm địa điểm, lên lịch trình, đặt vé xe, khách sạn, tour.
- Thiếu công cụ hỗ trợ lập kế hoạch tổng thể theo ngân sách, thời gian và nhu cầu cá nhân.

**Mục tiêu** của hệ thống:

- ✅ Hỗ trợ người dùng lập kế hoạch du lịch dựa trên điểm đến, thời gian, ngân sách và nhu cầu cá nhân.
- ✅ Cho phép đặt các dịch vụ du lịch (vé xe, khách sạn, tour) trên cùng một nền tảng.
- ✅ Tích hợp AI (Google Gemini / Groq LLaMA) để gợi ý lịch trình thông minh.
- ✅ Kết nối trực tiếp giữa du khách và các đối tác cung cấp dịch vụ.

---

## 🏗️ Kiến Trúc Hệ Thống

Dự án được xây dựng theo mô hình **Clean Architecture**, tách biệt rõ ràng các tầng nghiệp vụ:

```
TravelAI_System.slnx
├── TravelAI.Domain          ← Tầng Domain (Entities, Enums, Interfaces)
├── TravelAI.Application     ← Tầng Application (Services, DTOs, Interfaces)
├── TravelAI.Infrastructure  ← Tầng Infrastructure (EF Core, Repositories, External Services)
└── TravelAI.WebAPI          ← Tầng Presentation (Controllers, Middleware, API)

travel-ai-ui/                ← Frontend (React + TypeScript + Vite)
```

### Sơ đồ phụ thuộc

```
WebAPI → Infrastructure → Application → Domain
```

| Tầng | Trách nhiệm |
|------|-------------|
| **Domain** | Định nghĩa các Entity, Enum, Interface cốt lõi. Không phụ thuộc vào bất kỳ tầng nào khác. |
| **Application** | Chứa logic nghiệp vụ, DTOs, Service Interfaces, Validators. |
| **Infrastructure** | Triển khai cụ thể: EF Core DbContext, Repositories, tích hợp AI (Gemini, Groq), Payment. |
| **WebAPI** | Expose REST API, xử lý Authentication/Authorization (JWT), Middleware, Swagger. |
| **travel-ai-ui** | Giao diện người dùng React, giao tiếp với Backend qua Axios. |

---

## 🛠️ Công Nghệ Sử Dụng

### Backend

| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|----------|
| **.NET** | 10.0 | Framework chính |
| **ASP.NET Core Web API** | 10.0 | Xây dựng REST API |
| **Entity Framework Core** | 10.0 | ORM, quản lý database |
| **SQL Server** | Express / LocalDB | Cơ sở dữ liệu chính |
| **JWT Bearer** | 10.0 | Xác thực & phân quyền |
| **BCrypt.Net-Next** | 4.1.0 | Mã hóa mật khẩu |
| **Bogus** | 35.6.1 | Tạo dữ liệu mẫu |
| **Swashbuckle (Swagger)** | 10.1.5 | Tài liệu API |
| **Google Gemini API** | 2.0 Flash Lite | AI lập lịch trình |
| **Groq API (LLaMA 3.3 70B)** | — | AI hỗ trợ chat |

### Frontend

| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|----------|
| **React** | 19.2 | UI Framework |
| **TypeScript** | 5.9 | Type-safe JavaScript |
| **Vite** | 7.3 | Build tool |
| **React Router DOM** | 7.13 | Điều hướng trang |
| **TanStack Query** | 5.90 | Quản lý state & data fetching |
| **Axios** | 1.13 | HTTP Client |
| **Tailwind CSS** | 4.2 | Styling |
| **Recharts** | 2.15 | Biểu đồ thống kê |
| **Lucide React** | 0.576 | Icon library |

---

## ✨ Các Tính Năng Chính

### 👤 Khách truy cập (Guest)
- Tìm kiếm thông tin địa điểm, điểm tham quan.
- Xem chi tiết dịch vụ (giá, tiện ích, tình trạng còn trống).
- Sử dụng công cụ lập lịch trình demo.

### 🧳 Người dùng (Customer)
- Đăng ký / Đăng nhập tài khoản.
- Quản lý hồ sơ cá nhân và sở thích du lịch (phong cách, ngân sách, ẩm thực).
- **Lập kế hoạch du lịch với AI**: tạo lịch trình theo điểm đến, thời gian, ngân sách.
- Xem timeline lịch trình chi tiết theo từng ngày.
- **Đặt dịch vụ**: Khách sạn, Tour du lịch, Vé xe / phương tiện.
- Thanh toán trực tuyến (VNPay, Momo — mock payment).
- Theo dõi và quản lý lịch sử đặt dịch vụ.
- Hủy đặt chỗ theo chính sách hoàn hủy.
- Đánh giá dịch vụ sau khi sử dụng.
- **Chat AI** tích hợp để hỏi đáp và gợi ý du lịch.

### 🏢 Đối tác cung cấp dịch vụ (Partner)
- Dashboard tổng quan doanh thu và đơn hàng.
- Quản lý dịch vụ: đăng tải, chỉnh sửa thông tin chi tiết.
- Quản lý tồn kho: cập nhật số phòng trống, số ghế xe, suất tour theo thời gian thực.
- Quản lý giá: thiết lập giá cơ bản, giá theo mùa (cuối tuần +20%).
- Quản lý đơn hàng: xem và xử lý yêu cầu đặt chỗ.
- Xem và phản hồi đánh giá từ khách hàng.
- Quản lý hồ sơ doanh nghiệp.

### 🔧 Quản trị viên (Admin)
- Dashboard thống kê tổng quan hệ thống (doanh thu, booking, top destinations).
- Kiểm duyệt và phê duyệt hồ sơ đối tác.
- Quản lý người dùng (kích hoạt / vô hiệu hóa tài khoản).
- Quản lý điểm đến và điểm tham quan.
- Kiểm duyệt dịch vụ mới đăng tải.

---

## 🗄️ Cấu Trúc Cơ Sở Dữ Liệu

Hệ thống sử dụng **SQL Server** với **21 bảng** được phân thành 5 nhóm chức năng:

### Nhóm 1 — Quản lý người dùng
| Bảng | Mô tả |
|------|-------|
| `Roles` | Định nghĩa vai trò: Admin, Partner, Customer |
| `Users` | Tài khoản người dùng (email, mật khẩu đã mã hóa, họ tên) |
| `PartnerProfiles` | Thông tin doanh nghiệp đối tác (tên, mã số thuế, tài khoản ngân hàng) |
| `UserPreferences` | Sở thích cá nhân (phong cách du lịch, ngân sách, ẩm thực) |

### Nhóm 2 — Dịch vụ du lịch
| Bảng | Mô tả |
|------|-------|
| `Destinations` | Điểm đến lớn (Tỉnh/Thành phố) |
| `TouristSpots` | Danh lam thắng cảnh, điểm tham quan cụ thể (tọa độ GPS) |
| `Services` | Danh mục dịch vụ (Hotel, Tour, Transport) |
| `ServiceAttributes` | Đặc tính động của dịch vụ (Wifi, Pool, loại giường...) |
| `Service_Spots` | Bảng trung gian: điểm tham quan trong một Tour |
| `ServiceImages` | Kho hình ảnh dịch vụ |
| `ServiceAvailabilities` | Quản lý giá theo ngày, tồn kho, trạng thái giữ chỗ |

### Nhóm 3 — Lập kế hoạch du lịch
| Bảng | Mô tả |
|------|-------|
| `Itineraries` | Thông tin tổng quan lịch trình (tiêu đề, ngày đi, ngân sách) |
| `ItineraryItems` | Chi tiết hoạt động theo mốc thời gian trong lịch trình |
| `AISuggestionLogs` | Nhật ký hội thoại AI để tối ưu hóa gợi ý |

### Nhóm 4 — Đặt dịch vụ & Thanh toán
| Bảng | Mô tả |
|------|-------|
| `Promotions` | Mã giảm giá và chương trình khuyến mãi |
| `Bookings` | Đơn đặt dịch vụ tổng quát |
| `BookingItems` | Chi tiết từng dịch vụ trong đơn (snapshot giá tại thời điểm đặt) |
| `Payments` | Lịch sử thanh toán (VNPay, Momo) |
| `Refunds` | Quy trình hoàn trả tiền khi hủy dịch vụ |

### Nhóm 5 — Tương tác & Nhật ký
| Bảng | Mô tả |
|------|-------|
| `Reviews` | Đánh giá dịch vụ từ khách hàng (1–5 sao, nhận xét, phản hồi) |
| `AuditLogs` | Theo dõi lịch sử tác động dữ liệu của đối tác và admin |

---

## 📁 Cấu Trúc Thư Mục Dự Án

```
TravelAI_System/
│
├── TravelAI.Domain/                    # Tầng Domain
│   ├── Entities/                       # 21 Entity classes
│   └── Enums/                          # BookingStatus, ServiceType, RoleName...
│
├── TravelAI.Application/               # Tầng Application
│   ├── DTOs/                           # Data Transfer Objects (Auth, Booking, Service...)
│   ├── Interfaces/                     # Service Interfaces
│   └── Services/                       # BookingService, AI Services
│
├── TravelAI.Infrastructure/            # Tầng Infrastructure
│   ├── Application/Services/           # AuthService, AIPlannerService, ChatService...
│   ├── ExternalServices/               # Tích hợp Gemini AI, VNPay, Momo
│   ├── Migrations/                     # EF Core Migrations
│   └── Persistence/
│       ├── ApplicationDbContext.cs     # DbContext chính
│       └── DbInitializer.cs            # Seed dữ liệu mẫu
│
├── TravelAI.WebAPI/                    # Tầng Presentation
│   ├── Controllers/                    # REST API Controllers
│   │   ├── AuthController.cs           # Đăng ký / Đăng nhập
│   │   ├── AIController.cs             # Lập lịch trình AI
│   │   ├── ChatController.cs           # Chat AI
│   │   ├── BookingsController.cs       # Quản lý đặt dịch vụ
│   │   ├── ItineraryController.cs      # Quản lý lịch trình
│   │   ├── ServicesController.cs       # Quản lý dịch vụ
│   │   ├── DestinationsController.cs   # Quản lý điểm đến
│   │   ├── PartnerController.cs        # Dashboard đối tác
│   │   └── AdminController.cs          # Dashboard admin
│   ├── appsettings.json                # Cấu hình (DB, JWT, Gemini, Groq)
│   └── Program.cs                      # Entry point + DI + Middleware
│
└── travel-ai-ui/                       # Frontend React
    └── src/
        ├── api/                        # axiosClient.ts (tự động gắn JWT)
        ├── components/                 # Shared components (Chatbox, HomeSearch...)
        ├── pages/
        │   ├── auth/                   # Login, Register
        │   ├── customer/               # MyBookings, Checkout, Hotels, Tours...
        │   ├── partner/                # Dashboard, ManageServices, Orders...
        │   ├── Admin/                  # Stats, ManagePartners, ManageUsers...
        │   └── Planner/                # Timeline (AI Itinerary)
        └── App.tsx                     # Route definitions
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án

### Yêu cầu hệ thống

| Công cụ | Phiên bản tối thiểu |
|---------|---------------------|
| [.NET SDK](https://dotnet.microsoft.com/download) | 10.0 |
| [Node.js](https://nodejs.org/) | 20.x |
| [SQL Server](https://www.microsoft.com/en-us/sql-server) | Express hoặc LocalDB |
| [Git](https://git-scm.com/) | Bất kỳ |

---

### Bước 1 — Clone dự án

```bash
git clone <repository-url>
cd TravelAI_System
```

---

### Bước 2 — Cấu hình Backend

**2.1. Cập nhật Connection String** trong `TravelAI.WebAPI/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=.\\SQLEXPRESS;Database=TravelAI_DB;Trusted_Connection=True;TrustServerCertificate=True;"
  }
}
```

> Nếu dùng SQL Server LocalDB, thay bằng: `Server=(localdb)\\mssqllocaldb;Database=TravelAI_DB;Trusted_Connection=True;`

**2.2. Cấu hình API Keys** (tùy chọn — cần để dùng tính năng AI):

```json
{
  "Gemini": { "ApiKey": "YOUR_GEMINI_API_KEY" },
  "Groq":   { "ApiKey": "YOUR_GROQ_API_KEY" }
}
```

**2.3. Chạy Backend:**

```bash
dotnet restore TravelAI_System.slnx
dotnet run --project TravelAI.WebAPI
```

Khi khởi động lần đầu, hệ thống sẽ tự động:
1. Chạy tất cả EF Core Migrations để tạo database.
2. Gọi `DbInitializer.SeedAsync()` để seed toàn bộ dữ liệu mẫu.

Backend chạy tại: `http://localhost:5134`
Swagger UI: `http://localhost:5134/swagger`

---

### Bước 3 — Chạy Frontend

```bash
cd travel-ai-ui
npm install
npm run dev
```

Frontend chạy tại: `http://localhost:5173`

> CORS đã được cấu hình sẵn để cho phép kết nối từ `http://localhost:5173`.

---

### Bước 4 — Reset dữ liệu (nếu cần)

Nếu muốn seed lại dữ liệu từ đầu:

```bash
# Xóa và tạo lại database
dotnet ef database drop --force --project TravelAI.Infrastructure --startup-project TravelAI.WebAPI
dotnet ef database update --project TravelAI.Infrastructure --startup-project TravelAI.WebAPI

# Khởi động lại backend để seed tự động
dotnet run --project TravelAI.WebAPI
```

---

## 🔑 Tài Khoản Dùng Thử

> Tất cả tài khoản đều dùng mật khẩu mặc định: **`123456`**

### 👑 Admin

| Họ tên | Email | Mật khẩu | Quyền hạn |
|--------|-------|----------|-----------|
| Quản Trị Viên | `admin@travelai.vn` | `123456` | Toàn quyền hệ thống |

**Có thể test:**
- Dashboard thống kê: doanh thu, booking, top destinations, biểu đồ 30 ngày.
- Duyệt / từ chối hồ sơ đối tác.
- Quản lý người dùng (ban/unban).
- Kiểm duyệt dịch vụ mới.

---

### 🏢 Partner (Đối tác)

| Họ tên | Email | Mật khẩu | Doanh nghiệp | Khu vực |
|--------|-------|----------|--------------|---------|
| Trần Minh Khoa | `partner.danang@travelai.vn` | `123456` | Công ty Du lịch Biển Xanh Đà Nẵng | Đà Nẵng |
| Nguyễn Thị Lan | `partner.hanoi@travelai.vn` | `123456` | Hà Nội Discovery Travel | Hà Nội & TP.HCM |

**Có thể test:**
- Dashboard doanh thu và đơn hàng.
- Quản lý dịch vụ đã đăng (xem danh sách, chỉnh sửa).
- Xem và phản hồi đánh giá từ khách hàng.
- Quản lý lịch trống và giá theo ngày.

---

### 🧳 Customer (Khách hàng)

| Họ tên | Email | Mật khẩu | Sở thích | Ngân sách |
|--------|-------|----------|----------|-----------|
| Lê Thị Hương | `huong.le@gmail.com` | `123456` | Văn hóa & Lịch sử | Trung bình |
| Phạm Văn Đức | `duc.pham@gmail.com` | `123456` | Khám phá & Mạo hiểm | Cao |
| Võ Thị Mai Anh | `maianh.vo@gmail.com` | `123456` | Nghỉ dưỡng & Biển | Tiết kiệm |

**Có thể test:**
- Xem lịch sử booking (đã thanh toán, đang chờ, đã hủy).
- Lập kế hoạch du lịch với AI.
- Đặt dịch vụ mới và thanh toán.
- Đánh giá dịch vụ đã sử dụng.

---

## 📦 Dữ Liệu Mẫu Đã Seed

Sau khi chạy lần đầu, database sẽ có sẵn:

### Điểm đến & Điểm tham quan

| Điểm đến | Điểm tham quan |
|----------|----------------|
| **Đà Nẵng** | Cầu Vàng – Bà Nà Hills, Ngũ Hành Sơn, Bán đảo Sơn Trà |
| **Hà Nội** | Hồ Hoàn Kiếm, Văn Miếu – Quốc Tử Giám, Phố cổ Hà Nội |
| **TP. Hồ Chí Minh** | Dinh Độc Lập, Phố đi bộ Nguyễn Huệ |
| **Lâm Đồng (Đà Lạt)** | Thung lũng Tình Yêu, Núi Langbiang |

### Dịch vụ

| Dịch vụ | Loại | Đối tác | Giá cơ bản |
|---------|------|---------|------------|
| Khách sạn Mỹ Khê Sunrise | Hotel ⭐4.6 | Biển Xanh Đà Nẵng | 1.200.000 đ/đêm |
| Tour Bà Nà Hills – Cầu Vàng 1 ngày | Tour ⭐4.8 | Biển Xanh Đà Nẵng | 850.000 đ/người |
| Tour Ngũ Hành Sơn – Làng đá Non Nước | Tour ⭐4.4 | Biển Xanh Đà Nẵng | 350.000 đ/người |
| Khách sạn Hồ Gươm Boutique | Hotel ⭐4.3 | Hà Nội Discovery | 950.000 đ/đêm |
| Vé xe limousine Hà Nội – Đà Nẵng (VIP) | Transport ⭐4.2 | Hà Nội Discovery | 450.000 đ/vé |
| Tour Sài Gòn về đêm – Ẩm thực đường phố | Tour ⭐4.7 | Hà Nội Discovery | 550.000 đ/người |

> Tất cả dịch vụ có lịch trống 30 ngày tới, giá cuối tuần tự động tăng 20%.

### Mã khuyến mãi

| Mã | Giảm | Giảm tối đa | Hạn dùng |
|----|------|-------------|----------|
| `SUMMER2025` | 15% | 300.000 đ | +3 tháng |
| `NEWUSER10` | 10% | 150.000 đ | +6 tháng |
| `EXPIRED50` | 50% | 500.000 đ | Đã hết hạn (để test) |

### Bookings mẫu

| Khách hàng | Dịch vụ | Trạng thái | Ghi chú |
|------------|---------|------------|---------|
| Lê Thị Hương | Tour Bà Nà Hills × 2 | ✅ Đã thanh toán | Dùng mã SUMMER2025 |
| Lê Thị Hương | Khách sạn Mỹ Khê × 3 đêm | ⏳ Chờ thanh toán | — |
| Phạm Văn Đức | Vé xe limousine × 2 | ✅ Đã thanh toán | Dùng mã NEWUSER10 |
| Phạm Văn Đức | Tour Sài Gòn về đêm × 3 | ❌ Đã hủy | — |
| Võ Thị Mai Anh | Khách sạn Hồ Gươm + Tour Bà Nà | ✅ Đã thanh toán | Combo 2 dịch vụ |

---

## 👥 Thành Viên Nhóm

| Họ và Tên | MSSV |
|-----------|------|
| Lê Nguyễn Châu Anh | 102230057 |
| Hồ Nguyễn Thảo Nguyên | 102230088 |
| Nguyễn Như Quỳnh | 102230099 |

---

## 📄 Bố Cục Báo Cáo Đồ Án

Theo yêu cầu của đồ án PBL5, báo cáo được trình bày theo cấu trúc:

1. **Mở đầu** — Lý do chọn đề tài, mục tiêu
2. **Chương 1: Cơ sở lý thuyết** — Clean Architecture, MVC, JWT, AI API
3. **Chương 2: Phân tích thiết kế hệ thống** — Use case, ERD, thiết kế CSDL
4. **Chương 3: Triển khai và đánh giá kết quả** — Demo giao diện, kết quả kiểm thử
5. **Kết luận và hướng phát triển**
6. **Tài liệu tham khảo**

---

<div align="center">

**TravelAI** — Đồ án PBL5 | Khoa Công nghệ Thông tin

*"Khám phá các điểm đến tuyệt vời cùng sự hỗ trợ của AI"*

</div>
