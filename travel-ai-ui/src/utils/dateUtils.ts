/**
 * ⚠️ DEPRECATED FILE - Chỉ giữ lại các utility functions cần thiết
 * 
 * Các function format date/time đã được chuyển sang dateTimeUtils.ts
 * với timezone handling chính xác hơn sử dụng Intl.DateTimeFormat
 * 
 * CÁC FUNCTION ĐANG ACTIVE (vẫn được sử dụng):
 * - getTodayVietnam(): Lấy ngày hiện tại theo giờ VN (format YYYY-MM-DD cho input)
 * - getDateAfterMonthsVietnam(): Tính ngày sau N tháng
 * - localDateToUTC(): Convert local date sang UTC
 * - toVietnamTime(): Convert UTC string sang Date object theo giờ VN
 * 
 * ❌ DEPRECATED (không sử dụng nữa):
 * - formatDate() → Dùng formatVietnameseDate() từ dateTimeUtils.ts
 * - formatDateTime() → Dùng formatVietnameseDateTime() từ dateTimeUtils.ts
 * - formatShortDate() → Dùng formatVietnameseDateShort() từ dateTimeUtils.ts
 */

const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Chuyển đổi chuỗi ISO UTC sang Date object theo giờ Việt Nam
 * @active - Vẫn được sử dụng
 */
export function toVietnamTime(utcDateString: string | null | undefined): Date | null {
  if (!utcDateString) return null;
  
  const utcDate = new Date(utcDateString);
  if (isNaN(utcDate.getTime())) return null;
  
  // Sử dụng Intl API để chuyển đổi chính xác
  return new Date(utcDate.toLocaleString('en-US', { timeZone: VIETNAM_TIMEZONE }));
}

/**
 * @deprecated Sử dụng formatVietnameseDate() từ dateTimeUtils.ts thay thế
 * Format ngày theo định dạng Việt Nam (dd/MM/yyyy)
 */
export function formatDate(utcDateString: string | null | undefined): string {
  if (!utcDateString) return 'N/A';
  
  const date = new Date(utcDateString);
  if (isNaN(date.getTime())) return 'N/A';
  
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VIETNAM_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

/**
 * @deprecated Sử dụng formatVietnameseDateTime() từ dateTimeUtils.ts thay thế
 * Format ngày giờ đầy đủ theo định dạng Việt Nam (dd/MM/yyyy HH:mm:ss)
 */
export function formatDateTime(utcDateString: string | null | undefined): string {
  if (!utcDateString) return 'N/A';
  
  const date = new Date(utcDateString);
  if (isNaN(date.getTime())) return 'N/A';
  
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
 * @deprecated Sử dụng formatVietnameseDateShort() từ dateTimeUtils.ts thay thế
 * Format ngày ngắn gọn (dd/MM)
 */
export function formatShortDate(utcDateString: string | null | undefined): string {
  if (!utcDateString) return 'N/A';
  
  const date = new Date(utcDateString);
  if (isNaN(date.getTime())) return 'N/A';
  
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VIETNAM_TIMEZONE,
    day: '2-digit',
    month: '2-digit'
  }).format(date);
}

/**
 * Lấy ngày hiện tại theo giờ Việt Nam dưới dạng YYYY-MM-DD (cho input date)
 * @active - Vẫn được sử dụng
 */
export function getTodayVietnam(): string {
  const now = new Date();
  const vnNow = new Date(now.toLocaleString('en-US', { timeZone: VIETNAM_TIMEZONE }));
  
  const year = vnNow.getFullYear();
  const month = String(vnNow.getMonth() + 1).padStart(2, '0');
  const day = String(vnNow.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Chuyển đổi local date input (YYYY-MM-DD) sang UTC để gửi lên server
 * @active - Vẫn được sử dụng
 */
export function localDateToUTC(localDateString: string): string {
  if (!localDateString) return '';
  
  // Parse local date as Vietnam time (assume 00:00:00 Vietnam time)
  const [year, month, day] = localDateString.split('-').map(Number);
  const vnDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  
  // Subtract 7 hours to get UTC
  const utcDate = new Date(vnDate.getTime() - 7 * 60 * 60 * 1000);
  
  return utcDate.toISOString();
}

/**
 * Lấy ngày sau N tháng theo giờ Việt Nam dưới dạng YYYY-MM-DD
 * @active - Vẫn được sử dụng
 */
export function getDateAfterMonthsVietnam(months: number): string {
  const now = new Date();
  const vnNow = new Date(now.toLocaleString('en-US', { timeZone: VIETNAM_TIMEZONE }));
  
  vnNow.setMonth(vnNow.getMonth() + months);
  
  const year = vnNow.getFullYear();
  const month = String(vnNow.getMonth() + 1).padStart(2, '0');
  const day = String(vnNow.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}
