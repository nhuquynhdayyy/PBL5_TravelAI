import { useState, useEffect } from 'react';
import {
  MapPin, Calendar, Coins, Sparkles, Edit3, ChevronDown, RefreshCw, Loader2,
} from 'lucide-react';

type PlannerConfigBarProps = {
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
const budgetIcons = ['$', '$$', '$$$'];
const availableInterests = ['Biển', 'Thư giãn', 'Phiêu lưu', 'Văn hóa', 'Ẩm thực', 'Núi', 'Mua sắm'];

type OpenPanel = 'destination' | 'date' | 'budget' | 'interests' | null;

const PlannerConfigBar = ({
  destination,
  startDate,
  duration,
  budgetLevel,
  interests,
  onRegenerate,
  regenerating,
  onConfigChange,
}: PlannerConfigBarProps) => {
  const [localDestination, setLocalDestination] = useState(destination);
  const [localStartDate, setLocalStartDate] = useState('');
  const [localDuration, setLocalDuration] = useState(duration);
  const [localBudget, setLocalBudget] = useState(budgetLevel);
  const [localInterests, setLocalInterests] = useState<string[]>(interests);
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);

  useEffect(() => setLocalDestination(destination), [destination]);
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
    }
  }, [startDate]);
  useEffect(() => setLocalDuration(duration), [duration]);
  useEffect(() => setLocalBudget(budgetLevel), [budgetLevel]);
  useEffect(() => setLocalInterests(interests), [interests]);

  const emit = (overrides: Partial<{ destination: string; startDate: string; duration: number; budgetLevel: number; interests: string[] }>) => {
    onConfigChange?.({
      destination: localDestination,
      startDate: localStartDate,
      duration: localDuration,
      budgetLevel: localBudget,
      interests: localInterests,
      ...overrides,
    });
  };

  const toggle = (panel: OpenPanel) => setOpenPanel(prev => prev === panel ? null : panel);

  // Format date for display
  const displayDate = localStartDate
    ? new Date(localStartDate + 'T00:00:00').toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'Chọn ngày';

  return (
    <div className="relative mb-6">
      {/* Main bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">

        {/* Destination chip */}
        <button
          type="button"
          disabled={regenerating}
          onClick={() => toggle('destination')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
            openPanel === 'destination'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
          } disabled:opacity-50`}
        >
          <MapPin size={15} />
          {localDestination || 'Điểm đến'}
          <ChevronDown size={14} className={`transition ${openPanel === 'destination' ? 'rotate-180' : ''}`} />
        </button>

        <div className="h-5 w-px bg-slate-200" />

        {/* Date chip */}
        <button
          type="button"
          disabled={regenerating}
          onClick={() => toggle('date')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
            openPanel === 'date'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
          } disabled:opacity-50`}
        >
          <Calendar size={15} />
          {displayDate} · {localDuration} ngày
          <ChevronDown size={14} className={`transition ${openPanel === 'date' ? 'rotate-180' : ''}`} />
        </button>

        <div className="h-5 w-px bg-slate-200" />

        {/* Budget chip */}
        <button
          type="button"
          disabled={regenerating}
          onClick={() => toggle('budget')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
            openPanel === 'budget'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
          } disabled:opacity-50`}
        >
          <Coins size={15} />
          {budgetLabels[localBudget]}
          <ChevronDown size={14} className={`transition ${openPanel === 'budget' ? 'rotate-180' : ''}`} />
        </button>

        <div className="h-5 w-px bg-slate-200" />

        {/* Interests chip */}
        <button
          type="button"
          disabled={regenerating}
          onClick={() => toggle('interests')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
            openPanel === 'interests'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
          } disabled:opacity-50`}
        >
          <Sparkles size={15} />
          {localInterests.length > 0 ? localInterests.slice(0, 2).join(', ') + (localInterests.length > 2 ? ` +${localInterests.length - 2}` : '') : 'Sở thích'}
          <ChevronDown size={14} className={`transition ${openPanel === 'interests' ? 'rotate-180' : ''}`} />
        </button>

        {/* Spacer */}
        <div className="ml-auto" />

        {/* Regenerate button */}
        <button
          type="button"
          onClick={onRegenerate}
          disabled={regenerating}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white transition hover:bg-slate-700 disabled:opacity-60"
        >
          {regenerating ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <RefreshCw size={15} />
          )}
          {regenerating ? 'Đang tạo...' : 'Tạo lại'}
        </button>
      </div>

      {/* Dropdown panels */}
      {openPanel && (
        <div className="absolute top-full left-0 z-50 mt-2 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">

          {openPanel === 'destination' && (
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Điểm đến</p>
              <input
                type="text"
                value={localDestination}
                autoFocus
                onChange={(e) => setLocalDestination(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    emit({ destination: localDestination });
                    setOpenPanel(null);
                  }
                }}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                placeholder="Nhập điểm đến..."
              />
              <button
                type="button"
                onClick={() => { emit({ destination: localDestination }); setOpenPanel(null); }}
                className="mt-3 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-black text-white hover:bg-blue-700"
              >
                Áp dụng
              </button>
            </div>
          )}

          {openPanel === 'date' && (
            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Ngày đi & Số ngày</p>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Ngày khởi hành</label>
                  <input
                    type="date"
                    value={localStartDate}
                    onChange={(e) => setLocalStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Số ngày</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[3, 5, 7].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setLocalDuration(d)}
                        className={`rounded-xl py-2 text-sm font-black transition ${
                          localDuration === d ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {d} ngày
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { emit({ startDate: localStartDate, duration: localDuration }); setOpenPanel(null); }}
                  className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-black text-white hover:bg-blue-700"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          )}

          {openPanel === 'budget' && (
            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Ngân sách</p>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => {
                      setLocalBudget(level);
                      emit({ budgetLevel: level });
                      setOpenPanel(null);
                    }}
                    className={`flex flex-col items-center rounded-xl py-3 text-sm font-black transition ${
                      localBudget === level ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span className="text-lg">{budgetIcons[level]}</span>
                    <span className="mt-1 text-xs">{budgetLabels[level]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {openPanel === 'interests' && (
            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Sở thích</p>
              <div className="flex flex-wrap gap-2">
                {availableInterests.map(interest => {
                  const selected = localInterests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => {
                        const next = selected
                          ? localInterests.filter(i => i !== interest)
                          : [...localInterests, interest];
                        setLocalInterests(next);
                      }}
                      className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
                        selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => { emit({ interests: localInterests }); setOpenPanel(null); }}
                className="mt-3 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-black text-white hover:bg-blue-700"
              >
                Áp dụng
              </button>
            </div>
          )}

        </div>
      )}

      {/* Backdrop to close dropdown */}
      {openPanel && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpenPanel(null)}
        />
      )}
    </div>
  );
};

export default PlannerConfigBar;
