import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Download,
  DollarSign,
  Loader2,
  MapPin,
  Maximize2,
  Minimize2,
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
import ItineraryMap from './ItineraryMap';
import ItinerarySkeleton from './ItinerarySkeleton';
import ItineraryTimeline from './ItineraryTimeline';
import PlannerConfigBar from './PlannerConfigBar';
import StickyFooter from './StickyFooter';
import { exportItineraryPdf } from './itineraryPdf';
import type { ItineraryActivity, ItineraryViewModel } from './itineraryTypes';
import { usePreferences } from '../../hooks/usePreferences';
import {
  flattenActivities,
  formatCurrency,
  formatDateLabel,
  normalizeItinerary,
  parseLocalDate,
  toInputDateValue,
  formatDateToYmd,
  formatRelativeTime,
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
                      {formatRelativeTime(trip.createdAt)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700">
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

  const { pref } = usePreferences();
  const [destinations, setDestinations] = useState<any[]>([]);

  const getInitialItinerary = () => {
    // Only load initial itinerary if we're viewing a specific one
    if (!routeItineraryId) {
      return null; // Show list view
    }
    
    if (stateData) {
      localStorage.setItem('latest_itinerary', JSON.stringify(stateData));
      return normalizeItinerary(stateData);
    }
    
    // Don't load from localStorage for list view
    return null;
  };

  const [itinerary, setItinerary] = useState<ItineraryViewModel | null>(getInitialItinerary());
  const [loading, setLoading] = useState(Boolean(routeItineraryId && !stateData));
  const [optimizing, setOptimizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedTrips, setSavedTrips] = useState<any[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [activeDay, setActiveDay] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [focusedActivity, setFocusedActivity] = useState<ItineraryActivity | null>(null);
  const [focusClickKey, setFocusClickKey] = useState(0);
  const [mapExpanded, setMapExpanded] = useState(false);

  const itineraryId = itinerary?.itineraryId || (routeItineraryId ? Number(routeItineraryId) : null);

  const fetchItineraryById = useCallback(async (id: string | number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosClient.get(`/itinerary/${id}`);
      const rawData = response.data?.data || response.data;
      const normalized = normalizeItinerary(rawData);
      setItinerary(normalized);
      setActiveDay(normalized.days[0]?.day || 1);
      localStorage.setItem('latest_itinerary', JSON.stringify(rawData));
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

  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        const res = await axiosClient.get('/destinations');
        setDestinations(res.data?.data || res.data || []);
      } catch (err) {
        console.error('Lỗi khi tải danh sách điểm đến:', err);
      }
    };
    fetchDestinations();
  }, []);

  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const resolvedDestination = useMemo(() => {
    return queryParams.get('destination') || itinerary?.destination || '';
  }, [queryParams, itinerary]);

  const resolvedStartDate = useMemo(() => {
    return queryParams.get('startDate') || itinerary?.startDate || '';
  }, [queryParams, itinerary]);

  const resolvedDuration = useMemo(() => {
    const paramDur = queryParams.get('duration');
    if (paramDur) {
      const parsed = parseInt(paramDur, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return itinerary?.days?.length || 3;
  }, [queryParams, itinerary]);

  const resolvedBudget = useMemo(() => {
    const paramBudget = queryParams.get('budget') || queryParams.get('budgetLevel');
    if (paramBudget) {
      const parsed = parseInt(paramBudget, 10);
      if (!isNaN(parsed)) return parsed;
    }
    if (pref?.budgetLevel !== undefined) {
      return pref.budgetLevel;
    }
    return 1;
  }, [queryParams, pref]);

  const resolvedInterests = useMemo(() => {
    const paramInterests = queryParams.get('interests') || queryParams.get('travelStyle');
    if (paramInterests) {
      return paramInterests.split(',').map((s) => s.trim());
    }
    if (pref?.travelStyle) {
      return pref.travelStyle.split(',').map((s) => s.trim());
    }
    return ['Thư giãn'];
  }, [queryParams, pref]);

  const syncConfigWithItinerary = async (config: {
    destination: string;
    startDate: string;
    duration: number;
    budgetLevel: number;
    interests: string[];
  }) => {
    let destId = itinerary?.destinationId || itinerary?.raw?.destinationId;
    if (!destId) {
      const match = destinations.find(
        (d) =>
          d.name?.toLowerCase().includes(config.destination.toLowerCase()) ||
          config.destination.toLowerCase().includes(d.name?.toLowerCase())
      );
      if (match) {
        destId = match.id || match.destinationId;
      }
    }

    if (!destId) {
      alert('Không tìm thấy địa điểm phù hợp trong hệ thống để tạo lại lịch trình.');
      return;
    }

    try {
      setOptimizing(true);

      const budgetStr = config.budgetLevel === 0 ? 'low' : config.budgetLevel === 2 ? 'high' : 'medium';
      const travelStyleStr = config.interests.join(', ');
      
      try {
        await axiosClient.put('/preferences', {
          travelStyle: travelStyleStr,
          budgetLevel: config.budgetLevel,
          travelPace: pref?.travelPace ?? 1,
          cuisinePref: pref?.cuisinePref ?? ''
        });
      } catch (prefErr) {
        console.error('Failed to update preferences on backend:', prefErr);
      }

      const formattedStartDate = formatDateToYmd(config.startDate) || toInputDateValue(new Date());

      const specialRequestPrompt = `Người dùng muốn đi ${config.destination} trong ${config.duration} ngày, bắt đầu từ ngày ${formattedStartDate}. Phong cách chuyến đi: ${travelStyleStr}. Ngân sách: ${budgetStr}.`;

      const response = await axiosClient.post('/itinerary/generate', {
        destinationId: destId,
        numberOfDays: config.duration,
        startDate: formattedStartDate,
        specialRequest: specialRequestPrompt,
      });

      const newItinerary = response.data?.data || response.data;
      if (newItinerary) {
        const normalized = normalizeItinerary(newItinerary);
        setItinerary(normalized);
        setActiveDay(normalized.days[0]?.day || 1);
        localStorage.setItem('latest_itinerary', JSON.stringify(newItinerary));
      } else {
        alert('Không nhận được dữ liệu lịch trình mới từ AI.');
      }
    } catch (err: any) {
      console.error(err);
      alert(getErrorMessage(err, 'Có lỗi xảy ra khi tạo lại lịch trình.'));
    } finally {
      setOptimizing(false);
    }
  };

  const handleOpenSavedTrip = (tripId: number | string) => {
    navigate(`/planner/${tripId}`);
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

  const handleOptimize = async (feedback?: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login', { state: { from: location.pathname }, replace: false });
      return;
    }

    try {
      setOptimizing(true);

      if (feedback && feedback.trim()) {
        let destId = itinerary?.destinationId || itinerary?.raw?.destinationId;
        if (!destId) {
          const match = destinations.find(
            (d) =>
              d.name?.toLowerCase().includes(resolvedDestination.toLowerCase()) ||
              resolvedDestination.toLowerCase().includes(d.name?.toLowerCase())
          );
          if (match) {
            destId = match.id || match.destinationId;
          }
        }

        if (!destId) {
          alert('Không tìm thấy địa điểm phù hợp trong hệ thống để tạo lại lịch trình.');
          return;
        }

        const formattedStartDate = formatDateToYmd(resolvedStartDate) || toInputDateValue(new Date());

        const response = await axiosClient.post('/itinerary/generate', {
          destinationId: destId,
          numberOfDays: resolvedDuration,
          startDate: formattedStartDate,
          userFeedback: feedback,
          priorItinerary: itinerary?.raw || undefined,
          adults: itinerary?.raw?.adults || pref?.adults || 1,
          children: itinerary?.raw?.children || pref?.children || 0
        });

        const newItinerary = response.data?.data || response.data;
        if (newItinerary) {
          const normalized = normalizeItinerary(newItinerary);
          setItinerary(normalized);
          setActiveDay(normalized.days[0]?.day || 1);
          localStorage.setItem('latest_itinerary', JSON.stringify(newItinerary));
        } else {
          alert('Không nhận được dữ liệu lịch trình mới từ AI.');
        }
      } else {
        if (!itineraryId) {
          alert('Hãy lưu lịch trình trước khi tối ưu lại bằng AI.');
          return;
        }
        const response = await axiosClient.post(`/itinerary/${itineraryId}/optimize`);
        const normalized = normalizeItinerary(response.data?.data || response.data);
        setItinerary(normalized);
        setActiveDay(normalized.days[0]?.day || 1);
      }
    } catch (optimizeError) {
      console.error(optimizeError);
      alert(getErrorMessage(optimizeError, 'Không thể cập nhật lịch trình lúc này.'));
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
        alert("Lịch trình đã được lưu thành công!");
        navigate('/planner');
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
    // Set focused activity to trigger map flyTo + ripple animation
    setFocusedActivity(activity);
    // Increment key every click so FlyTo always fires, even for the same activity
    setFocusClickKey((k) => k + 1);
    
    // Keep focus long enough for the ripple animation to be visible (4 cycles × 1.6s)
    setTimeout(() => {
      setFocusedActivity(null);
    }, 6500);
    
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
      <div className="mx-auto max-w-[1600px] px-4 py-6 pb-32">

        {/* ── Banner Header ── */}
        <div className="mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-8 py-8 text-white shadow-xl">
          <button
            type="button"
            onClick={() => { setItinerary(null); navigate('/planner'); }}
            className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-blue-200 transition hover:text-white"
          >
            <ArrowLeft size={16} />
            Quay lại danh sách
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-blue-200">
                <Sparkles size={12} /> Quản lý lịch trình AI
              </p>
              <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                {itinerary.tripTitle}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2 text-sm font-bold text-slate-300">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5">
                  <MapPin size={14} className="text-blue-300" />{itinerary.destination}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5">
                  <CalendarDays size={14} className="text-blue-300" />{getTripDateRange(itinerary)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5">
                  <Route size={14} className="text-blue-300" />{flattenActivities(itinerary.days).length} hoạt động
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-emerald-200">
                  {formatCurrency(itinerary.totalEstimatedCost)}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => exportItineraryPdf(itinerary)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-5 text-sm font-black text-white transition hover:bg-white/20"
              >
                <Download size={16} /> Xuất PDF
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-500 disabled:opacity-70"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Lưu
              </button>
            </div>
          </div>
        </div>

        {/* ── Config Bar (replaces sidebar) ── */}
        <PlannerConfigBar
          destination={resolvedDestination}
          startDate={resolvedStartDate}
          duration={resolvedDuration}
          budgetLevel={resolvedBudget}
          interests={resolvedInterests}
          onRegenerate={handleOptimize}
          regenerating={optimizing}
          onConfigChange={syncConfigWithItinerary}
        />

        {optimizing && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm font-black text-blue-600">
            <Loader2 className="animate-spin" size={18} />
            AI đang sắp xếp lại thứ tự điểm đến theo lộ trình tối ưu…
          </div>
        )}

        {/* ── Day Tabs ── */}
        <DayTabs days={itinerary.days} activeDay={activeDay} onDayChange={setActiveDay} />

        {/* ── Main 2-column layout ── */}
        <div className={`grid gap-6 ${mapExpanded ? 'lg:grid-cols-[1fr_0]' : 'lg:grid-cols-[3fr_2fr]'}`}>

          {/* LEFT — Timeline (60%) */}
          <div className={mapExpanded ? 'hidden lg:block' : ''}>
            <ItineraryTimeline
              days={itinerary.days}
              activeDay={activeDay}
              onActiveDayChange={setActiveDay}
              onBook={handleBook}
              onActivityClick={handleActivityClick}
            />
          </div>

          {/* RIGHT — Sticky Map (40%) */}
          <div className="relative">
            {/* Expand/Collapse button */}
            <button
              type="button"
              onClick={() => setMapExpanded(v => !v)}
              className="absolute right-4 top-4 z-[1000] flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-md transition hover:bg-slate-100"
              title={mapExpanded ? 'Thu nhỏ bản đồ' : 'Mở rộng bản đồ'}
            >
              {mapExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              {mapExpanded ? 'Thu nhỏ' : 'Mở rộng'}
            </button>

            <div className={`sticky top-20 overflow-hidden rounded-3xl border border-slate-200 shadow-sm transition-all duration-300 ${mapExpanded ? 'h-[calc(100vh-120px)]' : 'h-[calc(100vh-180px)] min-h-[500px]'}`}>
              <ItineraryMap
                days={itinerary.days}
                activeDay={activeDay}
                focusedActivity={focusedActivity}
                focusClickKey={focusClickKey}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky Footer ── */}
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
