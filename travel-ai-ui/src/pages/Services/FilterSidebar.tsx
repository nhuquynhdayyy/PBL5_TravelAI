import React, { useState, useEffect } from 'react';
import { Star, SlidersHorizontal, RotateCcw, BadgeDollarSign, LayoutGrid } from 'lucide-react';

export interface FilterState {
  types: string[];
  minPrice: number | '';
  maxPrice: number | '';
  ratings: number[];
}

interface FilterSidebarProps {
  onFilterChange: (filters: FilterState) => void;
}

const SERVICE_TYPES = [
  { id: 'Hotel', label: 'Khách sạn', emoji: '🏨' },
  { id: 'Tour', label: 'Tour du lịch', emoji: '🗺️' },
  { id: 'Experience', label: 'Trải nghiệm', emoji: '✨' },
];

const FilterSidebar: React.FC<FilterSidebarProps> = ({ onFilterChange }) => {
  const [filters, setFilters] = useState<FilterState>({
    types: [],
    minPrice: '',
    maxPrice: '',
    ratings: [],
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

  const isActive =
    filters.types.length > 0 ||
    filters.minPrice !== '' ||
    filters.maxPrice !== '' ||
    filters.ratings.length > 0;

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
              onClick={() => setFilters({ types: [], minPrice: '', maxPrice: '', ratings: [] })}
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