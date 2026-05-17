import { useEffect, useState } from 'react';
import { HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { Bell, CheckCircle2, Loader2, X } from 'lucide-react';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  tone: 'info' | 'success';
};

const API_ORIGIN = 'http://localhost:5134';

const RealtimeNotifications = () => {
  const [items, setItems] = useState<NotificationItem[]>([]);

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

    const pushNotification = (item: Omit<NotificationItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setItems((current) => [{ id, ...item }, ...current].slice(0, 4));
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

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-6 top-6 z-[120] w-[min(360px,calc(100vw-32px))] space-y-3">
      {items.map((item) => {
        const Icon = item.tone === 'success' ? CheckCircle2 : Loader2;

        return (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-2xl"
          >
            <div
              className={`rounded-xl p-2 text-white ${
                item.tone === 'success' ? 'bg-emerald-500' : 'bg-blue-600'
              }`}
            >
              {item.tone === 'success' ? <Icon size={18} /> : <Bell size={18} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-slate-900">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.message}</p>
            </div>
            <button
              onClick={() => setItems((current) => current.filter((currentItem) => currentItem.id !== item.id))}
              className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Dong thong bao"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default RealtimeNotifications;
