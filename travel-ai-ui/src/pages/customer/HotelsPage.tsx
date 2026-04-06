// src/pages/customer/HotelsPage.tsx
import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import ServiceCard from '../../components/ServiceCard';
import { Search, Calendar, Users, MapPin, Loader2, Building2 } from 'lucide-react';

const HotelsPage = () => {
    const [hotels, setHotels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchHotels = async () => {
            try {
                setLoading(true);
                // API lấy danh sách Khách sạn (type=0) đã duyệt
                const res = await axiosClient.get('/services/public?type=0');
                setHotels(res.data || []);
            } catch (err) {
                console.error("Lỗi tải khách sạn:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHotels();
    }, []);

    const filteredHotels = hotels.filter(h => 
        h.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="bg-slate-50 min-h-screen">
            {/* --- HERO SEARCH SECTION --- */}
            <div className="bg-blue-600 pt-32 pb-20 px-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                
                <div className="max-w-6xl mx-auto relative z-10 text-left text-white">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 shadow-lg">
                        <Building2 size={12} /> Nghỉ dưỡng đẳng cấp
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tighter leading-tight">
                        TÌM KHÁCH SẠN <br /> GIÁ TỐT NHẤT
                    </h1>
                    
                    {/* Search Bar Style Traveloka */}
                    <div className="mt-10 bg-white rounded-[2rem] p-3 shadow-2xl grid grid-cols-1 md:grid-cols-4 gap-2 border-4 border-white/20 backdrop-blur-md">
                        <div className="flex items-center gap-3 px-5 py-4 border-r border-slate-100">
                            <MapPin className="text-blue-500" size={20} />
                            <input 
                                type="text" 
                                placeholder="Bạn muốn nghỉ ở đâu?" 
                                className="w-full outline-none font-bold text-slate-700"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-3 px-5 py-4 border-r border-slate-100">
                            <Calendar className="text-blue-500" size={20} />
                            <span className="text-slate-400 font-bold text-sm italic">Ngày nhận phòng</span>
                        </div>
                        <div className="flex items-center gap-3 px-5 py-4 border-r border-slate-100">
                            <Users className="text-blue-500" size={20} />
                            <span className="text-slate-400 font-bold text-sm italic">Khách & Phòng</span>
                        </div>
                        <button className="bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black transition-all active:scale-95 flex items-center justify-center gap-2">
                            <Search size={20} /> TÌM KIẾM
                        </button>
                    </div>
                </div>
            </div>

            {/* --- LIST HOTELS --- */}
            <div className="max-w-7xl mx-auto px-4 py-16">
                <h2 className="text-3xl font-black text-slate-800 mb-8 text-left tracking-tight">KHÁCH SẠN DÀNH CHO BẠN</h2>
                
                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={48} /></div>
                ) : filteredHotels.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {filteredHotels.map(h => (
                            <ServiceCard key={h.serviceId} service={h} isAdminOrPartner={false} onDelete={() => {}} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed">
                        <p className="text-slate-400 font-bold">Không tìm thấy khách sạn nào phù hợp.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HotelsPage; // <--- Dòng này để fix lỗi App.tsx