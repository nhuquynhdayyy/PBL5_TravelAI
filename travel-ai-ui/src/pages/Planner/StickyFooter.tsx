import { ShoppingBag } from 'lucide-react';
import { formatCurrency } from './itineraryUtils';

type StickyFooterProps = {
  totalCost: number;
  guestCount?: number;
  onBookAll: () => void;
  disabled?: boolean;
};

const StickyFooter = ({ totalCost, guestCount = 2, onBookAll, disabled = false }: StickyFooterProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-100 bg-white/95 backdrop-blur-lg shadow-2xl shadow-slate-200/60">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-baseline gap-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Tổng · {guestCount} khách
          </p>
          <p className="text-xl font-black text-slate-900">
            {formatCurrency(totalCost)}
          </p>
        </div>

        <button
          type="button"
          onClick={onBookAll}
          disabled={disabled}
          className="flex items-center gap-2 rounded-2xl bg-cyan-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-cyan-200 transition hover:bg-cyan-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ShoppingBag size={16} />
          Đặt toàn bộ dịch vụ
        </button>
      </div>
    </div>
  );
};

export default StickyFooter;
