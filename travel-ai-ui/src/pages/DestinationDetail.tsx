// // src/pages/DestinationDetail.tsx
// import React, { useEffect, useState } from 'react';
// import { useParams } from 'react-router-dom';
// import axiosClient from '../api/axiosClient'; // Dùng axiosClient cho đồng bộ port

// const DestinationDetail: React.FC = () => {
//     const { id } = useParams(); // Lấy ID từ URL
//     const [dest, setDest] = useState<any>(null);

//     const getFullImageUrl = (url: string) => {
//         if (!url) return 'https://via.placeholder.com/800x400';
//         // Nếu là link web (unsplash) thì giữ nguyên, nếu là path local thì thêm localhost:5134
//         return url.startsWith('http') ? url : `http://localhost:5134${url}`;
//     };

//     useEffect(() => {
//         const fetchDetail = async () => {
//             try {
//                 // Gọi API lấy chi tiết: /api/destinations/1
//                 const response = await axiosClient.get(`/destinations/${id}`);
//                 setDest(response.data.data);
//             } catch (error) {
//                 console.error("Lỗi lấy chi tiết:", error);
//             }
//         };
//         fetchDetail();
//     }, [id]);

//     if (!dest) return <div className="text-center p-10">Đang tải chi tiết điểm đến...</div>;

//     return (
//         <div className="max-w-4xl mx-auto p-6 bg-white rounded-3xl shadow-2xl mt-10 mb-20 border border-slate-50">
//             {/* ✅ CẬP NHẬT: Sử dụng hàm getFullImageUrl ở đây */}
//             <img 
//                 src={getFullImageUrl(dest.imageUrl)} 
//                 className="w-full h-[450px] object-cover rounded-2xl shadow-lg" 
//                 alt={dest.name} 
//             />
            
//             <div className="mt-8">
//                 <h1 className="text-5xl font-black text-slate-900 tracking-tight">
//                     {dest.name}
//                 </h1>
//                 <div className="w-20 h-1.5 bg-blue-500 mt-4 rounded-full"></div>
                
//                 <p className="mt-8 text-xl text-slate-600 leading-relaxed font-medium">
//                     {dest.description}
//                 </p>
//             </div>
//         </div>
//     );
// };

// export default DestinationDetail;

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Clock, Info } from 'lucide-react'; // Thêm icon cho đẹp
import axiosClient from '../api/axiosClient';

const DestinationDetail: React.FC = () => {
    const { id } = useParams();
    const [dest, setDest] = useState<any>(null);
    const [spots, setSpots] = useState<any[]>([]); // State lưu danh sách spots
    const [loadingSpots, setLoadingSpots] = useState(true);

    const getImageUrl = (url: string) => {
        if (!url) return 'https://via.placeholder.com/400x250';
        return url.startsWith('http') ? url : `http://localhost:5134${url}`;
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Lấy chi tiết Destination
                const destRes = await axiosClient.get(`/destinations/${id}`);
                setDest(destRes.data.data);

                // 2. Lấy danh sách Spots của Destination đó
                setLoadingSpots(true);
                const spotsRes = await axiosClient.get(`/spots/by-destination/${id}`);
                setSpots(spotsRes.data.data);
            } catch (error) {
                console.error("Lỗi lấy dữ liệu:", error);
            } finally {
                setLoadingSpots(false);
            }
        };
        fetchData();
    }, [id]);

    if (!dest) return <div className="p-10 text-center">Loading...</div>;

    return (
        <div className="max-w-6xl mx-auto p-6 mb-20">
            {/* Banner Destination */}
            <div className="relative h-[400px] rounded-3xl overflow-hidden shadow-2xl mb-10">
                <img src={getImageUrl(dest.imageUrl)} className="w-full h-full object-cover" alt={dest.name} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-10">
                    <h1 className="text-5xl font-black text-white">{dest.name}</h1>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Cột trái: Mô tả */}
                <div className="lg:col-span-2">
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                        <Info className="text-blue-500" /> Giới thiệu
                    </h2>
                    <p className="text-slate-600 leading-relaxed text-lg mb-10">{dest.description}</p>

                    {/* DANH SÁCH TOURIST SPOTS */}
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <MapPin className="text-red-500" /> Địa danh tham quan nổi bật
                    </h2>

                    {loadingSpots ? (
                        <div className="animate-pulse flex gap-4">
                            <div className="bg-slate-200 h-40 w-full rounded-2xl"></div>
                        </div>
                    ) : spots.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {spots.map((spot) => (
                                <div key={spot.spotId} className="group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-all">
                                    <div className="h-40 overflow-hidden">
                                        <img src={getImageUrl(spot.imageUrl)} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={spot.name} />
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-bold text-lg text-slate-800">{spot.name}</h3>
                                        <p className="text-slate-500 text-xs mt-1 line-clamp-2">{spot.description}</p>
                                        <div className="mt-3 flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase">
                                            <span className="flex items-center gap-1"><Clock size={12}/> {spot.avgTimeSpent} min</span>
                                            <span className="flex items-center gap-1"><MapPin size={12}/> View on map</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-10 bg-slate-50 rounded-2xl text-center text-slate-400 italic">
                            Chưa có dữ liệu địa danh tham quan.
                        </div>
                    )}
                </div>

                {/* Cột phải: Sidebar (Có thể để thời tiết, hoặc nút AI Planner sau này) */}
                <div className="bg-blue-50 p-6 rounded-3xl h-fit border border-blue-100">
                    <h3 className="font-bold text-blue-800 mb-2">Bạn đang lên kế hoạch?</h3>
                    <p className="text-sm text-blue-600 mb-4">Sử dụng AI để tạo lịch trình tối ưu đi qua các địa danh này.</p>
                    <button className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200">
                        Tạo lịch trình bằng AI
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DestinationDetail;