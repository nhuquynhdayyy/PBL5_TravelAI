import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Clock, ArrowLeft, Loader2, Compass } from 'lucide-react';
import axiosClient from '../../api/axiosClient';

const SpotList: React.FC = () => {
    const { id } = useParams(); 
    const navigate = useNavigate();
    
    const [spots, setSpots] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [destinationName, setDestinationName] = useState("");

    const getImageUrl = (url: string) => {
        if (!url) return 'https://via.placeholder.com/400x250';
        return url.startsWith('http') ? url : `http://localhost:5134${url}`;
    };

    useEffect(() => {
        const fetchSpots = async () => {
            try {
                setLoading(true);
                // Lấy song song danh sách spots và tên tỉnh
                const [spotsRes, destRes] = await Promise.all([
                    axiosClient.get(`/spots/by-destination/${id}`),
                    axiosClient.get(`/destinations/${id}`)
                ]);
                setSpots(spotsRes.data.data);
                setDestinationName(destRes.data.data.name);
            } catch (err) {
                console.error("Lỗi lấy dữ liệu:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSpots();
    }, [id]);

    if (loading) return (
        <div className="flex flex-col h-[60vh] items-center justify-center gap-4">
            <Loader2 className="animate-spin text-blue-500" size={48} />
            <p className="text-slate-500 font-medium animate-pulse text-sm">Đang nạp kho dữ liệu địa danh...</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 mb-20">
            {/* Header điều hướng */}
            <div className="mb-12">
                <button 
                    onClick={() => navigate(`/destinations/${id}`)}
                    className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors mb-6 font-bold text-sm bg-slate-100 w-fit px-4 py-2 rounded-xl"
                >
                    <ArrowLeft size={18} /> Quay lại thông tin chung {destinationName}
                </button>
                
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-slate-900 text-white rounded-3xl shadow-xl">
                        <Compass size={40} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight leading-none">
                            Tất cả địa danh tại {destinationName}
                        </h1>
                        <p className="text-slate-500 font-medium mt-2">Tổng cộng có {spots.length} điểm đến thú vị đang chờ bạn</p>
                    </div>
                </div>
            </div>

            {/* Grid danh sách đầy đủ */}
            {spots.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {spots.map((spot) => (
                        <div key={spot.id || spot.spotId} className="group bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden hover:shadow-2xl transition-all duration-500 flex flex-col h-full border-b-4 border-b-slate-100 hover:border-b-blue-500">
                            <div className="relative h-60 overflow-hidden">
                                <img 
                                    src={getImageUrl(spot.imageUrl)} 
                                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" 
                                    alt={spot.name} 
                                />
                                <div className="absolute top-4 left-4">
                                    <span className="bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black text-slate-900 uppercase shadow-lg border border-slate-100">
                                        Tourist Spot
                                    </span>
                                </div>
                            </div>

                            <div className="p-8 flex flex-col flex-grow">
                                <h3 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-blue-600 transition-colors">
                                    {spot.name}
                                </h3>
                                <p className="text-slate-500 text-sm leading-relaxed mb-8">
                                    {spot.description}
                                </p>
                                
                                <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    <span className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl">
                                        <Clock size={16} className="text-blue-500"/> {spot.avgTimeSpent} PHÚT
                                    </span>
                                    <span className="flex items-center gap-2 text-blue-500 cursor-pointer hover:bg-blue-50 px-4 py-2 rounded-xl transition-all">
                                        <MapPin size={16}/> BẢN ĐỒ
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-32 bg-slate-50 rounded-[60px] border-4 border-dashed border-slate-200">
                    <p className="text-slate-400 font-black italic text-2xl uppercase tracking-widest">Coming Soon...</p>
                    <p className="text-slate-400 mt-2">Chúng tôi đang cập nhật thêm dữ liệu cho {destinationName}</p>
                </div>
            )}
        </div>
    );
};

export default SpotList;