import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { LayoutDashboard, Calendar, Star, Settings, ArrowLeft, Loader2, Info, CheckCircle, Package } from 'lucide-react';

const ServiceConsole = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [tab, setTab] = useState('overview');
    const [service, setService] = useState<any>(null);
    const [availData, setAvailData] = useState<any[]>([]); // Dữ liệu lịch chỗ trống
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [sRes, aRes] = await Promise.all([
                    axiosClient.get(`/services/${id}`),
                    // Lấy lịch chỗ trống 30 ngày tới để Partner xem
                    axiosClient.get(`/availability/${id}?start=${new Date().toISOString()}&end=${new Date(Date.now() + 30*24*60*60*1000).toISOString()}`)
                ]);
                setService(sRes.data);
                setAvailData(aRes.data);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchData();
    }, [id]);

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-7xl mx-auto py-10 px-4 text-left">
            <button onClick={() => navigate('/partner/services')} className="flex items-center gap-2 text-slate-400 mb-8 font-bold"><ArrowLeft size={20}/> Quay lại danh sách</button>
            
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar */}
                <div className="w-full lg:w-72 space-y-2">
                    <div className="p-6 bg-slate-900 rounded-[2rem] text-white mb-4">
                        <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Dịch vụ</p>
                        <h2 className="font-black text-lg line-clamp-2">{service?.name}</h2>
                    </div>
                    <button onClick={() => setTab('overview')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold ${tab === 'overview' ? 'bg-blue-600 text-white' : 'bg-white'}`}><Info size={20}/> Tổng quan</button>
                    <button onClick={() => setTab('calendar')} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold ${tab === 'calendar' ? 'bg-blue-600 text-white' : 'bg-white'}`}><Calendar size={20}/> Lịch & Chỗ trống</button>
                </div>

                {/* Main Content */}
                <div className="flex-1 bg-white rounded-[3rem] shadow-xl p-10 border border-slate-50">
                    {tab === 'overview' && (
                        <div>
                            <h2 className="text-2xl font-black mb-6">Thông tin chi tiết</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Giá mặc định</p>
                                    <p className="text-2xl font-black text-blue-600">{new Intl.NumberFormat('vi-VN').format(service?.basePrice)}₫</p>
                                </div>
                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Trạng thái</p>
                                    <p className={`font-black ${service?.isActive ? 'text-green-600' : 'text-amber-500'}`}>{service?.isActive ? "ĐANG HIỂN THỊ" : "CHỜ DUYỆT"}</p>
                                </div>
                            </div>
                            <h4 className="font-bold mb-2">Mô tả hiển thị cho khách:</h4>
                            <p className="text-slate-600 bg-slate-50 p-6 rounded-2xl italic">{service?.description || "Chưa có mô tả"}</p>
                        </div>
                    )}

                    {tab === 'calendar' && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black">Lịch mở bán & Chỗ trống</h2>
                                <button onClick={() => navigate('/partner/availability')} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-xs">+ THÊM CHỖ TRỐNG</button>
                            </div>
                            <div className="space-y-3">
                                {availData.length > 0 ? availData.map((a, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-white p-2 rounded-xl font-black text-blue-600 shadow-sm">
                                                {new Date(a.date).toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-700">{new Intl.NumberFormat('vi-VN').format(a.price)}₫</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Giá bán ngày này</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-emerald-600">{a.remainingStock} chỗ</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Còn lại</p>
                                        </div>
                                    </div>
                                )) : <p className="text-center py-10 text-slate-400">Bạn chưa thiết lập chỗ trống cho các ngày tới.</p>}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ServiceConsole;