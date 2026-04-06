import React from 'react';
import { Hotel, Compass, MapPin, Star, Trash2, Edit3, CalendarCheck, ArrowUpRight, Wifi, Waves, Utensils } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

interface ServiceCardProps {
    service: any;
    isAdminOrPartner: boolean;
    onDelete: (id: number) => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, isAdminOrPartner, onDelete }) => {
    const navigate = useNavigate();

    const getImageUrl = (urls: string[]) => {
        if (!urls || urls.length === 0) return 'https://via.placeholder.com/400x300';
        return urls[0].startsWith('http') ? urls[0] : `http://localhost:5134${urls[0]}`;
    };

    const isHotel = service.serviceType === "Hotel" || service.serviceType === 0 || service.serviceType === "0";

    const handleQuickBook = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const token = localStorage.getItem('token');
        if (!token) {
            alert("Vui lòng đăng nhập để đặt chỗ!");
            navigate('/login');
            return;
        }

        const confirmBook = window.confirm(`Xác nhận đặt chỗ tại: ${service.name}?`);
        if (!confirmBook) return;

        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            const res = await axiosClient.post('/bookings/draft', {
                serviceId: service.serviceId,
                quantity: 1,
                checkInDate: tomorrow.toISOString()
            });

            if (res.data.bookingId) {
                alert(res.data.message);
                navigate(`/checkout/${res.data.bookingId}`);
            }
        } catch (err: any) {
            alert(err.response?.data?.message || "Lỗi khi đặt chỗ!");
        }
    };

    return (
        <div className="group bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-2xl transition-all duration-500 flex flex-col h-full">
            <div className="h-52 overflow-hidden relative">
                <img src={getImageUrl(service.imageUrls)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                <div className="absolute top-4 left-4">
                    <div className={`backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black uppercase text-white ${isHotel ? 'bg-blue-600/80' : 'bg-emerald-600/80'}`}>
                        {isHotel ? <Hotel size={12} /> : <Compass size={12} />} {isHotel ? "Khách sạn" : "Tour du lịch"}
                    </div>
                </div>

                {isAdminOrPartner && (
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => navigate(`/partner/services/edit/${service.serviceId}`)} className="p-2.5 bg-white/90 text-blue-600 rounded-xl shadow-lg"><Edit3 size={16} /></button>
                        <button onClick={() => onDelete(service.serviceId)} className="p-2.5 bg-white/90 text-red-600 rounded-xl shadow-lg"><Trash2 size={16} /></button>
                    </div>
                )}
            </div>

            <div className="p-6 flex flex-col flex-grow text-left">
                <div className="mb-4">
                    <h3 className="font-black text-xl text-slate-800 line-clamp-1 mb-1">{service.name}</h3>
                    <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                        <MapPin size={12} className="text-red-500" /> {service.spotName || "Điểm đến hấp dẫn"}
                    </div>
                    {/* HIỂN THỊ TÊN PARTNER (NICK) */}
                    <div className="text-[10px] text-blue-500 font-bold mt-1">Cung cấp bởi: {service.partnerName}</div>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-50 flex items-end justify-between">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Giá từ</p>
                        <p className="text-blue-600 font-black text-xl">{new Intl.NumberFormat('vi-VN').format(service.basePrice)}₫</p>
                    </div>
                    <div className="flex items-center gap-1 text-orange-500 font-black text-xs"><Star size={12} fill="currentColor" /> {service.ratingAvg || 5.0}</div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-6">
                    <button onClick={() => navigate(`/services/${service.serviceId}`)} className="py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold text-xs flex items-center justify-center gap-1">CHI TIẾT <ArrowUpRight size={14} /></button>
                </div>
            </div>
        </div>
    );
};
export default ServiceCard;