// src/pages/Services.tsx

import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import ServiceCard from '../components/ServiceCard';
import { Filter, Loader2, Search, SlidersHorizontal, X, Hotel, Compass } from 'lucide-react';

interface ServicesProps {
    defaultType?: string; // '0' cho Hotel, '1' cho Tour, hoặc để trống cho tất cả
}

const Services: React.FC<ServicesProps> = ({ defaultType = '' }) => {
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [type, setType] = useState<string>(defaultType); 
    const [searchQuery, setSearchQuery] = useState('');

    const fetchServices = async () => {
        try {
            setLoading(true);
            // Gọi API public dành cho khách (Chỉ lấy IsActive = true)
            const url = type !== '' ? `/services/public?type=${type}` : '/services/public';
            const res = await axiosClient.get(url);
            setServices(res.data || []);
        } catch (err) {
            console.error("Lỗi lấy danh sách dịch vụ:", err);
            setServices([]);
        } finally {
            setLoading(false);
        }
    };

    // Gọi lại API khi người dùng thay đổi bộ lọc loại dịch vụ
    useEffect(() => {
        fetchServices();
    }, [type]);

    // Lọc theo tên ngay tại Frontend để tăng trải nghiệm mượt mà
    const filteredServices = services.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* --- TIÊU ĐỀ TRANG --- */}
            <div className="text-left mb-12 animate-in fade-in slide-in-from-left duration-700">
                <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-3">
                    {type === '0' ? 'KHÁCH SẠN' : type === '1' ? 'TOUR DU LỊCH' : 'TẤT CẢ DỊCH VỤ'}
                </h1>
                <p className="text-slate-500 font-medium text-lg max-w-2xl">
                    {type === '0' 
                        ? 'Tìm kiếm chỗ nghỉ chân lý tưởng cho chuyến đi của bạn.' 
                        : type === '1' 
                        ? 'Khám phá những hành trình trải nghiệm thú vị nhất.' 
                        : 'Hệ thống Khách sạn và Tour du lịch đạt chuẩn trên toàn quốc.'}
                </p>
            </div>

            {/* --- THANH TÌM KIẾM & BỘ LỌC --- */}
            <div className="bg-white p-4 rounded-[2.5rem] shadow-sm border border-slate-100 mb-10 flex flex-col md:flex-row gap-4 items-center">
                {/* Ô tìm kiếm tên */}
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text"
                        placeholder="Tìm theo tên dịch vụ..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-[1.8rem] focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-700 outline-none"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                            <X size={18} />
                        </button>
                    )}
                </div>

                {/* Bộ lọc Loại (Dropdown) */}
                <div className="flex items-center gap-3 bg-slate-50 px-6 py-4 rounded-[1.8rem] w-full md:w-auto border-2 border-transparent focus-within:border-blue-500 transition-all">
                    <SlidersHorizontal size={20} className="text-blue-600" />
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Phân loại:</span>
                    <select 
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="bg-transparent font-black text-slate-800 outline-none border-none focus:ring-0 cursor-pointer min-w-[120px]"
                    >
                        <option value="">Tất cả</option>
                        <option value="0">🏨 Khách sạn</option>
                        <option value="1">🧭 Tour du lịch</option>
                    </select>
                </div>
            </div>

            {/* --- HIỂN THỊ DANH SÁCH --- */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <Loader2 className="animate-spin text-blue-600" size={48} />
                    <p className="text-slate-400 font-bold animate-pulse">Đang tải dữ liệu...</p>
                </div>
            ) : filteredServices.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-20 animate-in fade-in duration-700">
                    {filteredServices.map(s => (
                        <ServiceCard 
                            key={s.serviceId} 
                            service={s} 
                            isAdminOrPartner={false} // Khách xem không có quyền sửa xóa
                            onDelete={() => {}} 
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-32 bg-white rounded-[4rem] border-4 border-dashed border-slate-50 flex flex-col items-center gap-4">
                    <div className="text-7xl">🏜️</div>
                    <h3 className="text-2xl font-black text-slate-800">Rất tiếc, không tìm thấy kết quả nào!</h3>
                    <p className="text-slate-400 font-medium max-w-xs">Bạn hãy thử thay đổi tiêu chí lọc hoặc từ khóa tìm kiếm nhé.</p>
                    <button 
                        onClick={() => { setType(''); setSearchQuery(''); }}
                        className="mt-4 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
                    >
                        XÓA TẤT CẢ BỘ LỌC
                    </button>
                </div>
            )}

            {/* --- QUICK INFO FOOTER --- */}
            <div className="mt-10 p-8 bg-blue-50 rounded-[3rem] border border-blue-100 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-left">
                    <h4 className="font-black text-blue-900 text-xl mb-1">Bạn là chủ Khách sạn hoặc Tour?</h4>
                    <p className="text-blue-700/70 font-medium">Hợp tác cùng TravelAI để tiếp cận hàng ngàn khách hàng mỗi ngày.</p>
                </div>
                <button className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-black shadow-sm hover:shadow-md transition-all whitespace-nowrap">
                    ĐĂNG KÝ ĐỐI TÁC NGAY
                </button>
            </div>
        </div>
    );
};

export default Services;