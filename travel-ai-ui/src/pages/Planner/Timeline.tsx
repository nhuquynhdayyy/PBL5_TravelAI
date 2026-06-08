import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Download,
  DollarSign,
  Loader2,
  MapPin,
  Route,
  Save,
  Sparkles,
} from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import '../../styles/leaflet-dark.css';
import axiosClient from '../../api/axiosClient';
import { useCart } from '../../contexts/CartContext';
import DayTabs from './DayTabs';
import HotelCard from './HotelCard';
import ItineraryMap from './ItineraryMap';
import ItinerarySkeleton from './ItinerarySkeleton';
import ItineraryTimeline from './ItineraryTimeline';
import PlannerSidebar from './PlannerSidebar';
import StickyFooter from './StickyFooter';
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
        Hãy tạo lịch trình mới với AI hoặc khám phá các điểm đến để bắt đầu.
      </p>
    </div>
    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => window.location.href = '/planner/create'}
        className="rounded-2xl bg-[#0061ff] px-7 py-4 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
      >
        Tạo lịch trình với AI
      </button>
      <button
        type="button"
        onClick={onExplore}
        className="rounded-2xl bg-slate-100 px-7 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-200"
      >
        Khám phá điểm đến
      </button>
    </div>
  </div>
);

const getSavedTripId = (trip: any) => trip?.itineraryId ?? trip?.itinerary_id ?? trip?.id;

const SavedTripsPanel = ({
  trips,
  loading,
  onOpenTrip,
  onExplore,
}: {
  trips: any[];
  loading: boolean;
  onOpenTrip: (tripId: number | string) => void;
  onExplore: () => void;
}) => {
  if (loading) return <ItinerarySkeleton />;

  if (!trips.length) {
    return <EmptyItinerary onExplore={onExplore} />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 rounded-[32px] bg-slate-950 p-8 text-white shadow-2xl shadow-slate-200">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-blue-100">
          <Sparkles size={15} />
          Itinerary Library
        </p>
        <h1 className="text-4xl font-black tracking-tight md:text-5xl">Lịch trình đã lưu</h1>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-300">
          Chọn một lịch trình bên dưới để mở timeline chi tiết, bản đồ lộ trình và các công cụ tối ưu bằng AI.
        </p>
      </div>

      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-2xl font-black text-slate-900">
          <MapPin className="text-[#0061ff]" />
          {trips.length} lịch trình
        </h2>
        <button
          type="button"
          onClick={() => window.location.href = '/planner/create'}
          className="rounded-2xl bg-[#0061ff] px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
        >
          Tạo lịch trình mới
        </button>
      </div>

      <div className="grid gap-4">
        {trips.map((trip, index) => {
          const tripId = getSavedTripId(trip);

          return (
            <button
              key={tripId ?? index}
              type="button"
              onClick={() => tripId && onOpenTrip(tripId)}
              className="group rounded-3xl border border-slate-100 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate text-xl font-black text-slate-900 transition group-hover:text-[#0061ff]">
                    {trip.tripTitle || trip.title || trip.name || 'Lịch trình TravelAI'}
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                    {(trip.destination || trip.destinationName) && (
                      <span className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-2 text-[#0061ff]">
                        <MapPin size={13} />
                        {trip.destination || trip.destinationName}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-xl bg-slate-50 px-3 py-2">
                      <CalendarDays size={13} />
                      {trip.createdAt ? new Date(trip.createdAt).toLocaleDateString('vi-VN') : 'Vừa tạo'}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700">
                      <DollarSign size={13} />
                      {formatCurrency(trip.totalEstimatedCost || trip.totalCost || 0)}
                    </span>
                  </div>
                </div>
                <ChevronRight className="shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#0061ff]" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const Timeline: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { addItem } = useCart();
  const routeItineraryId = params.id;
  const stateData = (location.state as { data?: unknown } | null)?.data;

  const [itinerary, setItinerary] = useState<ItineraryViewModel | null>(
    stateData ? normalizeItinerary(stateData) : null,
  );
  const [loading, setLoading] = useState(Boolean(routeItineraryId && !stateData));
  const [optimizing, setOptimizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedTrips, setSavedTrips] = useState<any[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [activeDay, setActiveDay] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [focusedActivity, setFocusedActivity] = useState<ItineraryActivity | null>(null);

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

  const fetchSavedTrips = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setSavedTrips([]);
      return;
    }

    try {
      setLoadingTrips(true);
      setError(null);
      const response = await axiosClient.get('/itinerary/my-trips');
      setSavedTrips(response.data?.data || response.data || []);
    } catch (tripsError) {
      console.error(tripsError);
      setError(getErrorMessage(tripsError, 'Không thể tải danh sách lịch trình đã lưu.'));
    } finally {
      setLoadingTrips(false);
    }
  }, []);

  useEffect(() => {
    console.log('🔍 Timeline useEffect triggered');
    console.log('  - stateData:', stateData);
    console.log('  - routeItineraryId:', routeItineraryId);
    
    if (stateData) {
      console.log('✅ Found stateData, normalizing...');
      const normalized = normalizeItinerary(stateData);
      console.log('📋 Normalized itinerary:', normalized);
      setItinerary(normalized);
      setActiveDay(normalized.days[0]?.day || 1);
      setLoading(false);
      return;
    }

    if (routeItineraryId) {
      console.log('🔄 Fetching itinerary by ID:', routeItineraryId);
      fetchItineraryById(routeItineraryId);
      return;
    }

    console.log('📂 Fetching saved trips...');
    fetchSavedTrips();
  }, [fetchItineraryById, fetchSavedTrips, routeItineraryId, stateData]);

  const handleOpenSavedTrip = async (tripId: number | string) => {
    await fetchItineraryById(tripId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  const handleBookAll = async () => {
    if (!itinerary) return;

    const bookableActivities = flattenActivities(itinerary.days).filter((activity) => activity.serviceId);

    if (bookableActivities.length === 0) {
      alert('Không có dịch vụ nào có thể đặt trong lịch trình này.');
      return;
    }

    try {
      // Add all bookable activities to cart
      for (const activity of bookableActivities) {
        if (activity.serviceId) {
          const checkInDate = itinerary.startDate 
            ? new Date(itinerary.startDate)
            : new Date();
          
          // Adjust date based on activity day
          checkInDate.setDate(checkInDate.getDate() + activity.day - 1);

          await addItem({
            serviceId: activity.serviceId,
            serviceName: activity.title,
            checkInDate,
            price: activity.estimatedCost,
            quantity: 1,
          });
        }
      }

      alert(`Đã thêm ${bookableActivities.length} dịch vụ vào giỏ hàng!`);
      navigate('/cart');
    } catch (error) {
      console.error('Error adding all to cart:', error);
      alert('Co loi khi them vao gio hang.');
    }
  };

  const handleActivityClick = (activity: ItineraryActivity) => {
    // Set focused activity to trigger map flyTo
    setFocusedActivity(activity);
    
    // Clear focus after animation completes
    setTimeout(() => {
      setFocusedActivity(null);
    }, 2000);
    
    console.log('Activity clicked:', activity.title, 'Coordinates:', activity.latitude, activity.longitude);
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
    return (
      <SavedTripsPanel
        trips={savedTrips}
        loading={loadingTrips}
        onOpenTrip={handleOpenSavedTrip}
        onExplore={() => navigate('/destinations')}
      />
    );
  }

  const bookableCount = flattenActivities(itinerary.days).filter((a) => a.serviceId).length;

  return (
    <>
      <div className="mx-auto max-w-[1800px] px-4 py-8 pb-32">
        {/* Header */}
        <div className="mb-8 overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-950 via-slate-900/95 to-blue-950 p-8 md:p-12 md:py-16 text-white shadow-2xl relative min-h-[280px] flex items-center">
          <div className="flex w-full flex-col justify-between gap-6 lg:flex-row lg:items-end">
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
                Quản lý lịch trình AI
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
                onClick={() => exportItineraryPdf(itinerary)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-black text-slate-950 transition hover:bg-slate-100 shadow-md shadow-white/5 active:scale-95"
              >
                <Download size={18} />
                Xuất PDF
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-sm font-black text-white transition hover:bg-blue-500 shadow-md shadow-blue-500/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Lưu
              </button>
            </div>
          </div>
        </div>

        {optimizing && (
          <div className="mb-8 rounded-2xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-900/20">
            <div className="mb-3 flex items-center gap-3 text-sm font-black text-blue-600 dark:text-blue-400">
              <Loader2 className="animate-spin" size={18} />
              AI đang sắp xếp lại thứ tự điểm đến theo lộ trình ngắn hơn
            </div>
            <ItinerarySkeleton />
          </div>
        )}

        {/* Main 3-Column Layout */}
        <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)_420px]">
          {/* Left Sidebar */}
          {showSidebar && (
            <PlannerSidebar
              destination={itinerary.destination}
              startDate={itinerary.startDate}
              duration={itinerary.days.length}
              budgetLevel={1}
              interests={['Biển', 'Thư giãn']}
              onRegenerate={handleOptimize}
              regenerating={optimizing}
            />
          )}

          {/* Center Timeline */}
          <div className={showSidebar ? '' : 'lg:col-span-2'}>
            <DayTabs
              days={itinerary.days}
              activeDay={activeDay}
              onDayChange={setActiveDay}
            />
            <ItineraryTimeline
              days={itinerary.days}
              activeDay={activeDay}
              onActiveDayChange={setActiveDay}
              onBook={handleBook}
              onActivityClick={handleActivityClick}
            />
          </div>

          {/* Right Map */}
          <ItineraryMap 
            days={itinerary.days} 
            activeDay={activeDay} 
            focusedActivity={focusedActivity}
          />
        </div>
      </div>

      {/* Sticky Footer */}
      {bookableCount > 0 && (
        <StickyFooter
          totalCost={itinerary.totalEstimatedCost}
          guestCount={2}
          onBookAll={handleBookAll}
        />
      )}
    </>
  );
};

export default Timeline;
