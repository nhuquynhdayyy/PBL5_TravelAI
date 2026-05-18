import { Award, Check, DollarSign, Wifi } from 'lucide-react';
import type { ItineraryActivity } from './itineraryTypes';
import { formatCurrency, getImageUrl } from './itineraryUtils';

type HotelCardProps = {
  activity: ItineraryActivity;
  isRecommended?: boolean;
  onBook: (activity: ItineraryActivity) => void;
};

const HotelCard = ({ activity, isRecommended = false, onBook }: HotelCardProps) => {
  const isBookable = Boolean(activity.serviceId);

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 shadow-lg transition hover:-translate-y-1 hover:shadow-2xl dark:from-slate-800 dark:via-slate-900 dark:to-slate-800">
      {/* Recommended Badge */}
      {isRecommended && (
        <div className="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-full bg-cyan-500 px-3 py-1 text-xs font-black text-white shadow-lg">
          <Award size={12} />
          Đề xuất
        </div>
      )}

      {/* Check-in Label */}
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-2xl bg-slate-900/80 px-4 py-2 text-xs font-black text-white backdrop-blur-sm">
        <span className="text-lg">🛏️</span>
        Nhận phòng
      </div>

      {/* Hotel Image */}
      <div className="relative h-64 overflow-hidden">
        <img
          src={getImageUrl(activity.imageUrl)}
          alt={activity.title}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
      </div>

      {/* Hotel Info */}
      <div className="p-6">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-xs font-black text-white">
            Chỗ ở tối nay
          </span>
          {isRecommended && (
            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500 px-3 py-1 text-xs font-black text-white">
              Đề xuất
            </span>
          )}
        </div>

        <h3 className="mb-2 text-2xl font-black leading-tight text-slate-900 transition group-hover:text-blue-600 dark:text-white">
          {activity.title}
        </h3>

        <p className="mb-4 line-clamp-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
          {activity.description}
        </p>

        {/* Amenities */}
        <div className="mb-5 flex flex-wrap gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
          <span className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 shadow-sm dark:bg-slate-800">
            <Wifi size={14} className="text-blue-500" />
            Wifi miễn phí
          </span>
          <span className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 shadow-sm dark:bg-slate-800">
            <Check size={14} className="text-green-500" />
            Bao gồm ăn sáng
          </span>
          <span className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 shadow-sm dark:bg-slate-800">
            <span className="text-cyan-500">🏊</span>
            Hồ bơi
          </span>
        </div>

        {/* Pricing */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-5 dark:border-slate-700">
          <div>
            <p className="text-xs font-bold text-slate-500 line-through dark:text-slate-400">
              {formatCurrency(activity.estimatedCost * 1.25)}
            </p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(activity.estimatedCost)}
              <span className="text-sm font-medium text-slate-500">/đêm</span>
            </p>
          </div>

          {isBookable && (
            <button
              type="button"
              onClick={() => onBook(activity)}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
            >
              <DollarSign size={16} />
              Xem chi tiết
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default HotelCard;
