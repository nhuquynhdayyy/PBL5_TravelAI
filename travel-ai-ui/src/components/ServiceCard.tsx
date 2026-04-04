import React from 'react';
import { Hotel, MapPin, Star, Trash2, Edit3, Compass, Waves, Wifi, Utensils } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ServiceCardProps {
    service: any;
    isAdminOrPartner: boolean;
    onDelete: (id: number) => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, isAdminOrPartner, onDelete }) => {
    const navigate = useNavigate();

    const getImageUrl = (urls: string[]) => {
        if (!urls || urls.length === 0) return 'https://via.placeholder.com/400x250';
        return urls[0].startsWith('http') ? urls[0] : `http://localhost:5134${urls[0]}`;
    };

    // Kiểm tra chính xác chuỗi từ Backend trả về
    const isHotel = service.serviceType === "Hotel" || service.serviceType === 0 || service.serviceType === "0";

    return (
        <div className="group bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-500">
            {/* Image Header */}
            <div className="h-56 overflow-hidden relative">
                <img 
                    src={getImageUrl(service.imageUrls)} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                    alt={service.name} 
                />
                <div className="absolute top-4 left-4 flex gap-2">
                    <div className={`backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg ${
                        isHotel ? 'bg-blue-500/80 text-white' : 'bg-emerald-500/80 text-white'
                    }`}>
                        {isHotel ? <Hotel size={12} /> : <Compass size={12} />}
                        {isHotel ? "Khách sạn" : "Tour du lịch"}
                    </div>
                </div>

                {isAdminOrPartner && (
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => navigate(`/admin/services/edit/${service.serviceId}`)}
                            className="p-2.5 bg-white/90 hover:bg-blue-600 hover:text-white text-blue-600 rounded-xl shadow-lg transition-all"
                        >
                            <Edit3 size={16} />
                        </button>
                        <button 
                            onClick={() => onDelete(service.serviceId)}
                            className="p-2.5 bg-white/90 hover:bg-red-600 hover:text-white text-red-600 rounded-xl shadow-lg transition-all"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                    <h3 className="font-black text-xl text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {service.name}
                    </h3>
                </div>
                
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold mb-4 uppercase tracking-tighter">
                    <MapPin size={14} className="text-red-400" /> {service.spotName || "Nhiều địa điểm"}
                </div>

                {/* Tiện ích mô phỏng (Amenities) */}
                <div className="flex gap-3 mb-6">
                    <div className="p-2 bg-slate-50 rounded-lg text-slate-400" title="Wifi"><Wifi size={14} /></div>
                    <div className="p-2 bg-slate-50 rounded-lg text-slate-400" title="Bể bơi"><Waves size={14} /></div>
                    <div className="p-2 bg-slate-50 rounded-lg text-slate-400" title="Ăn sáng"><Utensils size={14} /></div>
                </div>

                <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Giá từ</p>
                        <p className="text-blue-600 font-black text-lg">
                            {new Intl.NumberFormat('vi-VN').format(service.basePrice)}đ
                        </p>
                    </div>
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-xl font-black text-xs">
                        <Star size={12} fill="currentColor" /> {service.ratingAvg || 5.0}
                    </div>
                </div>
                <div className="mt-6">
                    <button 
                        onClick={() => navigate(`/services/${service.serviceId}`)}
                        className="w-full py-3 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-blue-600 transition-all shadow-lg active:scale-95"
                    >
                        KHÁM PHÁ NGAY
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ServiceCard;