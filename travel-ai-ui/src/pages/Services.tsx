// src/pages/Services.tsx

import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import MainLayout from '../layouts/MainLayout';
import ServiceCard from '../components/ServiceCard';
import { Filter, Loader2, Search, SlidersHorizontal, X } from 'lucide-react';

const Services = () => {
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [type, setType] = useState<string>(''); 
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

    useEffect(() => {
        fetchServices();
    }, [type]);

    // Lọc theo tên ngay tại Frontend để mượt mà hơn
    const filteredServices = services.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* --- HEADER SECTION (CHỈ CÓ TIÊU ĐỀ) --- */}
                <div className="text-left mb-12 animate-in fade-in slide-in-from-left duration-700">
                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-3">
                        DỊCH VỤ <span className="text-blue-600">DU LỊCH</span>
                    </h1>
                    <p className="text-slate-500 font-medium text-lg max-w-2xl">
                        Khám phá hệ thống Khách sạn đạt chuẩn và các Tour du lịch trải nghiệm hấp dẫn nhất trên toàn quốc.
                    </p>
                </div>

                {/* --- FILTER & SEARCH BAR --- */}
                <div className="bg-white p-4 rounded-[2.5rem] shadow-sm border border-slate-100 mb-10 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="text"
                            placeholder="Tìm nhanh tên khách sạn hoặc tour..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-[1.8rem] focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-700"
                        />
                    </div>

                    <div className="flex items-center gap-3 bg-slate-50 px-6 py-4 rounded-[1.8rem] w-full md:w-auto">
                        <SlidersHorizontal size={20} className="text-blue-600" />
                        <select 
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="bg-transparent font-black text-slate-800 outline-none border-none focus:ring-0 cursor-pointer"
                        >
                            <option value="">LỌC THEO: Tất cả</option>
                            <option value="0">🏨 Khách sạn</option>
                            <option value="1">🧭 Tour du lịch</option>
                        </select>
                    </div>
                </div>

                {/* --- DANH SÁCH DỊCH VỤ --- */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <Loader2 className="animate-spin text-blue-600" size={48} />
                        <p className="text-slate-400 font-bold">Đang tìm kiếm dịch vụ tốt nhất...</p>
                    </div>
                ) : filteredServices.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-20">
                        {filteredServices.map(s => (
                            <ServiceCard 
                                key={s.serviceId} 
                                service={s} 
                                isAdminOrPartner={false} // Khách không có quyền sửa xóa
                                onDelete={() => {}} 
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-32 bg-white rounded-[4rem] border-4 border-dashed border-slate-50 flex flex-col items-center">
                        <div className="text-6xl mb-4">🏜️</div>
                        <h3 className="text-2xl font-black text-slate-700">Không tìm thấy kết quả!</h3>
                        <p className="text-slate-400 font-medium">Bạn hãy thử thay đổi từ khóa hoặc bộ lọc nhé.</p>
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default Services;