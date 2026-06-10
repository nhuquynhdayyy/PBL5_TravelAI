import type { ActivityKind, ItineraryActivity, ItineraryDay, ItineraryViewModel } from './itineraryTypes';

const API_HOST = 'http://localhost:5134';

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0) + 'đ';

export const getImageUrl = (url?: string, kind?: string, title?: string) => {
  if (!url) {
    const normalizedTitle = title ? title.toLowerCase() : '';
    if (kind === 'food' || normalizedTitle.includes('ăn') || normalizedTitle.includes('cafe') || normalizedTitle.includes('cà phê') || normalizedTitle.includes('nhà hàng') || normalizedTitle.includes('quán')) {
      return 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1200'; // food/restaurant
    }
    if (kind === 'hotel' || normalizedTitle.includes('khách sạn') || normalizedTitle.includes('resort') || normalizedTitle.includes('chỗ nghỉ')) {
      return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200'; // hotel
    }
    if (kind === 'transport' || normalizedTitle.includes('xe') || normalizedTitle.includes('di chuyển') || normalizedTitle.includes('sân bay') || normalizedTitle.includes('đi lại')) {
      return 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=1200'; // car/transport
    }
    // Default sightseeing/nature categories based on title
    if (normalizedTitle.includes('biển') || normalizedTitle.includes('beach') || normalizedTitle.includes('sông') || normalizedTitle.includes('vịnh') || normalizedTitle.includes('bán đảo')) {
      return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200'; // beach
    }
    if (normalizedTitle.includes('chùa') || normalizedTitle.includes('ngũ hành sơn') || normalizedTitle.includes('bảo tàng') || normalizedTitle.includes('di tích') || normalizedTitle.includes('núi') || normalizedTitle.includes('sơn')) {
      return 'https://images.unsplash.com/photo-1542856391-010fb87dcfed?q=80&w=1200'; // cultural/historical spot
    }
    return 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200'; // default road
  }
  return url.startsWith('http') ? url : `${API_HOST}${url}`;
};

export const parseLocalDate = (value?: string) => {
  if (!value) return null;

  const datePart = value.split('T')[0].trim();

  // Case 1: DD/MM/YYYY
  const matchDmy = datePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (matchDmy) {
    const [, d, m, y] = matchDmy;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  // Case 2: YYYY-MM-DD
  const matchYmd = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchYmd) {
    const [, y, m, d] = matchYmd;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  // Fallback
  try {
    const date = new Date(datePart);
    if (!isNaN(date.getTime())) return date;
  } catch (e) {
    console.error(e);
  }

  return null;
};

export const formatDateLabel = (date: Date) =>
  new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);

export const toInputDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const valueOf = <T,>(source: any, keys: string[], fallback: T): T => {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null) return source[key] as T;
  }

  return fallback;
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const inferKind = (activity: any): ActivityKind => {
  const source = normalizeText(
    [
      valueOf(activity, ['activityType', 'type', 'category', 'kind', 'serviceType'], ''),
      valueOf(activity, ['title', 'name', 'serviceName', 'spotName'], ''),
      valueOf(activity, ['description'], ''),
    ].join(' '),
  );

  if (source.includes('hotel') || source.includes('khach san') || source.includes('resort')) return 'hotel';
  if (source.includes('transport') || source.includes('di chuyen') || source.includes('xe') || source.includes('taxi')) return 'transport';
  if (source.includes('food') || source.includes('restaurant') || source.includes('an uong') || source.includes('am thuc')) return 'food';
  if (valueOf(activity, ['serviceId', 'service_id'], null)) return 'service';

  return 'sightseeing';
};

const toNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeTime = (value: unknown, fallback: string) => {
  if (!value) return fallback;
  const text = String(value);
  const match = text.match(/\d{1,2}:\d{2}/);
  if (match) return match[0].padStart(5, '0');
  return text;
};

const getActivityTitle = (activity: any) =>
  valueOf(activity, ['title', 'name', 'serviceName', 'spotName', 'location'], 'Hoạt động trong lịch trình');

const normalizeActivity = (activity: any, day: number, index: number): ItineraryActivity => {
  const fallbackStart = `${String(8 + index * 2).padStart(2, '0')}:00`;
  const fallbackEnd = `${String(10 + index * 2).padStart(2, '0')}:00`;
  const serviceId = valueOf<number | null>(activity, ['serviceId', 'service_id'], null);
  const startTime = normalizeTime(valueOf(activity, ['startTime', 'start_time', 'timeFrom', 'from'], ''), fallbackStart);
  const endTime = normalizeTime(valueOf(activity, ['endTime', 'end_time', 'timeTo', 'to'], ''), fallbackEnd);

  return {
    id: String(valueOf(activity, ['id', 'activityId', 'activity_id'], `${day}-${index}`)),
    title: getActivityTitle(activity),
    location: valueOf(activity, ['location', 'address', 'spotName', 'serviceName'], 'Chưa có địa chỉ'),
    description: valueOf(activity, ['description', 'note', 'notes'], 'Chi tiết hoạt động đang được cập nhật.'),
    day,
    startTime,
    endTime,
    duration: valueOf(activity, ['duration', 'durationText'], `${startTime} - ${endTime}`),
    imageUrl: valueOf(activity, ['imageUrl', 'image_url', 'coverImageUrl', 'thumbnailUrl'], undefined),
    estimatedCost: Number(valueOf(activity, ['estimatedCost', 'estimated_cost', 'cost', 'price'], 0)) || 0,
    serviceId,
    latitude: toNumber(valueOf(activity, ['latitude', 'lat'], null)),
    longitude: toNumber(valueOf(activity, ['longitude', 'lng', 'lon'], null)),
    kind: inferKind(activity),
  };
};

const getDayDateLabel = (startDate: string | undefined, dayNumber: number) => {
  const start = parseLocalDate(startDate);
  if (!start) return undefined;

  const date = new Date(start);
  date.setDate(date.getDate() + Math.max(dayNumber - 1, 0));
  return formatDateLabel(date);
};

export const normalizeItinerary = (payload: any): ItineraryViewModel => {
  const data = payload?.data || payload;
  const startDate = valueOf<string | undefined>(data, ['startDate', 'start_date'], undefined);
  const rawDays = Array.isArray(data?.days) ? data.days : [];
  const flatActivities = Array.isArray(data?.activities) ? data.activities : [];
  const dayMap = new Map<number, ItineraryActivity[]>();

  rawDays.forEach((dayItem: any, dayIndex: number) => {
    const dayNumber = Number(valueOf(dayItem, ['day', 'dayNumber', 'day_number'], dayIndex + 1)) || dayIndex + 1;
    const activities = Array.isArray(dayItem?.activities) ? dayItem.activities : [];
    dayMap.set(
      dayNumber,
      activities
        .map((activity: any, activityIndex: number) => normalizeActivity(activity, dayNumber, activityIndex))
        .sort((a: ItineraryActivity, b: ItineraryActivity) => a.startTime.localeCompare(b.startTime)),
    );
  });

  flatActivities.forEach((activity: any, index: number) => {
    const dayNumber = Number(valueOf(activity, ['day', 'dayNumber', 'day_number'], 1)) || 1;
    const activities = dayMap.get(dayNumber) || [];
    activities.push(normalizeActivity(activity, dayNumber, activities.length + index));
    dayMap.set(dayNumber, activities.sort((a: ItineraryActivity, b: ItineraryActivity) => a.startTime.localeCompare(b.startTime)));
  });

  const days: ItineraryDay[] = Array.from(dayMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([day, activities]) => ({
      day,
      dateLabel: getDayDateLabel(startDate, day),
      activities,
    }));

  const calculatedTotalCost = days.reduce((total, day) => 
    total + day.activities.reduce((dayTotal, activity) => 
      dayTotal + (activity.estimatedCost || 0), 0
    ), 0
  );

  return {
    itineraryId: valueOf<number | null>(data, ['itineraryId', 'itinerary_id', 'id'], null),
    destinationId: valueOf<number | null>(data, ['destinationId', 'destination_id'], null),
    tripTitle: valueOf(data, ['tripTitle', 'trip_title', 'title', 'name'], 'Lịch trình TravelAI'),
    destination: valueOf(data, ['destinationName', 'destination', 'destination_name'], 'Việt Nam'),
    startDate,
    endDate: valueOf<string | undefined>(data, ['endDate', 'end_date'], undefined),
    totalEstimatedCost: calculatedTotalCost,
    days,
    createdAt: valueOf<string | undefined>(data, ['createdAt', 'created_at', 'created'], undefined),
    raw: {
      ...data,
      totalEstimatedCost: calculatedTotalCost,
      total_estimated_cost: calculatedTotalCost,
    },
  };
};

export const flattenActivities = (days: ItineraryDay[]) => days.flatMap((day) => day.activities);

export const calculateTotalCost = (days: ItineraryDay[]): number => {
  return flattenActivities(days).reduce((total, activity) => total + (activity.estimatedCost || 0), 0);
};

export const formatDateToYmd = (dateStr?: string): string => {
  if (!dateStr) return '';
  const date = parseLocalDate(dateStr);
  if (!date) return '';
  return toInputDateValue(date);
};

export const formatRelativeTime = (dateInput: string | Date | undefined): string => {
  if (!dateInput) return 'Vừa tạo';

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return 'Vừa tạo';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 5) {
    return 'Vừa tạo';
  }
  if (diffMins < 60) {
    return `${diffMins} phút trước`;
  }
  if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  }

  // Check if it was yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return 'Hôm qua';
  }

  // Otherwise format as DD/MM/YYYY
  const day = `${date.getDate()}`.padStart(2, '0');
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};
