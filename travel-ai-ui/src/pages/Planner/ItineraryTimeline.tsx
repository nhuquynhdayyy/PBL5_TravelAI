import { Clock, MapPin, Star, Zap } from 'lucide-react';
import type { ItineraryActivity, ItineraryDay } from './itineraryTypes';
import { formatCurrency, getImageUrl } from './itineraryUtils';
import HotelCard from './HotelCard';

const kindMeta = {
  hotel: { icon: '🏨', label: 'Khách sạn', className: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  transport: { icon: '🚗', label: 'Di chuyển', className: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' },
  food: { icon: '🍽️', label: 'Ăn uống', className: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  sightseeing: { icon: '🏛️', label: 'Tham quan', className: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  service: { icon: '⭐', label: 'Dịch vụ', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
};

type ActivityCardProps = {
  activity: ItineraryActivity;
  onBook: (activity: ItineraryActivity) => void;
  onActivityClick?: (activity: ItineraryActivity) => void;
};

const ActivityCard = ({ activity, onBook, onActivityClick }: ActivityCardProps) => {
  const meta = kindMeta[activity.kind] || kindMeta.sightseeing;
  const isBookable = Boolean(activity.serviceId);

  // Fake rating for demo (in real app, get from API)
  const rating = 4.5 + Math.random() * 0.4;

  return (
    <article 
      className="group relative cursor-pointer"
      onClick={() => onActivityClick?.(activity)}
    >
      <div className="absolute -left-[54px] top-6 z-10 flex h-11 w-11 items-center justify-center rounded-2xl border-4 border-white bg-blue-600 text-xl shadow-lg transition group-hover:scale-110 dark:border-slate-900">
        {meta.icon}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl dark:border-slate-700 dark:bg-slate-800">
        <div className="grid gap-0 sm:grid-cols-[180px_1fr]">
          <div className="relative h-52 overflow-hidden sm:h-full">
            <img
              src={getImageUrl(activity.imageUrl, activity.title, activity.location)}
              alt={activity.title}
              className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent sm:hidden" />
            
            {/* Rating Badge */}
            <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-slate-900/80 px-2 py-1 text-xs font-black text-white backdrop-blur-sm">
              <Star size={12} className="fill-yellow-400 text-yellow-400" />
              {rating.toFixed(1)}
            </div>
          </div>

          <div className="flex min-w-0 flex-col p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white dark:bg-slate-700">
                <Clock size={13} />
                {activity.startTime}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${meta.className}`}>
                <span>{meta.icon}</span>
                {meta.label}
              </span>
            </div>

            <h3 className="text-xl font-black leading-tight text-slate-900 transition group-hover:text-blue-600 dark:text-white">
              {activity.title}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
              {activity.description}
            </p>

            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-700">
                <MapPin size={14} className="text-red-500" />
                {activity.location}
              </span>
              <span className="inline-flex items-center gap-1 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-700">
                <Clock size={14} className="text-blue-600" />
                {activity.duration}
              </span>
            </div>

            <div className="mt-5 flex flex-col justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center dark:border-slate-700">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chi phí dự kiến</p>
                <p className="text-lg font-black text-slate-900 dark:text-white">{formatCurrency(activity.estimatedCost)}</p>
              </div>
              {isBookable && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBook(activity);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 dark:shadow-blue-900/30"
                >
                  <Zap size={16} />
                  Đặt ngay
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

type ItineraryTimelineProps = {
  days: ItineraryDay[];
  activeDay: number;
  onActiveDayChange: (day: number) => void;
  onBook: (activity: ItineraryActivity) => void;
  onActivityClick?: (activity: ItineraryActivity) => void;
};

const ItineraryTimeline = ({ days, activeDay, onActiveDayChange, onBook, onActivityClick }: ItineraryTimelineProps) => {
  // Filter to show only active day
  const activeDayData = days.find((d) => d.day === activeDay);
  
  if (!activeDayData) return null;

  return (
    <section className="space-y-6">
      <div className="relative">
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white shadow-lg">
          <h3 className="text-2xl font-black">
            Ngày {activeDayData.day}
            {activeDayData.dateLabel && (
              <span className="ml-3 text-base font-medium opacity-80">
                {activeDayData.dateLabel}
              </span>
            )}
          </h3>
          <p className="mt-2 text-sm font-medium opacity-90">
            {activeDayData.activities.length} hoạt động được lên kế hoạch
          </p>
        </div>

        <div className="ml-5 space-y-5 border-l-2 border-dashed border-blue-200/60 pl-8 dark:border-slate-700/60">
          {activeDayData.activities.map((activity) => {
            // Use HotelCard for hotel activities
            if (activity.kind === 'hotel') {
              return (
                <HotelCard
                  key={activity.id}
                  activity={activity}
                  isRecommended={activity.serviceId !== null}
                  onBook={onBook}
                  onActivityClick={onActivityClick}
                />
              );
            }

            // Use regular ActivityCard for other activities
            return (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onBook={onBook}
                onActivityClick={onActivityClick}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ItineraryTimeline;
