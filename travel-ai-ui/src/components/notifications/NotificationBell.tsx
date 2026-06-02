import { Bell } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import { useNotificationQueries } from './useNotificationQueries';

const NotificationBell = () => {
  const { unreadCount } = useNotificationQueries();

  return (
    <div className="relative">
      <NotificationDropdown
        trigger={
          <button
            className="relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 transition-all hover:bg-blue-50 hover:text-blue-600"
            aria-label="Thong bao"
          >
            <Bell size={18} />
            <span className="hidden lg:inline">Thong bao</span>
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        }
      />
    </div>
  );
};

export default NotificationBell;
