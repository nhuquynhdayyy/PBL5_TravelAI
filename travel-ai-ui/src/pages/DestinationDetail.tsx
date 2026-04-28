import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    CalendarDays,
    ChevronDown,
    Compass,
    Filter,
    Info,
    Loader2,
    MapPin,
    Plus,
    Search,
    Sparkles
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import SpotCard from '../components/SpotCard';

const getTodayInputValue = () => {
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - timezoneOffset).toISOString().split('T')[0];
};

const DestinationDetail: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const isAdmin = user?.roleName?.toLowerCase() === 'admin';

    const [dest, setDest] = useState<any>(null);
    const [spots, setSpots] = useState<any[]>([]);
    const [allDestinations, setAllDestinations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDestId, setFilterDestId] = useState<string>('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [days, setDays] = useState<number>(1);
    const [startDate, setStartDate] = useState<string>(getTodayInputValue());

    const handleGenerateAI = async () => {
        try {
            setAiLoading(true);

            const response = await axiosClient.post('/itinerary/generate', {
                destinationId: parseInt(id || '0', 10),
                numberOfDays: days,
                startDate
            });

            const finalData = response.data.data || response.data;

            if (finalData) {
                navigate('/itinerary/latest', { state: { data: finalData } });
                return;
            }

            return alert('API tra ve du lieu rong.');
        } catch (error) {
            console.error(error);
            const message = typeof error === 'object' && error !== null && 'response' in error
                ? (() => {
                    const response = (error as {
                        response?: {
                            data?: {
                                message?: string;
                            } | string;
                        };
                    }).response;

                    if (typeof response?.data === 'string') {
                        return response.data;
                    }

                    return response?.data?.message || 'Khong tao duoc lich trinh. Mo Console F12 de xem chi tiet.';
                })()
                : 'Khong tao duoc lich trinh. Mo Console F12 de xem chi tiet.';

            return alert(message);
        } finally {
            setAiLoading(false);
        }
    };

    const getImageUrl = (url: string) => {
        if (!url) {
            return 'https://via.placeholder.com/800x400';
        }

        return url.startsWith('http') ? url : `http://localhost:5134${url}`;
    };

    const fetchData = async () => {
        try {
            setLoading(true);

            const allDestsRes = await axiosClient.get('/destinations');
            const destinations = allDestsRes.data.data || [];

            setAllDestinations(destinations);
            setDest(destinations.find((item: any) => item.id === parseInt(id || '0', 10)));

            const spotsRes = await axiosClient.get(`/spots/by-destination/${id}`);
            setSpots(spotsRes.data.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    useEffect(() => {
        const destinationIdToLoad = filterDestId !== 'all' && filterDestId !== id ? filterDestId : id;

        axiosClient
            .get(`/spots/by-destination/${destinationIdToLoad}`)
            .then((res) => setSpots(res.data.data || []))
            .catch(console.error);
    }, [filterDestId, id]);

    const filteredSpots = useMemo(() => {
        if (!searchQuery.trim()) {
            return spots;
        }

        const keyword = searchQuery.toLowerCase().trim();

        return spots.filter((spot) =>
            (spot.name || spot.spotName || '').toLowerCase().includes(keyword) ||
            (spot.description || '').toLowerCase().includes(keyword) ||
            (spot.location || spot.address || '').toLowerCase().includes(keyword)
        );
    }, [searchQuery, spots]);

    const handleDeleteSpot = async (spotId: number) => {
        if (!window.confirm('Bạn có chắc muốn xóa địa danh này không?')) {
            return;
        }

        try {
            await axiosClient.delete(`/spots/${spotId}`);
            setSpots((prev) => prev.filter((spot) => (spot.id || spot.spotId) !== spotId));
            alert('Đã xóa địa danh thành công!');
        } catch (error) {
            console.error(error);
            alert('Lỗi khi xóa địa danh.');
        }
    };

    const selectedDestName = filterDestId === 'all'
        ? 'Tất cả tỉnh/thành'
        : allDestinations.find((item) => String(item.id || item.destinationId) === filterDestId)?.name || 'Chọn tỉnh/thành';

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!dest) {
        return <div className="p-10 text-center font-bold">Không tìm thấy địa điểm.</div>;
    }

    return (
        <div className="mx-auto mb-20 max-w-6xl p-6">
            <button
                onClick={() => navigate('/destinations')}
                className="mb-6 flex items-center gap-2 font-bold text-slate-500 transition-colors hover:text-blue-600"
            >
                <ArrowLeft size={20} /> Quay lại danh sách tỉnh
            </button>

            <div className="relative mb-10 h-[450px] overflow-hidden rounded-[40px] border-8 border-white shadow-2xl">
                <img src={getImageUrl(dest.imageUrl)} className="h-full w-full object-cover" alt={dest.name} />
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-12">
                    <h1 className="text-6xl font-black tracking-tighter text-white">{dest.name}</h1>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <section className="mb-12">
                        <h2 className="mb-4 flex items-center gap-2 text-2xl font-black text-slate-800">
                            <Info className="text-blue-500" /> Giới thiệu về {dest.name}
                        </h2>
                        <p className="rounded-3xl border border-slate-100 bg-white p-6 text-lg leading-relaxed text-slate-600 shadow-sm">
                            {dest.description}
                        </p>
                    </section>

                    <section>
                        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                            <h2 className="flex items-center gap-2 text-2xl font-black text-slate-800">
                                <MapPin className="text-red-500" /> Địa danh tham quan
                            </h2>
                            {isAdmin && (
                                <button
                                    onClick={() => navigate(`/admin/spots/add?destinationId=${id}`)}
                                    className="flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-all active:scale-95 hover:bg-blue-700"
                                >
                                    <Plus size={18} /> Thêm địa danh
                                </button>
                            )}
                        </div>

                        <div className="mb-8 flex flex-col gap-3 sm:flex-row">
                            <div className="relative flex-1">
                                <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    placeholder="Tìm kiếm địa danh..."
                                    className="w-full rounded-2xl border-2 border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-700 shadow-sm transition-all placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-50"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400 hover:text-slate-600"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>

                            <div className="relative">
                                <button
                                    onClick={() => setIsFilterOpen((prev) => !prev)}
                                    className="flex min-w-[180px] items-center justify-between gap-2 whitespace-nowrap rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-blue-400 hover:bg-blue-50 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-50"
                                >
                                    <span className="flex items-center gap-2">
                                        <Filter size={16} className="text-blue-500" />
                                        <span className="max-w-[130px] truncate">{selectedDestName}</span>
                                    </span>
                                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isFilterOpen && (
                                    <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                                        <div className="max-h-72 overflow-y-auto p-2">
                                            <button
                                                onClick={() => {
                                                    setFilterDestId('all');
                                                    setIsFilterOpen(false);
                                                }}
                                                className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${filterDestId === 'all' ? 'bg-blue-500 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                                            >
                                                Tất cả tỉnh/thành
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setFilterDestId(String(id));
                                                    setIsFilterOpen(false);
                                                }}
                                                className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${(filterDestId === String(id) || filterDestId === id) ? 'bg-blue-500 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                                            >
                                                {dest.name} (hiện tại)
                                            </button>

                                            {allDestinations.length > 0 && <div className="my-1 border-t border-slate-100" />}

                                            {allDestinations
                                                .filter((item) => String(item.id || item.destinationId) !== String(id))
                                                .map((item) => {
                                                    const destinationId = String(item.id || item.destinationId);

                                                    return (
                                                        <button
                                                            key={destinationId}
                                                            onClick={() => {
                                                                setFilterDestId(destinationId);
                                                                setIsFilterOpen(false);
                                                            }}
                                                            className={`w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors ${filterDestId === destinationId ? 'bg-blue-500 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                                                        >
                                                            {item.name}
                                                        </button>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {(searchQuery || filterDestId !== String(id)) && (
                            <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
                                <span>
                                    Tìm thấy <span className="font-bold text-slate-800">{filteredSpots.length}</span> địa danh
                                </span>
                                {searchQuery && (
                                    <span className="rounded-lg bg-blue-50 px-2 py-0.5 font-medium text-blue-600">
                                        "{searchQuery}"
                                    </span>
                                )}
                                {filterDestId !== 'all' && filterDestId !== String(id) && (
                                    <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                                        {selectedDestName}
                                    </span>
                                )}
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setFilterDestId(String(id));
                                    }}
                                    className="ml-auto font-semibold text-blue-500 underline underline-offset-2 hover:text-blue-700"
                                >
                                    Xóa bộ lọc
                                </button>
                            </div>
                        )}

                        {filteredSpots.length > 0 ? (
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                {filteredSpots.slice(0, 4).map((spot) => (
                                    <SpotCard
                                        key={spot.id || spot.spotId}
                                        spot={spot}
                                        isAdmin={isAdmin}
                                        onDelete={handleDeleteSpot}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-[40px] border-2 border-dashed border-slate-200 bg-slate-50 p-10 text-center italic text-slate-400">
                                {searchQuery
                                    ? `Không tìm thấy địa danh nào khớp với "${searchQuery}"`
                                    : 'Dữ liệu địa danh đang được cập nhật...'}
                            </div>
                        )}

                        {filteredSpots.length > 4 && (
                            <div className="mt-10 text-center">
                                <button
                                    onClick={() => navigate(`/destinations/${id}/spots`)}
                                    className="rounded-2xl border-2 border-slate-900 bg-white px-10 py-4 font-black text-slate-900 shadow-lg transition-all hover:bg-slate-900 hover:text-white"
                                >
                                    Xem tất cả {filteredSpots.length} địa danh →
                                </button>
                            </div>
                        )}

                        <div className="mt-10">
                            <button
                                onClick={() => navigate(`/destinations/${id}/spots`)}
                                className="group flex w-full items-center justify-center gap-3 rounded-3xl bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 px-8 py-5 text-base font-black text-white shadow-xl shadow-blue-200 transition-all active:scale-[0.98] hover:from-indigo-600 hover:via-blue-600 hover:to-cyan-600 hover:shadow-2xl hover:shadow-blue-300"
                            >
                                <Compass size={22} className="transition-transform duration-300 group-hover:rotate-45" />
                                Tìm hiểu thêm các địa danh nổi tiếng khác
                                <span className="ml-1 opacity-70 transition-all group-hover:translate-x-1 group-hover:opacity-100">→</span>
                            </button>
                        </div>
                    </section>
                </div>

                <div className="space-y-6">
                    <div className="group relative overflow-hidden rounded-[40px] bg-slate-900 p-8 text-white shadow-2xl">
                        <Sparkles className="absolute -right-4 -top-4 size-24 text-white/10 transition-transform group-hover:rotate-12" />
                        <h3 className="relative z-10 mb-4 text-2xl font-black">Lên kế hoạch thông minh?</h3>

                        <div className="relative z-10 mb-6">
                            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-blue-400">
                                Bạn muốn đi trong bao lâu?
                            </label>
                            <div className="flex items-center rounded-2xl border border-white/10 bg-white/10 p-1">
                                <button
                                    onClick={() => setDays(Math.max(1, days - 1))}
                                    className="flex h-10 w-10 items-center justify-center rounded-xl font-bold transition-all hover:bg-white/20"
                                >
                                    -
                                </button>
                                <span className="flex-1 text-center text-xl font-black">{days} ngày</span>
                                <button
                                    onClick={() => setDays(days + 1)}
                                    className="flex h-10 w-10 items-center justify-center rounded-xl font-bold transition-all hover:bg-white/20"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <div className="relative z-10 mb-8">
                            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-blue-400">
                                Ngày bắt đầu
                            </label>
                            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                                <CalendarDays size={18} className="shrink-0 text-blue-300" />
                                <input
                                    type="date"
                                    value={startDate}
                                    min={getTodayInputValue()}
                                    onChange={(event) => setStartDate(event.target.value)}
                                    className="w-full bg-transparent font-semibold text-white outline-none [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleGenerateAI}
                            disabled={aiLoading || !startDate}
                            className="relative z-10 flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-500 px-6 py-4 font-black text-white shadow-xl shadow-blue-900/20 transition-all hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {aiLoading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    ĐANG PHÂN TÍCH...
                                </>
                            ) : (
                                <>BẮT ĐẦU NGAY</>
                            )}
                        </button>
                    </div>

                    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                        <h4 className="mb-4 flex items-center gap-2 font-black text-slate-800">
                            <MapPin size={16} className="text-red-400" /> Khám phá tỉnh/thành khác
                        </h4>
                        <div className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
                            {allDestinations
                                .filter((item) => String(item.id || item.destinationId) !== String(id))
                                .slice(0, 8)
                                .map((item) => (
                                    <button
                                        key={item.id || item.destinationId}
                                        onClick={() => navigate(`/destinations/${item.id || item.destinationId}`)}
                                        className="rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
                                    >
                                        → {item.name}
                                    </button>
                                ))}
                        </div>
                        <button
                            onClick={() => navigate(`/destinations/${id}/spots`)}
                            className="mt-4 w-full rounded-xl border-2 border-slate-200 py-2.5 text-sm font-bold text-slate-600 transition-all hover:border-blue-400 hover:text-blue-600"
                        >
                            Xem tất cả địa danh
                        </button>
                    </div>
                </div>
            </div>

            {isFilterOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
            )}
        </div>
    );
};

export default DestinationDetail;
