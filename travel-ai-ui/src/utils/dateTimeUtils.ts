/**
 * Utility functions để format date/time theo múi giờ Việt Nam (Asia/Ho_Chi_Minh - UTC+7)
 * Đảm bảo mọi thời gian hiển thị trên giao diện đều theo giờ Việt Nam
 */

const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Format date theo định dạng Việt Nam (dd/MM/yyyy)
 * @param dateString - ISO date string từ backend
 * @returns Chuỗi ngày theo format Việt Nam
 */
export function formatVietnameseDate(dateString: string | Date): string {
  if (!dateString) return '';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VIETNAM_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

/**
 * Format date theo định dạng ngắn (dd/MM)
 * @param dateString - ISO date string từ backend
 * @returns Chuỗi ngày theo format ngắn
 */
export function formatVietnameseDateShort(dateString: string | Date): string {
  if (!dateString) return '';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VIETNAM_TIMEZONE,
    day: '2-digit',
    month: '2-digit'
  }).format(date);
}

/**
 * Format time theo giờ Việt Nam (HH:mm)
 * @param dateString - ISO date string từ backend
 * @returns Chuỗi giờ theo format Việt Nam
 */
export function formatVietnameseTime(dateString: string | Date): string {
  if (!dateString) return '';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VIETNAM_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

/**
 * Format datetime đầy đủ theo giờ Việt Nam (dd/MM/yyyy HH:mm)
 * @param dateString - ISO date string từ backend
 * @returns Chuỗi ngày giờ đầy đủ theo format Việt Nam
 */
export function formatVietnameseDateTime(dateString: string | Date): string {
  if (!dateString) return '';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VIETNAM_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

/**
 * Format datetime với giây (dd/MM/yyyy HH:mm:ss)
 * @param dateString - ISO date string từ backend
 * @returns Chuỗi ngày giờ có giây theo format Việt Nam
 */
export function formatVietnameseDateTimeWithSeconds(dateString: string | Date): string {
  if (!dateString) return '';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VIETNAM_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
}

/**
 * Format datetime với tên thứ (Thứ Hai, 01/01/2024 14:30)
 * @param dateString - ISO date string từ backend
 * @returns Chuỗi ngày giờ có tên thứ
 */
export function formatVietnameseDateTimeWithWeekday(dateString: string | Date): string {
  if (!dateString) return '';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VIETNAM_TIMEZONE,
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

/**
 * Format relative time (vừa xong, 5 phút trước, 2 giờ trước, etc.)
 * @param dateString - ISO date string từ backend
 * @returns Chuỗi thời gian tương đối
 */
export function formatRelativeTime(dateString: string | Date): string {
  if (!dateString) return '';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const now = new Date();
  
  // Convert both to Vietnam timezone for accurate comparison
  const vietnamNow = new Date(now.toLocaleString('en-US', { timeZone: VIETNAM_TIMEZONE }));
  const vietnamDate = new Date(date.toLocaleString('en-US', { timeZone: VIETNAM_TIMEZONE }));
  
  const diffMs = vietnamNow.getTime() - vietnamDate.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) {
    return 'Vừa xong';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} phút trước`;
  } else if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  } else if (diffDays < 7) {
    return `${diffDays} ngày trước`;
  } else {
    return formatVietnameseDate(date);
  }
}

/**
 * Get current date/time in Vietnam timezone
 * @returns Date object representing current time in Vietnam
 */
export function getVietnameseNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: VIETNAM_TIMEZONE }));
}

/**
 * Convert date to Vietnam timezone Date object
 * @param dateString - ISO date string từ backend
 * @returns Date object in Vietnam timezone
 */
export function toVietnameseDate(dateString: string | Date): Date {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return new Date(date.toLocaleString('en-US', { timeZone: VIETNAM_TIMEZONE }));
}

/**
 * Format số tiền theo định dạng Việt Nam
 * @param amount - Số tiền
 * @returns Chuỗi số tiền đã format (ví dụ: 1.000.000)
 */
export function formatVietnameseCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}
