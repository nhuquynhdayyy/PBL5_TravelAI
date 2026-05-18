import React from 'react';
import {
  Bus,
  Clock3,
  Compass,
  Hotel,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Star,
  Waves,
  Wifi,
} from 'lucide-react';

export interface ServiceFilterState {
  serviceType: string;
  minPrice: number | '';
  maxPrice: number | '';
  rating: number | '';
  hotelStars: number | '';
  hotelAmenities: string[];
  tourThemes: string[];
  tourDuration: string;
  transportType: string;
  departureTime: string;
}

interface ServiceFilterSidebarProps {
  value: ServiceFilterState;
  onChange: (next: ServiceFilterState) => void;
  onReset: () => void;
}

export const defaultServiceFilters = (serviceType = ''): ServiceFilterState => ({
  serviceType,
  minPrice: '',
  maxPrice: '',
  rating: '',
  hotelStars: '',
  hotelAmenities: [],
  tourThemes: [],
  tourDuration: '',
  transportType: '',
  departureTime: '',
});

const serviceTypes = [
  { value: '', label: 'Tất cả' },
  { value: 'Hotel', label: 'Khách sạn' },
  { value: 'Tour', label: 'Tour' },
  { value: 'Transport', label: 'Vé xe' },
];

const hotelAmenities = [
  { value: 'Wifi', label: 'Wifi', icon: Wifi },
  { value: 'Pool', label: 'Hồ bơi', icon: Waves },
  { value: 'Breakfast', label: 'Ăn sáng', icon: Sparkles },
];

const tourThemes = [
  { value: 'Culture', label: 'Văn hóa' },
  { value: 'Adventure', label: 'Mạo hiểm' },
  { value: 'Relax', label: 'Nghỉ dưỡng' },
];

const tourDurations = [
  { value: '1day', label: '1 ngày' },
  { value: '2days1night', label: '2 ngày 1 đêm' },
  { value: '3days2nights', label: '3 ngày 2 đêm' },
];

const transportTypes = [
  { value: 'Limousine', label: 'Limousine' },
  { value: 'Bus', label: 'Xe khách' },
  { value: 'Train', label: 'Tàu hỏa' },
];

const departureTimes = [
  { value: 'morning', label: 'Sáng' },
  { value: 'afternoon', label: 'Chiều' },
  { value: 'evening', label: 'Tối' },
];

const ServiceFilterSidebar: React.FC<ServiceFilterSidebarProps> = ({ value, onChange, onReset }) => {
  const patch = (partial: Partial<ServiceFilterState>) => onChange({ ...value, ...partial });

  const toggleListValue = (field: 'hotelAmenities' | 'tourThemes', item: string) => {
    const current = value[field];
    patch({
      [field]: current.includes(item)
        ? current.filter((existing) => existing !== item)
        : [...current, item],
    } as Partial<ServiceFilterState>);
  };

  const hasActiveFilter =
    value.serviceType ||
    value.minPrice !== '' ||
    value.maxPrice !== '' ||
    value.rating !== '' ||
    value.hotelStars !== '' ||
    value.hotelAmenities.length > 0 ||
    value.tourThemes.length > 0 ||
    value.tourDuration ||
    value.transportType ||
    value.departureTime;

  return (
    <aside className="sticky top-24 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2 text-slate-900">
          <SlidersHorizontal size={18} className="text-teal-600" />
          <h2 className="text-sm font-black uppercase tracking-[0.18em]">Bộ lọc</h2>
        </div>
        {hasActiveFilter && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-teal-700"
          >
            <RotateCcw size={13} />
            Xóa tất cả
          </button>
        )}
      </div>

      <div className="space-y-6 p-5">
        <section>
          <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
            Loại dịch vụ
          </label>
          <select
            value={value.serviceType}
            onChange={(event) => patch({ serviceType: event.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-50"
          >
            {serviceTypes.map((type) => (
              <option key={type.value || 'all'} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </section>

        <section>
          <label className="mb-3 block text-xs font-black uppercase tracking-widest text-slate-500">
            Khoảng giá
          </label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              min={0}
              placeholder="Từ"
              value={value.minPrice}
              onChange={(event) => patch({ minPrice: event.target.value ? Number(event.target.value) : '' })}
              className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-50"
            />
            <input
              type="number"
              min={0}
              placeholder="Đến"
              value={value.maxPrice}
              onChange={(event) => patch({ maxPrice: event.target.value ? Number(event.target.value) : '' })}
              className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-50"
            />
          </div>
        </section>

        <section>
          <label className="mb-3 block text-xs font-black uppercase tracking-widest text-slate-500">
            Đánh giá
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[5, 4, 3].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => patch({ rating: value.rating === rating ? '' : rating })}
                className={`flex items-center justify-center gap-1 rounded-xl border px-3 py-2 text-sm font-black transition ${
                  value.rating === rating
                    ? 'border-amber-300 bg-amber-50 text-amber-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:bg-teal-50'
                }`}
              >
                <Star size={14} className="fill-current" />
                {rating}+
              </button>
            ))}
          </div>
        </section>

        {value.serviceType === 'Hotel' && (
          <section className="space-y-4 border-t border-dashed border-slate-200 pt-5">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                <Hotel size={15} className="text-teal-600" />
                Hạng sao
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((stars) => (
                  <button
                    key={stars}
                    type="button"
                    onClick={() => patch({ hotelStars: value.hotelStars === stars ? '' : stars })}
                    className={`rounded-xl border py-2 text-sm font-black transition ${
                      value.hotelStars === stars
                        ? 'border-teal-500 bg-teal-600 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-teal-50'
                    }`}
                  >
                    {stars}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">
                Tiện ích
              </div>
              <div className="space-y-2">
                {hotelAmenities.map((amenity) => {
                  const Icon = amenity.icon;
                  const checked = value.hotelAmenities.includes(amenity.value);
                  return (
                    <button
                      key={amenity.value}
                      type="button"
                      onClick={() => toggleListValue('hotelAmenities', amenity.value)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                        checked
                          ? 'border-teal-200 bg-teal-50 text-teal-800'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon size={16} />
                      {amenity.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {value.serviceType === 'Tour' && (
          <section className="space-y-4 border-t border-dashed border-slate-200 pt-5">
            <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
              <Compass size={15} className="text-teal-600" />
              Chủ đề tour
            </div>
            <div className="flex flex-wrap gap-2">
              {tourThemes.map((theme) => (
                <button
                  key={theme.value}
                  type="button"
                  onClick={() => toggleListValue('tourThemes', theme.value)}
                  className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                    value.tourThemes.includes(theme.value)
                      ? 'border-teal-200 bg-teal-50 text-teal-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {theme.label}
                </button>
              ))}
            </div>
            <select
              value={value.tourDuration}
              onChange={(event) => patch({ tourDuration: event.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-50"
            >
              <option value="">Thời lượng bất kỳ</option>
              {tourDurations.map((duration) => (
                <option key={duration.value} value={duration.value}>
                  {duration.label}
                </option>
              ))}
            </select>
          </section>
        )}

        {value.serviceType === 'Transport' && (
          <section className="space-y-4 border-t border-dashed border-slate-200 pt-5">
            <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
              <Bus size={15} className="text-teal-600" />
              Vé xe
            </div>
            <select
              value={value.transportType}
              onChange={(event) => patch({ transportType: event.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-50"
            >
              <option value="">Loại xe bất kỳ</option>
              {transportTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                <Clock3 size={15} className="text-teal-600" />
                Buổi khởi hành
              </div>
              <div className="grid grid-cols-3 gap-2">
                {departureTimes.map((time) => (
                  <button
                    key={time.value}
                    type="button"
                    onClick={() => patch({ departureTime: value.departureTime === time.value ? '' : time.value })}
                    className={`rounded-xl border py-2 text-sm font-black transition ${
                      value.departureTime === time.value
                        ? 'border-teal-500 bg-teal-600 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-teal-50'
                    }`}
                  >
                    {time.label}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </aside>
  );
};

export default ServiceFilterSidebar;
