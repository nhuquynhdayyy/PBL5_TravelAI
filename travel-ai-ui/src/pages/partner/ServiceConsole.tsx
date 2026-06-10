import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { Calendar, ArrowLeft, Loader2, DollarSign, Activity, FileText } from 'lucide-react';
import { formatVietnameseCurrency } from '../../utils/dateTimeUtils';

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

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
                <Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={40} />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 text-left">
            <button 
                onClick={() => navigate('/partner/services')} 
                className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-bold mb-8 transition-colors duration-200 active:scale-95 cursor-pointer"
            >
                <ArrowLeft size={20}/> Quay lại danh sách dịch vụ
            </button>
            
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-xl p-8 sm:p-10 border border-slate-100 dark:border-slate-700/60">
                <div className="mb-8 border-b border-slate-100 dark:border-slate-700 pb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <p className="text-xs font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-1.5">Bảng điều khiển dịch vụ</p>
                            <h2 className="font-black text-3xl text-slate-900 dark:text-white leading-tight">{service?.name}</h2>
                        </div>
                        <button 
                            onClick={() => navigate('/partner/availability')}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm transition-all active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/10 dark:shadow-none"
                        >
                            <Calendar size={18} />
                            Quản lý lịch bán & tồn kho
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="p-6 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-start gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-450 rounded-2xl">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Giá mặc định gốc</p>
                            <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                                {service?.basePrice > 0 
                                    ? `${formatVietnameseCurrency(service.basePrice)}₫` 
                                    : 'Chưa thiết lập'}
                            </p>
                        </div>
                    </div>
                    <div className="p-6 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-start gap-4">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 rounded-2xl">
                            <Activity size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Trạng thái hệ thống</p>
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-black border ${
                                service?.isActive 
                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50' 
                                    : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50'
                            }`}>
                                {service?.isActive ? "ĐÃ DUYỆT" : "CHỜ DUYỆT"}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-900/30 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                        <FileText size={18} className="text-blue-500" />
                        Mô tả hiển thị cho khách hàng
                    </h4>
                    <p className="text-slate-600 dark:text-slate-350 italic font-medium">
                        &ldquo;{service?.description || "Dịch vụ chưa được cập nhật thông tin mô tả chi tiết."}&rdquo;
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ServiceConsole;