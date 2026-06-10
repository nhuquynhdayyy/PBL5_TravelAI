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
    ReceiptText,
    Search,
    Sparkles,
    Users,
    Wallet
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import SpotCard from '../components/SpotCard';
import { getTodayVietnam } from '../utils/dateUtils';

type BudgetBreakdownItem = {
    category: string;
    amount: number;
    note: string;
};

type BudgetEstimate = {
    total: number;
    breakdown: BudgetBreakdownItem[];
};

const DestinationDetail: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const isAdmin = user?.roleName?.toLowerCase() === 'admin';

    const [dest, setDest] = useState<any>(null);
    const [spots, setSpots] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [days, setDays] = useState<number>(1);
    const [budgetPeople, setBudgetPeople] = useState<number>(2);
    const [budgetStyle, setBudgetStyle] = useState<string>('Trung binh');
    const [budgetLoading, setBudgetLoading] = useState(false);
    const [budgetEstimate, setBudgetEstimate] = useState<BudgetEstimate | null>(null);



    const handleEstimateBudget = async () => {
        try {
            setBudgetLoading(true);

            const response = await axiosClient.post('/ai/estimate-budget', {
                destination: dest.name,
                days,
                people: budgetPeople,
                travel_style: budgetStyle
            });

            setBudgetEstimate(response.data.data || response.data);
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

                    return response?.data?.message || 'Khong uoc tinh duoc ngan sach luc nay.';
                })()
                : 'Khong uoc tinh duoc ngan sach luc nay.';

            alert(message);
        } finally {
            setBudgetLoading(false);
        }
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(value);

    const getImageUrl = (url: string) => {
        if (!url) {
            return 'https://via.placeholder.com/800x400';
        }

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
                        </div>

                        {searchQuery && (
                            <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
                                <span>
                                    Tìm thấy <span className="font-bold text-slate-800">{filteredSpots.length}</span> địa danh
                                </span>
                                <span className="rounded-lg bg-blue-50 px-2 py-0.5 font-medium text-blue-600">
                                    "{searchQuery}"
                                </span>
                                <button
                                    onClick={() => setSearchQuery('')}
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

                    </section>
                </div>

                <div className="space-y-6">
                    <div className="group relative overflow-hidden rounded-[40px] bg-slate-900 p-8 text-white shadow-2xl text-center">
                        <Sparkles className="absolute -right-4 -top-4 size-24 text-white/10 transition-transform group-hover:rotate-12" />
                        <h3 className="relative z-10 mb-4 text-2xl font-black leading-tight">
                            Lập kế hoạch du lịch {dest.name} ngay cùng AI
                        </h3>
                        <p className="relative z-10 mb-6 text-sm text-slate-400 leading-relaxed">
                            Trải nghiệm công cụ lập lịch trình thông minh hoàn toàn miễn phí. AI sẽ đề xuất lộ trình tối ưu và gợi ý các hoạt động phù hợp nhất với sở thích của bạn.
                        </p>
                        <button
                            onClick={() => navigate(`/planner/create?destinationId=${id}`)}
                            className="relative z-10 flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-500 px-6 py-4.5 font-black text-white shadow-xl shadow-blue-900/20 transition-all hover:bg-blue-400 active:scale-[0.98]"
                        >
                            <Sparkles size={18} />
                            BẮT ĐẦU NGAY
                        </button>
                    </div>

                    <div className="rounded-[32px] border border-blue-100 bg-white p-6 shadow-sm">
                        <div className="mb-5 flex items-start justify-between gap-3">
                            <div>
                                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-blue-500">
                                    AI Budget Estimator
                                </p>
                                <h3 className="text-xl font-black text-slate-900">Ước tính ngân sách</h3>
                            </div>
                            <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                <Wallet size={22} />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Điểm đến
                                </label>
                                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                                    <MapPin size={16} className="text-red-400" />
                                    {dest.name}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Số ngày
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={30}
                                        value={days}
                                        onChange={(event) => setDays(Math.max(1, Number(event.target.value) || 1))}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Số người
                                    </label>
                                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-3">
                                        <Users size={16} className="text-slate-400" />
                                        <input
                                            type="number"
                                            min={1}
                                            max={50}
                                            value={budgetPeople}
                                            onChange={(event) => setBudgetPeople(Math.max(1, Number(event.target.value) || 1))}
                                            className="w-full text-sm font-bold text-slate-700 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Phong cách
                                </label>
                                <select
                                    value={budgetStyle}
                                    onChange={(event) => setBudgetStyle(event.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                                >
                                    <option value="Tiet kiem">Tiết kiệm</option>
                                    <option value="Trung binh">Trung bình</option>
                                    <option value="Cao cap">Cao cấp</option>
                                </select>
                            </div>

                            <button
                                onClick={handleEstimateBudget}
                                disabled={budgetLoading}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-black text-white transition-all hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {budgetLoading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Đang ước tính...
                                    </>
                                ) : (
                                    <>
                                        <ReceiptText size={18} />
                                        Ước tính chi phí
                                    </>
                                )}
                            </button>
                        </div>

                        {budgetEstimate && (
                            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100">
                                <div className="bg-blue-50 px-4 py-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                                        Tổng ngân sách
                                    </p>
                                    <p className="text-2xl font-black text-slate-900">
                                        {formatCurrency(budgetEstimate.total)}
                                    </p>
                                </div>

                                <div className="divide-y divide-slate-100">
                                    {budgetEstimate.breakdown.map((item) => (
                                        <div key={item.category} className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3">
                                            <div>
                                                <p className="text-sm font-black text-slate-800">{item.category}</p>
                                                <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.note}</p>
                                            </div>
                                            <p className="whitespace-nowrap text-sm font-black text-blue-600">
                                                {formatCurrency(item.amount)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DestinationDetail;
