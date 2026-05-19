import React from 'react';
import { Bus, Plane, MapPin, Star, Clock, ArrowRight, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TransportCardProps {
    service: any;
}

const TransportCard: React.FC<TransportCardProps> = ({ service }) => {
    const navigate = useNavigate();

    const getImageUrl = (urls: string[]) => {
        if (!urls || urls.length === 0) return 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800';
        return urls[0].startsWith('http') ? urls[0] : `http://localhost:5134${urls[0]}`;
    };

    // Phân loại: Bus hoặc Flight dựa vào attributes hoặc tên
    const isFlight = service.name?.toLowerCase().includes('máy bay') || 
                     service.name?.toLowerCase().includes('vé bay') ||
                     service.attributes?.some((attr: any) => attr.attrKey === 'Hãng bay');

    const getTransportType = () => {
        if (isFlight) return { icon: Plane, label: 'Máy bay', color: 'bg-sky-600' };
        return { icon: Bus, label: 'Xe khách', color: 'bg-purple-600' };
    };

    const transportType = getTransportType();
    const Icon = transportType.icon;

    // Lấy thông tin từ attributes
    const getDuration = () => {
        const timeAttr = service.attributes?.find((a: any) => 
            a.attrKey === 'Thời gian' || a.attrKey === 'Thời gian bay'
        );
        return timeAttr?.attrValue || 'Đang cập nhật';
    };

    const getCarrier = () => {
        const carrierAttr = service.attributes?.find((a: any) => 
            a.attrKey === 'Hãng bay' || a.attrKey === 'Loại xe'
        );
        return carrierAttr?.attrValue || service.partnerName;
    };

    return (
        <div 
            onClick={() => navigate(`/services/${service.serviceId}`)}
            className="group bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-2xl transition-all duration-500 cursor-pointer flex flex-col h-full"
        >
            <div className="h-48 overflow-hidden relative">
                <img 
                    src={getImageUrl(service.imageUrls)} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                    alt={service.name} 
                />
                <div className="absolute top-4 left-4">
                    <div className={`${transportType.color} backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black uppercase text-white flex items-center gap-1.5`}>
                        <Icon size={14} /> {transportType.label}
                    </div>
                </div>
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1">
                    <Star size={12} className="text-orange-400 fill-orange-400" />
                    <span className="text-xs font-black text-slate-800">{service.ratingAvg || 4.5}</span>
                </div>
            </div>

            <div className="p-6 flex flex-col flex-grow text-left">
                <div className="mb-4">
                    <h3 className="font-black text-lg text-slate-800 line-clamp-2 mb-2 leading-tight">
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

                {/* Hiển thị một số tiện ích nổi bật */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {service.attributes?.slice(0, 3).map((attr: any, idx: number) => (
                        <span 
                            key={idx}
                            className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 bg-slate-100 text-slate-600 rounded-lg"
                        >
                            {attr.attrValue}
                        </span>
                    ))}
                </div>

                <div className="mt-auto pt-4 border-t border-slate-50">
                    <div className="flex items-end justify-between mb-4">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Giá từ</p>
                            <p className="text-purple-600 font-black text-2xl">
                                {new Intl.NumberFormat('vi-VN').format(service.basePrice)}₫
                            </p>
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold">
                            Cung cấp bởi<br/>
                            <span className="text-blue-500">{service.partnerName}</span>
                        </div>
                    </div>

                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/services/${service.serviceId}`);
                        }}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 group-hover:shadow-lg transition-all"
                    >
                        XEM CHI TIẾT <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TransportCard;
