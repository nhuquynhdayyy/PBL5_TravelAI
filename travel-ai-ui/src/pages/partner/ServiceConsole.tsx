import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { Calendar, ArrowLeft, Loader2 } from 'lucide-react';

const ServiceConsole = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [service, setService] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const sRes = await axiosClient.get(`/services/${id}`);
                setService(sRes.data);
            } catch (err) { 
                console.error('Error fetching service:', err);
            }
            finally { setLoading(false); }
        };
        fetchData();
    }, [id]);

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-7xl mx-auto py-10 px-4 text-left">
            <button onClick={() => navigate('/partner/services')} className="flex items-center gap-2 text-slate-400 mb-8 font-bold"><ArrowLeft size={20}/> Quay lại danh sách</button>
            
            <div className="bg-white rounded-[3rem] shadow-xl p-10 border border-slate-50">
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Dịch vụ</p>
                            <h2 className="font-black text-3xl text-slate-900">{service?.name}</h2>
                        </div>
                        <button 
                            onClick={() => navigate('/partner/availability')}
                            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-100 transition-all"
                        >
                            <Calendar size={18} />
                            Quản lý lịch bán
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase">Giá mặc định</p>
                        <p className="text-2xl font-black text-blue-600">
                            {service?.basePrice > 0 
                                ? `${new Intl.NumberFormat('vi-VN').format(service.basePrice)}₫` 
                                : 'Chưa có giá'}
                        </p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase">Trạng thái</p>
                        <p className={`font-black ${service?.isActive ? 'text-green-600' : 'text-amber-500'}`}>
                            {service?.isActive ? "ĐÃ DUYỆT" : "CHỜ DUYỆT"}
                        </p>
                    </div>
                </div>
                
                <div>
                    <h4 className="font-bold mb-2">Mô tả hiển thị cho khách:</h4>
                    <p className="text-slate-600 bg-slate-50 p-6 rounded-2xl italic">{service?.description || "Chưa có mô tả"}</p>
                </div>
            </div>
        </div>
    );
};

export default ServiceConsole;