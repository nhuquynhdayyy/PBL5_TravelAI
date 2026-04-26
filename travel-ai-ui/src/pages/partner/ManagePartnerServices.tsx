// src/pages/partner/ManagePartnerServices.tsx

import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { 
    Plus, 
    Trash2, 
    Loader2, 
    Settings2,
    BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ManagePartnerServices = () => {
    const [myServices, setMyServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchMyServices = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get('/services/my-services');
            setMyServices(res.data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchMyServices(); }, []);

    const handleDelete = async (id: number) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa dịch vụ này?")) {
            try {
                await axiosClient.delete(`/services/${id}`);
                setMyServices(prev => prev.filter(s => s.serviceId !== id));
                alert("Đã xóa thành công!");
            } catch (err) { alert("Lỗi khi xóa!"); }
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6 text-left">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">DỊCH VỤ CỦA TÔI</h1>
                    <p className="text-slate-500 font-medium">Quản lý và theo dõi hiệu quả kinh doanh các Khách sạn/Tour của bạn.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button onClick={() => navigate('/partner/dashboard')} className="bg-slate-900 text-white px-6 py-4 rounded-[2rem] font-black shadow-xl transition-all active:scale-95 flex items-center gap-2">
                        <BarChart3 size={20} /> Xem dashboard
                    </button>
                    <button onClick={() => navigate('/partner/reviews')} className="bg-slate-900 text-white px-6 py-4 rounded-[2rem] font-black shadow-xl transition-all active:scale-95">
                        Xem review
                    </button>
                    <button onClick={() => navigate('/partner/services/add')} className="bg-blue-600 text-white px-8 py-4 rounded-[2rem] font-black shadow-xl flex items-center gap-2 transition-all active:scale-95">
                        <Plus size={22} /> Đăng dịch vụ mới
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="flex justify-center py-32"><Loader2 className="animate-spin text-blue-600" size={48} /></div>
            ) : myServices.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {myServices.map((s) => (
                        <div key={s.serviceId} className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-50 flex flex-col h-full hover:shadow-2xl transition-all duration-500">
                            {/* Image & Status */}
                            <div className="relative h-44 w-full overflow-hidden rounded-3xl mb-5">
                                <img src={`http://localhost:5134${s.imageUrls?.[0]}`} className="w-full h-full object-cover" alt="" />
                                <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-black uppercase text-white ${s.isActive ? 'bg-green-500' : 'bg-amber-500'}`}>
                                    {s.isActive ? 'Đang hiển thị' : 'Chờ duyệt'}
                                </span>
                            </div>

                            {/* Info */}
                            <div className="text-left mb-6 flex-grow">
                                <h3 className="font-black text-xl text-slate-800 line-clamp-1 mb-1">{s.name}</h3>
                                <p className="text-blue-600 font-black">{new Intl.NumberFormat('vi-VN').format(s.basePrice)}₫</p>
                            </div>

                            {/* ACTION BUTTONS */}
                            <div className="space-y-3">
                                {/* NÚT QUẢN LÝ CHI TIẾT (Vào Console) */}
                                <button 
                                    onClick={() => navigate(`/partner/services/${s.serviceId}/manage`)}
                                    className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-black text-sm hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg"
                                >
                                    <Settings2 size={18} /> QUẢN LÝ CHI TIẾT
                                </button>

                                <div className="flex gap-2">
                                    <button onClick={() => navigate(`/partner/services/edit/${s.serviceId}`)} className="flex-1 bg-slate-50 text-slate-500 py-2 rounded-xl font-bold text-xs hover:bg-blue-50 hover:text-blue-600 transition-colors italic">Sửa</button>
                                    <button onClick={() => handleDelete(s.serviceId)} className="p-2 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18}/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-32 bg-slate-50 rounded-[4rem] border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 font-bold">Bạn chưa đăng dịch vụ nào.</p>
                </div>
            )}
        </div>
    );
};

export default ManagePartnerServices;
