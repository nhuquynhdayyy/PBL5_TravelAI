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
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-lg dark:border-slate-700 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        {/* Total Cost */}
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Tổng cho {guestCount} khách
          </p>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {formatCurrency(totalCost)}
          </p>
        </div>

        {/* Book All Button */}
        <button
          type="button"
          onClick={onBookAll}
          disabled={disabled}
          className="flex items-center gap-2 rounded-2xl bg-cyan-500 px-8 py-4 text-sm font-black text-white shadow-lg shadow-cyan-200 transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-cyan-900/30"
        >
          <ShoppingBag size={18} />
          Đặt toàn bộ lịch trình
        </button>
      </div>
    </div>
  );
};

export default StickyFooter;
