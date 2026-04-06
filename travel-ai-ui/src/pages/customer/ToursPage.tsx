// src/pages/customer/ToursPage.tsx

import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import ServiceCard from '../../components/ServiceCard';
import { Search, Compass, MapPin, Loader2, Calendar, Send } from 'lucide-react';

const ToursPage = () => {
    const [tours, setTours] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchTours = async () => {
            try {
                setLoading(true);
                // Gọi API public và lọc theo Type = 1 (Tour)
                const res = await axiosClient.get('/services/public?type=1');
                setTours(res.data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchTours();
    }, []);

    const filteredTours = tours.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="bg-white min-h-screen">
            {/* --- HERO BANNER --- */}
            <div className="relative pt-32 pb-20 px-4 overflow-hidden bg-slate-900">
                <img 
                    src="https://images.unsplash.com/photo-1528127269322-539801943592?q=80&w=2070" 
                    className="absolute inset-0 w-full h-full object-cover opacity-40" 
                    alt="Tour Banner" 
                />
                <div className="max-w-6xl mx-auto relative z-10 text-left">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest mb-6 shadow-lg shadow-emerald-500/20">
                        <Send size={12} /> Khám phá Việt Nam
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tighter">
                        TRẢI NGHIỆM <br /> <span className="text-emerald-400">TOUR TRỌN GÓI</span>
                    </h1>
                    <p className="text-slate-300 text-lg max-w-xl font-medium leading-relaxed">
                        Từ leo núi mạo hiểm đến nghỉ dưỡng nhẹ nhàng. Chúng tôi mang đến những hành trình đáng nhớ nhất cho bạn.
                    </p>

                    {/* TOUR SEARCH BAR */}
                    <div className="mt-10 bg-white rounded-3xl p-3 shadow-2xl flex flex-col md:flex-row gap-2 max-w-4xl border-4 border-white/10 backdrop-blur-md">
                        <div className="flex-1 flex items-center gap-3 px-4 py-3 border-r border-slate-100">
                            <MapPin className="text-emerald-500" size={20} />
                            <input 
                                type="text" 
                                placeholder="Bạn muốn đi đâu hôm nay?" 
                                className="w-full outline-none font-bold text-slate-700"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex-1 flex items-center gap-3 px-4 py-3">
                            <Calendar className="text-emerald-500" size={20} />
                            <span className="text-slate-400 font-bold text-sm">Tháng bất kỳ</span>
                        </div>
                        <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 rounded-2xl font-black transition-all active:scale-95 shadow-xl shadow-emerald-200 flex items-center justify-center gap-2">
                            <Search size={20} /> TÌM TOUR
                        </button>
                    </div>
                </div>
            </div>

            {/* --- LIST CONTENT --- */}
            <div className="max-w-7xl mx-auto px-4 py-20">
                <div className="flex justify-between items-end mb-12">
                    <div className="text-left">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">CÁC TOUR NỔI BẬT</h2>
                        <p className="text-slate-500 font-medium">Tìm thấy {filteredTours.length} hành trình phù hợp</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" size={48} /></div>
                ) : filteredTours.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {filteredTours.map(tour => (
                            <ServiceCard key={tour.serviceId} service={tour} isAdminOrPartner={false} onDelete={() => {}} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                        <p className="text-slate-400 font-bold">Không tìm thấy tour nào phù hợp.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ToursPage;