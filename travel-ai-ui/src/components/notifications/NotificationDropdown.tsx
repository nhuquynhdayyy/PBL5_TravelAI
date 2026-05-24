import { Bell, CheckCheck, Clock, CreditCard, ReceiptText, Trash2 } from 'lucide-react';
import type { NotificationItem } from '../../contexts/NotificationContext';

interface NotificationDropdownProps {
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClear: () => void;
}

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit'
  }).format(date);
};

const getIcon = (type: string) => {
  if (type === 'PAYMENT_COUNTER') return <CreditCard size={18} />;
  if (type === 'booking_confirmed' || type === 'partner_booking_confirmed') return <ReceiptText size={18} />;
  return <Bell size={18} />;
const getTitle = (type: string) => {
  if (type === 'partner_booking_confirmed') return 'Don hang moi';
  if (type === 'booking_confirmed') return 'Thanh toan da xac nhan';
  return 'Thong bao';
};

const NotificationDropdown = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClear
}: NotificationDropdownProps) => {
  return (
    <div className="absolute right-0 top-full z-50 mt-3 w-[min(calc(100vw-2rem),24rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-2xl shadow-slate-900/10 animate-in fade-in slide-in-from-top-2 duration-150">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-sm font-black text-slate-900">Thong bao</p>
          <p className="text-xs font-medium text-slate-500">{notifications.length} thong bao gan day</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMarkAllAsRead}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
            title="Danh dau tat ca da doc"
          >
            <CheckCheck size={17} />
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-xl p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
            title="Xoa thong bao"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="max-h-[26rem] overflow-y-auto p-2">
        {notifications.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Bell size={22} />
            </div>
            <p className="font-black text-slate-800">Chua co thong bao</p>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Cap nhat booking moi se xuat hien tai day.
            </p>
          </div>
        ) : (
          notifications.map((notification) => (
            <button
              type="button"
              key={notification.id}
              onClick={() => onMarkAsRead(notification.id)}
              className={`mb-2 block w-full rounded-2xl border p-4 text-left transition-all ${
                notification.isRead
                  ? 'border-slate-100 bg-white hover:bg-slate-50'
                  : 'border-blue-100 bg-blue-50/80 hover:bg-blue-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${
                    notification.type === 'PAYMENT_COUNTER'
                      ? 'bg-amber-100 text-amber-700'
                      : notification.isRead
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  {getIcon(notification.type)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-black text-slate-900">{notification.title}</p>
                    <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-slate-400">
                      <Clock size={12} /> {formatTime(notification.createdAt)}
                    </span>
                  </div>
                  {notification.type === 'PAYMENT_COUNTER' && (
                    <span className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black text-amber-700">
                      Thanh toán tại quầy
                    </span>
                  )}
                  <p className="mt-1 line-clamp-2 text-sm font-medium leading-relaxed text-slate-600">
                    {notification.message}
                  </p>
                  {notification.bookingId && (
                    <p className="mt-2 text-xs font-black uppercase tracking-wider text-blue-600">
                      Booking #{notification.bookingId}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;
