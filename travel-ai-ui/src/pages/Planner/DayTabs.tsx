import { CalendarDays } from 'lucide-react';

type DayTabsProps = {
  days: Array<{ day: number; dateLabel?: string }>;
  activeDay: number;
  onDayChange: (day: number) => void;
};

const DayTabs = ({ days, activeDay, onDayChange }: DayTabsProps) => {
  return (
    <div className="sticky top-20 z-30 -mx-4 mb-6 overflow-x-auto bg-white/80 px-4 py-4 backdrop-blur-lg dark:bg-slate-900/80">
      <div className="flex gap-2">
        {days.map((day) => (
          <button
            key={day.day}
            type="button"
            onClick={() => onDayChange(day.day)}
            className={`flex shrink-0 items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition ${
              activeDay === day.day
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <CalendarDays size={16} />
            <span>
              Ngày {day.day}
              {day.dateLabel && (
                <span className="ml-1 text-xs opacity-70">• {day.dateLabel}</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DayTabs;
