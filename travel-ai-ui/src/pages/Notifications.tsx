import { Bell, CheckCircle2, Eye, Trash2 } from 'lucide-react';
import { useNotificationQueries } from '../components/notifications/useNotificationQueries';

const Notifications = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationQueries();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-black text-slate-900">
            <Bell className="text-blue-600" size={26} />
            Thông báo
            {unreadCount > 0 && (
              <span className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-black text-white">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Tất cả thông báo của tài khoản hiện tại được lưu trong database.
          </p>
        </div>
        {notifications.length > 0 && (
          <button
            onClick={() => markAllAsRead()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-100 transition-all hover:bg-blue-700"
          >
            <CheckCircle2 size={18} />
            Danh dau tat ca da doc
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-sm font-bold text-slate-500">Đang tải thông báo...</div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-4 rounded-full bg-slate-100 p-4">
              <Bell size={34} className="text-slate-400" />
            </div>
            <p className="text-sm font-black text-slate-500">Chưa có thông báo nào</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between ${
                  item.isRead ? 'bg-white' : 'bg-blue-50/60'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-black text-slate-900">{item.title}</h2>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black uppercase tracking-widest text-slate-500">
                      {item.type}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                      item.isRead ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                    }`}>
                      {item.isRead ? 'Da doc' : 'Chua doc'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.message}</p>
                  <p className="mt-2 text-xs font-semibold text-slate-400">
                    {new Date(item.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!item.isRead && (
                    <button
                      onClick={() => markAsRead(item.id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-blue-100 px-3 py-2 text-xs font-black text-blue-600 hover:bg-blue-50"
                    >
                      <Eye size={16} />
                      Da doc
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(item.id)}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-100 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                    Xoa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
