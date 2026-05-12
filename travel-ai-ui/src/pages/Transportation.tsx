import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import TransportCard from '../components/TransportCard';
import { Loader2, Search, X, Bus, Plane, SlidersHorizontal, MapPin } from 'lucide-react';

const Transportation: React.FC = () => {
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [transportFilter, setTransportFilter] = useState<string>(''); // 'bus' | 'flight' | ''

    const fetchTransportServices = async () => {
        try {
            setLoading(true);
            // Gọi API lấy tất cả dịch vụ Transport (ServiceType = 2)
            const res = await axiosClient.get('/services/public?type=2');
            setServices(res.data || []);
        } catch (err) {
            console.error("Lỗi lấy danh sách phương tiện:", err);
            setServices([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransportServices();
    }, []);

    // Lọc theo tên và loại phương tiện
    const filteredServices = services.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (transportFilter === 'flight') {
            const isFlight = s.name?.toLowerCase().includes('máy bay') || 
                           s.name?.toLowerCase().includes('vé bay') ||
                           s.attributes?.some((attr: any) => attr.attrKey === 'Hãng bay');
            return matchesSearch && isFlight;
        }
        
        if (transportFilter === 'bus') {
            const isBus = s.name?.toLowerCase().includes('xe') || 
                         s.name?.toLowerCase().includes('limousine') ||
                         s.attributes?.some((attr: any) => attr.attrKey === 'Loại xe');
            return matchesSearch && isBus;
        }
        
        return matchesSearch;
    });

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* TIÊU ĐỀ TRANG */}
            <div className="text-left mb-12 animate-in fade-in slide-in-from-left duration-700">
                <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-purple-50 rounded-full">
                    <Bus size={18} className="text-purple-600" />
                    <Plane size={18} className="text-sky-600" />
                    <span className="text-xs font-black uppercase tracking-widest text-purple-600">Transportation</span>
                </div>
                <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-3">
                    VÉ XE & MÁY BAY
                </h1>
                <p className="text-slate-500 font-medium text-lg max-w-2xl">
                    Đặt vé xe khách và máy bay nhanh chóng, tiện lợi. Di chuyển an toàn đến mọi điểm đến trên toàn quốc.
                </p>
            </div>

            {/* THANH TÌM KIẾM & BỘ LỌC */}
            <div className="bg-white p-4 rounded-[2.5rem] shadow-sm border border-slate-100 mb-10 flex flex-col md:flex-row gap-4 items-center">
                {/* Ô tìm kiếm */}
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text"
                        placeholder="Tìm theo tuyến đường, điểm đến..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-[1.8rem] focus:ring-2 focus:ring-purple-500 transition-all font-bold text-slate-700 outline-none"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')} 
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                {/* Bộ lọc loại phương tiện */}
                <div className="flex items-center gap-3 bg-slate-50 px-6 py-4 rounded-[1.8rem] w-full md:w-auto border-2 border-transparent focus-within:border-purple-500 transition-all">
                    <SlidersHorizontal size={20} className="text-purple-600" />
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Loại:</span>
                    <select 
                        value={transportFilter}
                        onChange={(e) => setTransportFilter(e.target.value)}
                        className="bg-transparent font-black text-slate-800 outline-none border-none focus:ring-0 cursor-pointer min-w-[120px]"
                    >
                        <option value="">Tất cả</option>
                        <option value="bus">🚌 Xe khách</option>
                        <option value="flight">✈️ Máy bay</option>
                    </select>
                </div>
            </div>

            {/* HIỂN THỊ DANH SÁCH */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <Loader2 className="animate-spin text-purple-600" size={48} />
                    <p className="text-slate-400 font-bold animate-pulse">Đang tải dữ liệu...</p>
                </div>
            ) : filteredServices.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-20 animate-in fade-in duration-700">
                    {filteredServices.map(s => (
                        <TransportCard key={s.serviceId} service={s} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-32 bg-white rounded-[4rem] border-4 border-dashed border-slate-50 flex flex-col items-center gap-4">
                    <div className="text-7xl">🚫</div>
                    <h3 className="text-2xl font-black text-slate-800">Không tìm thấy phương tiện phù hợp!</h3>
                    <p className="text-slate-400 font-medium max-w-xs">
                        Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm để xem thêm lựa chọn.
                    </p>
                    <button 
                        onClick={() => { setTransportFilter(''); setSearchQuery(''); }}
                        className="mt-4 px-8 py-3 bg-purple-600 text-white rounded-2xl font-black shadow-lg shadow-purple-100 hover:bg-purple-700 transition-all active:scale-95"
                    >
                        XÓA TẤT CẢ BỘ LỌC
                    </button>
                </div>
            )}

            {/* THÔNG TIN THÊM */}
            <div className="mt-10 grid md:grid-cols-2 gap-6">
                <div className="p-8 bg-gradient-to-br from-purple-50 to-blue-50 rounded-[3rem] border border-purple-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-purple-600 rounded-2xl">
                            <Bus size={24} className="text-white" />
                        </div>
                        <h4 className="font-black text-purple-900 text-xl">Xe khách cao cấp</h4>
                    </div>
                    <p className="text-purple-700/70 font-medium leading-relaxed">
                        Đặt vé xe limousine, giường nằm VIP với giá ưu đãi. An toàn, thoải mái trên mọi hành trình.
                    </p>
                </div>

                <div className="p-8 bg-gradient-to-br from-sky-50 to-blue-50 rounded-[3rem] border border-sky-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-sky-600 rounded-2xl">
                            <Plane size={24} className="text-white" />
                        </div>
                        <h4 className="font-black text-sky-900 text-xl">Vé máy bay giá rẻ</h4>
                    </div>
                    <p className="text-sky-700/70 font-medium leading-relaxed">
                        So sánh giá vé từ các hãng hàng không uy tín. Đặt nhanh, bay ngay, tiết kiệm chi phí.
                    </p>
                </div>
            </div>

            {/* CTA FOOTER */}
            <div className="mt-10 p-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-[3rem] flex flex-col md:flex-row items-center justify-between gap-6 text-white">
                <div className="text-left">
                    <h4 className="font-black text-2xl mb-2">Bạn là nhà xe hoặc hãng hàng không?</h4>
                    <p className="text-white/80 font-medium">
                        Hợp tác cùng TravelAI để mở rộng mạng lưới khách hàng trên toàn quốc.
                    </p>
                </div>
                <button className="bg-white text-purple-600 px-8 py-4 rounded-2xl font-black shadow-lg hover:shadow-xl transition-all whitespace-nowrap active:scale-95">
                    ĐĂNG KÝ ĐỐI TÁC
                </button>
            </div>
        </div>
    );
};

export default Transportation;
