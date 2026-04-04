import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import MainLayout from '../layouts/MainLayout';
import { ArrowLeft, MapPin, Star, Hotel, Compass, Info, CheckCircle2, Waves, Wifi, Utensils, Loader2 } from 'lucide-react';

const ServiceDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [service, setService] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeImg, setActiveImg] = useState(0);

    const API_URL = 'http://localhost:5134';

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                setLoading(true);
                const res = await axiosClient.get(`/services/${id}`);
                setService(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id]);

    if (loading) return (
        <div className="flex h-[60vh] items-center justify-center">
            <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
    );

    if (!service) return <div className="text-center p-20 font-bold">Không tìm thấy dịch vụ.</div>;

    const isHotel = service.serviceType === "Hotel";

    return (
        <MainLayout>
            <div className="max-w-6xl mx-auto px-4 mb-20 animate-in fade-in duration-500">
                {/* Back Button */}
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-8 font-bold transition-all">
                    <ArrowLeft size={20} /> Quay lại danh sách
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* LEFT: Image Gallery */}
                    <div className="space-y-4">
                        <div className="h-[450px] rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white">
                            <img 
                                src={`${API_URL}${service.imageUrls[activeImg] || '/uploads/placeholder.jpg'}`} 
                                className="w-full h-full object-cover" 
                                alt={service.name} 
                            />
                        </div>
                        <div className="flex gap-4 overflow-x-auto py-2">
                            {service.imageUrls?.map((img: string, index: number) => (
                                <img 
                                    key={index}
                                    src={`${API_URL}${img}`}
                                    onClick={() => setActiveImg(index)}
                                    className={`h-20 w-28 rounded-2xl object-cover cursor-pointer transition-all border-4 ${activeImg === index ? 'border-blue-500 scale-105' : 'border-transparent opacity-60'}`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* RIGHT: Info Content */}
                    <div className="space-y-8 text-left">
                        <div>
                            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white mb-4 ${isHotel ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                                {isHotel ? <Hotel size={14} /> : <Compass size={14} />}
                                {isHotel ? "Khách sạn" : "Tour du lịch"}
                            </div>
                            <h1 className="text-5xl font-black text-slate-900 leading-tight mb-4 tracking-tighter">
                                {service.name}
                            </h1>
                            <div className="flex items-center gap-4 text-slate-500 font-bold">
                                <div className="flex items-center gap-1.5"><MapPin size={18} className="text-red-500"/> {service.spotName || "Nhiều địa điểm"}</div>
                                <div className="flex items-center gap-1.5"><Star size={18} className="text-orange-400 fill-orange-400"/> {service.ratingAvg || 5.0} Đánh giá</div>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white flex justify-between items-center shadow-xl shadow-blue-100">
                            <div>
                                <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Giá cơ bản từ</p>
                                <p className="text-3xl font-black">{new Intl.NumberFormat('vi-VN').format(service.basePrice)}₫</p>
                            </div>
                            <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black transition-all active:scale-95 shadow-lg shadow-blue-500/20">
                                ĐẶT NGAY
                            </button>
                        </div>

                        {/* Amenities */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 bg-white border border-slate-100 rounded-3xl flex flex-col items-center gap-2">
                                <Wifi className="text-blue-500" />
                                <span className="text-[10px] font-black text-slate-400 uppercase">Wifi miễn phí</span>
                            </div>
                            <div className="p-4 bg-white border border-slate-100 rounded-3xl flex flex-col items-center gap-2">
                                <Waves className="text-blue-500" />
                                <span className="text-[10px] font-black text-slate-400 uppercase">Hồ bơi</span>
                            </div>
                            <div className="p-4 bg-white border border-slate-100 rounded-3xl flex flex-col items-center gap-2">
                                <Utensils className="text-blue-500" />
                                <span className="text-[10px] font-black text-slate-400 uppercase">Ăn sáng</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Description Section */}
                <div className="mt-16 text-left">
                    <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                        <Info className="text-blue-600" /> Thông tin chi tiết
                    </h2>
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-50 shadow-sm leading-relaxed text-slate-600 text-lg whitespace-pre-line">
                        {service.description || "Dữ liệu mô tả đang được cập nhật..."}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default ServiceDetail;