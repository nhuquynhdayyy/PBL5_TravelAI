import { useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';

const NotificationToaster = () => {
  const { latestToast, dismissToast } = useNotifications();

  useEffect(() => {
    if (!latestToast) return;

    const timeout = window.setTimeout(() => dismissToast(latestToast.id), 4500);
    return () => window.clearTimeout(timeout);
  }, [dismissToast, latestToast]);

  if (!latestToast) return null;

  return (
    <div className="fixed right-4 top-24 z-[70] w-[min(calc(100vw-2rem),24rem)] rounded-2xl border border-blue-100 bg-white p-4 text-left shadow-2xl shadow-slate-900/15 animate-in fade-in slide-in-from-top-3 duration-200">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
          <Bell size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-slate-900">Thong bao moi</p>
          <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600">{latestToast.message}</p>
        </div>
        <button
          type="button"
          onClick={() => dismissToast(latestToast.id)}
          className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Dong thong bao"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default NotificationToaster;
