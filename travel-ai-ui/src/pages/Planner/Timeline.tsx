import React, { useEffect, useState } from 'react';
import { 
  Calendar, MapPin, Clock, DollarSign, 
  ChevronRight, Sparkles, Map, Info, 
  ArrowLeft, Download, Share2, Coffee, Sun, Moon 
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { useLocation, useNavigate } from 'react-router-dom';

const Timeline: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Lấy dữ liệu từ trang Detail truyền sang
    const [data, setData] = useState<any>(location.state?.data || null);
    const [loading, setLoading] = useState(false);

    // Hàm xác định Icon theo thời gian hoặc tên hoạt động
    const getActivityIcon = (index: number) => {
        if (index === 0) return <Coffee className="size-5" />; // Sáng
        if (index === 1) return <Sun className="size-5" />;    // Trưa/Chiều
        return <Moon className="size-5" />;                    // Tối
    };
    
    const handleSave = async () => {
        try {
            const response = await axiosClient.post('/itinerary/save', data); // 'data' là JSON AI vừa trả về
            if (response.data.success) {
                alert("🎉 Tuyệt vời! Lịch trình đã được lưu vào mục 'Chuyến đi của tôi'.");
                navigate('/profile'); // Chuyển về trang cá nhân để xem danh sách
            }
        } catch (error) {
            alert("Không thể lưu lịch trình lúc này.");
        }
    };
    
    if (loading) return (
        <div className="flex flex-col h-[70vh] items-center justify-center gap-4">
            <div className="size-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">AI đang vẽ lịch trình cho bạn...</p>
        </div>
    );

    if (!data) return <div className="text-center p-20 font-bold text-slate-400">Chưa có lịch trình nào được tạo.</div>;

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 mb-20 animate-in fade-in duration-1000">
            {/* --- HEADER CHUYẾN ĐI --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                <div>
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-blue-500 mb-4 transition-colors font-bold text-sm">
                        <ArrowLeft size={18} /> QUAY LẠI
                    </button>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-2 italic">
                        {data.tripTitle}
                    </h1>
                    <div className="flex items-center gap-4 text-slate-500">
                        <span className="flex items-center gap-1 font-bold uppercase text-xs tracking-widest bg-slate-100 px-3 py-1 rounded-lg text-slate-600">
                            <MapPin size={14} className="text-blue-500" /> {data.destination}
                        </span>
                        <span className="flex items-center gap-1 font-bold uppercase text-xs tracking-widest bg-green-50 px-3 py-1 rounded-lg text-green-600 border border-green-100">
                            <DollarSign size={14} /> Tổng chi phí: {new Intl.NumberFormat('vi-VN').format(data.totalEstimatedCost)}₫
                        </span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button className="p-4 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm"><Download size={20} /></button>
                    <button className="p-4 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm"><Share2 size={20} /></button>
                </div>
            </div>

            {/* --- NỘI DUNG CHÍNH (TIMELINE) --- */}
            <div className="space-y-16">
                {data.days.map((day: any) => (
                    <div key={day.day} className="relative">
                        {/* Nhãn Ngày */}
                        <div className="sticky top-24 z-10 mb-10">
                            <div className="inline-flex items-center gap-3 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-xl transform -rotate-2">
                                <Calendar size={20} className="text-blue-400" />
                                <span className="text-xl font-black uppercase tracking-tighter">Ngày {day.day}</span>
                            </div>
                        </div>

                        {/* Các hoạt động trong ngày */}
                        <div className="relative ml-6 pl-10 border-l-4 border-dashed border-slate-200 space-y-10">
                            {day.activities.map((act: any, idx: number) => (
                                <div key={idx} className="relative group">
                                    {/* Điểm nút Timeline */}
                                    <div className={`absolute -left-[58px] top-6 size-10 rounded-full border-4 border-white shadow-lg flex items-center justify-center transition-all duration-500 group-hover:scale-125 z-20 ${
                                        idx === 0 ? 'bg-orange-400' : idx === 1 ? 'bg-blue-500' : 'bg-indigo-600'
                                    } text-white`}>
                                        {getActivityIcon(idx)}
                                    </div>

                                    {/* Card Hoạt động */}
                                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 relative overflow-hidden group/card">
                                        {/* Hiệu ứng tia sáng trang trí */}
                                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                            <Sparkles className="text-blue-500/20 size-20 rotate-12" />
                                        </div>

                                        <div className="flex flex-col md:flex-row justify-between gap-6 relative z-10">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-50 px-2 py-0.5 rounded-md">
                                                        {idx === 0 ? 'Buổi Sáng' : idx === 1 ? 'Buổi Chiều' : 'Buổi Tối'}
                                                    </span>
                                                </div>
                                                <h3 className="text-2xl font-black text-slate-800 mb-3 leading-tight group-hover/card:text-blue-600 transition-colors">
                                                    {act.title}
                                                </h3>
                                                <p className="text-slate-500 font-medium leading-relaxed mb-6">
                                                    {act.description}
                                                </p>
                                                
                                                <div className="flex flex-wrap gap-4">
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                                        <MapPin size={14} className="text-red-400" /> {act.location}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                                        <Clock size={14} className="text-blue-400" /> {act.duration}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="shrink-0 flex md:flex-col justify-end items-end gap-2">
                                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Chi phí dự kiến</p>
                                                <div className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl font-black text-lg shadow-lg">
                                                    ~{new Intl.NumberFormat('vi-VN').format(act.estimatedCost)}₫
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* --- ACTION BOTTOM --- */}
            <div className="mt-20 p-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[4rem] text-center shadow-2xl relative overflow-hidden">
                <Map className="absolute -bottom-10 -left-10 size-64 text-white/5 -rotate-12" />
                <h3 className="text-3xl font-black text-white mb-4 relative z-10 uppercase tracking-tighter">Sẵn sàng lên đường?</h3>
                <p className="text-blue-100 mb-10 max-w-lg mx-auto font-medium relative z-10 leading-relaxed">
                    Mọi thứ đã được AI chuẩn bị sẵn sàng. Hãy lưu lại lịch trình này để làm hành trang cho chuyến đi sắp tới nhé!
                </p>
                <div className="flex flex-wrap justify-center gap-4 relative z-10">
                    <button 
                        onClick={handleSave}
                        className="px-10 py-4 bg-white text-blue-600 rounded-2xl font-black shadow-lg hover:scale-105 transition-all"
                    >
                        LƯU VÀO TÀI KHOẢN
                    </button>
                    <button className="px-10 py-4 bg-blue-500 text-white border-2 border-white/20 rounded-2xl font-black hover:bg-blue-400 transition-all active:scale-95">ĐẶT TOÀN BỘ DỊCH VỤ</button>
                </div>
            </div>
        </div>
    );
};

export default Timeline;