import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    MapPin, Search, Filter, ChevronDown, ArrowLeft,
    Grid3X3, List, X, Compass, SlidersHorizontal
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import SpotCard from '../../components/SpotCard';

const SpotList: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const isAdmin = user?.roleName?.toLowerCase() === 'admin';

    // State
    const [allSpots, setAllSpots] = useState<any[]>([]); // Danh sách hiển thị hiện tại
    const [masterSpots, setMasterSpots] = useState<any[]>([]); // Danh sách tất cả để tính số lượng
    const [destinations, setDestinations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Filter state – sync with URL params
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [selectedDestId, setSelectedDestId] = useState<string>(searchParams.get('dest') || 'all');

    // 1. Tính toán số lượng địa danh cho mỗi tỉnh thành (Master data)
    const spotCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        masterSpots.forEach(spot => {
            // Kiểm tra các field ID có thể có từ API của bạn
            const dId = String(spot.destinationId || spot.idDestination || spot.destination?.id);
            if (dId) {
                counts[dId] = (counts[dId] || 0) + 1;
            }
        });
        return counts;
    }, [masterSpots]);

    // Fetch dữ liệu ban đầu
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setLoading(true);
                // Fetch danh mục tỉnh thành
                const destsRes = await axiosClient.get('/destinations');
                const dests = destsRes.data.data || [];
                setDestinations(dests);

                // Fetch TOÀN BỘ địa danh để có số liệu đếm (Master List)
                let allData: any[] = [];
                try {
                    const res = await axiosClient.get('/spots');
                    allData = res.data.data || [];
                } catch {
                    // Fallback nếu server không hỗ trợ lấy tất cả
                    const results = await Promise.all(
                        dests.map((d: any) =>
                            axiosClient.get(`/spots/by-destination/${d.id || d.destinationId}`)
                                .then(r => r.data.data || [])
                                .catch(() => [])
                        )
                    );
                    allData = results.flat();
                }
                setMasterSpots(allData);

                // Xử lý hiển thị ban đầu dựa trên URL
                const destParam = searchParams.get('dest');
                if (destParam && destParam !== 'all') {
                    const res = await axiosClient.get(`/spots/by-destination/${destParam}`);
                    setAllSpots(res.data.data || []);
                    setSelectedDestId(destParam);
                } else {
                    setAllSpots(allData);
                }
            } catch (err) {
                console.error('Error fetching data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    // Hàm đổi tỉnh thành
    const handleDestChange = async (destId: string) => {
        setSelectedDestId(destId);
        setIsFilterOpen(false);
        setLoading(true);

        // Cập nhật URL
        const newParams = new URLSearchParams(searchParams);
        if (destId === 'all') {
            newParams.delete('dest');
        } else {
            newParams.set('dest', destId);
        }
        setSearchParams(newParams);

        try {
            if (destId === 'all') {
                setAllSpots(masterSpots);
            } else {
                const res = await axiosClient.get(`/spots/by-destination/${destId}`);
                setAllSpots(res.data.data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Filter spots theo search bar
    const filteredSpots = useMemo(() => {
        if (!searchQuery.trim()) return allSpots;
        const q = searchQuery.toLowerCase().trim();
        return allSpots.filter(spot =>
            (spot.name || spot.spotName || '').toLowerCase().includes(q) ||
            (spot.description || '').toLowerCase().includes(q) ||
            (spot.location || spot.address || '').toLowerCase().includes(q)
        );
    }, [allSpots, searchQuery]);

    const handleDeleteSpot = async (spotId: number) => {
        if (window.confirm('Bạn có chắc muốn xóa địa danh này không?')) {
            try {
                await axiosClient.delete(`/spots/${spotId}`);
                setAllSpots(prev => prev.filter(s => (s.id || s.spotId) !== spotId));
                setMasterSpots(prev => prev.filter(s => (s.id || s.spotId) !== spotId));
                alert('Đã xóa địa danh thành công!');
            } catch {
                alert('Lỗi khi xóa địa danh.');
            }
        }
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedDestId('all');
        setSearchParams({});
        setAllSpots(masterSpots);
    };

    const hasActiveFilters = searchQuery || selectedDestId !== 'all';

    const selectedDestName = selectedDestId === 'all'
        ? 'Tất cả tỉnh/thành'
        : destinations.find(d => String(d.id || d.destinationId) === selectedDestId)?.name || 'Chọn tỉnh/thành';

    return (
        <div className="min-h-screen bg-slate-50">
            {/* ====== HERO HEADER ====== */}
            <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 text-white px-6 pt-10 pb-16 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl pointer-events-none" />

                <div className="max-w-6xl mx-auto relative z-10">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-white/60 hover:text-white mb-8 font-semibold transition-colors text-sm"
                    >
                        <ArrowLeft size={18} /> Quay lại
                    </button>

                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 bg-white/10 backdrop-blur rounded-2xl">
                            <Compass size={28} className="text-cyan-300" />
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black tracking-tight">Khám phá Địa Danh</h1>
                    </div>
                    <p className="text-white/60 text-lg font-medium ml-1">
                        Tổng hợp các địa danh nổi tiếng trên khắp Việt Nam
                    </p>

                    <div className="flex gap-6 mt-8">
                        <div className="bg-white/10 backdrop-blur px-5 py-3 rounded-2xl">
                            <p className="text-2xl font-black text-white">{masterSpots.length}</p>
                            <p className="text-white/60 text-xs font-medium mt-0.5">Tổng địa danh</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur px-5 py-3 rounded-2xl">
                            <p className="text-2xl font-black text-white">{destinations.length}</p>
                            <p className="text-white/60 text-xs font-medium mt-0.5">Tỉnh / Thành phố</p>
                        </div>
                        {hasActiveFilters && (
                            <div className="bg-blue-500/30 backdrop-blur px-5 py-3 rounded-2xl border border-blue-400/30 animate-in fade-in zoom-in duration-300">
                                <p className="text-2xl font-black text-cyan-300">{filteredSpots.length}</p>
                                <p className="text-white/60 text-xs font-medium mt-0.5">Kết quả lọc</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ====== SEARCH & FILTER BAR ====== */}
            <div className="max-w-6xl mx-auto px-6 -mt-6 relative z-30">
                <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200 border border-slate-100 p-4 flex flex-col sm:flex-row gap-3 items-stretch">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => {
                                setSearchQuery(e.target.value);
                                setSearchParams(prev => {
                                    const p = new URLSearchParams(prev);
                                    if (e.target.value) p.set('q', e.target.value);
                                    else p.delete('q');
                                    return p;
                                });
                            }}
                            placeholder="Tìm kiếm địa danh, tỉnh thành, mô tả..."
                            className="w-full pl-11 pr-10 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-700 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-400 focus:bg-white transition-all text-sm"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Destination Dropdown */}
                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsFilterOpen(!isFilterOpen);
                            }}
                            className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl border-2 font-semibold text-sm transition-all whitespace-nowrap min-w-[220px] justify-between ${isFilterOpen || selectedDestId !== 'all'
                                ? 'border-blue-400 bg-blue-50 text-blue-700'
                                : 'border-slate-100 bg-slate-50 text-slate-700 hover:border-blue-300'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <MapPin size={16} className={selectedDestId !== 'all' ? 'text-blue-500' : 'text-slate-400'} />
                                <span className="truncate max-w-[140px]">{selectedDestName}</span>
                            </span>
                            <ChevronDown size={16} className={`transition-transform text-slate-400 ${isFilterOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isFilterOpen && (
                            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="p-3">
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-wider px-2 mb-2">Lọc theo tỉnh/thành</p>
                                    <div className="max-h-72 overflow-y-auto space-y-0.5 custom-scrollbar">
                                        <button
                                            onClick={() => handleDestChange('all')}
                                            className={`w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-between ${selectedDestId === 'all' ? 'bg-blue-500 text-white' : 'hover:bg-slate-50 text-slate-700'}`}
                                        >
                                            <span className="flex items-center gap-2">🗺️ Tất cả tỉnh/thành</span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${selectedDestId === 'all' ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                                                {masterSpots.length}
                                            </span>
                                        </button>
                                        {destinations.map(d => {
                                            const dId = String(d.id || d.destinationId);
                                            const count = spotCounts[dId] || 0;
                                            return (
                                                <button
                                                    key={dId}
                                                    onClick={() => handleDestChange(dId)} // Đã thêm onClick
                                                    className={`w-full text-left px-4 py-2.5 rounded-xl font-medium text-sm transition-colors flex items-center justify-between ${selectedDestId === dId ? 'bg-blue-500 text-white' : 'hover:bg-slate-50 text-slate-600'}`}
                                                >
                                                    <span className="flex items-center gap-2 truncate mr-2">📍 {d.name}</span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${selectedDestId === dId ? 'bg-white/20' : 'bg-slate-100 text-slate-400'}`}>
                                                        {count}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Grid3X3 size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ====== MAIN CONTENT ====== */}
            <div className="max-w-6xl mx-auto px-6 py-8 relative z-10">
                {/* Active filter tags */}
                {hasActiveFilters && (
                    <div className="flex flex-wrap items-center gap-2 mb-6">
                        <span className="text-sm font-semibold text-slate-500 flex items-center gap-1.5">
                            <SlidersHorizontal size={14} /> Đang lọc:
                        </span>

                        {searchQuery && (
                            <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-xl text-sm font-semibold">
                                🔍 "{searchQuery}"
                                <button onClick={() => setSearchQuery('')} className="hover:text-blue-900 transition-colors ml-0.5">
                                    <X size={13} />
                                </button>
                            </span>
                        )}

                        {selectedDestId !== 'all' && (
                            <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl text-sm font-semibold">
                                📍 {selectedDestName}
                                <button onClick={() => handleDestChange('all')} className="hover:text-emerald-900 transition-colors ml-0.5">
                                    <X size={13} />
                                </button>
                            </span>
                        )}

                        <button
                            onClick={clearFilters}
                            className="ml-2 text-slate-400 hover:text-red-500 text-sm font-semibold underline underline-offset-2 transition-colors"
                        >
                            Xóa tất cả
                        </button>

                        <span className="ml-auto text-sm text-slate-500 font-medium">
                            <span className="font-bold text-slate-800">{filteredSpots.length}</span> kết quả
                        </span>
                    </div>
                )}

                {/* Content Area */}
                {loading ? (
                    <div className="flex h-64 items-center justify-center flex-col gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        <p className="text-slate-400 font-medium animate-pulse">Đang tải dữ liệu...</p>
                    </div>
                ) : filteredSpots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
                        <div className="text-6xl mb-4">🗺️</div>
                        <h3 className="text-xl font-black text-slate-700 mb-2">Không tìm thấy địa danh nào</h3>
                        <p className="text-slate-400 mb-6 max-w-sm">
                            {searchQuery
                                ? `Không có địa danh nào khớp với từ khóa "${searchQuery}"`
                                : 'Chưa có địa danh nào cho tỉnh/thành này'}
                        </p>
                        <button
                            onClick={clearFilters}
                            className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-transform active:scale-95 shadow-lg shadow-blue-200"
                        >
                            Xem tất cả địa danh
                        </button>
                    </div>
                ) : (
                    <div className={viewMode === 'grid'
                        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
                        : 'flex flex-col gap-4'
                    }>
                        {filteredSpots.map(spot => (
                            <SpotCard
                                key={spot.id || spot.spotId}
                                spot={spot}
                                isAdmin={isAdmin}
                                onDelete={handleDeleteSpot}
                            />
                        ))}
                    </div>
                )}

                {/* Quick links footer */}
                {!loading && selectedDestId === 'all' && !searchQuery && (
                    <div className="mt-20 bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
                        <h3 className="text-2xl font-black text-slate-800 mb-2 flex items-center gap-2">
                            <MapPin className="text-red-500" /> Khám phá theo tỉnh/thành
                        </h3>
                        <p className="text-slate-400 text-sm mb-8">Lọc địa danh theo từng tỉnh/thành phố để dễ lên kế hoạch hơn</p>
                        <div className="flex flex-wrap gap-3">
                            {destinations.map(d => {
                                const dId = String(d.id || d.destinationId);
                                return (
                                    <button
                                        key={dId}
                                        onClick={() => handleDestChange(dId)}
                                        className="px-5 py-2.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border-2 border-slate-200 hover:border-blue-300 rounded-2xl font-semibold text-sm transition-all flex items-center gap-2"
                                    >
                                        📍 {d.name}
                                        <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-400">
                                            {spotCounts[dId] || 0}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Backdrop click to close dropdown */}
            {isFilterOpen && (
                <div 
                    className="fixed inset-0 z-20 bg-black/5" 
                    onClick={() => setIsFilterOpen(false)} 
                />
            )}
        </div>
    );
};

export default SpotList;