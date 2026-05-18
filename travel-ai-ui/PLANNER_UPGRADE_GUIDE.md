# 🎨 Hướng dẫn Nâng cấp Giao diện AI Planner

## 📋 Tổng quan

Giao diện AI Planner đã được nâng cấp hoàn toàn theo bản thiết kế chuyên nghiệp với bố cục 3 cột:
- **Sidebar trái**: Bộ lọc và tham số chuyến đi
- **Timeline giữa**: Lịch trình chi tiết với Day Tabs
- **Map phải**: Bản đồ tương tác Leaflet

## 🎯 Các Component Mới

### 1. **PlannerSidebar.tsx**
Sidebar bên trái chứa các tham số:
- Điểm đến (Destination)
- Ngày bắt đầu (Start Date)
- Số ngày (Duration: 3/5/7 ngày)
- Mức ngân sách (Budget Level: $/$$/$$)
- Tâm trạng & Sở thích (Mood & Interests)
- Nút "Tạo lại lịch trình" (Regenerate)

**Props:**
```typescript
{
  destination: string;
  startDate?: string;
  duration: number;
  budgetLevel: number;
  interests: string[];
  onRegenerate: () => void;
  regenerating: boolean;
}
```

### 2. **DayTabs.tsx**
Tab chuyển đổi giữa các ngày mượt mà:
```typescript
{
  days: Array<{ day: number; dateLabel?: string }>;
  activeDay: number;
  onDayChange: (day: number) => void;
}
```

### 3. **HotelCard.tsx**
Thẻ khách sạn đặc biệt với:
- Gradient background (blue → cyan)
- Badge "Đề xuất" (Recommended) cho Partner hotels
- Amenities icons (Wifi, Breakfast, Pool)
- Giá gạch ngang (discount effect)
- Nút "Xem chi tiết"

**Props:**
```typescript
{
  activity: ItineraryActivity;
  isRecommended?: boolean;
  onBook: (activity: ItineraryActivity) => void;
}
```

### 4. **StickyFooter.tsx**
Thanh thanh toán cố định ở dưới cùng:
- Hiển thị tổng tiền
- Số lượng khách
- Nút "Đặt toàn bộ lịch trình" (Book All in One)

**Props:**
```typescript
{
  totalCost: number;
  guestCount?: number;
  onBookAll: () => void;
  disabled?: boolean;
}
```

## 🔄 Thay đổi trong ItineraryTimeline.tsx

### Trước:
- Hiển thị tất cả ngày cùng lúc
- Không có HotelCard riêng
- Không có rating stars

### Sau:
- Chỉ hiển thị ngày đang active
- HotelCard riêng cho `activity.kind === 'hotel'`
- Rating stars (fake data: 4.5-4.9)
- Click vào activity để focus map
- Dark mode support

## 🗺️ Tích hợp với Map

**ItineraryMap.tsx** đã có sẵn và hoạt động tốt:
- Leaflet với OpenStreetMap tiles
- Marker cho từng activity
- Polyline nối các điểm trong ngày
- Auto-focus khi thay đổi activeDay
- Popup hiển thị thông tin activity

## 🛒 Tích hợp với Cart

### Chức năng "Book All in One"
```typescript
const handleBookAll = () => {
  // Lọc các activity có serviceId
  const bookableActivities = flattenActivities(itinerary.days)
    .filter((activity) => activity.serviceId);

  // Thêm tất cả vào giỏ hàng
  bookableActivities.forEach((activity) => {
    addItem({
      serviceId: activity.serviceId,
      serviceName: activity.title,
      checkInDate: calculateCheckInDate(activity.day),
      price: activity.estimatedCost,
      quantity: 1,
    });
  });

  navigate('/cart');
};
```

## 🎨 Dark Mode

Tất cả component đều hỗ trợ Dark Mode với Tailwind classes:
```css
/* Light Mode */
bg-white text-slate-900

/* Dark Mode */
dark:bg-slate-900 dark:text-white
```

## 📊 Ánh xạ Dữ liệu API

### Dữ liệu từ Backend:
```json
{
  "trip_title": "Khám phá Đà Nẵng",
  "destination": "Đà Nẵng",
  "total_estimated_cost": 5000000,
  "start_date": "2024-10-24",
  "days": [
    {
      "day": 1,
      "activities": [
        {
          "title": "Melia Vinpearl Danang",
          "kind": "hotel",
          "service_id": 123,
          "estimated_cost": 950000,
          "latitude": 16.0471,
          "longitude": 108.2068
        }
      ]
    }
  ]
}
```

### Mapping trong Code:
```typescript
// normalizeItinerary() trong itineraryUtils.ts
const normalized: ItineraryViewModel = {
  itineraryId: data.itinerary_id,
  tripTitle: data.trip_title,
  destination: data.destination,
  startDate: data.start_date,
  totalEstimatedCost: data.total_estimated_cost,
  days: data.days.map(day => ({
    day: day.day,
    dateLabel: formatDateLabel(day.date),
    activities: day.activities.map(act => ({
      id: generateId(),
      title: act.title,
      kind: act.kind || 'sightseeing',
      serviceId: act.service_id,
      estimatedCost: act.estimated_cost,
      latitude: act.latitude,
      longitude: act.longitude,
      // ...
    }))
  }))
};
```

## 🏷️ Đánh dấu "Recommended" cho Partner Hotels

### Logic:
```typescript
// Trong Timeline.tsx
const isPartnerHotel = (activity: ItineraryActivity) => {
  // Kiểm tra nếu serviceId tồn tại và là Partner
  return activity.serviceId !== null && activity.kind === 'hotel';
};

// Render HotelCard
<HotelCard
  activity={activity}
  isRecommended={isPartnerHotel(activity)}
  onBook={handleBook}
/>
```

### Cách Backend đánh dấu:
Backend cần trả về `service_id` cho các khách sạn là Partner. Nếu `service_id !== null`, frontend sẽ tự động hiển thị badge "Đề xuất".

## 🚀 Cách sử dụng

### 1. Xem lịch trình
```
/planner → Hiển thị danh sách lịch trình đã lưu
/itinerary/:id → Xem chi tiết lịch trình
```

### 2. Tạo lịch trình mới
```
/preferences → Nhập sở thích
→ AI tạo lịch trình
→ Navigate to /planner với state.data
```

### 3. Tối ưu lại
```typescript
// Gọi API optimize
POST /itinerary/:id/optimize
→ AI sắp xếp lại thứ tự điểm đến
→ Update state với lịch trình mới
```

### 4. Đặt toàn bộ
```typescript
// Click "Đặt toàn bộ lịch trình"
→ Thêm tất cả dịch vụ vào Cart
→ Navigate to /cart
→ Checkout
```

## 🎯 Tính năng nổi bật

### ✅ Đã hoàn thành:
- [x] Bố cục 3 cột responsive
- [x] Sidebar với bộ lọc
- [x] Day Tabs mượt mà
- [x] HotelCard với gradient
- [x] ActivityCard với rating stars
- [x] Sticky Footer với "Book All"
- [x] Tích hợp Leaflet Map
- [x] Dark Mode support
- [x] Việt hóa toàn bộ UI
- [x] Tích hợp CartContext
- [x] Export PDF

### 🔮 Có thể mở rộng:
- [ ] Drag & drop để sắp xếp activities
- [ ] Real-time collaboration
- [ ] Share lịch trình qua link
- [ ] In-app chat với AI
- [ ] Weather forecast integration
- [ ] Price comparison với các OTA khác

## 🐛 Troubleshooting

### Map không hiển thị?
```bash
# Kiểm tra Leaflet CSS đã import
import 'leaflet/dist/leaflet.css';

# Kiểm tra container có height
<div className="h-[640px]">
  <MapContainer>...</MapContainer>
</div>
```

### Sticky Footer bị che?
```css
/* Thêm padding-bottom cho container */
<div className="pb-24">
  {/* Content */}
</div>
```

### Dark Mode không hoạt động?
```javascript
// Kiểm tra Tailwind config
// tailwind.config.js
module.exports = {
  darkMode: 'class', // hoặc 'media'
  // ...
}
```

## 📞 Liên hệ

Nếu có vấn đề, hãy kiểm tra:
1. Console logs
2. Network tab (API responses)
3. React DevTools (component state)
4. Tailwind classes (inspect element)

---

**Phiên bản**: 2.0.0  
**Ngày cập nhật**: 2026-05-18  
**Tác giả**: Kiro AI Assistant
