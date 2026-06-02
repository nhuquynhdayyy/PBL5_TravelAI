import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import ServiceCard from '../components/ServiceCard';
import { Loader2, Search, SlidersHorizontal, X } from 'lucide-react';

// Định nghĩa Interface cho Filter
interface ServiceFilterState {
    serviceType: string;
    minPrice: string;
    maxPrice: string;
    rating: string;
}

const Services: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    
    // --- KHAI BÁO STATE ---
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchKeyword, setSearchKeyword] = useState(''); // State cho ô nhập liệu
    const [pageNumber, setPageNumber] = useState(1);
    
    // Lấy type từ URL (ví dụ: ?type=0 hoặc ?type=Hotel)
    const initialType = searchParams.get('type') || '';
    const [filters, setFilters] = useState<ServiceFilterState>({
        serviceType: initialType,
        minPrice: '',
        maxPrice: '',
        rating: ''
    });

    // --- LOGIC FETCH DATA ---
    const fetchServices = async (signal?: AbortSignal) => {
        try {
            setLoading(true);
            // Build URL dựa trên filter
            let url = `/services/public?pageNumber=${pageNumber}&pageSize=12`;
            if (filters.serviceType) url += `&type=${filters.serviceType}`;
            if (searchKeyword) url += `&keyword=${searchKeyword}`;

            const res = await axiosClient.get(url, { signal });
            setServices(res.data || []);
        } catch (err: any) {
            if (err.name !== 'CanceledError') {
                console.error("Lỗi lấy danh sách dịch vụ:", err);
                setServices([]);
            }
        } finally {
            setLoading(false);
        }
    };

    // Effect gọi API khi filter hoặc search thay đổi
    useEffect(() => {
        const controller = new AbortController();
        
        // Debounce tìm kiếm để tránh gọi API liên tục
        const timeoutId = setTimeout(() => {
            fetchServices(controller.signal);
        }, 500);

        return () => {
            controller.abort();
            clearTimeout(timeoutId);
        };
    }, [filters, searchKeyword, pageNumber]);

    // Đồng bộ URL khi filter thay đổi
    useEffect(() => {
        if (filters.serviceType) {
            setSearchParams({ type: filters.serviceType });
        } else {
            setSearchParams({});
        }
    }, [filters.serviceType]);

    // --- XỬ LÝ GIAO DIỆN ---
    const pageTitle = useMemo(() => {
        switch (filters.serviceType) {
            case '0': case 'Hotel': return 'KHÁCH SẠN';
            case '1': case 'Tour': return 'TOUR DU LỊCH';
            default: return 'TẤT CẢ DỊCH VỤ';
        }
    }, [filters.serviceType]);

    const pageDescription = useMemo(() => {
        switch (filters.serviceType) {
            case '0': case 'Hotel': return 'Tìm kiếm chỗ nghỉ chân lý tưởng cho chuyến đi của bạn.';
            case '1': case 'Tour': return 'Khám phá những hành trình trải nghiệm thú vị nhất.';
            default: return 'Hệ thống Khách sạn và Tour du lịch đạt chuẩn trên toàn quốc.';
        }
    }, [filters.serviceType]);

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                
                {/* --- TIÊU ĐỀ TRANG (Style của bạn) --- */}
                <div className="text-left mb-12 animate-in fade-in slide-in-from-left duration-700">
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.28em] text-teal-600">
                        Services
                    </p>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-3">
                        {pageTitle}
                    </h1>
                    <p className="text-slate-500 font-medium text-lg max-w-2xl">
                        {pageDescription}
                    </p>
                </div>

                {/* --- THANH TÌM KIẾM & BỘ LỌC (Style đẹp của bạn) --- */}
                <div className="bg-white p-4 rounded-[2.5rem] shadow-sm border border-slate-100 mb-10 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="text"
                            placeholder="Tìm theo tên dịch vụ..."
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-[1.8rem] focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-700 outline-none"
                        />
                        {searchKeyword && (
                            <button onClick={() => setSearchKeyword('')} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                                <X size={18} />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-3 bg-slate-50 px-6 py-4 rounded-[1.8rem] w-full md:w-auto">
                        <SlidersHorizontal size={20} className="text-blue-600" />
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Phân loại:</span>
                        <select 
                            value={filters.serviceType}
                            onChange={(e) => setFilters({...filters, serviceType: e.target.value})}
                            className="bg-transparent font-black text-slate-800 outline-none border-none focus:ring-0 cursor-pointer min-w-[120px]"
                        >
                            <option value="">Tất cả</option>
                            <option value="0">🏨 Khách sạn</option>
                            <option value="1">🧭 Tour du lịch</option>
                        </select>
                    </div>
                </div>

                {/* --- DANH SÁCH DỊCH VỤ --- */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <Loader2 className="animate-spin text-blue-600" size={48} />
                        <p className="text-slate-400 font-bold animate-pulse">Đang tải dữ liệu...</p>
                    </div>
                ) : services.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-20 animate-in fade-in duration-700">
                        {services.map(s => (
                            <ServiceCard key={s.serviceId} service={s} isAdminOrPartner={false} onDelete={() => {}} />
                        ))}
                    </div>
                ) : (
                    /* --- TRẠNG THÁI TRỐNG --- */
                    <div className="text-center py-32 bg-white rounded-[4rem] border-4 border-dashed border-slate-50 flex flex-col items-center gap-4">
                        <div className="text-7xl">🏜️</div>
                        <h3 className="text-2xl font-black text-slate-800">Rất tiếc, không tìm thấy kết quả nào!</h3>
                        <button 
                            onClick={() => { setFilters({ ...filters, serviceType: '' }); setSearchKeyword(''); }}
                            className="mt-4 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all"
                        >
                            XÓA TẤT CẢ BỘ LỌC
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Services;