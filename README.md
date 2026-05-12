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
- [Thành viên nhóm](#-thành-viên-nhóm)

---

## 🎯 Giới Thiệu Chung

**TravelAI** là một nền tảng web tích hợp AI, được xây dựng nhằm giải quyết các bất cập trong trải nghiệm du lịch hiện đại:

- Thông tin du lịch bị phân tán trên nhiều website và ứng dụng khác nhau.
- Người dùng phải sử dụng nhiều nền tảng riêng lẻ để tìm địa điểm, lên lịch trình, đặt vé xe, khách sạn, tour du lịch.
- Thiếu công cụ hỗ trợ lập kế hoạch tổng thể theo ngân sách, thời gian và nhu cầu cá nhân.

**Mục tiêu** của hệ thống là xây dựng một website giúp:

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
| **Application** | Chứa logic nghiệp vụ, DTOs, Service Interfaces, Validators, AutoMapper Profiles. |
| **Infrastructure** | Triển khai cụ thể: EF Core DbContext, Repositories, tích hợp AI (Gemini, Groq), Email, Payment. |
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
| **SQL Server** | (LocalDB/Express) | Cơ sở dữ liệu chính |
| **JWT Bearer** | 10.0 | Xác thực & phân quyền |
| **BCrypt.Net-Next** | 4.1.0 | Mã hóa mật khẩu |
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
| **TanStack Query** | 5.90 | Quản lý state & fetching |
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
- **Lập kế hoạch du lịch** với AI: tạo lịch trình theo điểm đến, thời gian, ngân sách.
- Xem timeline lịch trình chi tiết theo từng ngày.
- **Đặt dịch vụ**: Khách sạn, Tour du lịch, Vé xe / phương tiện.
- Thanh toán trực tuyến (VNPay, Momo — mock payment).
- Nhận vé điện tử / mã QR sau khi đặt thành công.
- Theo dõi và quản lý lịch sử đặt dịch vụ.
- Hủy đặt chỗ theo chính sách hoàn hủy.
- Đánh giá dịch vụ sau khi sử dụng.
- **Chat AI** tích hợp để hỏi đáp và gợi ý du lịch.

### 🏢 Đối tác cung cấp dịch vụ (Partner)
- Dashboard tổng quan doanh thu và đơn hàng.
- Quản lý dịch vụ: đăng tải, chỉnh sửa thông tin chi tiết.
- Quản lý tồn kho: cập nhật số phòng trống, số ghế xe, suất tour theo thời gian thực.
- Quản lý giá: thiết lập giá cơ bản, giá theo mùa, khuyến mãi.
- Quản lý đơn hàng: xác nhận / từ chối yêu cầu đặt chỗ.
- Xem và phản hồi đánh giá từ khách hàng.
- Quản lý hồ sơ doanh nghiệp.

### 🔧 Quản trị viên (Admin)
- Kiểm duyệt và phê duyệt hồ sơ đối tác.
- Quản lý người dùng (kích hoạt / vô hiệu hóa tài khoản).
- Quản lý điểm đến và điểm tham quan.
- Kiểm duyệt dịch vụ mới đăng tải.
- Xem thống kê tổng quan hệ thống.

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
| `ServiceAvailability` | Quản lý giá theo ngày, tồn kho, trạng thái giữ chỗ |

### Nhóm 3 — Lập kế hoạch du lịch
| Bảng | Mô tả |
|------|-------|
| `Itineraries` | Thông tin tổng quan lịch trình (tiêu đề, ngày đi, ngân sách) |
| `ItineraryItems` | Chi tiết hoạt động theo mốc thời gian trong lịch trình |
| `AI_Suggestions_Logs` | Nhật ký hội thoại AI để tối ưu hóa gợi ý |

### Nhóm 4 — Đặt dịch vụ & Thanh toán
| Bảng | Mô tả |
|------|-------|
| `Promotions` | Mã giảm giá và chương trình khuyến mãi |
| `Bookings` | Đơn đặt dịch vụ tổng quát |
| `BookingItems` | Chi tiết từng dịch vụ trong đơn (snapshot giá) |
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
│   ├── Common/                         # BaseEntity, ValueObject
│   ├── Entities/                       # 21 Entity classes
│   ├── Enums/                          # BookingStatus, ServiceType, RoleName...
│   └── Interfaces/                     # IGenericRepository, IUnitOfWork
│
├── TravelAI.Application/               # Tầng Application
│   ├── Abstractions/                   # IApplicationDbContext, IDateTimeService
│   ├── DTOs/                           # Data Transfer Objects (Auth, Booking, Service...)
│   ├── Interfaces/                     # Service Interfaces (IBookingService, IAIPlannerService...)
│   ├── Mappings/                       # AutoMapper MappingProfile
│   ├── Services/                       # BookingService, AI Services
│   └── Validators/                     # FluentValidation (CreateBookingValidator)
│
├── TravelAI.Infrastructure/            # Tầng Infrastructure
│   ├── ExternalServices/
│   │   ├── AI/                         # Tích hợp Gemini AI
│   │   ├── Mail/                       # Email service
│   │   └── Payment/                    # VNPay, Momo integration
│   ├── Migrations/                     # EF Core Migrations
│   ├── Persistence/
│   │   ├── ApplicationDbContext.cs     # DbContext chính
│   │   ├── Configurations/             # Entity configurations
│   │   └── SeedData.cs                 # Dữ liệu mẫu
│   ├── Repositories/                   # GenericRepository, BookingRepository
│   └── Services/                       # Triển khai các Service Interfaces
│
├── TravelAI.WebAPI/                    # Tầng Presentation
│   ├── Controllers/                    # 14 API Controllers
│   │   ├── AuthController.cs
│   │   ├── AIController.cs
│   │   ├── ChatController.cs
│   │   ├── BookingsController.cs
│   │   ├── ItineraryController.cs
│   │   ├── ServicesController.cs
│   │   ├── DestinationsController.cs
│   │   ├── PartnerController.cs
│   │   ├── AdminController.cs
│   │   └── ...
│   ├── Extensions/                     # DI Extensions
│   ├── Middleware/                     # ExceptionMiddleware, LoggingMiddleware
│   ├── appsettings.json                # Cấu hình (DB, JWT, Gemini, Groq)
│   └── Program.cs                      # Entry point
│
├── travel-ai-ui/                       # Frontend React
│   ├── src/
│   │   ├── api/                        # Axios API calls
│   │   ├── components/                 # Shared components (Chatbox, HomeSearch...)
│   │   ├── hooks/                      # Custom React hooks
│   │   ├── layouts/                    # MainLayout
│   │   ├── pages/
│   │   │   ├── auth/                   # Login, Register
│   │   │   ├── customer/               # MyBookings, Checkout, Hotels, Tours...
│   │   │   ├── partner/                # Dashboard, ManageServices, Orders...
│   │   │   ├── Admin/                  # Stats, ManagePartners, ManageUsers...
│   │   │   ├── Planner/                # Timeline (AI Itinerary)
│   │   │   └── Preferences/            # UserPreferences
│   │   ├── store/                      # State management
│   │   └── App.tsx                     # Route definitions
│   ├── package.json
│   └── vite.config.ts
│
└── TravelAI_System.slnx                # Solution file (.NET)
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án

### Yêu cầu hệ thống

- [.NET SDK 10.0](https://dotnet.microsoft.com/download)
- [Node.js >= 20.x](https://nodejs.org/)
- [SQL Server](https://www.microsoft.com/en-us/sql-server) (LocalDB hoặc SQL Server Express)
- [Git](https://git-scm.com/)

---

### 1. Clone dự án

```bash
git clone <repository-url>
cd TravelAI_System
```

---

### 2. Cấu hình Backend

#### 2.1. Cập nhật Connection String

Mở file `TravelAI.WebAPI/appsettings.json` và chỉnh sửa chuỗi kết nối phù hợp với môi trường của bạn:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=.\\SQLEXPRESS;Database=TravelAI_DB;Trusted_Connection=True;TrustServerCertificate=True;"
  }
}
```

#### 2.2. Cấu hình API Keys (tùy chọn)

Cập nhật API keys cho Gemini AI và Groq trong `appsettings.json`:

```json
{
  "Gemini": {
    "ApiKey": "YOUR_GEMINI_API_KEY"
  },
  "Groq": {
    "ApiKey": "YOUR_GROQ_API_KEY"
  }
}
```

#### 2.3. Chạy Migration & Khởi động Backend

```bash
# Restore packages
dotnet restore TravelAI_System.slnx

# Chạy API (migration sẽ tự động chạy khi khởi động)
dotnet run --project TravelAI.WebAPI
```

Backend sẽ chạy tại: `https://localhost:7xxx` hoặc `http://localhost:5xxx`

Swagger UI có thể truy cập tại: `http://localhost:<port>/` (root path)

---

### 3. Cấu hình & Chạy Frontend

```bash
# Di chuyển vào thư mục frontend
cd travel-ai-ui

# Cài đặt dependencies
npm install

# Chạy development server
npm run dev
```

Frontend sẽ chạy tại: `http://localhost:5173`

> **Lưu ý:** CORS đã được cấu hình để cho phép kết nối từ `http://localhost:5173`.

---

### 4. Build Production

#### Backend

```bash
dotnet publish TravelAI.WebAPI -c Release -o ./publish
```

#### Frontend

```bash
cd travel-ai-ui
npm run build
```

---

### 5. Tài khoản mặc định (Seed Data)

Sau khi chạy lần đầu, hệ thống sẽ tự động tạo dữ liệu mẫu. Kiểm tra file `TravelAI.Infrastructure/Persistence/SeedData.cs` để xem thông tin tài khoản mặc định.

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
