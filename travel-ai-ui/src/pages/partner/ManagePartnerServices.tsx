// src/pages/partner/ManagePartnerServices.tsx

import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { Plus, Edit3, Trash2, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ManagePartnerServices = () => {
    const [myServices, setMyServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // 1. Lấy danh sách dịch vụ của chính Partner đang đăng nhập
    const fetchMyServices = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get('/services/my-services');
            setMyServices(res.data || []);
        } catch (err) {
            console.error("Lỗi lấy dữ liệu:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyServices();
    }, []);

    // 2. Hàm Xử lý Xóa dịch vụ
    const handleDelete = async (id: number) => {
        // Hiện thông báo xác nhận trước khi xóa
        const confirmDelete = window.confirm("Bạn có chắc chắn muốn xóa dịch vụ này không? Thao tác này không thể hoàn tác.");
        
        if (confirmDelete) {
            try {
                // Gọi API DELETE tới Backend
                await axiosClient.delete(`/services/${id}`);
                
                // Cập nhật lại giao diện ngay lập tức (Xóa bỏ item khỏi mảng myServices)
                setMyServices(prev => prev.filter(s => s.serviceId !== id));
                
                alert("Đã xóa dịch vụ thành công!");
            } catch (err) {
                console.error("Lỗi khi xóa:", err);
                alert("Không thể xóa dịch vụ này. Có thể dịch vụ này đang tồn tại trong một lịch trình đặt trước.");
            }
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                <div className="text-left">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                        QUẢN LÝ <span className="text-blue-600">DỊCH VỤ CỦA TÔI</span>
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Nơi bạn quản lý, cập nhật và theo dõi các Khách sạn/Tour của mình.</p>
                </div>

                <button 
                    onClick={() => navigate('/partner/services/add')} 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-[2rem] font-black shadow-xl shadow-blue-100 transition-all active:scale-95 flex items-center gap-2"
                >
                    <Plus size={22} /> Đăng dịch vụ mới
                </button>
            </div>

            {/* Content Section */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <Loader2 className="animate-spin text-blue-600" size={48} />
                    <p className="text-slate-400 font-bold">Đang tải danh sách của bạn...</p>
                </div>
            ) : myServices.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {myServices.map((s) => (
                        <div key={s.serviceId} className="group bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-50 relative hover:shadow-2xl transition-all duration-500">
                            
                            {/* Status Badge */}
                            <div className="absolute top-4 left-4 z-10">
                                {s.isActive ? (
                                    <span className="flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                                        <CheckCircle size={12} /> Đang hiển thị
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 bg-amber-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                                        <AlertCircle size={12} /> Chờ duyệt
                                    </span>
                                )}
                            </div>
                            
                            {/* Image Preview */}
                            <div className="h-44 w-full overflow-hidden rounded-3xl mb-5">
                                <img 
                                    src={s.imageUrls?.[0] ? `http://localhost:5134${s.imageUrls[0]}` : 'https://via.placeholder.com/300x200'} 
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                    alt={s.name} 
                                />
                            </div>

                            {/* Info */}
                            <div className="text-left mb-6">
                                <h3 className="font-black text-xl text-slate-800 line-clamp-1 mb-1">{s.name}</h3>
                                <p className="text-blue-600 font-black text-sm">
                                    {new Intl.NumberFormat('vi-VN').format(s.basePrice)}₫
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => navigate(`/partner/services/edit/${s.serviceId}`)} 
                                    className="flex-1 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white py-3 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2"
                                >
                                    <Edit3 size={18}/> Sửa
                                </button>
                                
                                <button 
                                    onClick={() => handleDelete(s.serviceId)} // GẮN HÀM XÓA TẠI ĐÂY
                                    className="p-3 bg-red-50 hover:bg-red-600 text-red-500 hover:text-white rounded-2xl transition-all shadow-sm"
                                    title="Xóa dịch vụ"
                                >
                                    <Trash2 size={20}/>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-32 bg-white rounded-[4rem] border-4 border-dashed border-slate-50">
                    <div className="text-6xl mb-4 text-slate-200">📦</div>
                    <h3 className="text-2xl font-black text-slate-400">Bạn chưa đăng dịch vụ nào.</h3>
                    <p className="text-slate-400 mt-2">Bắt đầu kinh doanh bằng cách bấm nút "Đăng dịch vụ mới" ở trên!</p>
                </div>
            )}
        </div>
    );
};

export default ManagePartnerServices;