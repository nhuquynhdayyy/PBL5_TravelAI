import React from 'react';
import { ArrowRight, Bus, Clock, MapPin, Plane, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TransportCardProps {
  service: any;
}

const toAttributes = (attributes: any) => {
  if (Array.isArray(attributes)) {
    return attributes;
  }

  return Object.entries(attributes || {}).map(([attrKey, attrValue]) => ({
    attrKey,
    attrValue: String(attrValue),
  }));
};

const includesAny = (value: string | undefined, terms: string[]) => {
  const normalized = (value || '').toLowerCase();
  return terms.some((term) => normalized.includes(term.toLowerCase()));
};

const TransportCard: React.FC<TransportCardProps> = ({ service }) => {
  const navigate = useNavigate();
  const attributes = toAttributes(service.attributes);

  const getImageUrl = (urls: string[]) => {
    if (!urls || urls.length === 0) return 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800';
    return urls[0].startsWith('http') ? urls[0] : `http://localhost:5134${urls[0]}`;
  };

  const hasFlightAttribute = attributes.some((attr: any) =>
    includesAny(attr.attrKey, ['Hãng bay', 'Hang bay', 'Airline']),
  );
  const isFlight = includesAny(service.name, ['máy bay', 'vé bay', 'flight']) || hasFlightAttribute;
  const transportType = isFlight
    ? { icon: Plane, label: 'Máy bay', color: 'bg-sky-600' }
    : { icon: Bus, label: 'Xe khách', color: 'bg-purple-600' };
  const Icon = transportType.icon;

  const findAttribute = (keys: string[]) =>
    attributes.find((attr: any) => keys.some((key) => includesAny(attr.attrKey, [key])));

  const getDuration = () => {
    const timeAttr = findAttribute(['Thời gian', 'Thời gian bay', 'Duration']);
    return timeAttr?.attrValue || 'Đang cập nhật';
  };

  const getCarrier = () => {
    const carrierAttr = findAttribute(['Hãng bay', 'Loại xe', 'Nhà xe', 'Phương tiện']);
    return carrierAttr?.attrValue || service.partnerName;
  };

  return (
    <div
      onClick={() => navigate(`/services/${service.serviceId}`)}
      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm transition-all duration-500 hover:shadow-2xl"
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={getImageUrl(service.imageUrls)}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          alt={service.name}
        />
        <div className="absolute left-4 top-4">
          <div className={`${transportType.color} flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[10px] font-black uppercase text-white backdrop-blur-md`}>
            <Icon size={14} /> {transportType.label}
          </div>
        </div>
        <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 backdrop-blur-sm">
          <Star size={12} className="fill-orange-400 text-orange-400" />
          <span className="text-xs font-black text-slate-800">{service.ratingAvg || 4.5}</span>
        </div>
      </div>

      <div className="flex flex-grow flex-col p-6 text-left">
        <div className="mb-4">
          <h3 className="mb-2 line-clamp-2 text-lg font-black leading-tight text-slate-800">
            {service.name}
          </h3>
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Clock size={12} className="text-blue-500" />
              <span className="font-bold">{getDuration()}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <MapPin size={12} className="text-red-500" />
              <span className="font-bold">{getCarrier()}</span>
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {attributes.slice(0, 3).map((attr: any, idx: number) => (
            <span
              key={`${attr.attrKey}-${idx}`}
              className="rounded-lg bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-600"
            >
              {attr.attrValue}
            </span>
          ))}
        </div>

        <div className="mt-auto border-t border-slate-50 pt-4">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="mb-1 text-[10px] font-black uppercase text-slate-400">Giá từ</p>
              <p className="text-2xl font-black text-purple-600">
                {new Intl.NumberFormat('vi-VN').format(service.basePrice)}đ
              </p>
            </div>
            <div className="text-[10px] font-bold text-slate-400">
              Cung cấp bởi<br />
              <span className="text-blue-500">{service.partnerName}</span>
            </div>
          </div>

          <button
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/services/${service.serviceId}`);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 py-3 text-sm font-bold text-white transition-all group-hover:shadow-lg"
          >
            Xem chi tiết <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransportCard;
