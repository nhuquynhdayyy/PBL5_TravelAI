import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Clock, Info, ArrowLeft, Settings2, Sparkles } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import MainLayout from '../layouts/MainLayout';

const DestinationDetail: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [dest, setDest] = useState<any>(null);
    const [spots, setSpots] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const getImageUrl = (url: string) => {
        if (!url) return 'https://via.placeholder.com/800x400';
        return url.startsWith('http') ? url : `http://localhost:5134${url}`;
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Gọi song song 2 API để tối ưu tốc độ
                const [destRes, spotsRes] = await Promise.all([
                    axiosClient.get(`/destinations/${id}`),
                    axiosClient.get(`/spots/by-destination/${id}`)
                ]);
                setDest(destRes.data.data);
                setSpots(spotsRes.data.data);
            } catch (error) {
                console.error("Lỗi lấy dữ liệu:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) return (
        <div className="flex h-[60vh] items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
    );

    if (!dest) return <div className="p-10 text-center font-bold">Không tìm thấy thông tin địa điểm này.</div>;

    return (
        <div className="max-w-6xl mx-auto p-6 mb-20">
            {/* Nút quay lại trang danh sách tỉnh */}
            <button 
                onClick={() => navigate('/destinations')}
                className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 transition-colors font-bold"
            >
                <ArrowLeft size={20} /> Quay lại danh sách tỉnh
            </button>

            {/* Banner Destination */}
            <div className="relative h-[450px] rounded-[40px] overflow-hidden shadow-2xl mb-10 border-8 border-white">
                <img src={getImageUrl(dest.imageUrl)} className="w-full h-full object-cover" alt={dest.name} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-12">
                    <div>
                        <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-4 inline-block">Featured Destination</span>
                        <h1 className="text-6xl font-black text-white tracking-tighter">{dest.name}</h1>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Cột trái: Nội dung chính */}
                <div className="lg:col-span-2">
                    <section className="mb-12">
                        <h2 className="text-2xl font-black text-slate-800 mb-4 flex items-center gap-2">
                            <Info className="text-blue-500" /> Giới thiệu về {dest.name}
                        </h2>
                        <p className="text-slate-600 leading-relaxed text-lg bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                            {dest.description}
                        </p>
                    </section>

                    {/* DANH SÁCH TOURIST SPOTS (PREVIEW 4 CÁI) */}
                    <section>
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                                <MapPin className="text-red-500" /> Địa danh tham quan tiêu biểu
                            </h2>
                        </div>

                        {spots.length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {spots.slice(0, 4).map((spot) => (
                                        <div key={spot.id || spot.spotId} className="group bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col">
                                            <div className="h-44 overflow-hidden relative">
                                                <img src={getImageUrl(spot.imageUrl)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={spot.name} />
                                            </div>
                                            <div className="p-5 flex-grow">
                                                <h3 className="font-bold text-lg text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">{spot.name}</h3>
                                                <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">{spot.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {spots.length > 4 && (
                                    <div className="mt-10 text-center">
                                        <button 
                                            onClick={() => navigate(`/destinations/${id}/spots`)}
                                            className="px-10 py-4 bg-white border-2 border-slate-900 text-slate-900 rounded-2xl font-black hover:bg-slate-900 hover:text-white transition-all shadow-lg active:scale-95"
                                        >
                                            Xem tất cả {spots.length} địa danh tại {dest.name} →
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="p-10 bg-slate-50 rounded-[40px] text-center text-slate-400 italic border-2 border-dashed border-slate-200">
                                Dữ liệu địa danh đang được cập nhật...
                            </div>
                        )}
                    </section>
                </div>

                {/* Cột phải: Sidebar AI Planner */}
                <div className="space-y-6">
                    <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden group">
                        <Sparkles className="absolute -top-4 -right-4 size-24 text-white/10 group-hover:rotate-12 transition-transform" />
                        <h3 className="text-2xl font-black mb-4 relative z-10">Lên kế hoạch thông minh?</h3>
                        <p className="text-slate-400 text-sm mb-8 leading-relaxed relative z-10">
                            Để AI của TravelAI thiết kế lịch trình tối ưu nhất cho chuyến đi {dest.name} của bạn.
                        </p>
                        <button className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 active:scale-95 relative z-10">
                             Bắt đầu ngay
                        </button>
                    </div>

                    <div className="bg-blue-50 p-6 rounded-[32px] border border-blue-100 flex items-center gap-4">
                        <div className="p-3 bg-white rounded-2xl text-blue-500 shadow-sm"><Settings2 size={24}/></div>
                        <div>
                            <p className="text-xs font-black text-blue-800 uppercase tracking-tighter">Cá nhân hoá</p>
                            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Dựa trên sở thích của bạn</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DestinationDetail;