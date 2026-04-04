import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Calendar, Users, Heart, Star,
  ChevronLeft, ChevronRight, Search, ArrowRight,
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import FilterSidebar, { type FilterState } from '../../pages/Services/FilterSidebar';

export interface ServiceDTO {
  serviceId: number;
  partnerId: number;
  spotId: number;
  serviceType: string;
  name: string;
  basePrice: number;
  ratingAvg: number;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
}

const getImageUrl = (url?: string) =>
  url
    ? url.startsWith('http')
      ? url
      : `http://localhost:5134${url}`
    : 'https://images.unsplash.com/photo-1542314831-c6a4d14d837e?w=800&q=80';

/* ─── HOTEL CARD ─────────────────────────────────────────────── */
const HotelCard: React.FC<{ hotel: ServiceDTO; index: number }> = ({ hotel, index }) => {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);

  return (
    <div
      onClick={() => navigate(`/services/detail/${hotel.serviceId}`)}
      className="hotel-card flex-shrink-0 w-[280px] md:w-[300px] cursor-pointer group"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Image */}
      <div className="relative h-[200px] rounded-2xl overflow-hidden mb-4">
        <img
          src={getImageUrl(hotel.imageUrl)}
          alt={hotel.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Badge */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-amber-600 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
          {hotel.serviceType === 'Hotel' ? 'Khách sạn' : hotel.serviceType}
        </div>

        {/* Heart */}
        <button
          onClick={(e) => { e.stopPropagation(); setLiked(!liked); }}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${liked ? 'bg-rose-500 text-white scale-110' : 'bg-white/80 text-slate-500 hover:bg-white hover:text-rose-500'}`}
        >
          <Heart size={15} className={liked ? 'fill-white' : ''} />
        </button>

        {/* Rating bubble */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm">
          <Star size={11} className="fill-amber-400 text-amber-400" />
          <span className="text-[11px] font-bold text-slate-800">{hotel.ratingAvg?.toFixed(1) || '5.0'}</span>
        </div>
      </div>

      {/* Content */}
      <div className="px-1">
        <p className="text-[11px] text-slate-400 uppercase tracking-widest font-medium mb-1">Đà Nẵng</p>
        <h3 className="font-bold text-slate-800 text-[15px] leading-snug line-clamp-2 mb-3 group-hover:text-amber-600 transition-colors">
          {hotel.name}
        </h3>
        <div className="flex items-end justify-between">
          <div>
            <span className="text-[11px] text-slate-400">Từ</span>
            <p className="text-amber-600 font-extrabold text-lg leading-none">
              ₫{hotel.basePrice?.toLocaleString('vi-VN')}
            </p>
            <span className="text-[10px] text-slate-400">/đêm</span>
          </div>
          <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full font-semibold">
            Xác nhận ngay
          </span>
        </div>
      </div>
    </div>
  );
};

/* ─── EXPERIENCE CARD ─────────────────────────────────────────── */
const ExperienceCard: React.FC<{ exp: ServiceDTO; index: number }> = ({ exp, index }) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/services/detail/${exp.serviceId}`)}
      className="exp-card flex-shrink-0 w-[200px] md:w-[220px] cursor-pointer group"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="relative h-[280px] rounded-2xl overflow-hidden">
        <img
          src={getImageUrl(exp.imageUrl)}
          alt={exp.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Content inside image */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="text-[10px] text-amber-300 uppercase tracking-widest font-bold mb-1">Trải nghiệm</div>
          <h3 className="text-white font-bold text-[13px] leading-snug line-clamp-3">
            {exp.name}
          </h3>
          <div className="mt-3 flex items-center gap-1 text-white/60 text-[11px] group-hover:text-amber-300 transition-colors">
            <span>Xem chi tiết</span>
            <ArrowRight size={11} className="translate-x-0 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── SECTION HEADER ──────────────────────────────────────────── */
const SectionHeader: React.FC<{
  title: string;
  subtitle?: string;
  onScrollLeft: () => void;
  onScrollRight: () => void;
}> = ({ title, subtitle, onScrollLeft, onScrollRight }) => (
  <div className="flex justify-between items-end mb-8">
    <div>
      <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">{title}</h2>
      {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
    </div>
    <div className="flex gap-2">
      <button
        onClick={onScrollLeft}
        className="w-10 h-10 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center hover:border-amber-400 hover:text-amber-600 transition-all hover:scale-105 active:scale-95"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={onScrollRight}
        className="w-10 h-10 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center hover:border-amber-400 hover:text-amber-600 transition-all hover:scale-105 active:scale-95"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  </div>
);

/* ─── MAIN COMPONENT ──────────────────────────────────────────── */
const ServiceList: React.FC = () => {
  const [services, setServices] = useState<ServiceDTO[]>([]);
  const [filters, setFilters] = useState<FilterState>({ types: [], minPrice: '', maxPrice: '', ratings: [] });

  const hotelScrollRef = useRef<HTMLDivElement>(null);
  const expScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    axiosClient
      .get('/services')
      .then((res) => setServices(res.data?.data || res.data || []))
      .catch(console.error);
  }, []);

  const scroll = (ref: React.RefObject<HTMLDivElement | null>, dir: 'left' | 'right') => {
    ref.current?.scrollBy({ left: dir === 'right' ? 320 : -320, behavior: 'smooth' });
  };

  const filteredServices = services.filter((s) => {
    if (filters.types.length && !filters.types.includes(s.serviceType)) return false;
    if (filters.minPrice !== '' && s.basePrice < filters.minPrice) return false;
    if (filters.maxPrice !== '' && s.basePrice > filters.maxPrice) return false;
    if (filters.ratings.length && (s.ratingAvg || 0) < Math.min(...filters.ratings)) return false;
    return true;
  });

  const hotels = filteredServices.filter((s) => s.serviceType === 'Hotel');
  const experiences = filteredServices.filter((s) => s.serviceType !== 'Hotel');

  return (
    <>
      {/* ── Inject styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .service-list-root { font-family: 'DM Sans', sans-serif; }
        .service-list-root h1, .service-list-root h2 { font-family: 'Playfair Display', serif; }

        .scrollbar-hide { scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hotel-card { animation: fadeUp 0.5s ease both; }
        .exp-card   { animation: fadeUp 0.5s ease both; }

        .hero-noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
        }
      `}</style>

      <div className="service-list-root bg-[#faf9f7] min-h-screen pb-24">

        {/* ── HERO ── */}
        <div className="relative h-[420px] overflow-visible mb-36">
          {/* BG */}
          <img
            src="https://images.unsplash.com/photo-1504150558240-0b4fd8946624?w=1600&q=80"
            alt="Da Nang"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/70" />
          {/* Noise texture */}
          <div className="hero-noise absolute inset-0 opacity-30 mix-blend-overlay" />

          {/* Text */}
          <div className="relative z-10 h-full flex flex-col justify-center px-6 md:px-16 max-w-6xl mx-auto">
            <p className="text-amber-300 text-xs font-bold uppercase tracking-[0.25em] mb-3">
              ✦ Khám phá Đà Nẵng
            </p>
            <h1 className="text-5xl md:text-6xl font-black text-white leading-tight mb-4 drop-shadow-lg">
              Lưu trú & <br />
              <em className="italic text-amber-300 not-italic">Trải nghiệm</em>
            </h1>
            <p className="text-white/70 text-base max-w-md">
              Từ khách sạn sang trọng đến những hoạt động độc đáo — tất cả trong tầm tay bạn.
            </p>
          </div>

          {/* ── FLOATING SEARCH BAR ── */}
          <div className="absolute -bottom-[3.5rem] left-1/2 -translate-x-1/2 w-11/12 max-w-4xl hidden md:block z-20">
            <div className="bg-white rounded-2xl shadow-2xl shadow-slate-300/60 border border-slate-100 p-2 flex items-stretch gap-0">
              <div className="flex-1 px-5 py-3 flex items-center gap-3 border-r border-slate-100">
                <MapPin size={18} className="text-amber-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Địa điểm</p>
                  <input
                    type="text"
                    defaultValue="Đà Nẵng"
                    className="outline-none text-slate-800 font-bold text-sm w-full bg-transparent"
                  />
                </div>
              </div>
              <div className="flex-1 px-5 py-3 flex items-center gap-3 border-r border-slate-100">
                <Calendar size={18} className="text-amber-500 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Ngày nhận / trả</p>
                  <p className="text-slate-600 font-semibold text-sm">Chọn ngày</p>
                </div>
              </div>
              <div className="flex-1 px-5 py-3 flex items-center gap-3">
                <Users size={18} className="text-amber-500 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Khách & Phòng</p>
                  <p className="text-slate-600 font-semibold text-sm">2 Người, 1 Phòng</p>
                </div>
              </div>
              <button className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-amber-200 ml-2 shrink-0">
                <Search size={16} />
                Tìm kiếm
              </button>
            </div>
          </div>
        </div>

        {/* ── LAYOUT ── */}
        <div className="max-w-[1400px] mx-auto px-4 md:px-10 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-10 mt-10">

          {/* SIDEBAR */}
          <aside className="hidden lg:block">
            <FilterSidebar onFilterChange={setFilters} />
          </aside>

          {/* CONTENT */}
          <main className="overflow-hidden space-y-16">

            {/* Hotels */}
            {hotels.length > 0 && (
              <section>
                <SectionHeader
                  title="Khách sạn tại Đà Nẵng"
                  subtitle={`${hotels.length} khách sạn đang chờ bạn`}
                  onScrollLeft={() => scroll(hotelScrollRef, 'left')}
                  onScrollRight={() => scroll(hotelScrollRef, 'right')}
                />
                <div
                  ref={hotelScrollRef}
                  className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide"
                >
                  {hotels.map((h, i) => (
                    <HotelCard key={h.serviceId} hotel={h} index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* Experiences */}
            {experiences.length > 0 && (
              <section>
                <SectionHeader
                  title="Trải nghiệm độc đáo"
                  subtitle="Những hoạt động không thể bỏ lỡ"
                  onScrollLeft={() => scroll(expScrollRef, 'left')}
                  onScrollRight={() => scroll(expScrollRef, 'right')}
                />
                <div
                  ref={expScrollRef}
                  className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide"
                >
                  {experiences.map((exp, i) => (
                    <ExperienceCard key={exp.serviceId} exp={exp} index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* Empty state */}
            {filteredServices.length === 0 && (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                  <Search size={32} className="text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-700 mb-2">Không tìm thấy kết quả</h3>
                <p className="text-slate-400 text-sm max-w-xs">
                  Hãy thử thay đổi bộ lọc hoặc tìm kiếm với từ khoá khác nhé.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
};

export default ServiceList;