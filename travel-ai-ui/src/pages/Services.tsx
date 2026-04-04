// src/pages/Services.tsx

import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import MainLayout from '../layouts/MainLayout';
import ServiceCard from '../components/ServiceCard';
import { Plus, Filter, Loader2, Search, SlidersHorizontal, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Services = () => {
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [type, setType] = useState<string>(''); // Lưu trữ '0' (Hotel), '1' (Tour) hoặc '' (Tất cả)
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    // Lấy thông tin user từ localStorage để check quyền Admin/Partner
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const isAdminOrPartner = user?.roleName?.toLowerCase() === 'admin' || user?.roleName?.toLowerCase() === 'partner';

    const fetchServices = async () => {
        try {
            setLoading(true);
            // Nếu type có giá trị thì gọi API kèm query param: /api/services?type=0
            const url = type !== '' ? `/services?type=${type}` : '/services';
            const res = await axiosClient.get(url);
            
            // Backend của bạn trả về mảng trực tiếp hoặc { data: [] }
            // Dựa trên code trước đó, tôi giả định nó trả về mảng trực tiếp
            setServices(res.data || []);
        } catch (err) {
            console.error("Lỗi lấy danh sách dịch vụ:", err);
            setServices([]);
        } finally {
            setLoading(false);
        }
    };

    // Gọi lại API mỗi khi giá trị 'type' thay đổi
    useEffect(() => {
        fetchServices();
    }, [type]);

    const handleDelete = async (id: number) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa dịch vụ này không? Thao tác này không thể hoàn tác.")) return;
        try {
            await axiosClient.delete(`/services/${id}`);
            setServices(prev => prev.filter(s => s.serviceId !== id));
            alert("Đã xóa dịch vụ thành công!");
        } catch (err) {
            alert("Lỗi khi xóa dịch vụ. Có thể dịch vụ này đang nằm trong một lịch trình.");
        }
    };

    // Filter danh sách theo Search Bar (Client-side search)
    const filteredServices = services.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* --- HEADER SECTION --- */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                    <div className="text-left">
                        <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-3">
                            DỊCH VỤ <span className="text-blue-600">DU LỊCH</span>
                        </h1>
                        <p className="text-slate-500 font-medium text-lg">
                            Hệ thống Khách sạn cao cấp và Tour du lịch trọn gói dành cho bạn.
                        </p>
                    </div>

                    {isAdminOrPartner && (
                        <button 
                            onClick={() => navigate('/services/add')}
                            className="w-full md:w-auto bg-slate-900 hover:bg-blue-600 text-white px-8 py-4 rounded-[2rem] font-black shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Plus size={22} /> THÊM DỊCH VỤ MỚI
                        </button>
                    )}
                </div>

                {/* --- FILTER & SEARCH BAR --- */}
                <div className="bg-white p-4 rounded-[2.5rem] shadow-sm border border-slate-100 mb-10 flex flex-col md:flex-row gap-4 items-center">
                    {/* Search Input */}
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="text"
                            placeholder="Tìm kiếm tên dịch vụ..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-[1.8rem] focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-700"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        )}
                    </div>

                    {/* Filter Dropdown */}
                    <div className="flex items-center gap-3 bg-slate-50 px-6 py-4 rounded-[1.8rem] w-full md:w-auto">
                        <SlidersHorizontal size={20} className="text-blue-600" />
                        <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Lọc theo:</span>
                        <select 
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="bg-transparent font-black text-slate-800 outline-none cursor-pointer border-none focus:ring-0"
                        >
                            <option value="">Tất cả</option>
                            <option value="0">🏨 Khách sạn</option>
                            <option value="1">🧭 Tour du lịch</option>
                        </select>
                    </div>
                </div>

                {/* --- MAIN CONTENT (GRID) --- */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <Loader2 className="animate-spin text-blue-600" size={48} />
                        <p className="text-slate-400 font-bold animate-pulse">Đang tải dữ liệu dịch vụ...</p>
                    </div>
                ) : filteredServices.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-20 animate-in fade-in duration-700">
                        {filteredServices.map(s => (
                            <ServiceCard 
                                key={s.serviceId} 
                                service={s} 
                                isAdminOrPartner={isAdminOrPartner} 
                                onDelete={handleDelete} 
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-32 bg-white rounded-[4rem] border-4 border-dashed border-slate-100 flex flex-col items-center gap-4">
                        <div className="text-6xl">🏜️</div>
                        <h3 className="text-2xl font-black text-slate-700">Không tìm thấy dịch vụ nào!</h3>
                        <p className="text-slate-400 font-medium">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm của bạn.</p>
                        <button 
                            onClick={() => { setType(''); setSearchQuery(''); }}
                            className="mt-2 text-blue-600 font-black hover:underline"
                        >
                            Xóa tất cả bộ lọc
                        </button>
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default Services;