# 🏨 Cập Nhật: Đặt Khách Sạn Nhiều Ngày & Bộ Lọc Theo Khoảng Thời Gian

## 📋 Tổng Quan Thay Đổi

Hệ thống đã được cập nhật để hỗ trợ:
1. ✅ **Đặt khách sạn nhiều ngày** (check-in và check-out)
2. ✅ **Đặt xe thuê nhiều ngày** (ngày nhận và ngày trả)
3. ✅ **Bộ lọc theo khoảng thời gian** cho Hotel và Transport

---

## 🔧 Chi Tiết Thay Đổi

### **A. Backend Changes**

#### 1️⃣ **ServiceFilterRequest.cs**
**File**: `TravelAI.Application/DTOs/Service/ServiceFilterRequest.cs`

**Thay đổi**:
- Thêm `CheckInDate` (DateTime?)
- Thêm `CheckOutDate` (DateTime?)

```csharp
// Date range filters for availability
public DateTime? CheckInDate { get; set; }
public DateTime? CheckOutDate { get; set; }
```

#### 2️⃣ **BookingService.cs**
**File**: `TravelAI.Infrastructure/Services/BookingService.cs`

**Thay đổi**:
- Thêm method `CreateHotelBookingAsync()` để xử lý đặt phòng nhiều đêm
- Thêm method `EnsureHotelAvailability()` để kiểm tra phòng trống
- Cập nhật `CreateDraftBookingAsync()` để phân biệt Hotel và Transport

**Logic**:
```csharp
// Hotel: Tính số đêm (checkout - checkin)
var nights = (checkOutDate - checkInDate).Days;

// Check availability cho mỗi đêm (KHÔNG bao gồm ngày checkout)
for (var date = checkInDate.Date; date < checkOutDate.Date; date = date.AddDays(1))
{
    // Check room availability
}

// Tính tổng tiền: Sum(price của mỗi đêm) * số phòng
var totalAmount = availabilities.Sum(a => a.Price) * request.Quantity;
```

#### 3️⃣ **ServiceService.cs**
**File**: `TravelAI.Infrastructure/Services/ServiceService.cs`

**Thay đổi**:
- Thêm date range filtering vào `ApplyFilters()`

**Logic**:
```csharp
// Nếu có cả CheckInDate và CheckOutDate
if (request.CheckInDate.HasValue && request.CheckOutDate.HasValue)
{
    // Lọc các service có phòng trống cho TẤT CẢ các ngày trong khoảng
    query = query.Where(s => 
        !_context.ServiceAvailabilities
            .Where(a => a.ServiceId == s.ServiceId 
                && a.Date >= checkInDate 
                && a.Date < checkOutDate)
            .Any(a => (a.TotalStock - (a.BookedCount + a.HeldCount)) <= 0)
    );
}
// Nếu chỉ có CheckInDate
else if (request.CheckInDate.HasValue)
{
    // Lọc các service có phòng trống cho ngày đó
}
```

---

### **B. Frontend Changes**

#### 1️⃣ **ServiceDetail.tsx**
**File**: `travel-ai-ui/src/pages/ServiceDetail.tsx`

**Thay đổi**:
- Thêm state `checkOutDate`
- Thêm logic phát hiện loại service (Hotel, Transport, Tour)
- Thêm UI date picker cho checkout
- Cập nhật tính giá cho multi-day booking
- Cập nhật `handleBooking()` và `handleAddToCart()`

**UI Changes**:
```tsx
// Hiển thị date picker cho checkout (chỉ với Hotel & Transport)
{isMultiDayService && (
  <div>
    <label>Ngày trả phòng / Ngày trả xe</label>
    <input type="date" value={checkOutDate} onChange={...} />
    <p>{nights} đêm / {days} ngày</p>
  </div>
)}
```

**Price Calculation**:
```tsx
// Hotel: số đêm = (checkout - checkin).days
const nights = Math.floor((checkOut - checkIn) / (1000 * 60 * 60 * 24));

// Transport: số ngày = (checkout - checkin).days + 1
const days = Math.floor((checkOut - checkIn) / (1000 * 60 * 60 * 24)) + 1;

// Giá = basePrice * số ngày/đêm
setActualPrice((service.basePrice ?? 0) * days);
```

#### 2️⃣ **ServiceFilterSidebar.tsx**
**File**: `travel-ai-ui/src/pages/Services/ServiceFilterSidebar.tsx`

**Thay đổi**:
- Thêm `checkInDate` và `checkOutDate` vào `ServiceFilterState`
- Thêm UI section "Khoảng thời gian" (chỉ hiển thị khi chọn Hotel hoặc Transport)

**UI**:
```tsx
{(value.serviceType === 'Hotel' || value.serviceType === 'Transport') && (
  <section className="...">
    <label>📅 Khoảng thời gian</label>
    <input type="date" label="Ngày nhận phòng/xe" />
    <input type="date" label="Ngày trả phòng/xe" min={checkInDate} />
    <p>{nights} đêm / {days} ngày</p>
  </section>
)}
```

#### 3️⃣ **Services.tsx**
**File**: `travel-ai-ui/src/pages/Services.tsx`

**Thay đổi**:
- Cập nhật `buildRequest()` để gửi `checkInDate` và `checkOutDate` lên backend

```tsx
const buildRequest = (filters, searchKeyword, pageNumber) => ({
  ...existingFields,
  checkInDate: filters.checkInDate || undefined,
  checkOutDate: filters.checkOutDate || undefined,
});
```

---

## 🎯 Cách Sử Dụng

### **1. Đặt Khách Sạn Nhiều Ngày**

1. Vào trang chi tiết khách sạn
2. Chọn **Ngày nhận phòng** từ calendar
3. Chọn **Ngày trả phòng** từ date picker
4. Hệ thống tự động tính:
   - Số đêm = (Ngày trả - Ngày nhận)
   - Tổng tiền = Giá mỗi đêm × Số đêm × Số phòng
5. Nhấn "ĐẶT CHỖ NGAY" hoặc "THÊM VÀO GIỎ HÀNG"

### **2. Tìm Khách Sạn Theo Khoảng Thời Gian**

1. Vào trang `/hotels`
2. Mở bộ lọc bên trái
3. Trong section **"📅 Khoảng thời gian"**:
   - Chọn **Ngày nhận phòng**
   - Chọn **Ngày trả phòng**
4. Hệ thống chỉ hiển thị các khách sạn có phòng trống cho TẤT CẢ các đêm trong khoảng thời gian đó

### **3. Thuê Xe Nhiều Ngày**

1. Vào trang chi tiết xe thuê (Transport với IsRental=true)
2. Chọn **Ngày nhận xe**
3. Chọ **Ngày trả xe**
4. Hệ thống tự động tính:
   - Số ngày = (Ngày trả - Ngày nhận) + 1
   - Tổng tiền = Giá mỗi ngày × Số ngày × Số xe
5. Đặt xe

---

## 🔍 Technical Details

### **Database Impact**
- ✅ Không cần migration (các field `CheckOutDate` đã tồn tại)
- ✅ Sử dụng `ServiceAvailability` table để check tồn kho

### **Validation Rules**

#### Backend:
- `CheckOutDate > CheckInDate` (bắt buộc)
- Kiểm tra availability cho MỖI ngày trong range
- Hotel: Không bao gồm checkout date
- Transport: Bao gồm cả checkout date

#### Frontend:
- Validate checkout date phải sau checkin date
- Min date cho checkout = checkin + 1 day
- Hiển thị số đêm/ngày real-time

### **Price Calculation**

#### Hotel (per night):
```
Total = Sum(price[date] for date in [checkin, checkout)) * quantity
```

#### Transport (per day):
```
Total = BasePrice * ((checkout - checkin).days + 1) * quantity
```

---

## 📊 Ví Dụ

### **Đặt khách sạn 3 đêm**
- Check-in: 2026-06-15
- Check-out: 2026-06-18
- Số đêm: 3 (15, 16, 17)
- Giá mỗi đêm: 500,000₫
- Số phòng: 2
- **Tổng tiền**: 500,000 × 3 × 2 = **3,000,000₫**

### **Thuê xe 5 ngày**
- Nhận xe: 2026-06-15
- Trả xe: 2026-06-19
- Số ngày: 5 (15, 16, 17, 18, 19)
- Giá mỗi ngày: 800,000₫
- Số xe: 1
- **Tổng tiền**: 800,000 × 5 × 1 = **4,000,000₫**

---

## ✅ Testing Checklist

- [x] Backend build thành công
- [x] Frontend TypeScript không có lỗi
- [x] Hotel booking với nhiều ngày hoạt động
- [x] Transport booking với nhiều ngày hoạt động
- [x] Date range filter cho Hotels
- [x] Date range filter cho Transport
- [x] Price calculation chính xác
- [x] Availability check cho tất cả ngày trong range
- [x] UI responsive và user-friendly

---

## 🚀 Deployment Notes

1. Deploy backend trước (API changes)
2. Deploy frontend sau (UI changes)
3. Test trên production:
   - Đặt hotel 1 đêm
   - Đặt hotel nhiều đêm
   - Filter hotels theo date range
   - Thuê xe nhiều ngày

---

## 📝 Future Enhancements

- [ ] Hiển thị giá chi tiết từng ngày trong calendar
- [ ] Discount cho booking dài ngày
- [ ] Dynamic pricing theo demand
- [ ] Blocked dates visualization
- [ ] Quick filters: "This weekend", "Next week"

---

**Created**: June 10, 2026
**Author**: Kiro AI Assistant
