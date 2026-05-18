import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, CalendarCheck, Compass, Edit3, Hotel, MapPin, ShoppingCart, Star, Trash2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { getDisplayAvailabilityPrice } from './AvailabilityCalendar';
import type { AvailabilityDay } from './AvailabilityCalendar';
import { useCart } from '../contexts/CartContext';

interface ServiceCardProps {
  service: any;
  isAdminOrPartner: boolean;
  onDelete: (id: number) => void;
}

const currencyFormatter = new Intl.NumberFormat('vi-VN');

const toInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const ServiceCard: React.FC<ServiceCardProps> = ({ service, isAdminOrPartner, onDelete }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addItem } = useCart();
  const [availability, setAvailability] = useState<AvailabilityDay[]>([]);

  const selectedDate = new URLSearchParams(location.search).get('date') ?? '';

  const getImageUrl = (urls: string[]) => {
    if (!urls || urls.length === 0) return 'https://via.placeholder.com/400x300';
    return urls[0].startsWith('http') ? urls[0] : `http://localhost:5134${urls[0]}`;
  };

  const isHotel = service.serviceType === 'Hotel' || service.serviceType === 0 || service.serviceType === '0';

  useEffect(() => {
    let isActive = true;
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + 30);

    axiosClient
      .get(`/availability/${service.serviceId}`, {
        params: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      })
      .then((res) => {
        if (!isActive) return;
        setAvailability(
          (res.data ?? []).map((item: any) => ({
            date: toInputDate(new Date(item.date)),
            price: Number(item.price) || 0,
            remainingStock: Number(item.remainingStock) || 0,
            isAvailable: Boolean(item.isAvailable)
          }))
        );
      })
      .catch(() => {
        if (isActive) setAvailability([]);
      });

    return () => {
      isActive = false;
    };
  }, [service.serviceId]);

  const activeAvailability = useMemo(() => {
    const availableDays = availability.filter((item) => item.isAvailable && item.remainingStock > 0);
    if (selectedDate) {
      return availableDays.find((item) => item.date === selectedDate) ?? null;
    }

    return availableDays[0] ?? null;
  }, [availability, selectedDate]);

  const displayPrice = activeAvailability
    ? getDisplayAvailabilityPrice(activeAvailability)
    : service.basePrice;

  const handleAddToCart = (event: React.MouseEvent) => {
    event.stopPropagation();

    if (!activeAvailability) {
      alert('Dich vu nay chua co ngay con cho de them vao gio hang.');
      return;
    }

    addItem({
      serviceId: service.serviceId,
      serviceName: service.name,
      checkInDate: new Date(`${activeAvailability.date}T00:00:00`),
      quantity: 1,
      price: displayPrice
    });

    alert('Da them dich vu vao gio hang.');
  };

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm transition-all duration-500 hover:shadow-2xl">
      <div className="relative h-52 overflow-hidden">
        <img
          src={getImageUrl(service.imageUrls)}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          alt={service.name}
        />
        <div className="absolute left-4 top-4">
          <div className={`flex items-center gap-1 rounded-full px-4 py-1.5 text-[10px] font-black uppercase text-white backdrop-blur-md ${isHotel ? 'bg-blue-600/80' : 'bg-emerald-600/80'}`}>
            {isHotel ? <Hotel size={12} /> : <Compass size={12} />} {isHotel ? 'Khach san' : 'Tour du lich'}
          </div>
        </div>

        <div className="absolute bottom-4 left-4 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-black uppercase text-emerald-700 shadow-sm">
          {activeAvailability ? `Con ${activeAvailability.remainingStock} cho` : 'Het cho'}
        </div>

        {isAdminOrPartner && (
          <div className="absolute right-4 top-4 flex gap-2 opacity-0 transition-all group-hover:opacity-100">
            <button onClick={() => navigate(`/partner/services/edit/${service.serviceId}`)} className="rounded-xl bg-white/90 p-2.5 text-blue-600 shadow-lg">
              <Edit3 size={16} />
            </button>
            <button onClick={() => onDelete(service.serviceId)} className="rounded-xl bg-white/90 p-2.5 text-red-600 shadow-lg">
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-grow flex-col p-6 text-left">
        <div className="mb-4">
          <h3 className="mb-1 line-clamp-1 text-xl font-black text-slate-800">{service.name}</h3>
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <MapPin size={12} className="text-red-500" /> {service.spotName || 'Diem den hap dan'}
          </div>
          <div className="mt-1 text-[10px] font-bold text-blue-500">Cung cap boi: {service.partnerName}</div>
        </div>

        <div className="mt-auto border-t border-slate-50 pt-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase text-slate-400">
                <CalendarCheck size={12} /> {activeAvailability ? activeAvailability.date : 'Gia tu'}
              </p>
              <p className="text-xl font-black text-blue-600">{currencyFormatter.format(displayPrice)}d</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-black text-orange-500">
              <Star size={12} fill="currentColor" /> {service.ratingAvg || 5.0}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate(`/services/${service.serviceId}${selectedDate ? `?date=${selectedDate}` : ''}`)}
              className="flex items-center justify-center gap-1 rounded-2xl bg-slate-100 py-3 text-xs font-bold text-slate-700"
            >
              CHI TIET <ArrowUpRight size={14} />
            </button>
            <button
              onClick={handleAddToCart}
              disabled={!activeAvailability}
              className="flex items-center justify-center gap-1 rounded-2xl bg-blue-600 py-3 text-xs font-black text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              <ShoppingCart size={14} /> THEM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;
