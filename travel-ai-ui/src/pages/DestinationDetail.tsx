import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Clock, Info, ArrowLeft, Settings2, Sparkles, Plus } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import SpotCard from '../components/SpotCard'; // Import component mới

const DestinationDetail: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    // Auth logic
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const isAdmin = user?.roleName?.toLowerCase() === 'admin';

    const [dest, setDest] = useState<any>(null);
    const [spots, setSpots] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const getImageUrl = (url: string) => {
        if (!url) return 'https://via.placeholder.com/800x400';
        return url.startsWith('http') ? url : `http://localhost:5134${url}`;
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [destRes, spotsRes] = await Promise.all([
                axiosClient.get(`/destinations/${id}`),
                axiosClient.get(`/spots/by-destination/${id}`)
            ]);
            setDest(destRes.data.data);
            setSpots(spotsRes.data.data);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    // Hàm xóa địa danh (Spot)
    const handleDeleteSpot = async (spotId: number) => {
        if (window.confirm("Bạn có chắc muốn xóa địa danh này không?")) {
            try {
                await axiosClient.delete(`/spots/${spotId}`);
                setSpots(prev => prev.filter(s => (s.id || s.spotId) !== spotId));
                alert("Đã xóa địa danh thành công!");
            } catch (err) {
                alert("Lỗi khi xóa địa danh.");
            }
        }
    };

    if (loading) return (
        <div className="flex h-[60vh] items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
    );

    if (!dest) return <div className="p-10 text-center font-bold">Không tìm thấy địa điểm.</div>;

    return (
        <div className="max-w-6xl mx-auto p-6 mb-20">
            <button onClick={() => navigate('/destinations')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 font-bold">
                <ArrowLeft size={20} /> Quay lại danh sách tỉnh
            </button>

            <div className="relative h-[450px] rounded-[40px] overflow-hidden shadow-2xl mb-10 border-8 border-white">
                <img src={getImageUrl(dest.imageUrl)} className="w-full h-full object-cover" alt={dest.name} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-12">
                    <h1 className="text-6xl font-black text-white tracking-tighter">{dest.name}</h1>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2">
                    <section className="mb-12">
                        <h2 className="text-2xl font-black text-slate-800 mb-4 flex items-center gap-2">
                            <Info className="text-blue-500" /> Giới thiệu về {dest.name}
                        </h2>
                        <p className="text-slate-600 leading-relaxed text-lg bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                            {dest.description}
                        </p>
                    </section>

                    <section>
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                                <MapPin className="text-red-500" /> Địa danh tham quan
                            </h2>
                            
                            {/* NÚT THÊM ĐỊA DANH CHO ADMIN */}
                            {isAdmin && (
                                <button 
                                    onClick={() => navigate(`/admin/spots/add?destinationId=${id}`)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1 shadow-lg shadow-blue-200 transition-all active:scale-95"
                                >
                                    <Plus size={18} /> Thêm địa danh
                                </button>
                            )}
                        </div>

                        {spots.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {spots.slice(0, 4).map((spot) => (
                                    <SpotCard 
                                        key={spot.id || spot.spotId} 
                                        spot={spot} 
                                        isAdmin={isAdmin} 
                                        onDelete={handleDeleteSpot} 
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="p-10 bg-slate-50 rounded-[40px] text-center text-slate-400 italic border-2 border-dashed border-slate-200">
                                Dữ liệu địa danh đang được cập nhật...
                            </div>
                        )}
                        
                        {spots.length > 4 && (
                            <div className="mt-10 text-center">
                                <button onClick={() => navigate(`/destinations/${id}/spots`)} className="px-10 py-4 bg-white border-2 border-slate-900 text-slate-900 rounded-2xl font-black hover:bg-slate-900 hover:text-white transition-all shadow-lg">
                                    Xem tất cả {spots.length} địa danh →
                                </button>
                            </div>
                        )}
                    </section>
                </div>

                <div className="space-y-6">
                    <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden group">
                        <Sparkles className="absolute -top-4 -right-4 size-24 text-white/10 group-hover:rotate-12 transition-transform" />
                        <h3 className="text-2xl font-black mb-4 relative z-10">Lên kế hoạch thông minh?</h3>
                        <p className="text-slate-400 text-sm mb-8 leading-relaxed relative z-10">Để AI thiết kế lịch trình tối ưu nhất cho chuyến đi {dest.name} của bạn.</p>
                        <button className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 relative z-10">
                             Bắt đầu ngay
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DestinationDetail;