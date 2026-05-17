import { useEffect, useState } from 'react';
import {
    BarChart3,
    Building2,
    CalendarRange,
    DollarSign,
    Loader2,
    Package,
    RefreshCw,
    TrendingUp
} from 'lucide-react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { formatVietnameseDate, formatVietnameseDateShort } from '../../utils/dateTimeUtils';
import { getTodayVietnam } from '../../utils/dateUtils';

type RevenueByService = {
    serviceName: string;
    revenue: number;
    bookingCount: number;
};

type RevenueByDay = {
    date: string;
    revenue: number;
};

type PartnerRevenueSummary = {
    totalRevenue: number;
    totalBookings: number;
    rangeStart: string;
    rangeEnd: string;
    period: string;
    revenueByService: RevenueByService[];
    revenueByDay: RevenueByDay[];
};

type PeriodFilter = 'day' | 'week' | 'month' | 'custom';

const currencyFormatter = new Intl.NumberFormat('vi-VN');

const periodOptions: Array<{ value: PeriodFilter; label: string }> = [
    { value: 'day', label: 'Ngay' },
    { value: 'week', label: 'Tuan' },
    { value: 'month', label: 'Thang' },
    { value: 'custom', label: 'Tuy chon' }
];

// Removed - using getTodayVietnam from utils

const PartnerDashboard = () => {
    const [summary, setSummary] = useState<PartnerRevenueSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<PeriodFilter>('month');
    const [startDate, setStartDate] = useState(getTodayVietnam());
    const [endDate, setEndDate] = useState(getTodayVietnam());

    const fetchSummary = async (nextPeriod = period, nextStartDate = startDate, nextEndDate = endDate) => {
        try {
            setLoading(true);
            const params: Record<string, string> = { period: nextPeriod };

            if (nextPeriod === 'custom') {
                params.startDate = nextStartDate;
                params.endDate = nextEndDate;
            }

            const response = await axiosClient.get('/partner/revenue-summary', { params });
            setSummary(response.data);
        } catch (error) {
            console.error('Loi lay bao cao doanh thu partner:', error);
            alert('Khong the tai bao cao doanh thu luc nay.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, []);

    const handlePeriodChange = (nextPeriod: PeriodFilter) => {
        setPeriod(nextPeriod);

        if (nextPeriod !== 'custom') {
            fetchSummary(nextPeriod, startDate, endDate);
        }
    };

    const handleApplyCustomRange = () => {
        if (!startDate || !endDate) {
            alert('Vui long chon day du ngay bat dau va ngay ket thuc.');
            return;
        }

        fetchSummary('custom', startDate, endDate);
    };

    const chartData = (summary?.revenueByDay ?? []).map(item => ({
        ...item,
        label: formatVietnameseDateShort(item.date)
    }));

    const topServices = (summary?.revenueByService ?? []).slice(0, 5);
    const rangeLabel = summary
        ? `${formatVietnameseDate(summary.rangeStart)} - ${formatVietnameseDate(summary.rangeEnd)}`
        : '';
    const periodLabel = periodOptions.find(option => option.value === (summary?.period ?? period))?.label ?? 'Thang';

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
                <div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-[0.2em] mb-4">
                        <BarChart3 size={14} /> Partner Revenue
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">DASHBOARD DOANH THU</h1>
                    <p className="mt-3 text-slate-500 font-medium max-w-2xl">
                        Theo doi doanh thu theo ngay, tuan, thang hoac khoang thoi gian tuy chon cua ban.
                    </p>
                </div>

                <button
                    onClick={() => fetchSummary()}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-sm shadow-lg hover:bg-emerald-600 transition-all active:scale-95"
                >
                    <RefreshCw size={18} /> Tai lai
                </button>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6 sm:p-8 mb-8">
                <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
                            <CalendarRange size={14} /> Bo loc thoi gian
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {periodOptions.map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => handlePeriodChange(option.value)}
                                    className={`px-5 py-3 rounded-2xl text-sm font-black transition-all ${
                                        period === option.value
                                            ? 'bg-slate-900 text-white shadow-lg'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <Link
                            to="/partner/profile"
                            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-50 text-blue-700 font-black text-sm hover:bg-blue-100 transition-all"
                        >
                            <Building2 size={18} /> Ho so doanh nghiep
                        </Link>
                        <label className="flex flex-col gap-2 text-sm font-bold text-slate-600">
                            Tu ngay
                            <input
                                type="date"
                                value={startDate}
                                onChange={(event) => setStartDate(event.target.value)}
                                disabled={period !== 'custom'}
                                className="px-4 py-3 rounded-2xl border border-slate-200 bg-white disabled:bg-slate-100 disabled:text-slate-400"
                            />
                        </label>
                        <label className="flex flex-col gap-2 text-sm font-bold text-slate-600">
                            Den ngay
                            <input
                                type="date"
                                value={endDate}
                                onChange={(event) => setEndDate(event.target.value)}
                                disabled={period !== 'custom'}
                                className="px-4 py-3 rounded-2xl border border-slate-200 bg-white disabled:bg-slate-100 disabled:text-slate-400"
                            />
                        </label>
                        <button
                            onClick={handleApplyCustomRange}
                            disabled={period !== 'custom'}
                            className="px-6 py-3 rounded-2xl bg-emerald-600 text-white font-black text-sm shadow-lg hover:bg-emerald-500 transition-all disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                        >
                            Ap dung
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-32">
                    <Loader2 className="animate-spin text-emerald-600" size={48} />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Doanh thu {periodLabel.toLowerCase()}</span>
                                <DollarSign className="text-emerald-500" size={22} />
                            </div>
                            <div className="text-3xl font-black text-slate-900">
                                {currencyFormatter.format(summary?.totalRevenue ?? 0)}d
                            </div>
                            <p className="mt-3 text-sm font-medium text-slate-500">{rangeLabel}</p>
                        </div>

                        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Don hang {periodLabel.toLowerCase()}</span>
                                <Package className="text-blue-500" size={22} />
                            </div>
                            <div className="text-3xl font-black text-slate-900">{summary?.totalBookings ?? 0}</div>
                            <p className="mt-3 text-sm font-medium text-slate-500">{rangeLabel}</p>
                        </div>

                        <Link 
                            to="/partner/inventory-pricing"
                            className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-[2rem] p-6 border border-purple-200 shadow-lg hover:shadow-xl transition-all group"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-100">Quick Action</span>
                                <Package className="text-white group-hover:scale-110 transition-transform" size={22} />
                            </div>
                            <div className="text-2xl font-black text-white mb-2">
                                Quản Lý Tồn Kho & Giá
                            </div>
                            <p className="text-sm font-medium text-purple-100">Set giá, tồn kho & pricing rules →</p>
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6">
                        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6 sm:p-8">
                            <div className="flex items-start justify-between gap-4 mb-8">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                                        Theo khoang da chon
                                    </p>
                                    <h2 className="text-2xl font-black text-slate-900">Doanh thu theo ngay</h2>
                                </div>
                                <div className="size-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <TrendingUp size={24} />
                                </div>
                            </div>

                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.04} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
                                        <YAxis
                                            tick={{ fontSize: 12, fill: '#64748b' }}
                                            tickFormatter={(value: number) => `${Math.round(Number(value) / 1000)}k`}
                                        />
                                        <Tooltip
                                            formatter={(value: number | string) => [`${currencyFormatter.format(Number(value))}d`, 'Doanh thu']}
                                            labelFormatter={(value: number | string) => `Ngay ${value}`}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="revenue"
                                            stroke="#10b981"
                                            strokeWidth={3}
                                            fill="url(#revenueFill)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6 sm:p-8">
                            <div className="flex items-start justify-between gap-4 mb-8">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                                        Xep theo bo loc
                                    </p>
                                    <h2 className="text-2xl font-black text-slate-900">Dich vu doanh thu cao</h2>
                                </div>
                                <div className="size-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <BarChart3 size={24} />
                                </div>
                            </div>

                            {topServices.length > 0 ? (
                                <div className="overflow-hidden rounded-[2rem] border border-slate-100">
                                    <div className="grid grid-cols-[1.6fr_1fr_0.8fr] gap-4 px-5 py-4 bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.18em]">
                                        <div>Dich vu</div>
                                        <div>Doanh thu</div>
                                        <div>Don</div>
                                    </div>

                                    <div className="divide-y divide-slate-100">
                                        {topServices.map(service => (
                                            <div
                                                key={service.serviceName}
                                                className="grid grid-cols-[1.6fr_1fr_0.8fr] gap-4 px-5 py-4 items-center text-sm"
                                            >
                                                <div className="font-bold text-slate-700">{service.serviceName}</div>
                                                <div className="font-black text-emerald-600">
                                                    {currencyFormatter.format(service.revenue)}d
                                                </div>
                                                <div className="font-black text-slate-900">{service.bookingCount}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-[2rem] border-2 border-dashed border-slate-200 p-10 text-center bg-slate-50">
                                    <p className="text-slate-500 font-medium">
                                        Chua co giao dich thanh cong trong khoang thoi gian da chon.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default PartnerDashboard;
