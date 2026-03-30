import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Clock, ArrowLeft, Loader2, Info, Calendar } from 'lucide-react';
import axiosClient from '../api/axiosClient';

const SpotDetail: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [spot, setSpot] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const getImageUrl = (url: string) => {
        if (!url) return 'https://via.placeholder.com/800x450';
        return url.startsWith('http') ? url : `http://localhost:5134${url}`;
    };

    useEffect(() => {
        const fetchSpot = async () => {
            try {
                setLoading(true);
                const res = await axiosClient.get(`/spots/${id}`);
                setSpot(res.data.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchSpot();
    }, [id]);

    if (loading) return (
        <div className="flex h-[60vh] items-center justify-center">
            <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
    );

    if (!spot) return <div className="text-center p-20 font-bold text-slate-500">Không tìm thấy địa danh này.</div>;

    return (
        <div className="max-w-4xl mx-auto p-6 mb-20 animate-in fade-in duration-500">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 font-bold">
                <ArrowLeft size={20} /> Quay lại
            </button>

            <div className="relative h-[400px] rounded-[40px] overflow-hidden shadow-2xl mb-10 border-4 border-white">
                <img src={getImageUrl(spot.imageUrl)} className="w-full h-full object-cover" alt={spot.name} />
                <div className="absolute top-6 left-6 bg-white/90 backdrop-blur px-4 py-2 rounded-2xl font-black text-blue-600 text-xs shadow-lg uppercase tracking-widest">
                    Tourist Spot
                </div>
            </div>

            <div className="space-y-8">
                <div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-4">{spot.name}</h1>
                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-bold text-sm">
                            <Clock size={18} /> {spot.avgTimeSpent} phút tham quan
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl font-bold text-sm">
                            <Calendar size={18} /> {spot.openingHours || "Mở cửa cả ngày"}
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                    <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Info className="text-blue-500" /> Giới thiệu địa danh
                    </h2>
                    <p className="text-slate-600 leading-relaxed text-lg whitespace-pre-line">
                        {spot.description}
                    </p>
                </div>

                {/* Phần Map mô phỏng */}
                <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            <MapPin className="text-red-500" /> Vị trí trên bản đồ
                        </h3>
                        <span className="text-xs text-slate-400 font-mono">{spot.latitude}, {spot.longitude}</span>
                    </div>
                    <div className="h-48 bg-slate-200 rounded-2xl flex items-center justify-center text-slate-400 font-bold italic">
                        [ Google Maps API Placeholder ]
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SpotDetail;