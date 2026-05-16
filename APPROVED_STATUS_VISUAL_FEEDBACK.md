# Approved Status Visual Feedback - Implementation

## 🎯 Vấn đề đã fix

### Trước khi fix:
❌ Khi bấm "Duyệt" đơn hàng, chỉ hiện thông báo "Đã duyệt thành công" nhưng status vẫn là "Đã thanh toán" (màu xanh lá) - **KHÔNG CÓ SỰ THAY ĐỔI TRỰC QUAN**

### Sau khi fix:
✅ Khi bấm "Duyệt", status thay đổi thành **"Đã duyệt"** (màu tím) - **RÕ RÀNG, DỄ NHẬN BIẾT**

---

## 🔧 Giải pháp Technical

### Backend Changes:

#### 1. Thêm 2 fields mới vào `Booking` entity:
```csharp
public class Booking {
    // ... existing fields
    public bool IsApprovedByPartner { get; set; } = false;
    public DateTime? ApprovedAt { get; set; }
}
```

#### 2. Database Migration (Program.cs):
```sql
ALTER TABLE [Bookings]
ADD [IsApprovedByPartner] BIT NOT NULL DEFAULT 0;

ALTER TABLE [Bookings]
ADD [ApprovedAt] DATETIME2 NULL;
```

#### 3. Update `PartnerOrderService.ApproveOrderAsync()`:
```csharp
// Cập nhật trạng thái approved
booking.IsApprovedByPartner = true;
booking.ApprovedAt = DateTime.UtcNow;
await _context.SaveChangesAsync();
```

#### 4. Update `PartnerController` endpoints:
```csharp
// GET /api/partner/orders
isApprovedByPartner = bi.Booking.IsApprovedByPartner,
approvedAt = bi.Booking.ApprovedAt

// GET /api/partner/orders/{id}
isApprovedByPartner = booking.IsApprovedByPartner,
approvedAt = booking.ApprovedAt
```

---

### Frontend Changes:

#### 1. Thêm status "Đã duyệt" (màu tím):
```typescript
const statusMap: Record<number, { label: string; className: string }> = {
    1: { label: 'Cho thanh toan', className: 'bg-amber-100 text-amber-700 ...' },
    2: { label: 'Da thanh toan', className: 'bg-emerald-100 text-emerald-700 ...' },
    3: { label: 'Da hoan tien', className: 'bg-sky-100 text-sky-700 ...' },
    4: { label: 'Da huy', className: 'bg-rose-100 text-rose-700 ...' },
    5: { label: 'Da duyet', className: 'bg-purple-100 text-purple-700 ...' } // NEW!
};
```

#### 2. Logic hiển thị status:
```typescript
function getStatusMeta(status: number | string, isApproved?: boolean) {
    // Nếu đã được duyệt bởi partner, hiển thị status "Đã duyệt"
    if (isApproved && resolveStatusKey(status) === 2) {
        return statusMap[5]; // "Đã duyệt" màu tím
    }
    
    const key = resolveStatusKey(status);
    return statusMap[key] ?? { ... };
}
```

#### 3. Ẩn nút approve/reject cho đơn đã duyệt:
```typescript
const isPaid = resolveStatusKey(order.status) === 2 && !order.isApprovedByPartner;
// Chỉ hiển thị nút khi: Paid = true VÀ chưa được duyệt
```

#### 4. Hiển thị ngày duyệt trong detail page:
```tsx
{order.isApprovedByPartner && order.approvedAt && (
    <div className="bg-purple-50 rounded-2xl p-5 border-2 border-purple-200">
        <div className="flex items-center gap-3 mb-3">
            <CheckCircle className="text-purple-600" size={20} />
            <span className="text-xs font-black uppercase tracking-[0.18em] text-purple-600">
                Ngay duyet
            </span>
        </div>
        <p className="text-lg font-bold text-purple-900">
            {new Date(order.approvedAt).toLocaleString('vi-VN')}
        </p>
        <p className="text-sm text-purple-600 mt-2">
            ✓ Don hang da duoc duyet boi partner
        </p>
    </div>
)}
```

---

## 🎨 Visual Changes

### Status Badge Colors:

| Status | Label | Color | Use Case |
|--------|-------|-------|----------|
| Pending (1) | Chờ thanh toán | 🟡 Amber | Đơn mới tạo, chưa thanh toán |
| Paid (2) | Đã thanh toán | 🟢 Green | Đã thanh toán, chờ partner duyệt |
| **Approved (5)** | **Đã duyệt** | **🟣 Purple** | **Đã thanh toán VÀ đã được partner duyệt** |
| Refunded (3) | Đã hoàn tiền | 🔵 Blue | Đã hoàn tiền cho khách |
| Cancelled (4) | Đã hủy | 🔴 Red | Đơn bị hủy |

### Before vs After:

**Before:**
```
Status: "Đã thanh toán" (xanh lá)
→ Bấm "Duyệt" 
→ Success modal
→ Status: "Đã thanh toán" (xanh lá) ❌ KHÔNG THAY ĐỔI
```

**After:**
```
Status: "Đã thanh toán" (xanh lá)
→ Bấm "Duyệt"
→ Success modal
→ Status: "Đã duyệt" (tím) ✅ THAY ĐỔI RÕ RÀNG
→ Nút "Duyệt" và "Từ chối" biến mất
→ Hiển thị ngày duyệt trong detail page
```

---

## 📊 Data Flow

### Approve Flow (Updated):

1. User clicks "Duyệt" button
2. Approve Modal hiện lên
3. User confirms
4. API call: `POST /api/partner/orders/{id}/approve`
5. **Backend updates:**
   - `IsApprovedByPartner = true`
   - `ApprovedAt = DateTime.UtcNow`
6. Success Modal hiện lên
7. **Frontend refreshes và hiển thị:**
   - Status badge: "Đã duyệt" (màu tím)
   - Nút "Duyệt" và "Từ chối" biến mất
   - Trong detail page: Hiển thị card "Ngày duyệt" màu tím

---

## 🔍 Logic Details

### Backend Validation:

```csharp
public async Task<bool> ApproveOrderAsync(int bookingId, int partnerId)
{
    // 1. Kiểm tra booking tồn tại
    // 2. Kiểm tra partner ownership
    // 3. Kiểm tra status = Paid
    // 4. Kiểm tra chưa được approve (NEW!)
    if (booking.IsApprovedByPartner)
    {
        return false; // Đã được duyệt rồi, không cho duyệt lại
    }
    
    // 5. Update approved status
    booking.IsApprovedByPartner = true;
    booking.ApprovedAt = DateTime.UtcNow;
    await _context.SaveChangesAsync();
    
    // 6. Send email
    // ...
}
```

### Frontend Display Logic:

```typescript
// PartnerOrders.tsx
const status = getStatusMeta(order.status, order.isApprovedByPartner);
const isPaid = resolveStatusKey(order.status) === 2 && !order.isApprovedByPartner;

// PartnerOrderDetail.tsx
const statusKey = order.isApprovedByPartner && order.status === 2 ? 5 : order.status;
const canApproveOrReject = order.status === 2 && !order.isApprovedByPartner;
```

---

## ✅ Testing Checklist

### Backend:
- [x] Database migration adds 2 new columns
- [x] ApproveOrderAsync updates IsApprovedByPartner = true
- [x] ApproveOrderAsync sets ApprovedAt timestamp
- [x] Cannot approve already approved order
- [x] GET /api/partner/orders returns isApprovedByPartner
- [x] GET /api/partner/orders/{id} returns isApprovedByPartner and approvedAt

### Frontend:
- [x] Status "Đã duyệt" hiển thị màu tím
- [x] Nút "Duyệt" và "Từ chối" biến mất sau khi approve
- [x] Danh sách orders tự động refresh sau approve
- [x] Detail page hiển thị card "Ngày duyệt" màu tím
- [x] Card "Ngày duyệt" chỉ hiển thị khi isApprovedByPartner = true

### User Experience:
- [x] Approve → Status thay đổi từ "Đã thanh toán" (xanh) → "Đã duyệt" (tím)
- [x] Visual feedback rõ ràng, dễ nhận biết
- [x] Không thể approve lại đơn đã duyệt
- [x] Timestamp ghi nhận thời điểm duyệt

---

## 🎯 Benefits

### 1. **Visual Clarity**
- ✅ Status "Đã duyệt" màu tím khác biệt rõ ràng với "Đã thanh toán" màu xanh
- ✅ Partner dễ dàng phân biệt đơn đã duyệt vs chưa duyệt
- ✅ Nút action biến mất sau khi duyệt → tránh nhầm lẫn

### 2. **Data Tracking**
- ✅ Lưu timestamp khi duyệt (`ApprovedAt`)
- ✅ Có thể audit/report đơn đã duyệt
- ✅ Có thể tính thời gian xử lý đơn hàng

### 3. **Business Logic**
- ✅ Phân biệt rõ 3 trạng thái:
  - Paid + Not Approved → Chờ partner duyệt
  - Paid + Approved → Đã được duyệt, sẵn sàng phục vụ
  - Cancelled/Refunded → Đơn không còn hiệu lực

### 4. **User Experience**
- ✅ Feedback trực quan ngay lập tức
- ✅ Không cần đọc text, nhìn màu sắc là biết
- ✅ Giảm confusion và support requests

---

## 📝 Database Schema

### Before:
```sql
CREATE TABLE Bookings (
    BookingId INT PRIMARY KEY,
    UserId INT,
    TotalAmount DECIMAL(18,2),
    Status INT, -- 1=Pending, 2=Paid, 3=Refunded, 4=Cancelled
    CreatedAt DATETIME2
);
```

### After:
```sql
CREATE TABLE Bookings (
    BookingId INT PRIMARY KEY,
    UserId INT,
    TotalAmount DECIMAL(18,2),
    Status INT, -- 1=Pending, 2=Paid, 3=Refunded, 4=Cancelled
    CreatedAt DATETIME2,
    IsApprovedByPartner BIT NOT NULL DEFAULT 0, -- NEW!
    ApprovedAt DATETIME2 NULL -- NEW!
);
```

---

## 🚀 Deployment Notes

1. **Database Migration**: Tự động chạy khi start backend (Program.cs)
2. **Backward Compatible**: Existing data có `IsApprovedByPartner = false` (default)
3. **No Breaking Changes**: Frontend vẫn hoạt động với old data
4. **Gradual Rollout**: Có thể deploy backend trước, frontend sau

---

## 🎉 Kết luận

Đã fix hoàn toàn vấn đề "không thấy sự thay đổi sau khi duyệt":

✅ **Backend**: Thêm `IsApprovedByPartner` và `ApprovedAt` fields
✅ **Database**: Migration tự động
✅ **API**: Trả về approved status
✅ **Frontend**: Hiển thị status "Đã duyệt" màu tím
✅ **UX**: Visual feedback rõ ràng, nút action biến mất
✅ **Build**: Cả backend và frontend build thành công

Giờ đây partner có thể **NHÌN THẤY RÕ RÀNG** đơn hàng nào đã được duyệt!
