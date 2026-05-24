import { useState } from 'react';
import { Calendar, MapPin, Sparkles, TrendingUp } from 'lucide-react';

type PlannerSidebarProps = {
  destination: string;
  startDate?: string;
  duration: number;
  budgetLevel: number;
  interests: string[];
  onRegenerate: () => void;
  regenerating: boolean;
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
}: PlannerSidebarProps) => {
  const [localDestination, setLocalDestination] = useState(destination);
  const [localStartDate, setLocalStartDate] = useState(startDate || '');
  const [localDuration, setLocalDuration] = useState(duration);
  const [localBudget, setLocalBudget] = useState(budgetLevel);
  const [localInterests, setLocalInterests] = useState<string[]>(interests);

  const availableInterests = ['Biển', 'Thư giãn', 'Phiêu lưu', 'Văn hóa', 'Ẩm thực'];

  const toggleInterest = (interest: string) => {
    setLocalInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  return (
    <aside className="sticky top-24 space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {/* Header */}
      <div>
        <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-blue-600 dark:text-blue-400">
          Thông số chuyến đi
        </p>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
          Cấu hình trợ lý AI
        </h2>
      </div>

      {/* Destination */}
      <div>
        <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
          Điểm đến
        </label>
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={localDestination}
            onChange={(e) => setLocalDestination(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            placeholder="Nhập điểm đến..."
          />
        </div>
      </div>

      {/* Start Date & Duration */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
            Ngày bắt đầu
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="date"
              value={localStartDate}
              onChange={(e) => setLocalStartDate(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
            Số ngày
          </label>
          <select
            value={localDuration}
            onChange={(e) => setLocalDuration(Number(e.target.value))}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value={3}>3 Ngày</option>
            <option value={5}>5 Ngày</option>
            <option value={7}>7 Ngày</option>
          </select>
        </div>
      </div>

      {/* Budget Level */}
      <div>
        <label className="mb-3 block text-sm font-bold text-slate-700 dark:text-slate-300">
          Mức ngân sách
        </label>
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setLocalBudget(level)}
              className={`flex-1 rounded-xl py-2 text-center text-xs font-black transition ${
                localBudget === level
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {'$'.repeat(level + 1)}
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
          {budgetLabels[localBudget]}
        </p>
      </div>

      {/* Mood & Interests */}
      <div>
        <label className="mb-3 block text-sm font-bold text-slate-700 dark:text-slate-300">
          Tâm trạng & Sở thích
        </label>
        <div className="flex flex-wrap gap-2">
          {availableInterests.map((interest) => (
            <button
              key={interest}
              type="button"
              onClick={() => toggleInterest(interest)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                localInterests.includes(interest)
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {interest}
            </button>
          ))}
        </div>
      </div>

      {/* Regenerate Button */}
      <button
        type="button"
        onClick={onRegenerate}
        disabled={regenerating}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-sm font-black text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-blue-600 dark:hover:bg-blue-700"
      >
        {regenerating ? (
          <>
            <TrendingUp className="animate-pulse" size={18} />
            Đang tạo lại...
          </>
        ) : (
          <>
            <Sparkles size={18} />
            Tạo lại lịch trình
          </>
        )}
      </button>
    </aside>
  );
};

export default PlannerSidebar;
