import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Bell, CheckCircle2, Eye, Loader2, Package, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotificationQueries } from './useNotificationQueries';

type NotificationDropdownProps = {
  trigger: ReactNode;
};

const NotificationDropdown = ({ trigger }: NotificationDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {
    notifications,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationQueries();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTimeAgo = (createdAt: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / 1000);
    if (seconds < 60) return 'Vua xong';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phut truoc`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} gio truoc`;
    return `${Math.floor(seconds / 86400)} ngay truoc`;
  };

  const getIcon = (type: string) => {
    const normalizedType = type.toLowerCase();
    if (normalizedType.includes('booking')) return <Package size={18} />;
    if (normalizedType.includes('payment')) return <CheckCircle2 size={18} />;
    return <Bell size={18} />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <span onClick={() => setIsOpen((current) => !current)}>{trigger}</span>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,380px)] max-h-[520px] overflow-hidden rounded-2xl border border-white/10 bg-[#1E293B] shadow-2xl shadow-black/40 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between border-b border-white/10 bg-[#162033] px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-blue-600" />
              <h3 className="text-sm font-black text-white">Thong bao</h3>
              {notifications.length > 0 && (
                <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-black text-white">
                  {notifications.length}
                </span>
              )}
            </div>
            {notifications.length > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-xs font-bold text-blue-400 transition-colors hover:text-blue-300"
              >
                Doc tat ca
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-blue-600" size={28} />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-12">
                <div className="mb-3 rounded-full bg-[#162033] p-4">
                  <Bell size={32} className="text-slate-400" />
                </div>
                <p className="text-sm font-bold text-slate-400">Chua co thong bao nao</p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {notifications.slice(0, 8).map((item) => (
                  <div
                    key={item.id}
                    className={`group flex items-start gap-3 p-4 transition-colors ${
                      item.isRead ? 'bg-[#1E293B] hover:bg-[#243247]' : 'bg-blue-950/35 hover:bg-blue-950/50'
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 rounded-xl p-2 text-white ${
                        item.isRead ? 'bg-slate-400' : 'bg-blue-600'
                      }`}
                    >
                      {getIcon(item.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-white">{item.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">{item.message}</p>
                      <p className="mt-1.5 text-[10px] font-semibold text-slate-400">
                        {getTimeAgo(item.createdAt)} - {item.isRead ? 'Da doc' : 'Chua doc'}
                      </p>
                    </div>
                    {!item.isRead && (
                      <button
                        onClick={() => markAsRead(item.id)}
                        className="rounded-lg p-1 text-slate-400 transition-all hover:bg-[#162033] hover:text-blue-400"
                        aria-label="Danh dau da doc"
                      >
                        <Eye size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(item.id)}
                      className="flex-shrink-0 rounded-lg p-1 text-slate-400 transition-all hover:bg-[#162033] hover:text-red-400"
                      aria-label="Xoa thong bao"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link
            to="/notifications"
            onClick={() => setIsOpen(false)}
            className="block border-t border-white/10 px-4 py-3 text-center text-xs font-black uppercase tracking-widest text-blue-400 hover:bg-[#162033]"
          >
            Xem tat ca thong bao
          </Link>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
