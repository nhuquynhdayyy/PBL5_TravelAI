# 🚀 Quick Start - AI Planner

## Chạy Development Server

```bash
cd travel-ai-ui
npm run dev
```

Truy cập: `http://localhost:5173`

---

## Routes chính

| Route | Mô tả |
|-------|-------|
| `/planner` | Danh sách lịch trình đã lưu |
| `/itinerary/:id` | Chi tiết lịch trình |
| `/preferences` | Tạo lịch trình mới |

---

## Components mới

### 1. PlannerSidebar
```tsx
<PlannerSidebar
  destination="Đà Nẵng"
  startDate="2024-10-24"
  duration={3}
  budgetLevel={1}
  interests={['Biển', 'Thư giãn']}
  onRegenerate={handleOptimize}
  regenerating={false}
/>
```

### 2. DayTabs
```tsx
<DayTabs
  days={itinerary.days}
  activeDay={activeDay}
  onDayChange={setActiveDay}
/>
```

### 3. HotelCard
```tsx
<HotelCard
  activity={hotelActivity}
  isRecommended={true}
  onBook={handleBook}
/>
```

### 4. StickyFooter
```tsx
<StickyFooter
  totalCost={5000000}
  guestCount={2}
  onBookAll={handleBookAll}
/>
```

---

## API Endpoints cần có

```typescript
// Lấy lịch trình theo ID
GET /itinerary/:id

// Lấy danh sách lịch trình của user
GET /itinerary/my-trips

// Tối ưu lại lịch trình
POST /itinerary/:id/optimize

// Lưu lịch trình
POST /itinerary/save
```

---

## Dữ liệu mẫu

```json
{
  "trip_title": "Khám phá Đà Nẵng",
  "destination": "Đà Nẵng",
  "start_date": "2024-10-24",
  "total_estimated_cost": 5000000,
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
          "longitude": 108.2068,
          "start_time": "15:00",
          "duration": "1 đêm",
          "location": "Đà Nẵng",
          "description": "Khách sạn 5 sao...",
          "image_url": "https://..."
        }
      ]
    }
  ]
}
```

---

## Troubleshooting

### Map không hiển thị?
```bash
# Kiểm tra Leaflet CSS đã import
import 'leaflet/dist/leaflet.css';
```

### Sticky Footer che nội dung?
```tsx
// Đã thêm pb-32 trong Timeline.tsx
<div className="pb-32">
```

### TypeScript errors?
```bash
npm run build
# Kiểm tra console output
```

---

## Đọc thêm

- **Chi tiết**: `PLANNER_UPGRADE_GUIDE.md`
- **Demo**: `PLANNER_DEMO_GUIDE.md`
- **Tổng kết**: `PLANNER_FINAL_REPORT.md`
