import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Star, MapPin, ArrowRight, Zap } from 'lucide-react';
import type { ServiceDTO } from './ServiceList';

const getImageUrl = (url?: string) =>
  url
    ? url.startsWith('http') ? url : `http://localhost:5134${url}`
    : 'https://images.unsplash.com/photo-1542314831-c6a4d14d837e?w=800&q=80';

const SERVICE_LABEL: Record<string, string> = {
  Hotel: 'Khách sạn',
  Tour: 'Tour du lịch',
  Experience: 'Trải nghiệm',
};

interface ServiceCardProps {
  service: ServiceDTO;
  variant?: 'horizontal' | 'vertical';
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, variant = 'vertical' }) => {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [booking, setBooking] = useState(false);

  const handleBook = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBooking(true);
    setTimeout(() => {
      navigate('/checkout', {
        state: { service },
      });
    }, 350); // small ripple delay before navigate
  };

  const handleCardClick = () => {
    navigate(`/services/detail/${service.serviceId}`);
  };

  /* ── HORIZONTAL variant (list-style) ── */
  if (variant === 'horizontal') {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
          .svc-card { font-family: 'DM Sans', sans-serif; }
          @keyframes cardIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
          .svc-card { animation: cardIn .4s ease both; }
          .book-btn { position:relative; overflow:hidden; }
          .book-btn::after {
            content:''; position:absolute; inset:0;
            background:white; opacity:0; border-radius:inherit;
            transition: opacity .3s;
          }
          .book-btn.pulse::after { opacity:.25; }
        `}</style>
        <div
          onClick={handleCardClick}
          className="svc-card group flex gap-0 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
        >
          {/* Image */}
          <div className="relative w-48 shrink-0">
            <img
              src={getImageUrl(service.imageUrl)}
              alt={service.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <button
              onClick={(e) => { e.stopPropagation(); setLiked(!liked); }}
              className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-all ${liked ? 'bg-rose-500 text-white' : 'bg-white/80 text-slate-400 hover:text-rose-400'}`}
            >
              <Heart size={13} className={liked ? 'fill-white' : ''} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-wide">
                  {SERVICE_LABEL[service.serviceType] || service.serviceType}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <MapPin size={10} /> Đà Nẵng
                </span>
              </div>
              <h3 className="font-bold text-slate-800 text-base leading-snug mb-2 line-clamp-2 group-hover:text-amber-600 transition-colors">
                {service.name}
              </h3>
              <div className="flex items-center gap-1 text-[12px]">
                <Star size={12} className="fill-amber-400 text-amber-400" />
                <span className="font-bold text-slate-700">{service.ratingAvg?.toFixed(1) || '5.0'}</span>
                <span className="text-slate-400">(100+ đánh giá)</span>
              </div>
            </div>

            <div className="flex items-end justify-between mt-3">
              <div>
                <span className="text-[11px] text-slate-400">Từ </span>
                <span className="text-amber-600 font-extrabold text-xl">
                  ₫{service.basePrice?.toLocaleString('vi-VN')}
                </span>
                <span className="text-[11px] text-slate-400"> /đêm</span>
              </div>
              <BookButton onClick={handleBook} loading={booking} />
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ── VERTICAL variant (card-style, default) ── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        .svc-card { font-family: 'DM Sans', sans-serif; }
        @keyframes cardIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .svc-card { animation: cardIn .4s ease both; }
      `}</style>
      <div
        onClick={handleCardClick}
        className="svc-card group flex-shrink-0 w-[280px] md:w-[300px] cursor-pointer"
      >
        {/* Image */}
        <div className="relative h-[200px] rounded-2xl overflow-hidden mb-4">
          <img
            src={getImageUrl(service.imageUrl)}
            alt={service.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Badge */}
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-amber-600 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
            {SERVICE_LABEL[service.serviceType] || service.serviceType}
          </div>

          {/* Heart */}
          <button
            onClick={(e) => { e.stopPropagation(); setLiked(!liked); }}
            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${liked ? 'bg-rose-500 text-white scale-110' : 'bg-white/80 text-slate-500 hover:bg-white hover:text-rose-500'}`}
          >
            <Heart size={14} className={liked ? 'fill-white' : ''} />
          </button>

          {/* Rating */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm">
            <Star size={11} className="fill-amber-400 text-amber-400" />
            <span className="text-[11px] font-bold text-slate-800">{service.ratingAvg?.toFixed(1) || '5.0'}</span>
          </div>
        </div>

        {/* Content */}
        <div className="px-1">
          <p className="text-[11px] text-slate-400 uppercase tracking-widest font-medium mb-1 flex items-center gap-1">
            <MapPin size={10} /> Đà Nẵng
          </p>
          <h3 className="font-bold text-slate-800 text-[15px] leading-snug line-clamp-2 mb-3 group-hover:text-amber-600 transition-colors">
            {service.name}
          </h3>

          <div className="flex items-end justify-between">
            <div>
              <span className="text-[11px] text-slate-400">Từ</span>
              <p className="text-amber-600 font-extrabold text-lg leading-none">
                ₫{service.basePrice?.toLocaleString('vi-VN')}
              </p>
              <span className="text-[10px] text-slate-400">/đêm</span>
            </div>
            <BookButton onClick={handleBook} loading={booking} />
          </div>
        </div>
      </div>
    </>
  );
};

/* ── Reusable Book Button ── */
const BookButton: React.FC<{ onClick: (e: React.MouseEvent) => void; loading: boolean }> = ({ onClick, loading }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95
      ${loading
        ? 'bg-amber-200 text-amber-500 cursor-wait'
        : 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-200 hover:shadow-lg hover:shadow-amber-200 hover:-translate-y-0.5'
      }`}
  >
    {loading ? (
      <span className="flex items-center gap-1.5">
        <span className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        Đang xử lý
      </span>
    ) : (
      <span className="flex items-center gap-1.5">
        <Zap size={13} className="fill-white" />
        Đặt chỗ
        <ArrowRight size={13} />
      </span>
    )}
  </button>
);

export default ServiceCard;