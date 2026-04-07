// src/pages/Admin/AdminManageServices.tsx

import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import MainLayout from '../../layouts/MainLayout';
import { 
    ShieldCheck, 
    Trash2, 
    CheckCircle, 
    XCircle, 
    Loader2, 
    Search, 
    Hotel, 
    Compass, 
    User,
    AlertCircle
} from 'lucide-react';

const AdminManageServices = () => {
    const [allServices, setAllServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    // 1. Fetch toàn bộ dịch vụ từ API dành riêng cho Admin
    const fetchAllServices = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get('/services/admin-all');
            setAllServices(res.data || []);
        } catch (err) {
            console.error("Lỗi lấy dữ liệu quản trị:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllServices();
    }, []);

    // 2. Hàm Duyệt hoặc Khóa dịch vụ (Toggle Status)
    const handleToggleStatus = async (id: number) => {
        try {
            setActionLoading(id);
            await axiosClient.patch(`/services/${id}/toggle`);
            
            // Cập nhật lại state tại chỗ để UI thay đổi ngay lập tức
            setAllServices(prev => prev.map(s => 
                s.serviceId === id ? { ...s, isActive: !s.isActive } : s
            ));
        } catch (err) {
            alert("Lỗi khi cập nhật trạng thái!");
        } finally {
            setActionLoading(null);
        }
    };

    // 3. Hàm Xóa vĩnh viễn (Nếu vi phạm nghiêm trọng)
    const handleDelete = async (id: number) => {
        if (!window.confirm("CẢNH BÁO: Bạn đang xóa vĩnh viễn dịch vụ này khỏi hệ thống. Tiếp tục?")) return;
        try {
            await axiosClient.delete(`/services/${id}`);
            setAllServices(prev => prev.filter(s => s.serviceId !== id));
        } catch (err) {
            alert("Lỗi khi xóa dịch vụ!");
        }
    };

    // Lọc theo thanh tìm kiếm
    const filtered = allServices.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                
                {/* Header & Stats */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 text-left">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <ShieldCheck className="text-red-600" size={36} />
                            QUẢN TRỊ <span className="text-red-600">HỆ THỐNG</span>
                        </h1>
                        <p className="text-slate-500 font-medium mt-1">Duyệt bài, khóa dịch vụ và kiểm soát nội dung từ các Đối tác (Partner).</p>
                    </div>

                    <div className="flex gap-4">
                        <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng dịch vụ</p>
                            <p className="text-2xl font-black text-slate-900">{allServices.length}</p>
                        </div>
                        <div className="bg-red-50 px-6 py-3 rounded-2xl border border-red-100 text-center">
                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Chờ duyệt</p>
                            <p className="text-2xl font-black text-red-600">
                                {allServices.filter(s => !s.isActive).length}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative mb-8">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Tìm kiếm theo tên dịch vụ hoặc ID Partner..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 bg-white border-2 border-slate-100 rounded-[1.8rem] shadow-sm focus:border-red-500 transition-all outline-none font-bold text-slate-700"
                    />
                </div>

                {/* Main Table Content */}
                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-red-600" size={48} /></div>
                ) : (
                    <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-900 text-white">
                                    <tr>
                                        <th className="p-6 text-xs font-black uppercase tracking-widest">Thông tin dịch vụ</th>
                                        <th className="p-6 text-xs font-black uppercase tracking-widest text-center">Loại</th>
                                        <th className="p-6 text-xs font-black uppercase tracking-widest">Đối tác (Partner)</th>
                                        <th className="p-6 text-xs font-black uppercase tracking-widest">Trạng thái</th>
                                        <th className="p-6 text-xs font-black uppercase tracking-widest text-right">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filtered.map((s) => (
                                        <tr key={s.serviceId} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <img 
                                                        src={s.imageUrls?.[0] ? `http://localhost:5134${s.imageUrls[0]}` : 'https://via.placeholder.com/100'} 
                                                        className="size-14 rounded-xl object-cover border-2 border-white shadow-sm" 
                                                    />
                                                    <div>
                                                        <p className="font-black text-slate-800 leading-none mb-1">{s.name}</p>
                                                        <p className="text-[10px] font-bold text-blue-600 uppercase">ID: #{s.serviceId}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                {s.serviceType === "Hotel" ? (
                                                    <div className="inline-flex p-2 bg-blue-100 text-blue-600 rounded-lg"><Hotel size={18} /></div>
                                                ) : (
                                                    <div className="inline-flex p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Compass size={18} /></div>
                                                )}
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-2 text-slate-600 font-bold text-sm">
                                                    <User size={14} className="text-slate-400" />
                                                    {s.partnerName}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                {s.isActive ? (
                                                    <span className="flex items-center gap-1.5 text-green-600 font-black text-[10px] uppercase tracking-widest bg-green-50 px-3 py-1.5 rounded-full w-fit">
                                                        <CheckCircle size={12} /> Đang hiển thị
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 text-amber-600 font-black text-[10px] uppercase tracking-widest bg-amber-50 px-3 py-1.5 rounded-full w-fit">
                                                        <AlertCircle size={12} /> Chờ duyệt / Đã khóa
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleToggleStatus(s.serviceId)}
                                                        disabled={actionLoading === s.serviceId}
                                                        className={`px-4 py-2 rounded-xl font-black text-xs transition-all shadow-md active:scale-95 flex items-center gap-2 ${
                                                            s.isActive 
                                                            ? 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white' 
                                                            : 'bg-green-600 text-white hover:bg-green-700 shadow-green-200'
                                                        }`}
                                                    >
                                                        {actionLoading === s.serviceId ? (
                                                            <Loader2 size={14} className="animate-spin" />
                                                        ) : (
                                                            s.isActive ? <XCircle size={14} /> : <CheckCircle size={14} />
                                                        )}
                                                        {s.isActive ? "KHÓA LẠI" : "DUYỆT BÀI"}
                                                    </button>
                                                    
                                                    <button 
                                                        onClick={() => handleDelete(s.serviceId)}
                                                        className="p-2 bg-slate-100 text-slate-400 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm"
                                                        title="Xóa vĩnh viễn"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
    );
};

export default AdminManageServices;