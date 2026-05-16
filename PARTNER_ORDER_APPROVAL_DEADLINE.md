# Cải Tiến: Partner Phải Duyệt Thủ Công Trong 24-48h

## Tổng Quan
Hệ thống đã được cải tiến để yêu cầu partner phải duyệt đơn hàng thủ công trong vòng 24-48 giờ sau khi khách hàng thanh toán. Nếu partner không duyệt kịp thời, đơn hàng sẽ được tự động phê duyệt.

## Các Thay Đổi Chính

### 1. Backend Changes

#### 1.1 Database Schema
- **Booking Entity** đã có sẵn các trường:
  - `IsApprovedByPartner` (bool): Trạng thái duyệt của partner
  - `ApprovedAt` (DateTime?): Thời điểm duyệt
  - `ApprovalDeadline` (DateTime?): Thời hạn duyệt (mặc định 48h)

#### 1.2 Background Jobs
Đã tạo 2 background jobs mới:

**a) OrderApprovalTimeoutJob** (`TravelAI.Infrastructure/BackgroundJobs/OrderApprovalTimeoutJob.cs`)
- Chạy mỗi 10 phút
- Tự động duyệt các đơn hàng quá hạn
- Gửi email thông báo cho khách hàng và partner
- Logic:
  ```csharp
  - Tìm đơn hàng: Status = Paid, IsApprovedByPartner = false, ApprovalDeadline <= now
  - Tự động set: IsApprovedByPartner = true, ApprovedAt = now
  - Gửi email cho khách hàng: "Đơn hàng đã được duyệt"
  - Gửi email cảnh báo cho partner: "Đơn hàng tự động duyệt do quá hạn"
  ```

**b) OrderApprovalReminderJob** (`TravelAI.Infrastructure/BackgroundJobs/OrderApprovalReminderJob.cs`)
- Chạy mỗi 30 phút
- Gửi email nhắc nhở partner khi còn 12h và 2h trước deadline
- Logic:
  ```csharp
  - Nhắc nhở 12h: Khi còn 11-13h (để tránh gửi nhiều lần)
  - Nhắc nhở 2h: Khi còn 1.5-2.5h (khẩn cấp)
  - Email bao gồm: Mã đơn, tổng tiền, thời hạn duyệt
  ```

#### 1.3 Configuration
**appsettings.json** - Thêm section cấu hình:
```json
{
  "OrderApproval": {
    "DefaultDeadlineHours": 48,
    "MinDeadlineHours": 24,
    "MaxDeadlineHours": 72,
    "ReminderHours": [12, 2]
  }
}
```

#### 1.4 API Endpoints
**PartnerController** - Cập nhật endpoints:

**GET /api/partner/orders**
- Thêm trả về: `approvalDeadline`, `hoursUntilDeadline`
- `hoursUntilDeadline`: Số giờ còn lại để duyệt (tính real-time)

**GET /api/partner/orders/{bookingId}**
- Thêm trả về: `approvalDeadline`, `hoursUntilDeadline`

**GET /api/partner/orders/pending-count** (MỚI)
- Trả về số lượng đơn hàng chờ duyệt
- Dùng để hiển thị badge notification

#### 1.5 Service Updates
**BookingService.cs**
- Thay đổi deadline từ 24h → 48h:
  ```csharp
  ApprovalDeadline = DateTime.UtcNow.AddHours(48)
  ```

#### 1.6 Program.cs
- Đăng ký 2 background jobs:
  ```csharp
  builder.Services.AddHostedService<OrderApprovalTimeoutJob>();
  builder.Services.AddHostedService<OrderApprovalReminderJob>();
  ```

### 2. Frontend Changes

#### 2.1 PartnerOrders.tsx
**Thêm Type Definition:**
```typescript
type PartnerOrder = {
  // ... existing fields
  approvalDeadline?: string;
  hoursUntilDeadline?: number;
}
```

**Thêm Function formatDeadlineCountdown:**
```typescript
function formatDeadlineCountdown(hoursUntilDeadline?: number) {
  if (!hoursUntilDeadline || hoursUntilDeadline <= 0) {
    return { text: 'Đã hết hạn', className: 'text-rose-600', urgent: true };
  }
  
  if (hoursUntilDeadline < 2) {
    const minutes = Math.floor(hoursUntilDeadline * 60);
    return { 
      text: `Còn ${minutes} phút`, 
      className: 'text-rose-600 animate-pulse', 
      urgent: true 
    };
  }
  
  if (hoursUntilDeadline < 12) {
    const hours = Math.floor(hoursUntilDeadline);
    return { 
      text: `Còn ${hours}h`, 
      className: 'text-amber-600', 
      urgent: true 
    };
  }
  
  const hours = Math.floor(hoursUntilDeadline);
  return { 
    text: `Còn ${hours}h`, 
    className: 'text-slate-600', 
    urgent: false 
  };
}
```

**UI Updates:**
- Thêm cột "Deadline" trong bảng desktop
- Hiển thị countdown với màu sắc:
  - Xanh/Xám: > 12h
  - Vàng: 2-12h
  - Đỏ (pulse): < 2h
  - Đỏ: Đã hết hạn
- Thêm warning box trong mobile view khi còn < 12h

## Workflow Hoàn Chỉnh

### 1. Khách Hàng Đặt Hàng
```
1. Khách tạo booking → Status = Pending
2. Khách thanh toán → Status = Paid
3. Hệ thống set ApprovalDeadline = now + 48h
```

### 2. Partner Nhận Thông Báo
```
Timeline:
- T+0h: Đơn hàng xuất hiện trong danh sách "Chờ duyệt"
- T+36h: Email nhắc nhở lần 1 (còn 12h)
- T+46h: Email nhắc nhở lần 2 - KHẨN CẤP (còn 2h)
- T+48h: Tự động duyệt nếu partner chưa xử lý
```

### 3. Partner Xử Lý
**Option A: Duyệt đơn**
```
- Partner click "Duyệt"
- Set: IsApprovedByPartner = true, ApprovedAt = now
- Gửi email cho khách: "Đơn hàng đã được duyệt"
- Status hiển thị: "Đã duyệt"
```

**Option B: Từ chối đơn**
```
- Partner click "Từ chối" + nhập lý do
- Set: Status = Cancelled
- Tạo Refund 100%
- Giải phóng inventory (BookedCount--)
- Gửi email cho khách: "Đơn hàng bị từ chối" + lý do
```

**Option C: Không xử lý (quá 48h)**
```
- Background job tự động duyệt
- Set: IsApprovedByPartner = true, ApprovedAt = now
- Gửi email cho khách: "Đơn hàng đã được duyệt"
- Gửi email cảnh báo cho partner: "Tự động duyệt do quá hạn"
```

## Email Templates

### 1. Email Nhắc Nhở (12h)
```
Subject: Nhắc nhở: Duyệt đơn hàng #123 - Còn 12 giờ

Xin chào [Partner Name],

Đơn hàng #123 cần được duyệt trong vòng 12 giờ nữa!

Thông tin đơn hàng:
- Mã đơn: #123
- Tổng tiền: 1,000,000 VND
- Thời hạn duyệt: 28/04/2026 14:30

Vui lòng đăng nhập vào hệ thống để duyệt hoặc từ chối đơn hàng.
```

### 2. Email Nhắc Nhở Khẩn Cấp (2h)
```
Subject: [KHẨN CẤP] Nhắc nhở: Duyệt đơn hàng #123 - Còn 2 giờ

Xin chào [Partner Name],

⚠️ Đơn hàng #123 cần được duyệt trong vòng 2 giờ nữa!

Thông tin đơn hàng:
- Mã đơn: #123
- Tổng tiền: 1,000,000 VND
- Thời hạn duyệt: 28/04/2026 14:30

⚠️ Nếu không duyệt kịp, đơn hàng sẽ được tự động phê duyệt!
```

### 3. Email Tự Động Duyệt (Partner)
```
Subject: Đơn hàng #123 đã được tự động duyệt

Xin chào [Partner Name],

Đơn hàng #123 đã quá thời hạn duyệt (48 giờ) và được hệ thống tự động phê duyệt.

Vui lòng kiểm tra và chuẩn bị dịch vụ cho khách hàng.

Lưu ý: Hãy duyệt đơn hàng kịp thời để tránh tự động duyệt trong tương lai.
```

## Testing Checklist

### Backend
- [ ] Background jobs chạy đúng interval
- [ ] Tự động duyệt đơn hàng quá hạn
- [ ] Gửi email nhắc nhở đúng thời điểm
- [ ] API trả về đúng `hoursUntilDeadline`
- [ ] Không gửi email trùng lặp

### Frontend
- [ ] Hiển thị countdown chính xác
- [ ] Màu sắc thay đổi theo thời gian còn lại
- [ ] Animation pulse khi < 2h
- [ ] Mobile view hiển thị warning box
- [ ] Desktop view hiển thị cột deadline

### Integration
- [ ] Workflow hoàn chỉnh từ đặt hàng → tự động duyệt
- [ ] Email gửi đúng người nhận
- [ ] Timezone xử lý chính xác (UTC)

## Cấu Hình Tùy Chỉnh

Để thay đổi thời hạn duyệt, chỉnh sửa `appsettings.json`:

```json
{
  "OrderApproval": {
    "DefaultDeadlineHours": 24,  // Thay đổi từ 48 → 24
    "ReminderHours": [6, 1]      // Nhắc nhở khi còn 6h và 1h
  }
}
```

## Lưu Ý Quan Trọng

1. **Timezone**: Tất cả thời gian sử dụng UTC để tránh lỗi múi giờ
2. **Email Service**: Hiện tại chỉ log ra console, cần implement SendGrid thực tế
3. **Performance**: Background jobs chạy mỗi 10-30 phút, có thể tối ưu nếu cần real-time hơn
4. **Notification**: Có thể thêm push notification hoặc SMS cho partner
5. **Dashboard**: Có thể thêm dashboard thống kê tỷ lệ tự động duyệt

## Mở Rộng Tương Lai

1. **Cấu hình linh hoạt theo service**: Mỗi dịch vụ có thể có deadline khác nhau
2. **Escalation**: Gửi thông báo cho admin nếu partner không phản hồi
3. **Analytics**: Theo dõi tỷ lệ tự động duyệt, thời gian phản hồi trung bình
4. **Penalty**: Phạt partner nếu tỷ lệ tự động duyệt quá cao
5. **Real-time notification**: WebSocket/SignalR để cập nhật countdown real-time
