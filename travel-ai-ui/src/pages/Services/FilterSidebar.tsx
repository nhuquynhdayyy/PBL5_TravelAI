import React, { useState, useEffect } from 'react';
import { Star, SlidersHorizontal, RotateCcw, BadgeDollarSign, LayoutGrid, Hotel, Compass, Car, UtensilsCrossed, Clock, MapPin } from 'lucide-react';

export interface FilterState {
  types: string[];
  minPrice: number | '';
  maxPrice: number | '';
  ratings: number[];
  // Hotel specific
  hotelStars?: number;
  hotelAmenities?: string[];
  // Tour specific
  tourThemes?: string[];
  tourDuration?: string;
  // Transport specific
  transportType?: string;
  departureTime?: string;
  // Restaurant specific
  cuisineTypes?: string[];
  mealType?: string;
  // Dynamic attributes
  attributes?: Record<string, string>;
}

interface FilterSidebarProps {
  onFilterChange: (filters: FilterState) => void;
  selectedServiceType?: string; // Để hiển thị filter động theo loại dịch vụ
}

const SERVICE_TYPES = [
  { id: 'Hotel', label: 'Khách sạn', emoji: '🏨' },
  { id: 'Tour', label: 'Tour du lịch', emoji: '🗺️' },
  { id: 'Transport', label: 'Vận chuyển', emoji: '🚗' },
  { id: 'Restaurant', label: 'Nhà hàng', emoji: '🍽️' },
  { id: 'Activity', label: 'Hoạt động', emoji: '✨' },
];

// Hotel amenities
const HOTEL_AMENITIES = [
  { id: 'Wifi', label: 'Wifi miễn phí', icon: '📶' },
  { id: 'Pool', label: 'Hồ bơi', icon: '🏊' },
  { id: 'Breakfast', label: 'Ăn sáng', icon: '🍳' },
  { id: 'Parking', label: 'Bãi đỗ xe', icon: '🅿️' },
  { id: 'Gym', label: 'Phòng gym', icon: '💪' },
  { id: 'Spa', label: 'Spa', icon: '💆' },
];

// Tour themes
const TOUR_THEMES = [
  { id: 'Culture', label: 'Văn hóa', icon: '🏛️' },
  { id: 'Adventure', label: 'Mạo hiểm', icon: '🏔️' },
  { id: 'Relax', label: 'Nghỉ dưỡng', icon: '🏖️' },
  { id: 'Food', label: 'Ẩm thực', icon: '🍜' },
  { id: 'Nature', label: 'Thiên nhiên', icon: '🌿' },
];

// Tour durations
const TOUR_DURATIONS = [
  { id: '1day', label: '1 ngày' },
  { id: '2days1night', label: '2 ngày 1 đêm' },
  { id: '3days2nights', label: '3 ngày 2 đêm' },
  { id: '4days3nights', label: '4 ngày 3 đêm' },
];

// Transport types
const TRANSPORT_TYPES = [
  { id: 'Limousine', label: 'Limousine', icon: '🚙' },
  { id: 'Bus', label: 'Xe khách', icon: '🚌' },
  { id: 'Train', label: 'Tàu hỏa', icon: '🚂' },
  { id: 'Plane', label: 'Máy bay', icon: '✈️' },
];

// Departure times
const DEPARTURE_TIMES = [
  { id: 'morning', label: 'Sáng (6h-12h)', icon: '🌅' },
  { id: 'afternoon', label: 'Chiều (12h-18h)', icon: '☀️' },
  { id: 'evening', label: 'Tối (18h-24h)', icon: '🌙' },
];

// Cuisine types
const CUISINE_TYPES = [
  { id: 'Vietnamese', label: 'Việt Nam', icon: '🇻🇳' },
  { id: 'Japanese', label: 'Nhật Bản', icon: '🇯🇵' },
  { id: 'Korean', label: 'Hàn Quốc', icon: '🇰🇷' },
  { id: 'Chinese', label: 'Trung Quốc', icon: '🇨🇳' },
  { id: 'Western', label: 'Âu Mỹ', icon: '🍔' },
  { id: 'Italian', label: 'Ý', icon: '🇮🇹' },
];

// Meal types
const MEAL_TYPES = [
  { id: 'breakfast', label: 'Bữa sáng', icon: '🌅' },
  { id: 'lunch', label: 'Bữa trưa', icon: '☀️' },
  { id: 'dinner', label: 'Bữa tối', icon: '🌙' },
];

const FilterSidebar: React.FC<FilterSidebarProps> = ({ onFilterChange, selectedServiceType }) => {
  const [filters, setFilters] = useState<FilterState>({
    types: [],
    minPrice: '',
    maxPrice: '',
    ratings: [],
    hotelAmenities: [],
    tourThemes: [],
    cuisineTypes: [],
  });

  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const toggleType = (type: string) => {
    setFilters((prev) => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter((t) => t !== type)
        : [...prev.types, type],
    }));
  };

  const toggleRating = (rating: number) => {
    setFilters((prev) => ({
      ...prev,
      ratings: prev.ratings.includes(rating)
        ? prev.ratings.filter((r) => r !== rating)
        : [...prev.ratings, rating],
    }));
  };

  const handlePriceChange = (field: 'minPrice' | 'maxPrice', value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value === '' ? '' : Number(value),
    }));
  };

  // Hotel filters
  const toggleAmenity = (amenity: string) => {
    setFilters((prev) => ({
      ...prev,
      hotelAmenities: prev.hotelAmenities?.includes(amenity)
        ? prev.hotelAmenities.filter((a) => a !== amenity)
        : [...(prev.hotelAmenities || []), amenity],
    }));
  };

  const setHotelStars = (stars: number) => {
    setFilters((prev) => ({
      ...prev,
      hotelStars: prev.hotelStars === stars ? undefined : stars,
    }));
  };

  // Tour filters
  const toggleTourTheme = (theme: string) => {
    setFilters((prev) => ({
      ...prev,
      tourThemes: prev.tourThemes?.includes(theme)
        ? prev.tourThemes.filter((t) => t !== theme)
        : [...(prev.tourThemes || []), theme],
    }));
  };

  const setTourDuration = (duration: string) => {
    setFilters((prev) => ({
      ...prev,
      tourDuration: prev.tourDuration === duration ? undefined : duration,
    }));
  };

  // Transport filters
  const setTransportType = (type: string) => {
    setFilters((prev) => ({
      ...prev,
      transportType: prev.transportType === type ? undefined : type,
    }));
  };

  const setDepartureTime = (time: string) => {
    setFilters((prev) => ({
      ...prev,
      departureTime: prev.departureTime === time ? undefined : time,
    }));
  };

  // Restaurant filters
  const toggleCuisineType = (cuisine: string) => {
    setFilters((prev) => ({
      ...prev,
      cuisineTypes: prev.cuisineTypes?.includes(cuisine)
        ? prev.cuisineTypes.filter((c) => c !== cuisine)
        : [...(prev.cuisineTypes || []), cuisine],
    }));
  };

  const setMealType = (meal: string) => {
    setFilters((prev) => ({
      ...prev,
      mealType: prev.mealType === meal ? undefined : meal,
    }));
  };

  const resetFilters = () => {
    setFilters({
      types: [],
      minPrice: '',
      maxPrice: '',
      ratings: [],
      hotelAmenities: [],
      tourThemes: [],
      cuisineTypes: [],
    });
  };

  const isActive =
    filters.types.length > 0 ||
    filters.minPrice !== '' ||
    filters.maxPrice !== '' ||
    filters.ratings.length > 0 ||
    (filters.hotelAmenities && filters.hotelAmenities.length > 0) ||
    filters.hotelStars !== undefined ||
    (filters.tourThemes && filters.tourThemes.length > 0) ||
    filters.tourDuration !== undefined ||
    filters.transportType !== undefined ||
    filters.departureTime !== undefined ||
    (filters.cuisineTypes && filters.cuisineTypes.length > 0) ||
    filters.mealType !== undefined;

  // Determine which service type to show specific filters for
  const activeServiceType = selectedServiceType || (filters.types.length === 1 ? filters.types[0] : null);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        .filter-sidebar { font-family: 'DM Sans', sans-serif; }
        .filter-chip { transition: all 0.15s ease; }
        .filter-chip:hover { transform: translateX(2px); }
      `}</style>

      <div className="filter-sidebar bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden sticky top-24">

        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <SlidersHorizontal size={17} />
            <span className="font-bold text-sm uppercase tracking-wider">Bộ lọc</span>
          </div>
          {isActive && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-semibold transition-colors"
            >
              <RotateCcw size={12} />
              Xóa tất cả
            </button>
          )}
        </div>

        <div className="p-5 space-y-7">

          {/* ── Danh mục ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <LayoutGrid size={15} className="text-amber-500" />
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Danh mục</h3>
            </div>
            <div className="space-y-1">
              {SERVICE_TYPES.map((item) => {
                const active = filters.types.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleType(item.id)}
                    className={`filter-chip w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      active
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <span className="text-base">{item.emoji}</span>
                    <span>{item.label}</span>
                    {active && (
                      <span className="ml-auto w-2 h-2 rounded-full bg-amber-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-slate-100" />

          {/* ── Mức giá ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BadgeDollarSign size={15} className="text-amber-500" />
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Mức giá (VNĐ)</h3>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">₫</span>
                <input
                  type="number"
                  placeholder="Từ..."
                  value={filters.minPrice}
                  onChange={(e) => handlePriceChange('minPrice', e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all bg-slate-50 focus:bg-white"
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">₫</span>
                <input
                  type="number"
                  placeholder="Đến..."
                  value={filters.maxPrice}
                  onChange={(e) => handlePriceChange('maxPrice', e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all bg-slate-50 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-slate-100" />

          {/* ── Xếp hạng sao ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Star size={15} className="text-amber-500" />
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Xếp hạng sao</h3>
            </div>
            <div className="space-y-1">
              {[5, 4, 3].map((rating) => {
                const active = filters.ratings.includes(rating);
                return (
                  <button
                    key={rating}
                    onClick={() => toggleRating(rating)}
                    className={`filter-chip w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                      active
                        ? 'bg-amber-50 border border-amber-200'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={13}
                          className={
                            i < rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'fill-slate-200 text-slate-200'
                          }
                        />
                      ))}
                    </span>
                    <span className={`text-xs font-medium ${active ? 'text-amber-700' : 'text-slate-500'}`}>
                      {rating < 5 ? `${rating}+ sao` : '5 sao'}
                    </span>
                    {active && (
                      <span className="ml-auto w-2 h-2 rounded-full bg-amber-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── HOTEL SPECIFIC FILTERS ── */}
          {activeServiceType === 'Hotel' && (
            <>
              {/* Divider */}
              <div className="border-t border-dashed border-slate-100" />

              {/* Hotel Stars */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Hotel size={15} className="text-amber-500" />
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Hạng sao khách sạn</h3>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[5, 4, 3, 2, 1].map((stars) => (
                    <button
                      key={stars}
                      onClick={() => setHotelStars(stars)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                        filters.hotelStars === stars
                          ? 'bg-amber-500 text-white shadow-md'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {stars}⭐
                    </button>
                  ))}
                </div>
              </div>

              {/* Hotel Amenities */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-amber-500">🏨</span>
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Tiện ích</h3>
                </div>
                <div className="space-y-1">
                  {HOTEL_AMENITIES.map((amenity) => {
                    const active = filters.hotelAmenities?.includes(amenity.id);
                    return (
                      <button
                        key={amenity.id}
                        onClick={() => toggleAmenity(amenity.id)}
                        className={`filter-chip w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          active
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <span className="text-base">{amenity.icon}</span>
                        <span>{amenity.label}</span>
                        {active && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-amber-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── TOUR SPECIFIC FILTERS ── */}
          {activeServiceType === 'Tour' && (
            <>
              {/* Divider */}
              <div className="border-t border-dashed border-slate-100" />

              {/* Tour Themes */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Compass size={15} className="text-amber-500" />
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Chủ đề tour</h3>
                </div>
                <div className="space-y-1">
                  {TOUR_THEMES.map((theme) => {
                    const active = filters.tourThemes?.includes(theme.id);
                    return (
                      <button
                        key={theme.id}
                        onClick={() => toggleTourTheme(theme.id)}
                        className={`filter-chip w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          active
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <span className="text-base">{theme.icon}</span>
                        <span>{theme.label}</span>
                        {active && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-amber-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tour Duration */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={15} className="text-amber-500" />
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Thời lượng</h3>
                </div>
                <div className="space-y-1">
                  {TOUR_DURATIONS.map((duration) => {
                    const active = filters.tourDuration === duration.id;
                    return (
                      <button
                        key={duration.id}
                        onClick={() => setTourDuration(duration.id)}
                        className={`filter-chip w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          active
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <span>{duration.label}</span>
                        {active && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-amber-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── TRANSPORT SPECIFIC FILTERS ── */}
          {activeServiceType === 'Transport' && (
            <>
              {/* Divider */}
              <div className="border-t border-dashed border-slate-100" />

              {/* Transport Type */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Car size={15} className="text-amber-500" />
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Loại phương tiện</h3>
                </div>
                <div className="space-y-1">
                  {TRANSPORT_TYPES.map((type) => {
                    const active = filters.transportType === type.id;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setTransportType(type.id)}
                        className={`filter-chip w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          active
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <span className="text-base">{type.icon}</span>
                        <span>{type.label}</span>
                        {active && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-amber-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Departure Time */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={15} className="text-amber-500" />
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Giờ khởi hành</h3>
                </div>
                <div className="space-y-1">
                  {DEPARTURE_TIMES.map((time) => {
                    const active = filters.departureTime === time.id;
                    return (
                      <button
                        key={time.id}
                        onClick={() => setDepartureTime(time.id)}
                        className={`filter-chip w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          active
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <span className="text-base">{time.icon}</span>
                        <span>{time.label}</span>
                        {active && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-amber-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── RESTAURANT SPECIFIC FILTERS ── */}
          {activeServiceType === 'Restaurant' && (
            <>
              {/* Divider */}
              <div className="border-t border-dashed border-slate-100" />

              {/* Cuisine Types */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <UtensilsCrossed size={15} className="text-amber-500" />
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Loại ẩm thực</h3>
                </div>
                <div className="space-y-1">
                  {CUISINE_TYPES.map((cuisine) => {
                    const active = filters.cuisineTypes?.includes(cuisine.id);
                    return (
                      <button
                        key={cuisine.id}
                        onClick={() => toggleCuisineType(cuisine.id)}
                        className={`filter-chip w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          active
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <span className="text-base">{cuisine.icon}</span>
                        <span>{cuisine.label}</span>
                        {active && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-amber-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Meal Type */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={15} className="text-amber-500" />
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Bữa ăn</h3>
                </div>
                <div className="space-y-1">
                  {MEAL_TYPES.map((meal) => {
                    const active = filters.mealType === meal.id;
                    return (
                      <button
                        key={meal.id}
                        onClick={() => setMealType(meal.id)}
                        className={`filter-chip w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          active
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <span className="text-base">{meal.icon}</span>
                        <span>{meal.label}</span>
                        {active && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-amber-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Active filter count footer */}
        {isActive && (
          <div className="mx-5 mb-5">
            <div className="bg-amber-500 text-white text-xs font-bold text-center py-2.5 rounded-xl tracking-wide">
              {[
                filters.types.length && `${filters.types.length} danh mục`,
                (filters.minPrice !== '' || filters.maxPrice !== '') && '1 mức giá',
                filters.ratings.length && `${filters.ratings.length} xếp hạng`,
              ]
                .filter(Boolean)
                .join(' · ')}
              {' '}đang được áp dụng
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default FilterSidebar;