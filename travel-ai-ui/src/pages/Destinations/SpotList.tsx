import React, { useEffect, useState } from 'react';
// import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Search, MapPin, ArrowLeft, Plus } from 'lucide-react'; // Thêm Plus vào đây
import { useNavigate, useParams, Link } from 'react-router-dom';

interface TouristSpot {
    id: number;
    name: string;
    description: string | null;
    imageUrl: string | null;
    location: string | null;
    destinationId: number;
}

const SpotList: React.FC = () => {
    const { id } = useParams<{ id: string }>(); 
    const [spots, setSpots] = useState<TouristSpot[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>(''); // Thêm state cho ô tìm kiếm
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate(); // Khởi tạo hàm navigate
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user?.roleName?.toLowerCase() === 'admin';
    console.log("USER:", user);
console.log("isAdmin:", isAdmin);

    const API_BASE_URL ='http://localhost:5134';

    useEffect(() => {
        const fetchSpots = async () => {
            if (!id) return;
            setLoading(true);
            setError(null); // Reset lỗi mỗi lần tìm kiếm mới
            
            try {
                // Sử dụng endpoint /api/spots tích hợp Query mới
                const response = await axios.get(`${API_BASE_URL}/api/spots`, {
                    params: {
                        destinationId: id,
                        searchTerm: searchTerm
                    }
                });
                
                if (response.data) {
    // nếu API trả array
    if (Array.isArray(response.data)) {
        setSpots(response.data);
    } 
    // nếu API trả object { success, data }
    else if (response.data.success) {
        setSpots(response.data.data);
    }
}
            } catch (err) {
                console.error("Lỗi khi lấy dữ liệu:", err);
                setError('Không thể kết nối với máy chủ hoặc không tìm thấy địa danh.');
            } finally {
                setLoading(false);
            }
        };

        // Cơ chế Debounce: Đợi người dùng dừng gõ 500ms mới gọi API
        const delayDebounceFn = setTimeout(() => {
            fetchSpots();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [id, searchTerm]); // Chạy lại khi ID tỉnh hoặc Từ khóa thay đổi

    // Giao diện hiển thị lỗi
    if (error && spots.length === 0 && !loading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen bg-slate-50">
                <div className="text-6xl mb-4">⚠️</div>
                <h2 className="text-2xl font-bold text-slate-800">{error}</h2>
                <button 
                    onClick={() => window.location.reload()}
                    className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold"
                >
                    Thử lại
                </button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-6 py-10 min-h-screen bg-slate-50">
            {/* Thanh điều hướng */}
            <div className="mb-8">
                <Link to="/" className="text-slate-600 hover:text-blue-600 font-bold flex items-center gap-2 transition-colors">
                    <ArrowLeft size={20} /> Quay lại Trang chủ
                </Link>
            </div>

            {/* Tiêu đề & Ô tìm kiếm */}
            <div className="mb-12 text-center">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-6">
                    Địa Danh Tham Quan
                </h1>
                
                {/* Search Box */}
                <div className="max-w-xl mx-auto relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search size={20} className="text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Tìm kiếm địa danh tại đây..."
                        className="block w-full pl-12 pr-4 py-4 bg-white border-none rounded-2xl shadow-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Nút thêm địa danh mới - Chỉ hiện cho Admin */}
{isAdmin && (
    <div className="flex justify-end mb-6">
        <button 
            onClick={() => navigate(`/admin/spots/add?destinationId=${id}`)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 shadow-lg transition-all"
        >
            <Plus size={20} /> Thêm địa danh mới
        </button>
    </div>
)}

            {/* Trạng thái Loading */}
            {loading ? (
                <div className="flex flex-col justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-slate-500 font-medium">Đang tìm kiếm địa danh...</p>
                </div>
            ) : spots.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
                    <div className="text-6xl mb-6">🔍</div>
                    <h3 className="text-xl font-bold text-slate-800">Không tìm thấy địa danh nào!</h3>
                    <p className="text-slate-500 mt-2">Hãy thử thay đổi từ khóa tìm kiếm của bạn.</p>
                </div>
            ) : (
                /* Danh sách địa danh */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {spots.map((spot) => (
                        <div 
                            key={spot.id} 
                            className="group bg-white rounded-3xl shadow-md overflow-hidden flex flex-col hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
                        >
                            <div className="relative h-56 overflow-hidden">
                                <img 
                                    src={spot.imageUrl ? `${API_BASE_URL}${spot.imageUrl}` : 'https://via.placeholder.com/400x300?text=No+Image'} 
                                    alt={spot.name} 
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                            </div>
                            
                            <div className="p-6 flex-grow flex flex-col">
                                <div className="flex items-center gap-1 text-blue-500 text-[10px] font-bold uppercase tracking-widest mb-2">
                                    <MapPin size={12} /> {spot.location || 'Vietnam'}
                                </div>
                                
                                <h3 className="text-xl font-black text-slate-800 line-clamp-1 mb-2 group-hover:text-blue-600 transition-colors">
                                    {spot.name}
                                </h3>
                                
                                <p className="text-slate-500 text-sm line-clamp-3 leading-relaxed mb-6">
                                    {spot.description || 'Khám phá vẻ đẹp tiềm ẩn của địa danh này cùng TravelAI.'}
                                </p>

                                <div className="mt-auto">
                                    <button className="w-full py-3 bg-slate-900 text-white text-center rounded-2xl font-bold text-sm hover:bg-blue-600 transition-all shadow-md active:scale-[0.98]">
                                        Tìm hiểu thêm
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SpotList;