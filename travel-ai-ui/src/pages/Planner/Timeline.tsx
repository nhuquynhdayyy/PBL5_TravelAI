import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Download,
  Loader2,
  MapPin,
  Route,
  Save,
  Sparkles,
} from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import axiosClient from '../../api/axiosClient';
import ItineraryMap from './ItineraryMap';
import ItinerarySkeleton from './ItinerarySkeleton';
import ItineraryTimeline from './ItineraryTimeline';
import { exportItineraryPdf } from './itineraryPdf';
import type { ItineraryActivity, ItineraryViewModel } from './itineraryTypes';
import {
  flattenActivities,
  formatCurrency,
  formatDateLabel,
  normalizeItinerary,
  parseLocalDate,
  toInputDateValue,
} from './itineraryUtils';

const getErrorMessage = (error: unknown, fallback: string) => {
  const response = (error as { response?: { data?: { message?: string } | string } })?.response;
  if (typeof response?.data === 'string') return response.data;
  return response?.data?.message || fallback;
};

const getTripDateRange = (itinerary: ItineraryViewModel) => {
  const start = parseLocalDate(itinerary.startDate);
  const end = parseLocalDate(itinerary.endDate);

  if (start && end) return `${formatDateLabel(start)} - ${formatDateLabel(end)}`;
  if (start && itinerary.days.length > 0) {
    const last = new Date(start);
    last.setDate(last.getDate() + itinerary.days.length - 1);
    return `${formatDateLabel(start)} - ${formatDateLabel(last)}`;
  }
  if (start) return formatDateLabel(start);

  return `${itinerary.days.length} ngày`;
};

const EmptyItinerary = ({ onExplore }: { onExplore: () => void }) => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
    <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-4xl">🗺️</div>
    <div>
      <h2 className="text-3xl font-black text-slate-900">Chưa có lịch trình nào</h2>
      <p className="mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
        Hãy chọn một điểm đến hoặc mở lại lịch trình đã lưu để TravelAI hiển thị timeline và bản đồ lộ trình.
      </p>
    </div>
    <button
      type="button"
      onClick={onExplore}
      className="rounded-2xl bg-[#0061ff] px-7 py-4 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
    >
      Khám phá điểm đến
    </button>
  </div>
);

const Timeline: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const routeItineraryId = params.id;
  const stateData = (location.state as { data?: unknown } | null)?.data;

  const [itinerary, setItinerary] = useState<ItineraryViewModel | null>(
    stateData ? normalizeItinerary(stateData) : null,
  );
  const [loading, setLoading] = useState(Boolean(routeItineraryId && !stateData));
  const [optimizing, setOptimizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeDay, setActiveDay] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const itineraryId = itinerary?.itineraryId || (routeItineraryId ? Number(routeItineraryId) : null);

  const fetchItineraryById = useCallback(async (id: string | number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosClient.get(`/itinerary/${id}`);
      const normalized = normalizeItinerary(response.data?.data || response.data);
      setItinerary(normalized);
      setActiveDay(normalized.days[0]?.day || 1);
    } catch (fetchError) {
      console.error(fetchError);
      setError(getErrorMessage(fetchError, 'Không thể tải lịch trình từ hệ thống.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (stateData) {
      const normalized = normalizeItinerary(stateData);
      setItinerary(normalized);
      setActiveDay(normalized.days[0]?.day || 1);
      setLoading(false);
      return;
    }

    if (routeItineraryId) {
      fetchItineraryById(routeItineraryId);
    }
  }, [fetchItineraryById, routeItineraryId, stateData]);

  const bookableActivity = useMemo(() => {
    if (!itinerary) return null;
    return flattenActivities(itinerary.days).find((activity) => activity.serviceId) || null;
  }, [itinerary]);

  const handleBook = (activity: ItineraryActivity) => {
    if (!activity.serviceId) return;

    const day = itinerary?.days.find((item) => item.day === activity.day);
    const date = day?.dateLabel && itinerary?.startDate
      ? (() => {
          const start = parseLocalDate(itinerary.startDate);
          if (!start) return '';
          start.setDate(start.getDate() + activity.day - 1);
          return `?date=${toInputDateValue(start)}`;
        })()
      : '';

    navigate(`/services/${activity.serviceId}${date}`);
  };

  const handleOptimize = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login', { state: { from: location.pathname }, replace: false });
      return;
    }

    if (!itineraryId) {
      alert('Hãy lưu lịch trình trước khi tối ưu lại bằng AI.');
      return;
    }

    try {
      setOptimizing(true);
      const response = await axiosClient.post(`/itinerary/${itineraryId}/optimize`);
      const normalized = normalizeItinerary(response.data?.data || response.data);
      setItinerary(normalized);
      setActiveDay(normalized.days[0]?.day || 1);
    } catch (optimizeError) {
      console.error(optimizeError);
      alert(getErrorMessage(optimizeError, 'Không thể tối ưu lịch trình lúc này.'));
    } finally {
      setOptimizing(false);
    }
  };

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login', { state: { from: location.pathname }, replace: false });
      return;
    }

    if (!itinerary) return;

    try {
      setSaving(true);
      const response = await axiosClient.post('/itinerary/save', itinerary.raw);
      if (response.data?.success || response.data?.data) {
        alert("Lịch trình đã được lưu vào mục 'Chuyến đi của tôi'.");
        navigate('/profile');
      }
    } catch (saveError) {
      console.error(saveError);
      alert(getErrorMessage(saveError, 'Không thể lưu lịch trình lúc này.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ItinerarySkeleton />;

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <h2 className="text-2xl font-black text-slate-900">Không tải được lịch trình</h2>
        <p className="max-w-md text-sm font-medium text-slate-500">{error}</p>
        {routeItineraryId && (
          <button
            type="button"
            onClick={() => fetchItineraryById(routeItineraryId)}
            className="rounded-2xl bg-[#0061ff] px-6 py-3 text-sm font-black text-white"
          >
            Thử lại
          </button>
        )}
      </div>
    );
  }

  if (!itinerary || itinerary.days.length === 0) {
    return <EmptyItinerary onExplore={() => navigate('/destinations')} />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 overflow-hidden rounded-[32px] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-200 md:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-blue-100 transition hover:text-white"
            >
              <ArrowLeft size={18} />
              Quay lại
            </button>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-blue-100">
              <Sparkles size={15} />
              AI itinerary manager
            </p>
            <h1 className="max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
              {itinerary.tripTitle}
            </h1>
            <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold text-slate-200">
              <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
                <MapPin size={16} className="text-blue-300" />
                {itinerary.destination}
              </span>
              <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
                <CalendarDays size={16} className="text-blue-300" />
                {getTripDateRange(itinerary)}
              </span>
              <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
                <Route size={16} className="text-blue-300" />
                {flattenActivities(itinerary.days).length} hoạt động
              </span>
              <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 px-3 py-2 text-emerald-100">
                {formatCurrency(itinerary.totalEstimatedCost)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <button
              type="button"
              onClick={handleOptimize}
              disabled={optimizing}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0061ff] px-5 py-4 text-sm font-black text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {optimizing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
              {optimizing ? 'AI đang tối ưu...' : 'Tối ưu lại bằng AI'}
            </button>
            <button
              type="button"
              onClick={() => exportItineraryPdf(itinerary)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-950 transition hover:bg-blue-50"
            >
              <Download size={18} />
              Xuất PDF
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 py-4 text-sm font-black text-white ring-1 ring-white/15 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Lưu
            </button>
          </div>
        </div>
      </div>

      {optimizing && (
        <div className="mb-8 rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <div className="mb-3 flex items-center gap-3 text-sm font-black text-[#0061ff]">
            <Loader2 className="animate-spin" size={18} />
            AI đang sắp xếp lại thứ tự điểm đến theo lộ trình ngắn hơn
          </div>
          <ItinerarySkeleton />
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <ItineraryTimeline
          days={itinerary.days}
          activeDay={activeDay}
          onActiveDayChange={setActiveDay}
          onBook={handleBook}
        />
        <ItineraryMap days={itinerary.days} activeDay={activeDay} />
      </div>

      <div className="mt-10 rounded-3xl bg-gradient-to-r from-[#0061ff] to-cyan-500 p-8 text-center text-white">
        <h2 className="text-2xl font-black">Sẵn sàng hoàn tất chuyến đi?</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm font-medium leading-6 text-blue-50">
          Bạn có thể lưu lịch trình, xuất PDF hoặc đặt ngay dịch vụ đầu tiên được TravelAI đề xuất.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-2xl bg-white px-7 py-4 text-sm font-black text-[#0061ff] transition hover:bg-blue-50 disabled:opacity-70"
          >
            Lưu vào tài khoản
          </button>
          <button
            type="button"
            onClick={() => bookableActivity && handleBook(bookableActivity)}
            disabled={!bookableActivity}
            className="rounded-2xl border border-white/30 bg-white/10 px-7 py-4 text-sm font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Đặt dịch vụ gợi ý
          </button>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
