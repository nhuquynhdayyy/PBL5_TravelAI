# 🔑 DANH SÁCH TÀI KHOẢN ĐĂNG NHẬP - TravelAI

## ⚠️ QUAN TRỌNG
**TẤT CẢ TÀI KHOẢN ĐỀU DÙNG MẬT KHẨU:** `123456`

---

## 👑 ADMIN (Quản trị viên)

| Thông tin | Giá trị |
|-----------|---------|
| **Email** | `admin@travelai.vn` |
| **Mật khẩu** | `123456` |
| **Họ tên** | Quản Trị Viên |
| **Quyền hạn** | Toàn quyền hệ thống |

**Có thể làm:**
- ✅ Xem dashboard thống kê tổng quan
- ✅ Duyệt/từ chối hồ sơ đối tác
- ✅ Quản lý người dùng (ban/unban)
- ✅ Quản lý điểm đến và điểm tham quan
- ✅ Kiểm duyệt dịch vụ mới

---

## 🏢 PARTNER (Đối tác cung cấp dịch vụ)

### Partner 1: Công ty Du lịch Đà Nẵng
| Thông tin | Giá trị |
|-----------|---------|
| **Email** | `partner.danang@travelai.vn` |
| **Mật khẩu** | `123456` |
| **Họ tên** | Trần Minh Khoa |
| **Doanh nghiệp** | Công ty Du lịch Biển Xanh Đà Nẵng |
| **Dịch vụ** | Khách sạn và Tour tại Đà Nẵng |

### Partner 2: Hà Nội Discovery Travel
| Thông tin | Giá trị |
|-----------|---------|
| **Email** | `partner.hanoi@travelai.vn` |
| **Mật khẩu** | `123456` |
| **Họ tên** | Nguyễn Thị Lan |
| **Doanh nghiệp** | Hà Nội Discovery Travel |
| **Dịch vụ** | Tour miền Bắc và Vé xe khách |

### Partner 3: Phương Trang Bus Lines
| Thông tin | Giá trị |
|-----------|---------|
| **Email** | `partner.phuongtrang@travelai.vn` |
| **Mật khẩu** | `123456` |
| **Họ tên** | Lê Văn Minh |
| **Doanh nghiệp** | Phương Trang – FUTA Bus Lines |
| **Dịch vụ** | Xe khách toàn quốc |

### Partner 4: Vietjet Air
| Thông tin | Giá trị |
|-----------|---------|
| **Email** | `partner.vietjet@travelai.vn` |
| **Mật khẩu** | `123456` |
| **Họ tên** | Nguyễn Thị Hồng |
| **Doanh nghiệp** | Vietjet Air |
| **Dịch vụ** | Máy bay nội địa |

**Partner có thể làm:**
- ✅ Xem dashboard doanh thu và đơn hàng
- ✅ Quản lý dịch vụ (thêm/sửa/xóa)
- ✅ Quản lý giá và lịch trống
- ✅ Xem và xử lý đơn đặt chỗ
- ✅ Phản hồi đánh giá khách hàng

---

## 🧳 CUSTOMER (Khách hàng)

### Customer 1: Lê Thị Hương
| Thông tin | Giá trị |
|-----------|---------|
| **Email** | `huong.le@gmail.com` |
| **Mật khẩu** | `123456` |
| **Họ tên** | Lê Thị Hương |
| **Sở thích** | Văn hóa & Lịch sử |
| **Ngân sách** | Trung bình |

### Customer 2: Phạm Văn Đức
| Thông tin | Giá trị |
|-----------|---------|
| **Email** | `duc.pham@gmail.com` |
| **Mật khẩu** | `123456` |
| **Họ tên** | Phạm Văn Đức |
| **Sở thích** | Khám phá & Mạo hiểm |
| **Ngân sách** | Cao |

### Customer 3: Võ Thị Mai Anh
| Thông tin | Giá trị |
|-----------|---------|
| **Email** | `maianh.vo@gmail.com` |
| **Mật khẩu** | `123456` |
| **Họ tên** | Võ Thị Mai Anh |
| **Sở thích** | Nghỉ dưỡng & Biển |
| **Ngân sách** | Tiết kiệm |

**Customer có thể làm:**
- ✅ Lập kế hoạch du lịch với AI
- ✅ Đặt dịch vụ (khách sạn, tour, vé xe/máy bay)
- ✅ Thanh toán trực tuyến
- ✅ Xem lịch sử booking
- ✅ Đánh giá dịch vụ
- ✅ Chat AI hỏi đáp

---

## 📝 LƯU Ý

1. **Mật khẩu giống nhau:** Tất cả tài khoản đều dùng mật khẩu `123456`
2. **Phân quyền tự động:** Hệ thống tự động phân quyền dựa trên email
3. **Dữ liệu mẫu:** Các tài khoản này đã có dữ liệu mẫu sẵn (bookings, reviews...)

---

## 🚀 CÁCH ĐĂNG NHẬP

1. Truy cập: http://localhost:5173
2. Nhập email (VD: `admin@travelai.vn`)
3. Nhập mật khẩu: `123456`
4. Click "Đăng nhập"

---

## 🔧 NẾU KHÔNG ĐĂNG NHẬP ĐƯỢC

### Kiểm tra Backend có chạy không:
```powershell
# Kiểm tra port
netstat -ano | findstr ":7001"
```

### Kiểm tra dữ liệu đã seed chưa:
```powershell
# Chạy lại backend để seed dữ liệu
cd TravelAI.WebAPI
dotnet run
```

### Reset database (nếu cần):
```powershell
# Xóa và tạo lại database
dotnet ef database drop --force --project TravelAI.Infrastructure --startup-project TravelAI.WebAPI
dotnet ef database update --project TravelAI.Infrastructure --startup-project TravelAI.WebAPI

# Chạy lại để seed
dotnet run --project TravelAI.WebAPI
```

---

**📌 TẤT CẢ MẬT KHẨU ĐỀU LÀ: `123456`** 🔐
