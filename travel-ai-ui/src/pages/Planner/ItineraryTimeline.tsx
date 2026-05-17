import { CalendarDays, Clock, MapPin, Sparkles, Zap } from 'lucide-react';
import type { ItineraryActivity, ItineraryDay } from './itineraryTypes';
import { formatCurrency, getImageUrl } from './itineraryUtils';

const kindMeta = {
  hotel: { icon: '🏨', label: 'Khách sạn', className: 'bg-blue-50 text-blue-700' },
  transport: { icon: '🚗', label: 'Di chuyển', className: 'bg-cyan-50 text-cyan-700' },
  food: { icon: '🍛', label: 'Ăn uống', className: 'bg-orange-50 text-orange-700' },
  sightseeing: { icon: '🏛️', label: 'Tham quan', className: 'bg-violet-50 text-violet-700' },
  service: { icon: '⭐', label: 'Dịch vụ', className: 'bg-emerald-50 text-emerald-700' },
};

type ActivityCardProps = {
  activity: ItineraryActivity;
  onBook: (activity: ItineraryActivity) => void;
};

const ActivityCard = ({ activity, onBook }: ActivityCardProps) => {
  const meta = kindMeta[activity.kind] || kindMeta.sightseeing;
  const isBookable = Boolean(activity.serviceId);

  return (
    <article className="group relative">
      <div className="absolute -left-[54px] top-6 z-10 flex h-11 w-11 items-center justify-center rounded-2xl border-4 border-white bg-[#0061ff] text-xl shadow-lg transition group-hover:scale-110">
        {meta.icon}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl">
        <div className="grid gap-0 sm:grid-cols-[180px_1fr]">
          <div className="relative h-52 overflow-hidden sm:h-full">
            <img
              src={getImageUrl(activity.imageUrl)}
              alt={activity.title}
              className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent sm:hidden" />
          </div>

          <div className="flex min-w-0 flex-col p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
                <Clock size={13} />
                {activity.startTime} - {activity.endTime}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${meta.className}`}>
                <span>{meta.icon}</span>
                {meta.label}
              </span>
              {isBookable && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                  <Sparkles size={13} />
                  Có thể đặt
                </span>
              )}
            </div>

            <h3 className="text-xl font-black leading-tight text-slate-900 transition group-hover:text-[#0061ff]">
              {activity.title}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-slate-500">
              {activity.description}
            </p>

            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-xl bg-slate-50 px-3 py-2">
                <MapPin size={14} className="text-red-500" />
                {activity.location}
              </span>
              <span className="inline-flex items-center gap-1 rounded-xl bg-slate-50 px-3 py-2">
                <Clock size={14} className="text-[#0061ff]" />
                {activity.duration}
              </span>
            </div>

            <div className="mt-5 flex flex-col justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chi phí dự kiến</p>
                <p className="text-lg font-black text-slate-900">{formatCurrency(activity.estimatedCost)}</p>
              </div>
              {isBookable && (
                <button
                  type="button"
                  onClick={() => onBook(activity)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0061ff] px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
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
};

const ItineraryTimeline = ({ days, activeDay, onActiveDayChange, onBook }: ItineraryTimelineProps) => (
  <section className="space-y-10">
    {days.map((day) => (
      <div key={day.day} className="relative">
        <button
          type="button"
          onClick={() => onActiveDayChange(day.day)}
          className={`sticky top-24 z-20 mb-6 inline-flex items-center gap-3 rounded-2xl px-5 py-3 text-left shadow-lg transition ${
            activeDay === day.day ? 'bg-[#0061ff] text-white shadow-blue-200' : 'bg-slate-900 text-white hover:bg-[#0061ff]'
          }`}
        >
          <CalendarDays size={20} />
          <span>
            <span className="block text-lg font-black">Ngày {day.day}</span>
            {day.dateLabel && <span className="block text-xs font-bold opacity-80">{day.dateLabel}</span>}
          </span>
        </button>

        <div className="ml-5 space-y-5 border-l-4 border-dashed border-blue-100 pl-8">
          {day.activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} onBook={onBook} />
          ))}
        </div>
      </div>
    ))}
  </section>
);

export default ItineraryTimeline;
