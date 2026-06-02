import { useEffect, useState, useRef } from 'react';
import { HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { Bell, CheckCircle2, Loader2, X, Package, Calendar } from 'lucide-react';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  tone: 'info' | 'success';
  timestamp: Date;
};

// Lấy API origin từ VITE_API_URL, loại bỏ /api và sử dụng đúng protocol
const getApiOrigin = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'https://localhost:7001/api';
  return apiUrl.replace('/api', '');
};

const API_ORIGIN = getApiOrigin();

const NotificationDropdown = () => {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    const connection = new HubConnectionBuilder()
      .withUrl(`${API_ORIGIN}/hubs/notifications`, {
        accessTokenFactory: () => localStorage.getItem('token') ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    const pushNotification = (item: Omit<NotificationItem, 'id' | 'timestamp'>) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const newItem = { id, timestamp: new Date(), ...item };
      
      setItems((current) => [newItem, ...current].slice(0, 20)); // Giữ tối đa 20 thông báo
      setUnreadCount((count) => count + 1);
    };

    connection.on('itinerary_processing', (payload: { status?: string; message?: string }) => {
      pushNotification({
        title: payload.status === 'completed' ? 'Lịch trình đã sẵn sàng' : 'AI đang xử lý',
        message: payload.message ?? 'TravelAI đang cập nhật tiến trình lịch trình.',
        tone: payload.status === 'completed' ? 'success' : 'info',
      });
    });

    connection.on('booking_confirmed', (payload: { message?: string }) => {
      pushNotification({
        title: 'Đơn hàng đã xác nhận',
        message: payload.message ?? 'Đơn hàng của bạn đã được cập nhật.',
        tone: 'success',
      });
    });

    connection.on('partner_booking_confirmed', (payload: { message?: string }) => {
      pushNotification({
        title: 'Đối tác có đơn mới',
        message: payload.message ?? 'Có đơn hàng mới cho dịch vụ của bạn.',
        tone: 'success',
      });
    });

    connection
      .start()
      .catch((error) => console.error('SignalR connection failed', error));

    return () => {
      if (connection.state !== HubConnectionState.Disconnected) {
        void connection.stop();
      }
    };
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0); // Đánh dấu đã đọc khi mở dropdown
    }
  };

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const handleClearAll = () => {
    setItems([]);
    setUnreadCount(0);
  };

  const getTimeAgo = (timestamp: Date) => {
    const seconds = Math.floor((new Date().getTime() - timestamp.getTime()) / 1000);
    
    if (seconds < 60) return 'Vừa xong';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
    return `${Math.floor(seconds / 86400)} ngày trước`;
  };

  const getIcon = (title: string, tone: string) => {
    if (title.includes('Lịch trình')) return <Calendar size={18} />;
    if (title.includes('Đơn hàng') || title.includes('đơn mới')) return <Package size={18} />;
    if (tone === 'success') return <CheckCircle2 size={18} />;
    return <Bell size={18} />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={handleToggle}
        className="relative p-2 text-slate-600 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
        aria-label="Thông báo"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-slate-50">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-blue-600" />
              <h3 className="text-sm font-black text-slate-900">Thông báo</h3>
              {items.length > 0 && (
                <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-black rounded-full">
                  {items.length}
                </span>
              )}
            </div>
            {items.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Xóa tất cả
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="p-4 bg-slate-100 rounded-full mb-3">
                  <Bell size={32} className="text-slate-400" />
                </div>
                <p className="text-sm font-bold text-slate-400">Chưa có thông báo nào</p>
                <p className="text-xs text-slate-400 mt-1">Thông báo sẽ xuất hiện ở đây</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors group"
                  >
                    <div
                      className={`rounded-xl p-2 text-white flex-shrink-0 ${
                        item.tone === 'success' ? 'bg-emerald-500' : 'bg-blue-600'
                      }`}
                    >
                      {getIcon(item.title, item.tone)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-slate-900">{item.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.message}</p>
                      <p className="mt-1.5 text-[10px] font-semibold text-slate-400">
                        {getTimeAgo(item.timestamp)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleRemove(item.id, e)}
                      className="rounded-lg p-1 text-slate-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-200 hover:text-slate-700 flex-shrink-0"
                      aria-label="Xóa thông báo"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
