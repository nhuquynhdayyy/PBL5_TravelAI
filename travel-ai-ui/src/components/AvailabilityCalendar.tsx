import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, Loader2, TrendingUp } from 'lucide-react';
import axiosClient from '../api/axiosClient';

export type AvailabilityDay = {
  date: string;
  price: number;
  remainingStock: number;
  isAvailable: boolean;
};

type AvailabilityCalendarProps = {
  serviceId: number;
  selectedDate?: string;
  onSelect: (day: AvailabilityDay) => void;
  /** Số tháng hiển thị trong dropdown (mặc định 6) */
  monthCount?: number;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat('vi-VN');

const toInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isWeekend = (value: string) => {
  const d = new Date(`${value}T00:00:00`).getDay();
  return d === 0 || d === 6;
};

const getWeekdayLabel = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(
    new Date(`${value}T00:00:00`)
  );

export const getDisplayAvailabilityPrice = (
  day: Pick<AvailabilityDay, 'date' | 'price'>
) => (isWeekend(day.date) ? Math.round(day.price * 1.2) : day.price);

const toMonthKey = (year: number, month: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}`;

const getDaysInMonth = (year: number, month: number): string[] => {
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) =>
    toInputDate(new Date(year, month, i + 1))
  );
};

const monthDropdownLabel = (year: number, month: number) =>
  new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(
    new Date(year, month, 1)
  );

// ── Component ─────────────────────────────────────────────────────────────────

const AvailabilityCalendar = ({
  serviceId,
  selectedDate,
  onSelect,
  monthCount = 6,
}: AvailabilityCalendarProps) => {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const monthOptions = useMemo(
    () =>
      Array.from({ length: monthCount }, (_, i) => {
        const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
        return { year: d.getFullYear(), month: d.getMonth() };
      }),
    [monthCount, today]
  );

  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [cache, setCache] = useState<Record<string, AvailabilityDay[]>>({});
  const [loading, setLoading] = useState(false);

  const monthKey = toMonthKey(selectedMonth.year, selectedMonth.month);

  useEffect(() => {
    if (cache[monthKey] !== undefined) return;

    let isActive = true;
    const start = new Date(selectedMonth.year, selectedMonth.month, 1);
    const end = new Date(selectedMonth.year, selectedMonth.month + 1, 0);
    end.setHours(23, 59, 59, 999);

    setLoading(true);
    axiosClient
      .get(`/availability/${serviceId}`, {
        params: { start: start.toISOString(), end: end.toISOString() },
      })
      .then((res) => {
        if (!isActive) return;
        setCache((prev) => ({
          ...prev,
          [monthKey]: (res.data ?? []).map((item: any) => ({
            date: toInputDate(new Date(item.date)),
            price: Number(item.price) || 0,
            remainingStock: Number(item.remainingStock) || 0,
            isAvailable: Boolean(item.isAvailable),
          })),
        }));
      })
      .catch(() => {
        if (isActive) setCache((prev) => ({ ...prev, [monthKey]: [] }));
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [monthKey, selectedMonth, serviceId, cache]);

  const calendarDays = useMemo(
    () => getDaysInMonth(selectedMonth.year, selectedMonth.month),
    [selectedMonth]
  );

  const availability = cache[monthKey] ?? [];
  const availabilityByDate = useMemo(
    () => new Map(availability.map((item) => [item.date, item])),
    [availability]
  );

  // Offset: T2=0, T3=1, ... CN=6 (lưới bắt đầu từ T2)
  const firstDayOffset = useMemo(() => {
    const dow = new Date(selectedMonth.year, selectedMonth.month, 1).getDay();
    return dow === 0 ? 6 : dow - 1;
  }, [selectedMonth]);

  const weekHeaders = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
              <CalendarDays size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Lịch còn chỗ</p>
              <p className="text-xs text-blue-200">Chọn ngày và giá phù hợp</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
            <TrendingUp size={12} className="text-blue-200" />
            <span className="text-xs font-medium text-blue-100">Cuối tuần +20%</span>
          </div>
        </div>

        {/* ── Month Dropdown ── */}
        <div className="relative mt-3">
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-left text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            <span className="capitalize">
              {monthDropdownLabel(selectedMonth.year, selectedMonth.month)}
            </span>
            <ChevronDown
              size={16}
              className={`text-blue-200 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1.5 overflow-hidden rounded-xl border border-white/20 bg-blue-800 shadow-xl shadow-blue-900/40">
              {monthOptions.map((opt) => {
                const key = toMonthKey(opt.year, opt.month);
                const active = key === monthKey;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedMonth(opt);
                      setDropdownOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition hover:bg-white/10 ${
                      active
                        ? 'bg-white/15 font-semibold text-white'
                        : 'font-medium text-blue-200'
                    }`}
                  >
                    <span className="capitalize">
                      {monthDropdownLabel(opt.year, opt.month)}
                    </span>
                    {active && (
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-300" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-slate-100 bg-slate-50 px-5 py-2.5">
        {[
          { color: 'bg-white border border-blue-200', label: 'Còn chỗ' },
          { color: 'bg-blue-600', label: 'Đã chọn' },
          { color: 'bg-slate-200', label: 'Hết chỗ' },
          { color: 'bg-amber-50 border border-amber-200', label: 'Cuối tuần' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`h-2.5 w-2.5 rounded-sm ${color}`} />
            <span className="text-[11px] font-medium text-slate-500">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Calendar body ── */}
      <div className="p-4 sm:p-5">
        {/* Week header row */}
        <div className="mb-2 grid grid-cols-7 gap-1.5 sm:gap-2">
          {weekHeaders.map((h) => (
            <div
              key={h}
              className={`py-1 text-center text-[10px] font-bold uppercase tracking-wider ${
                h === 'T7' || h === 'CN' ? 'text-amber-500' : 'text-slate-400'
              }`}
            >
              {h}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={22} className="animate-spin text-blue-600" />
              <span className="text-xs font-medium text-slate-400">Đang tải...</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {/* Empty offset cells */}
            {Array.from({ length: firstDayOffset }, (_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {calendarDays.map((date) => {
              const dayData = availabilityByDate.get(date);
              const isPast = date < toInputDate(today);
              const disabled =
                isPast || !dayData?.isAvailable || dayData.remainingStock <= 0;
              const selected = selectedDate === date;
              const weekend = isWeekend(date);
              const displayPrice = dayData
                ? getDisplayAvailabilityPrice(dayData)
                : 0;
              const isLow = !disabled && dayData && dayData.remainingStock <= 3;

              return (
                <button
                  key={date}
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    dayData && onSelect({ ...dayData, price: displayPrice })
                  }
                  className={[
                    'relative flex min-h-[80px] flex-col items-center justify-between rounded-xl border px-1 py-2 text-center transition-all duration-150 sm:min-h-[88px] sm:px-1.5 sm:py-2.5',
                    selected
                      ? 'border-blue-600 bg-blue-600 shadow-md shadow-blue-200'
                      : disabled
                        ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-40'
                        : weekend
                          ? 'border-amber-100 bg-amber-50 hover:border-amber-300 hover:shadow-sm'
                          : 'border-slate-100 bg-white hover:border-blue-300 hover:shadow-sm',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'text-[9px] font-semibold uppercase tracking-wider sm:text-[10px]',
                      selected ? 'text-blue-200' : weekend ? 'text-amber-500' : 'text-slate-400',
                    ].join(' ')}
                  >
                    {getWeekdayLabel(date)}
                  </span>

                  <span
                    className={[
                      'text-xl font-bold leading-none sm:text-2xl',
                      selected ? 'text-white' : disabled ? 'text-slate-400' : 'text-slate-800',
                    ].join(' ')}
                  >
                    {new Date(`${date}T00:00:00`).getDate()}
                  </span>

                  {dayData && !isPast ? (
                    <span className="w-full min-w-0 space-y-0.5">
                      <span
                        className={[
                          'block w-full overflow-hidden text-ellipsis whitespace-nowrap text-[9px] font-bold sm:text-[10px]',
                          selected ? 'text-blue-100' : weekend ? 'text-amber-600' : 'text-blue-600',
                        ].join(' ')}
                      >
                        {currencyFormatter.format(displayPrice)}đ
                      </span>
                      <span
                        className={[
                          'block overflow-hidden text-ellipsis whitespace-nowrap text-[8px] font-medium sm:text-[9px]',
                          selected
                            ? 'text-blue-200'
                            : disabled
                              ? 'text-slate-400'
                              : isLow
                                ? 'text-red-500'
                                : 'text-slate-400',
                        ].join(' ')}
                      >
                        {disabled
                          ? 'Hết chỗ'
                          : isLow
                            ? `Còn ${dayData.remainingStock}!`
                            : `Còn ${dayData.remainingStock}`}
                      </span>
                    </span>
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-slate-200" />
                  )}

                  {isLow && !selected && (
                    <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-slate-100 bg-slate-50 px-5 py-2.5">
        <p className="text-[11px] text-slate-400">
          * Giá cuối tuần (thứ 7, chủ nhật) đã bao gồm phụ thu 20%.
        </p>
      </div>
    </div>
  );
};

export default AvailabilityCalendar;