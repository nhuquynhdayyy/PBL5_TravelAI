import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronRight,
  Loader2,
  MapPin,
  RotateCcw,
  Send,
  Sparkles,
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { getTodayVietnam } from '../../utils/dateUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Destination {
  id: number;
  name: string;
  country?: string;
  imageUrl?: string;
}

interface QuickReply {
  label: string;
  value: string;
  emoji?: string;
  color?: string;
}

interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
  quickReplies?: QuickReply[];
  showDatePicker?: boolean;
  isTyping?: boolean;
  timestamp: number;
}

type Step =
  | 'greeting'
  | 'destination'
  | 'duration'
  | 'guests'
  | 'startDate'
  | 'budget'
  | 'naturePreference'
  | 'activityPreference'
  | 'specialRequest'
  | 'summary'
  | 'generating';

interface PlanData {
  destinationId: number | null;
  destinationName: string;
  numberOfDays: number;
  startDate: string;
  budgetLevel: string;
  naturePrefs: string[];
  activityPrefs: string[];
  specialRequest: string;
  adults: number;
  children: number;
  estimatedBudget?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_ORDER: Step[] = [
  'greeting',
  'destination',
  'duration',
  'guests',
  'startDate',
  'budget',
  'naturePreference',
  'activityPreference',
  'specialRequest',
  'summary',
  'generating',
];

const DURATION_OPTIONS: QuickReply[] = [
  { label: '1 ngày', value: '1', emoji: '⚡' },
  { label: '2 ngày', value: '2', emoji: '🌅' },
  { label: '3 ngày', value: '3', emoji: '🗓️' },
  { label: '5 ngày', value: '5', emoji: '🏖️' },
  { label: '7 ngày', value: '7', emoji: '🌏' },
  { label: '10 ngày', value: '10', emoji: '✈️' },
];

const BUDGET_OPTIONS: QuickReply[] = [
  { label: 'Tiết kiệm', value: 'low', emoji: '💰', color: 'emerald' },
  { label: 'Trung bình', value: 'medium', emoji: '💵', color: 'blue' },
  { label: 'Cao cấp', value: 'high', emoji: '💎', color: 'purple' },
];

const NATURE_OPTIONS: QuickReply[] = [
  { label: 'Biển & Đảo', value: 'Biển', emoji: '🏖️', color: 'cyan' },
  { label: 'Núi & Rừng', value: 'Núi', emoji: '⛰️', color: 'green' },
  { label: 'Thành phố', value: 'Thành phố', emoji: '🏙️', color: 'blue' },
  { label: 'Di tích lịch sử', value: 'Di tích', emoji: '🏛️', color: 'amber' },
  { label: 'Đồng quê', value: 'Nông thôn', emoji: '🌾', color: 'lime' },
];

const ACTIVITY_OPTIONS: QuickReply[] = [
  { label: 'Ẩm thực', value: 'Ẩm thực', emoji: '🍜', color: 'orange' },
  { label: 'Văn hóa & Nghệ thuật', value: 'Văn hóa', emoji: '🎭', color: 'purple' },
  { label: 'Thể thao & Phiêu lưu', value: 'Phiêu lưu', emoji: '🏄', color: 'blue' },
  { label: 'Mua sắm', value: 'Mua sắm', emoji: '🛍️', color: 'pink' },
  { label: 'Chụp ảnh', value: 'Chụp ảnh', emoji: '📸', color: 'indigo' },
  { label: 'Thư giãn & Spa', value: 'Thư giãn', emoji: '🧘', color: 'teal' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2);
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function getBudgetLabel(val: string) {
  return BUDGET_OPTIONS.find((b) => b.value === val)?.label || val;
}

export function generateTravelPrompt(userData: PlanData, chatHistory: ChatMessage[]): string {
  const parts: string[] = [];

  // Destination & Duration
  if (userData.destinationName) {
    parts.push(`Người dùng muốn đi ${userData.destinationName}`);
  }
  if (userData.numberOfDays) {
    parts.push(`${userData.numberOfDays} ngày`);
  }
  if (userData.startDate) {
    parts.push(`khởi hành vào ngày ${formatDate(userData.startDate)}`);
  }

  // Guests
  if (userData.adults) {
    parts.push(`số lượng khách: ${userData.adults} người lớn${userData.children > 0 ? `, ${userData.children} trẻ em` : ''}`);
  }

  // Budget
  if (userData.budgetLevel) {
    const budgetLabel = getBudgetLabel(userData.budgetLevel);
    parts.push(`ngân sách ${budgetLabel.toLowerCase()}`);
  }
  if (userData.estimatedBudget) {
    parts.push(`tổng chi phí dự kiến cho chuyến đi là ${userData.estimatedBudget.toLocaleString('vi-VN')}đ`);
  }

  // Landscape Preference
  if (userData.naturePrefs && userData.naturePrefs.length > 0) {
    const natureLabels = userData.naturePrefs.map(
      (val) => NATURE_OPTIONS.find((o) => o.value === val)?.label || val
    );
    parts.push(`phong cảnh yêu thích: ${natureLabels.join(', ')}`);
  }

  // Activity Preference
  if (userData.activityPrefs && userData.activityPrefs.length > 0) {
    const activityLabels = userData.activityPrefs.map(
      (val) => ACTIVITY_OPTIONS.find((o) => o.value === val)?.label || val
    );
    parts.push(`hoạt động mong muốn: ${activityLabels.join(', ')}`);
  }

  // Special Request
  if (userData.specialRequest) {
    parts.push(`yêu cầu đặc biệt: "${userData.specialRequest}"`);
  }

  // Chat history analysis
  const chatNotes: string[] = [];
  chatHistory.forEach((msg) => {
    if (msg.role === 'user') {
      const text = msg.text.trim();
      // Filter out automated quick reply tags or trigger commands
      if (
        text.startsWith('✨') ||
        text.startsWith('⏭️') ||
        text.startsWith('📍') ||
        text.startsWith('🗓️') ||
        text.startsWith('📅') ||
        text.startsWith('💰') ||
        text.startsWith('💵') ||
        text.startsWith('💎')
      ) {
        return;
      }
      chatNotes.push(text);
    }
  });

  if (chatNotes.length > 0) {
    parts.push(`ghi chú thêm từ trò chuyện: ${chatNotes.map(n => `"${n}"`).join(', ')}`);
  }

  return parts.join(', ') + '.';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const TypingIndicator = () => (
  <div className="flex items-end gap-3 mb-4">
    <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
      <Sparkles size={16} className="text-white" />
    </div>
    <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl rounded-bl-sm px-5 py-4">
      <div className="flex gap-1.5 items-center h-5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
          />
        ))}
      </div>
    </div>
  </div>
);

interface AiBubbleProps {
  message: ChatMessage;
  onQuickReply: (reply: QuickReply) => void;
  onDateSubmit: (date: string) => void;
  selectedValues?: string[];
  multiSelect?: boolean;
  pendingMulti?: string[];
  onMultiToggle?: (val: string) => void;
  onMultiConfirm?: () => void;
  showGuestPicker?: boolean;
  onGuestsSubmit?: (adults: number, children: number) => void;
}

const COLOR_MAP: Record<string, string> = {
  cyan: 'border-cyan-400/50 hover:bg-cyan-500/20 hover:border-cyan-400 text-cyan-300',
  green: 'border-green-400/50 hover:bg-green-500/20 hover:border-green-400 text-green-300',
  blue: 'border-blue-400/50 hover:bg-blue-500/20 hover:border-blue-400 text-blue-300',
  amber: 'border-amber-400/50 hover:bg-amber-500/20 hover:border-amber-400 text-amber-300',
  lime: 'border-lime-400/50 hover:bg-lime-500/20 hover:border-lime-400 text-lime-300',
  orange: 'border-orange-400/50 hover:bg-orange-500/20 hover:border-orange-400 text-orange-300',
  purple: 'border-purple-400/50 hover:bg-purple-500/20 hover:border-purple-400 text-purple-300',
  pink: 'border-pink-400/50 hover:bg-pink-500/20 hover:border-pink-400 text-pink-300',
  indigo: 'border-indigo-400/50 hover:bg-indigo-500/20 hover:border-indigo-400 text-indigo-300',
  teal: 'border-teal-400/50 hover:bg-teal-500/20 hover:border-teal-400 text-teal-300',
  emerald: 'border-emerald-400/50 hover:bg-emerald-500/20 hover:border-emerald-400 text-emerald-300',
};

const SELECTED_MAP: Record<string, string> = {
  cyan: 'bg-cyan-500/30 border-cyan-400 text-cyan-200',
  green: 'bg-green-500/30 border-green-400 text-green-200',
  blue: 'bg-blue-500/30 border-blue-400 text-blue-200',
  amber: 'bg-amber-500/30 border-amber-400 text-amber-200',
  lime: 'bg-lime-500/30 border-lime-400 text-lime-200',
  orange: 'bg-orange-500/30 border-orange-400 text-orange-200',
  purple: 'bg-purple-500/30 border-purple-400 text-purple-200',
  pink: 'bg-pink-500/30 border-pink-400 text-pink-200',
  indigo: 'bg-indigo-500/30 border-indigo-400 text-indigo-200',
  teal: 'bg-teal-500/30 border-teal-400 text-teal-200',
  emerald: 'bg-emerald-500/30 border-emerald-400 text-emerald-200',
};

const AiBubble: React.FC<AiBubbleProps> = ({
  message,
  onQuickReply,
  onDateSubmit,
  selectedValues = [],
  multiSelect = false,
  pendingMulti = [],
  onMultiToggle,
  onMultiConfirm,
  showGuestPicker = false,
  onGuestsSubmit,
}) => {
  const [dateVal, setDateVal] = useState(getTodayVietnam());
  const [adultsCount, setAdultsCount] = useState(2);
  const [childrenCount, setChildrenCount] = useState(0);

  return (
    <div className="flex items-end gap-3 mb-6 animate-fadeInUp">
      <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
        <Sparkles size={16} className="text-white" />
      </div>

      <div className="flex-1 max-w-[85%]">
        <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl rounded-bl-sm px-5 py-4 text-white text-[15px] leading-relaxed font-medium shadow-lg">
          {message.text}
        </div>

        {/* Quick Replies */}
        {message.quickReplies && message.quickReplies.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.quickReplies.map((reply) => {
              const isSelected = multiSelect
                ? pendingMulti.includes(reply.value)
                : selectedValues.includes(reply.value);
              const colorClass = reply.color
                ? isSelected
                  ? SELECTED_MAP[reply.color] || ''
                  : COLOR_MAP[reply.color] || ''
                : isSelected
                  ? 'bg-blue-500/30 border-blue-400 text-blue-200'
                  : 'border-white/20 hover:bg-white/10 hover:border-white/40 text-white/80';

              return (
                <button
                  key={reply.value}
                  onClick={() =>
                    multiSelect && onMultiToggle
                      ? onMultiToggle(reply.value)
                      : onQuickReply(reply)
                  }
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold
                    transition-all duration-200 active:scale-95
                    ${colorClass}
                    ${isSelected ? 'ring-1 ring-white/20' : ''}
                  `}
                >
                  {reply.emoji && <span>{reply.emoji}</span>}
                  {reply.label}
                  {isSelected && <span className="text-xs">✓</span>}
                </button>
              );
            })}
            {multiSelect && onMultiConfirm && pendingMulti.length > 0 && (
              <button
                onClick={onMultiConfirm}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-black transition-all active:scale-95 shadow-lg shadow-blue-500/30"
              >
                Xác nhận ({pendingMulti.length}) <ChevronRight size={14} />
              </button>
            )}
          </div>
        )}

        {/* Date Picker */}
        {message.showDatePicker && (
          <div className="mt-3 flex items-center gap-3">
            <input
              type="date"
              value={dateVal}
              min={getTodayVietnam()}
              onChange={(e) => setDateVal(e.target.value)}
              className="bg-white/10 border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm font-semibold [color-scheme:dark] focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 transition-all"
            />
            <button
              onClick={() => onDateSubmit(dateVal)}
              disabled={!dateVal}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-black transition-all active:scale-95 shadow-lg shadow-blue-500/30"
            >
              Chọn <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Guest Picker */}
        {showGuestPicker && onGuestsSubmit && (
          <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-4 max-w-xs backdrop-blur-sm shadow-xl">
            <div className="flex flex-col gap-4">
              {/* Người lớn */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-sm">Người lớn</p>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Từ 12 tuổi</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setAdultsCount((prev) => Math.max(1, prev - 1))}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 active:scale-90 text-white font-bold flex items-center justify-center transition-all border border-white/10"
                  >
                    -
                  </button>
                  <span className="text-white font-black text-sm w-5 text-center">{adultsCount}</span>
                  <button
                    onClick={() => setAdultsCount((prev) => Math.min(20, prev + 1))}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 active:scale-90 text-white font-bold flex items-center justify-center transition-all border border-white/10"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-white/5" />

              {/* Trẻ em */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-sm">Trẻ em</p>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider">2 - 11 tuổi</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setChildrenCount((prev) => Math.max(0, prev - 1))}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 active:scale-90 text-white font-bold flex items-center justify-center transition-all border border-white/10"
                  >
                    -
                  </button>
                  <span className="text-white font-black text-sm w-5 text-center">{childrenCount}</span>
                  <button
                    onClick={() => setChildrenCount((prev) => Math.min(20, prev + 1))}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 active:scale-90 text-white font-bold flex items-center justify-center transition-all border border-white/10"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-white/5" />

              <button
                onClick={() => onGuestsSubmit(adultsCount, childrenCount)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-black transition-all active:scale-95 shadow-lg shadow-blue-500/30 flex items-center justify-center gap-1"
              >
                Xác nhận <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const UserBubble: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex justify-end mb-6 animate-fadeInUp">
    <div className="max-w-[75%] bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl rounded-br-sm px-5 py-3.5 text-sm font-semibold shadow-lg shadow-blue-600/30">
      {text}
    </div>
  </div>
);

// ─── Progress Steps ───────────────────────────────────────────────────────────

const PROGRESS_LABELS = ['Điểm đến', 'Thời gian', 'Số lượng khách', 'Ngày đi', 'Ngân sách', 'Sở thích', 'Hoàn tất'];

const ProgressBar: React.FC<{ currentStep: Step }> = ({ currentStep }) => {
  const stepMap: Record<Step, number> = {
    greeting: 0,
    destination: 1,
    duration: 2,
    guests: 3,
    startDate: 4,
    budget: 5,
    naturePreference: 6,
    activityPreference: 6,
    specialRequest: 6,
    summary: 7,
    generating: 7,
  };
  const current = stepMap[currentStep] || 0;
  const total = PROGRESS_LABELS.length;

  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {PROGRESS_LABELS.map((label, i) => (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-500 ${
                i < current
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-500/40'
                  : i === current
                    ? 'bg-blue-400/30 border-2 border-blue-400 text-blue-300'
                    : 'bg-white/5 border border-white/10 text-white/30'
              }`}
            >
              {i < current ? '✓' : i + 1}
            </div>
            <span className={`text-[9px] font-bold hidden sm:block whitespace-nowrap transition-all ${
              i <= current ? 'text-blue-300' : 'text-white/20'
            }`}>
              {label}
            </span>
          </div>
          {i < total - 1 && (
            <div
              className={`flex-1 h-0.5 rounded-full mb-3.5 transition-all duration-700 ${
                i < current ? 'bg-blue-500' : 'bg-white/10'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// ─── Summary Card ─────────────────────────────────────────────────────────────

const SummaryCard: React.FC<{ data: PlanData; onConfirm: () => void; onReset: () => void }> = ({
  data,
  onConfirm,
  onReset,
}) => (
  <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6 animate-fadeInUp">
    <h3 className="text-white font-black text-lg mb-4 flex items-center gap-2">
      <Sparkles size={18} className="text-blue-400" />
      Tóm tắt chuyến đi của bạn
    </h3>
    <div className="space-y-2.5 text-sm">
      {[
        { icon: '📍', label: 'Điểm đến', value: data.destinationName },
        { icon: '🗓️', label: 'Thời gian', value: `${data.numberOfDays} ngày, từ ${formatDate(data.startDate)}` },
        { icon: '👥', label: 'Số lượng khách', value: `${data.adults} người lớn${data.children > 0 ? `, ${data.children} trẻ em` : ''}` },
        { icon: '💰', label: 'Ngân sách', value: getBudgetLabel(data.budgetLevel) },
        { icon: '🌿', label: 'Phong cảnh', value: data.naturePrefs.join(', ') || 'Chưa chọn' },
        { icon: '🎯', label: 'Hoạt động', value: data.activityPrefs.join(', ') || 'Chưa chọn' },
        ...(data.specialRequest ? [{ icon: '💬', label: 'Yêu cầu đặc biệt', value: data.specialRequest }] : []),
      ].map(({ icon, label, value }) => (
        <div key={label} className="flex items-start gap-3">
          <span className="text-base shrink-0">{icon}</span>
          <div>
            <span className="text-white/50 text-xs font-bold uppercase tracking-wider">{label}</span>
            <p className="text-white font-semibold mt-0.5">{value}</p>
          </div>
        </div>
      ))}
    </div>
    <div className="flex gap-3 mt-6">
      <button
        onClick={onConfirm}
        className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-black text-sm transition-all active:scale-[0.98] shadow-lg shadow-blue-600/40 flex items-center justify-center gap-2"
      >
        <Sparkles size={16} />
        Tạo lịch trình với AI
      </button>
      <button
        onClick={onReset}
        className="px-4 py-3.5 bg-white/10 hover:bg-white/15 text-white/70 rounded-xl font-bold text-sm transition-all active:scale-95 border border-white/10"
        title="Bắt đầu lại"
      >
        <RotateCcw size={16} />
      </button>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const CreateItinerary: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isFirstMount = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [step, setStep] = useState<Step>('greeting');
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedValues, setSelectedValues] = useState<Record<string, string[]>>({});
  const [pendingMulti, setPendingMulti] = useState<string[]>([]);
  const [pref, setPref] = useState<any>(null);
  const [loadingPref, setLoadingPref] = useState<boolean>(true);

  const [planData, setPlanData] = useState<PlanData>({
    destinationId: null,
    destinationName: '',
    numberOfDays: 3,
    startDate: getTodayVietnam(),
    budgetLevel: 'medium',
    naturePrefs: [],
    activityPrefs: [],
    specialRequest: '',
    adults: 2,
    children: 0,
  });

  // Scroll to bottom inside chat container on new messages (skip on first mount)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    // Scroll within the chat container only, not the whole page
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Load destinations and preferences
  useEffect(() => {
    // Load destinations
    axiosClient
      .get('/destinations')
      .then((res) => {
        const data: Destination[] = res.data?.data || res.data || [];
        setDestinations(Array.isArray(data) ? data : []);
      })
      .catch(console.error);

    // Load user preferences from Profile
    axiosClient
      .get('/preferences')
      .then((res) => {
        if (res.data && res.data.success && res.data.data) {
          const userPref = res.data.data;
          setPref(userPref);

          // Map budgetLevel enum (0 -> 'low', 1 -> 'medium', 2 -> 'high')
          let budgetStr = 'medium';
          if (userPref.budgetLevel === 0) budgetStr = 'low';
          if (userPref.budgetLevel === 2) budgetStr = 'high';

          setPlanData((prev) => {
            const next = { ...prev, budgetLevel: budgetStr };

            // If style is Phượt or Thám hiểm, pre-populate adventure-related context
            if (userPref.travelStyle === 'Phượt' || userPref.travelStyle === 'Thám hiểm') {
              next.naturePrefs = ['Núi'];
              next.activityPrefs = ['Phiêu lưu'];
              next.specialRequest = 'Ưu tiên các điểm đến mạo hiểm';
            }
            return next;
          });
        }
      })
      .catch(console.error)
      .finally(() => {
        setLoadingPref(false);
      });
  }, []);

  // Kick off greeting after destinations and preferences load
  useEffect(() => {
    if (destinations.length > 0 && !loadingPref && messages.length === 0) {
      const isPhuot = pref?.travelStyle === 'Phượt' || pref?.travelStyle === 'Thám hiểm';
      const isDayDac = pref?.travelPace === 2; // 2: Dày đặc

      let greetingText = 'Xin chào! Tôi là AI Planner của TravelAI 🌏\nHãy để tôi giúp bạn lập kế hoạch chuyến đi trong mơ!\n\nBạn muốn đến đâu lần này?';

      if (isPhuot && isDayDac) {
        greetingText = 'Xin chào! Tôi là AI Planner của TravelAI 🌏\nTôi thấy bạn thích đi phượt và lịch trình dày đặc, tôi sẽ ưu tiên các điểm đến mạo hiểm nhé?\n\nBạn muốn đến đâu lần này?';
      }

      const destIdParam = searchParams.get('destinationId');
      const daysParam = searchParams.get('days');
      const peopleParam = searchParams.get('people');
      const budgetStyleParam = searchParams.get('budgetStyle');
      const budgetTotalParam = searchParams.get('budgetTotal');

      const matchingDest = destIdParam
        ? destinations.find((d) => d.id === parseInt(destIdParam, 10))
        : null;

      if (matchingDest) {
        if (daysParam && peopleParam) {
          const daysNum = parseInt(daysParam, 10);
          const peopleNum = parseInt(peopleParam, 10);

          setMessages([
            {
              id: genId(),
              role: 'ai',
              text: greetingText,
              timestamp: Date.now() - 6000,
            },
            {
              id: genId(),
              role: 'user',
              text: `📍 ${matchingDest.name}`,
              timestamp: Date.now() - 5000,
            },
            {
              id: genId(),
              role: 'ai',
              text: `Tuyệt vời! ${matchingDest.name} là lựa chọn tuyệt vời 🎉\n\nBạn muốn đi trong bao nhiêu ngày?`,
              timestamp: Date.now() - 4000,
            },
            {
              id: genId(),
              role: 'user',
              text: `🗓️ ${daysNum} ngày`,
              timestamp: Date.now() - 3000,
            },
            {
              id: genId(),
              role: 'ai',
              text: `${daysNum} ngày đủ để khám phá nhiều điều thú vị!\n\nChuyến đi của bạn có bao nhiêu người? Hãy chọn số lượng người lớn và trẻ em.`,
              timestamp: Date.now() - 2000,
            },
            {
              id: genId(),
              role: 'user',
              text: `👥 ${peopleNum} người lớn`,
              timestamp: Date.now() - 1000,
            },
            {
              id: genId(),
              role: 'ai',
              text: `Đã nhận thông tin hành khách! 👥\n\nBạn dự định khởi hành vào ngày nào?`,
              showDatePicker: true,
              timestamp: Date.now(),
            },
          ]);

          markSelected('destination', String(matchingDest.id));
          markSelected('duration', String(daysNum));
          if (budgetStyleParam) {
            markSelected('budget', budgetStyleParam);
          }

          setPlanData((prev) => ({
            ...prev,
            destinationId: matchingDest.id,
            destinationName: matchingDest.name,
            numberOfDays: daysNum,
            adults: peopleNum,
            children: 0,
            budgetLevel: budgetStyleParam || prev.budgetLevel,
            estimatedBudget: budgetTotalParam ? parseInt(budgetTotalParam, 10) : undefined,
          }));

          setStep('startDate');
        } else {
          const gId = genId();
          const uId = genId();
          const aId = genId();

          setMessages([
            {
              id: gId,
              role: 'ai',
              text: greetingText,
              timestamp: Date.now() - 2000,
            },
            {
              id: uId,
              role: 'user',
              text: `📍 ${matchingDest.name}`,
              timestamp: Date.now() - 1000,
            },
            {
              id: aId,
              role: 'ai',
              text: `Tuyệt vời! ${matchingDest.name} là lựa chọn tuyệt vời 🎉\n\nBạn muốn đi trong bao nhiêu ngày?`,
              quickReplies: DURATION_OPTIONS,
              timestamp: Date.now(),
            },
          ]);

          markSelected('destination', String(matchingDest.id));
          setPlanData((prev) => ({
            ...prev,
            destinationId: matchingDest.id,
            destinationName: matchingDest.name,
          }));
          setStep('duration');
        }
      } else {
        pushAiMessage(greetingText, buildDestinationReplies(destinations));
        setStep('destination');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinations, loadingPref, pref, searchParams]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function buildDestinationReplies(dests: Destination[]): QuickReply[] {
    return dests.slice(0, 10).map((d) => ({ label: d.name, value: String(d.id) }));
  }

  function pushAiMessage(
    text: string,
    quickReplies?: QuickReply[],
    showDatePicker = false,
    showGuestPicker = false,
  ) {
    const msg: ChatMessage = {
      id: genId(),
      role: 'ai',
      text,
      quickReplies,
      showDatePicker,
      showGuestPicker,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, msg]);
  }

  function pushUserMessage(text: string) {
    setMessages((prev) => [
      ...prev,
      { id: genId(), role: 'user', text, timestamp: Date.now() },
    ]);
  }

  async function aiThinkThen(fn: () => void, delay = 800) {
    setIsTyping(true);
    await new Promise((r) => setTimeout(r, delay));
    setIsTyping(false);
    fn();
  }

  function markSelected(stepKey: string, val: string) {
    setSelectedValues((prev) => ({ ...prev, [stepKey]: [val] }));
  }

  // ── Step Handlers ─────────────────────────────────────────────────────────────

  function handleDestinationReply(reply: QuickReply) {
    const destId = parseInt(reply.value, 10);
    const dest = destinations.find((d) => d.id === destId);
    if (!dest) return;

    pushUserMessage(`📍 ${dest.name}`);
    markSelected('destination', reply.value);
    setPlanData((prev) => ({ ...prev, destinationId: destId, destinationName: dest.name }));
    setStep('duration');

    aiThinkThen(() => {
      pushAiMessage(
        `Tuyệt vời! ${dest.name} là lựa chọn tuyệt vời 🎉\n\nBạn muốn đi trong bao nhiêu ngày?`,
        DURATION_OPTIONS,
      );
    });
  }

  function handleDurationReply(reply: QuickReply) {
    const days = parseInt(reply.value, 10);
    pushUserMessage(`🗓️ ${reply.label}`);
    markSelected('duration', reply.value);
    setPlanData((prev) => ({ ...prev, numberOfDays: days }));
    setStep('guests');

    aiThinkThen(() => {
      pushAiMessage(
        `${days} ngày đủ để khám phá nhiều điều thú vị!\n\nChuyến đi của bạn có bao nhiêu người? Hãy chọn số lượng người lớn và trẻ em.`,
        undefined,
        false,
        true, // showGuestPicker
      );
    });
  }

  function handleGuestsSubmit(adults: number, children: number) {
    let text = `👥 ${adults} người lớn`;
    if (children > 0) {
      text += `, ${children} trẻ em`;
    }
    pushUserMessage(text);
    setPlanData((prev) => ({ ...prev, adults, children }));
    setStep('startDate');

    aiThinkThen(() => {
      pushAiMessage(
        `Đã nhận thông tin hành khách! 👥\n\nBạn dự định khởi hành vào ngày nào?`,
        undefined,
        true, // showDatePicker
      );
    });
  }

  function handleDateSubmit(date: string) {
    pushUserMessage(`📅 ${formatDate(date)}`);
    setPlanData((prev) => ({ ...prev, startDate: date }));

    const hasPreFilledBudget = !!searchParams.get('budgetStyle');

    if (hasPreFilledBudget) {
      setStep('naturePreference');
      aiThinkThen(() => {
        pushAiMessage(
          `Ngày ${formatDate(date)} nghe có vẻ tuyệt! ☀️\n\nĐể AI gợi ý đúng hơn, bạn thích loại phong cảnh nào?\n(Có thể chọn nhiều)`,
          NATURE_OPTIONS,
        );
      });
    } else {
      setStep('budget');
      aiThinkThen(() => {
        pushAiMessage(
          `Ngày ${formatDate(date)} nghe có vẻ tuyệt! ☀️\n\nBạn có ngân sách dự kiến như thế nào cho chuyến đi này?`,
          BUDGET_OPTIONS,
        );
      });
    }
  }

  function handleBudgetReply(reply: QuickReply) {
    pushUserMessage(`${reply.emoji} ${reply.label}`);
    markSelected('budget', reply.value);
    setPlanData((prev) => ({ ...prev, budgetLevel: reply.value }));
    setStep('naturePreference');

    aiThinkThen(() => {
      pushAiMessage(
        `Hiểu rồi! Để AI gợi ý đúng hơn, bạn thích loại phong cảnh nào?\n(Có thể chọn nhiều)`,
        NATURE_OPTIONS,
      );
    });
  }

  function handleNatureToggle(val: string) {
    setPendingMulti((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
    );
  }

  function handleNatureConfirm() {
    if (pendingMulti.length === 0) return;
    const labels = NATURE_OPTIONS.filter((o) => pendingMulti.includes(o.value)).map(
      (o) => `${o.emoji} ${o.label}`,
    );
    pushUserMessage(labels.join(', '));
    setPlanData((prev) => ({ ...prev, naturePrefs: pendingMulti }));
    setPendingMulti([]);
    setStep('activityPreference');

    aiThinkThen(() => {
      pushAiMessage(
        `Sở thích phong cảnh của bạn thật đặc biệt! 🌿\n\nCòn về hoạt động, bạn thích làm gì nhất trong chuyến đi?\n(Có thể chọn nhiều)`,
        ACTIVITY_OPTIONS,
      );
    });
  }

  function handleActivityToggle(val: string) {
    setPendingMulti((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
    );
  }

  function handleActivityConfirm() {
    const labels = ACTIVITY_OPTIONS.filter((o) => pendingMulti.includes(o.value)).map(
      (o) => `${o.emoji} ${o.label}`,
    );
    const selected = pendingMulti.length > 0 ? pendingMulti : [];
    pushUserMessage(selected.length > 0 ? labels.join(', ') : 'Đa dạng, cái gì cũng được!');
    setPlanData((prev) => ({ ...prev, activityPrefs: selected }));
    setPendingMulti([]);
    setStep('specialRequest');

    aiThinkThen(() => {
      pushAiMessage(
        `Bạn có yêu cầu đặc biệt nào không?\nVí dụ: "thích đồ ăn chay", "cần chỗ nghỉ thú cưng", "có trẻ nhỏ"...\n\nHoặc nhấn nút bên dưới để bỏ qua.`,
        [{ label: 'Bỏ qua', value: '__skip__', emoji: '⏭️' }],
      );
    });
  }

  function handleSpecialRequest(text: string) {
    const isSkip = text === '__skip__' || text.trim() === '';
    pushUserMessage(isSkip ? '⏭️ Không có yêu cầu đặc biệt' : `💬 ${text}`);
    setPlanData((prev) => ({ ...prev, specialRequest: isSkip ? '' : text }));
    setInputValue('');
    setStep('summary');

    aiThinkThen(() => {
      pushAiMessage(
        `Hoàn hảo! Tôi đã thu thập đủ thông tin rồi ✅\n\nHãy xem lại tóm tắt chuyến đi của bạn bên dưới nhé!`,
      );
    }, 600);
  }

  // ── Master Quick Reply Dispatcher ─────────────────────────────────────────────

  function handleQuickReply(reply: QuickReply) {
    if (generating) return;
    switch (step) {
      case 'destination':
        handleDestinationReply(reply);
        break;
      case 'duration':
        handleDurationReply(reply);
        break;
      case 'budget':
        handleBudgetReply(reply);
        break;
      case 'specialRequest':
        if (reply.value === '__skip__') handleSpecialRequest('__skip__');
        break;
    }
  }

  function handleMultiToggle(val: string) {
    if (step === 'naturePreference') handleNatureToggle(val);
    else if (step === 'activityPreference') handleActivityToggle(val);
  }

  function handleMultiConfirm() {
    if (step === 'naturePreference') handleNatureConfirm();
    else if (step === 'activityPreference') handleActivityConfirm();
  }

  // ── Text Input Send ───────────────────────────────────────────────────────────

  function handleSend() {
    const text = inputValue.trim();
    if (!text || generating) return;

    if (step === 'destination') {
      // Find by name
      const match = destinations.find((d) =>
        d.name.toLowerCase().includes(text.toLowerCase()),
      );
      if (match) {
        handleDestinationReply({ label: match.name, value: String(match.id) });
      } else {
        pushAiMessage(
          `Tôi chưa tìm thấy điểm đến "${text}" trong hệ thống.\nBạn có thể chọn từ gợi ý bên dưới không?`,
        );
      }
    } else if (step === 'specialRequest') {
      handleSpecialRequest(text);
    }
    setInputValue('');
  }

  // ── Generate Itinerary ────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!planData.destinationId) return;
    setGenerating(true);
    setStep('generating');

    pushUserMessage('✨ Tạo lịch trình ngay!');
    setIsTyping(true);

    try {
      const specialRequestPrompt = generateTravelPrompt(planData, messages);
      const requestBody = {
        destinationId: planData.destinationId,
        numberOfDays: planData.numberOfDays,
        startDate: planData.startDate,
        specialRequest: specialRequestPrompt,
        adults: planData.adults,
        children: planData.children,
      };

      const response = await axiosClient.post('/itinerary/generate', requestBody);
      const itinerary = response.data?.data || response.data;

      if (itinerary) {
        navigate('/itinerary/latest', {
          state: { data: itinerary },
          replace: false,
        });
      } else {
        throw new Error('Không nhận được dữ liệu lịch trình từ server.');
      }
    } catch (err: any) {
      setIsTyping(false);
      setGenerating(false);
      setStep('summary');

      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Có lỗi xảy ra khi tạo lịch trình. Vui lòng thử lại.';

      pushAiMessage(`❌ ${msg}\n\nBạn muốn thử lại không?`);
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────────

  function handleReset() {
    setMessages([]);
    setStep('greeting');
    setInputValue('');
    setSelectedValues({});
    setPendingMulti([]);

    // Map budgetLevel enum (0 -> 'low', 1 -> 'medium', 2 -> 'high')
    let budgetStr = 'medium';
    if (pref?.budgetLevel === 0) budgetStr = 'low';
    if (pref?.budgetLevel === 2) budgetStr = 'high';

    const initialPlanData = {
      destinationId: null,
      destinationName: '',
      numberOfDays: 3,
      startDate: getTodayVietnam(),
      budgetLevel: budgetStr,
      naturePrefs: [] as string[],
      activityPrefs: [] as string[],
      specialRequest: '',
      adults: 2,
      children: 0,
    };

    if (pref?.travelStyle === 'Phượt' || pref?.travelStyle === 'Thám hiểm') {
      initialPlanData.naturePrefs = ['Núi'];
      initialPlanData.activityPrefs = ['Phiêu lưu'];
      initialPlanData.specialRequest = 'Ưu tiên các điểm đến mạo hiểm';
    }

    setPlanData(initialPlanData);

    // Re-trigger greeting
    setTimeout(() => {
      const isPhuot = pref?.travelStyle === 'Phượt' || pref?.travelStyle === 'Thám hiểm';
      const isDayDac = pref?.travelPace === 2; // 2: Dày đặc

      let greetingText = 'Bắt đầu lại nào! 🔄\n\nBạn muốn đến đâu lần này?';

      if (isPhuot && isDayDac) {
        greetingText = 'Bắt đầu lại nào! 🔄\nTôi thấy bạn thích đi phượt và lịch trình dày đặc, tôi sẽ ưu tiên các điểm đến mạo hiểm nhé?\n\nBạn muốn đến đâu lần này?';
      }

      pushAiMessage(
        greetingText,
        buildDestinationReplies(destinations),
      );
      setStep('destination');
    }, 100);
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  const isMultiStep = step === 'naturePreference' || step === 'activityPreference';
  const showInput =
    step === 'destination' || step === 'specialRequest';
  const inputPlaceholder =
    step === 'destination'
      ? 'Nhập tên điểm đến...'
      : 'Nhập yêu cầu đặc biệt (hoặc bỏ qua)...';

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.35s ease-out forwards;
        }
      `}</style>

      <div
        className="min-h-screen flex flex-col"
        style={{
          background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 40%, #0f0a2e 100%)',
        }}
      >
        {/* ── Header ── */}
        <div className="border-b border-white/5 bg-black/20 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 px-4 pt-4 pb-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-white font-black text-base leading-tight">AI Travel Planner</h1>
                <p className="text-blue-300 text-xs font-medium">Lên kế hoạch chuyến đi thông minh</p>
              </div>
              {step !== 'greeting' && step !== 'generating' && (
                <button
                  onClick={handleReset}
                  className="ml-auto text-white/40 hover:text-white/70 transition-colors"
                  title="Bắt đầu lại"
                >
                  <RotateCcw size={16} />
                </button>
              )}
            </div>
            <ProgressBar currentStep={step} />
          </div>
        </div>

        {/* ── Chat Area ── */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-6">
            {/* Loading destinations */}
            {destinations.length === 0 && (
              <div className="flex items-center justify-center gap-3 text-white/50 py-20">
                <Loader2 className="animate-spin" size={20} />
                <span className="text-sm font-medium">Đang tải dữ liệu...</span>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, idx) => {
              const isLastAi = msg.role === 'ai' && idx === messages.length - 1;
              const showReplies = isLastAi && !isTyping && !generating;
              const isNatureStep = step === 'naturePreference' && isLastAi;
              const isActivityStep = step === 'activityPreference' && isLastAi;

              return msg.role === 'ai' ? (
                <AiBubble
                  key={msg.id}
                  message={{
                    ...msg,
                    quickReplies: showReplies ? msg.quickReplies : [],
                    showDatePicker: showReplies && msg.showDatePicker,
                    showGuestPicker: showReplies && msg.showGuestPicker,
                  }}
                  onQuickReply={handleQuickReply}
                  onDateSubmit={handleDateSubmit}
                  selectedValues={selectedValues[step] || []}
                  multiSelect={showReplies && (isNatureStep || isActivityStep)}
                  pendingMulti={pendingMulti}
                  onMultiToggle={handleMultiToggle}
                  onMultiConfirm={handleMultiConfirm}
                  showGuestPicker={showReplies && msg.showGuestPicker}
                  onGuestsSubmit={handleGuestsSubmit}
                />
              ) : (
                <UserBubble key={msg.id} text={msg.text} />
              );
            })}

            {/* Typing indicator */}
            {isTyping && <TypingIndicator />}

            {/* Summary Card */}
            {step === 'summary' && !isTyping && (
              <SummaryCard
                data={planData}
                onConfirm={handleGenerate}
                onReset={handleReset}
              />
            )}

            {/* Generating state */}
            {generating && (
              <div className="flex flex-col items-center gap-4 py-12 animate-fadeInUp">
                <div className="relative">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/40">
                    <Sparkles size={28} className="text-white animate-pulse" />
                  </div>
                  <div className="absolute inset-0 rounded-3xl bg-blue-500/20 animate-ping" />
                </div>
                <div className="text-center">
                  <p className="text-white font-black text-lg">AI đang tạo lịch trình</p>
                  <p className="text-blue-300 text-sm font-medium mt-1">
                    Phân tích sở thích và lên kế hoạch chi tiết...
                  </p>
                </div>
                <div className="flex gap-2">
                  {['Phân tích điểm đến', 'Tối ưu lộ trình', 'Gợi ý dịch vụ'].map((label, i) => (
                    <span
                      key={label}
                      className="px-3 py-1.5 rounded-full bg-white/10 text-white/60 text-xs font-bold animate-pulse"
                      style={{ animationDelay: `${i * 0.3}s` }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* ── Input Bar ── */}
        {showInput && !generating && (
          <div className="border-t border-white/5 bg-black/20 backdrop-blur-sm sticky bottom-0">
            <div className="max-w-2xl mx-auto px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-3 bg-white/10 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-blue-400/50 focus-within:ring-2 focus-within:ring-blue-400/20 transition-all">
                  <MapPin size={16} className="text-white/30 shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={inputPlaceholder}
                    className="flex-1 bg-transparent text-white placeholder-white/30 text-sm font-medium outline-none"
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className="w-11 h-11 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-blue-600/30"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CreateItinerary;
