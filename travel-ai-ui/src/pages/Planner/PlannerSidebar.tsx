import { useEffect, useState } from 'react';
import { Calendar, MapPin, Sparkles, TrendingUp, Clock, Coins, Edit3 } from 'lucide-react';

type PlannerSidebarProps = {
  destination: string;
  startDate?: string;
  duration: number;
  budgetLevel: number;
  interests: string[];
  onRegenerate: () => void;
  regenerating: boolean;
  onConfigChange?: (config: {
    destination: string;
    startDate: string;
    duration: number;
    budgetLevel: number;
    interests: string[];
  }) => void;
};

const budgetLabels = ['Tiết kiệm', 'Cân bằng', 'Sang trọng'];

const PlannerSidebar = ({
  destination,
  startDate,
  duration,
  budgetLevel,
  interests,
  onRegenerate,
  regenerating,
  onConfigChange,
}: PlannerSidebarProps) => {
  const [localDestination, setLocalDestination] = useState(destination);
  const [localStartDate, setLocalStartDate] = useState('');
  const [localDuration, setLocalDuration] = useState(duration);
  const [localBudget, setLocalBudget] = useState(budgetLevel);
  const [localInterests, setLocalInterests] = useState<string[]>(interests);
  const [isEditingInterests, setIsEditingInterests] = useState(false);

  const availableInterests = ['Biển', 'Thư giãn', 'Phiêu lưu', 'Văn hóa', 'Ẩm thực'];

  // Sync props to local state when they load/change asynchronously
  useEffect(() => {
    setLocalDestination(destination);
  }, [destination]);

  useEffect(() => {
    if (startDate) {
      const datePart = startDate.split('T')[0].trim();
      const matchDmy = datePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (matchDmy) {
        const [, d, m, y] = matchDmy;
        setLocalStartDate(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
      } else {
        setLocalStartDate(datePart);
      }
    } else {
      setLocalStartDate('');
    }
  }, [startDate]);

  useEffect(() => {
    setLocalDuration(duration);
  }, [duration]);

  useEffect(() => {
    setLocalBudget(budgetLevel);
  }, [budgetLevel]);

  useEffect(() => {
    setLocalInterests(interests);
  }, [interests]);

  const handleConfigChange = (updatedFields: {
    destination?: string;
    startDate?: string;
    duration?: number;
    budgetLevel?: number;
    interests?: string[];
  }) => {
    if (onConfigChange) {
      onConfigChange({
        destination: updatedFields.destination ?? localDestination,
        startDate: updatedFields.startDate ?? localStartDate,
        duration: updatedFields.duration ?? localDuration,
        budgetLevel: updatedFields.budgetLevel ?? localBudget,
        interests: updatedFields.interests ?? localInterests,
      });
    }
  };

  const toggleInterest = (interest: string) => {
    setLocalInterests((prev) => {
      const next = prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest];
      handleConfigChange({ interests: next });
      return next;
    });
  };

  return (
    <aside className="sticky top-24 space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {/* Header */}
      <div>
        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-blue-600 dark:text-blue-400">
          Thông số chuyến đi
        </p>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">
          Cấu hình trợ lý AI
        </h2>
      </div>

      {/* Destination */}
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
          <MapPin size={13} /> Điểm đến
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            value={localDestination}
            disabled={regenerating}
            onChange={(e) => setLocalDestination(e.target.value)}
            onBlur={() => handleConfigChange({ destination: localDestination })}
            onKeyDown={(e) => e.key === 'Enter' && handleConfigChange({ destination: localDestination })}
            className="w-full rounded-xl border border-slate-100 bg-slate-50/50 py-2 pl-9 pr-3 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
            placeholder="Nhập điểm đến..."
          />
        </div>
      </div>

      {/* Start Date & Duration */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
            <Calendar size={13} /> Ngày đi
          </label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input
              type="date"
              value={localStartDate}
              disabled={regenerating}
              onChange={(e) => {
                setLocalStartDate(e.target.value);
                handleConfigChange({ startDate: e.target.value });
              }}
              className="w-full rounded-xl border border-slate-100 bg-slate-50/50 py-2 pl-8 pr-2 text-[10px] font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
            <Clock size={13} /> Số ngày
          </label>
          <select
            value={localDuration}
            disabled={regenerating}
            onChange={(e) => {
              const val = Number(e.target.value);
              setLocalDuration(val);
              handleConfigChange({ duration: val });
            }}
            className="w-full rounded-xl border border-slate-100 bg-slate-50/50 py-2 px-3 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <option value={3}>3 Ngày</option>
            <option value={5}>5 Ngày</option>
            <option value={7}>7 Ngày</option>
          </select>
        </div>
      </div>

      {/* Budget Level */}
      <div>
        <label className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
          <Coins size={13} /> Ngân sách
        </label>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((level) => (
            <button
              key={level}
              type="button"
              disabled={regenerating}
              onClick={() => {
                setLocalBudget(level);
                handleConfigChange({ budgetLevel: level });
              }}
              className={`flex-1 rounded-lg py-1.5 text-center text-xs font-black transition ${
                localBudget === level
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-50 text-slate-400 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-500'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {'$'.repeat(level + 1)}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-center text-[10px] font-bold text-slate-400 dark:text-slate-500">
          {budgetLabels[localBudget]}
        </p>
      </div>

      {/* Mood & Interests */}
      <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
            <Sparkles size={13} /> Sở thích
          </span>
          <button
            type="button"
            disabled={regenerating}
            onClick={() => setIsEditingInterests(!isEditingInterests)}
            className="flex items-center gap-1 text-[10px] font-black text-blue-600 hover:underline dark:text-blue-400 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Edit3 size={10} />
            {isEditingInterests ? 'Xong' : 'Sửa'}
          </button>
        </div>

        {isEditingInterests ? (
          <div className="flex flex-wrap gap-1.5">
            {availableInterests.map((interest) => {
              const isSelected = localInterests.includes(interest);
              return (
                <button
                  key={interest}
                  type="button"
                  disabled={regenerating}
                  onClick={() => toggleInterest(interest)}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {interest}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {localInterests.length > 0 ? (
              localInterests.map((interest) => (
                <span
                  key={interest}
                  className="inline-flex items-center rounded-lg bg-blue-50/50 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:bg-blue-900/10 dark:text-blue-400"
                >
                  {interest}
                </span>
              ))
            ) : (
              <span className="text-[10px] italic text-slate-400">Chưa chọn sở thích nào</span>
            )}
          </div>
        )}
      </div>

      {/* Regenerate Button */}
      <button
        type="button"
        onClick={onRegenerate}
        disabled={regenerating}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-xs font-black text-white shadow-md transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-blue-600 dark:hover:bg-blue-700"
      >
        {regenerating ? (
          <>
            <TrendingUp className="animate-pulse" size={14} />
            Đang tạo lại...
          </>
        ) : (
          <>
            <Sparkles size={14} />
            Tạo lại lịch trình
          </>
        )}
      </button>
    </aside>
  );
};

export default PlannerSidebar;
