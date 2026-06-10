import { useCallback, useEffect, useState } from 'react';
import {
    AlertTriangle,
    BarChart3,
    Building2,
    CalendarRange,
    Clock,
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

type PendingOrdersSummary = {
    pendingCount: number;
    nearestDeadlineHours?: number | null;
    hoursUntilNearestDeadline?: number | null;
    nearestHoursUntilDeadline?: number | null;
    nearestApprovalDeadlineHours?: number | null;
};

type PeriodFilter = 'day' | 'week' | 'month' | 'custom';

const currencyFormatter = new Intl.NumberFormat('vi-VN');

const periodOptions: Array<{ value: PeriodFilter; label: string }> = [
    { value: 'day', label: 'Ngày' },
    { value: 'week', label: 'Tuần' },
    { value: 'month', label: 'Tháng' },
    { value: 'custom', label: 'Tùy chọn' }
];

// Removed - using getTodayVietnam from utils

const PartnerDashboard = () => {
    const [summary, setSummary] = useState<PartnerRevenueSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [pendingOrders, setPendingOrders] = useState<PendingOrdersSummary | null>(null);
    const [period, setPeriod] = useState<PeriodFilter>('month');
    const [startDate, setStartDate] = useState(getTodayVietnam());
    const [endDate, setEndDate] = useState(getTodayVietnam());

    const fetchSummary = useCallback(async (nextPeriod: PeriodFilter, nextStartDate: string, nextEndDate: string) => {
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
            console.error('Lỗi lấy báo cáo doanh thu đối tác:', error);
            alert('Không thể tải báo cáo doanh thu lúc này.');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchPendingOrders = useCallback(async () => {
        try {
            const response = await axiosClient.get('/partner/orders/pending-count');
            setPendingOrders(response.data);
        } catch (error) {
            console.error('Lỗi lấy số đơn chờ duyệt của đối tác:', error);
            setPendingOrders(null);
        }
    }, []);

    const refreshDashboard = useCallback(async (nextPeriod: PeriodFilter, nextStartDate: string, nextEndDate: string) => {
        await Promise.all([
            fetchSummary(nextPeriod, nextStartDate, nextEndDate),
            fetchPendingOrders()
        ]);
    }, [fetchPendingOrders, fetchSummary]);

    useEffect(() => {
        refreshDashboard('month', getTodayVietnam(), getTodayVietnam());
    }, [refreshDashboard]);

    const handlePeriodChange = (nextPeriod: PeriodFilter) => {
        setPeriod(nextPeriod);

        if (nextPeriod !== 'custom') {
            refreshDashboard(nextPeriod, startDate, endDate);
        }
    };

    const handleApplyCustomRange = () => {
        if (!startDate || !endDate) {
            alert('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.');
            return;
        }

        refreshDashboard('custom', startDate, endDate);
    };

    const getNearestDeadlineHours = (pendingOrdersSummary: PendingOrdersSummary | null) => {
        if (!pendingOrdersSummary) {
            return null;
        }

        return pendingOrdersSummary.nearestDeadlineHours
            ?? pendingOrdersSummary.hoursUntilNearestDeadline
            ?? pendingOrdersSummary.nearestHoursUntilDeadline
            ?? pendingOrdersSummary.nearestApprovalDeadlineHours
            ?? null;
    };

    const formatDeadlineHours = (hours: number) => {
        if (hours <= 0) {
            return 'quá hạn';
        }

        if (hours < 1) {
            return `${Math.max(1, Math.ceil(hours * 60))} phút`;
        }

        return `${Math.ceil(hours)} giờ`;
    };

    const chartData = (summary?.revenueByDay ?? []).map(item => ({
        ...item,
        label: formatVietnameseDateShort(item.date)
    }));

    const topServices = (summary?.revenueByService ?? []).slice(0, 5);
    const rangeLabel = summary
        ? `${formatVietnameseDate(summary.rangeStart)} - ${formatVietnameseDate(summary.rangeEnd)}`
        : '';
    const periodLabel = periodOptions.find(option => option.value === (summary?.period ?? period))?.label ?? 'Tháng';
    const pendingCount = pendingOrders?.pendingCount ?? 0;
    const nearestDeadlineHours = getNearestDeadlineHours(pendingOrders);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
                <div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-[0.2em] mb-4">
                        <BarChart3 size={14} /> Báo cáo doanh thu đối tác
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">BẢNG ĐIỀU KHIỂN DOANH THU</h1>
                    <p className="mt-3 text-slate-500 dark:text-slate-400 font-medium max-w-2xl">
                        Theo dõi doanh thu theo ngày, tuần, tháng hoặc khoảng thời gian tùy chọn của bạn.
                    </p>
                </div>

                <button
                    onClick={() => refreshDashboard(period, startDate, endDate)}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white font-black text-sm shadow-lg hover:bg-emerald-600 dark:hover:bg-emerald-600 transition-all duration-300 active:scale-95 cursor-pointer"
                >
                    <RefreshCw size={18} /> Tải lại dữ liệu
                </button>
            </div>

            <Link
                to="/partner/orders"
                className={`flex flex-col md:flex-row md:items-center md:justify-between gap-5 rounded-[2rem] border p-6 sm:p-7 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md mb-8 ${
                    pendingCount > 0
                        ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 hover:border-amber-300'
                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700/50 hover:border-slate-200'
                }`}
            >
                <div className="flex items-start gap-4">
                    <div className={`size-12 shrink-0 rounded-2xl flex items-center justify-center ${
                        pendingCount > 0 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                    }`}>
                        {pendingCount > 0 ? <AlertTriangle size={24} /> : <Clock size={24} />}
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-2">
                            Đơn hàng chờ duyệt
                        </p>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                            Bạn có {pendingCount} đơn hàng đang chờ duyệt.
                        </h2>
                        {nearestDeadlineHours !== null && pendingCount > 0 && (
                            <p className="mt-2 text-sm font-bold text-amber-700 dark:text-amber-400">
                                Đơn hàng gần nhất còn {formatDeadlineHours(nearestDeadlineHours)} để duyệt.
                            </p>
                        )}
                    </div>
                </div>
                <span className={`inline-flex w-fit items-center justify-center rounded-2xl px-5 py-3 text-sm font-black transition-all ${
                    pendingCount > 0 ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}>
                    Xem đơn hàng
                </span>
            </Link>

            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 shadow-sm p-6 sm:p-8 mb-8">
                <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-3">
                            <CalendarRange size={14} /> Bộ lọc thời gian
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {periodOptions.map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => handlePeriodChange(option.value)}
                                    className={`px-5 py-3 rounded-2xl text-sm font-black transition-all duration-300 cursor-pointer ${
                                        period === option.value
                                            ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 items-end">
                        <Link
                            to="/partner/profile"
                            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 font-black text-sm hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all duration-300 self-stretch sm:self-auto text-center"
                        >
                            <Building2 size={18} /> Hồ sơ doanh nghiệp
                        </Link>
                        <label className="flex flex-col gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 w-full sm:w-auto">
                            Từ ngày
                            <input
                                type="date"
                                value={startDate}
                                onChange={(event) => setStartDate(event.target.value)}
                                disabled={period !== 'custom'}
                                className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400"
                            />
                        </label>
                        <label className="flex flex-col gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 w-full sm:w-auto">
                            Đến ngày
                            <input
                                type="date"
                                value={endDate}
                                onChange={(event) => setEndDate(event.target.value)}
                                disabled={period !== 'custom'}
                                className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400"
                            />
                        </label>
                        <button
                            onClick={handleApplyCustomRange}
                            disabled={period !== 'custom'}
                            className="px-6 py-3 rounded-2xl bg-emerald-600 text-white font-black text-sm shadow-lg hover:bg-emerald-500 transition-all duration-300 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:shadow-none cursor-pointer w-full sm:w-auto self-stretch sm:self-auto"
                        >
                            Áp dụng
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
                        <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-700/50 shadow-sm transition-all duration-300 hover:shadow-md">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Doanh thu {periodLabel.toLowerCase()}</span>
                                <DollarSign className="text-emerald-500" size={22} />
                            </div>
                            <div className="text-3xl font-black text-slate-900 dark:text-white">
                                {currencyFormatter.format(summary?.totalRevenue ?? 0)}₫
                            </div>
                            <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">{rangeLabel}</p>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-700/50 shadow-sm transition-all duration-300 hover:shadow-md">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Đơn hàng {periodLabel.toLowerCase()}</span>
                                <Package className="text-blue-500" size={22} />
                            </div>
                            <div className="text-3xl font-black text-slate-900 dark:text-white">{summary?.totalBookings ?? 0}</div>
                            <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">{rangeLabel}</p>
                        </div>

                        <Link 
                            to="/partner/availability"
                            className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-[2rem] p-6 border border-purple-200 dark:border-purple-900/50 shadow-lg hover:shadow-xl transition-all duration-300 group"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-100">Hành động nhanh</span>
                                <Package className="text-white group-hover:scale-110 transition-transform" size={22} />
                            </div>
                            <div className="text-2xl font-black text-white mb-2">
                                Quản lý Tồn kho & Giá
                            </div>
                            <p className="text-sm font-medium text-purple-100">Set giá, tồn kho & quy tắc giá →</p>
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6">
                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 shadow-sm p-6 sm:p-8">
                            <div className="flex items-start justify-between gap-4 mb-8">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-2">
                                        Theo khoảng đã chọn
                                    </p>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">Doanh thu theo ngày</h2>
                                </div>
                                <div className="size-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
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
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                                        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
                                        <YAxis
                                            tick={{ fontSize: 12, fill: '#64748b' }}
                                            tickFormatter={(value: number) => `${Math.round(Number(value) / 1000)}k`}
                                        />
                                        <Tooltip
                                            formatter={(value: number | string) => [`${currencyFormatter.format(Number(value))}₫`, 'Doanh thu']}
                                            labelFormatter={(value: number | string) => `Ngày ${value}`}
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

                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 shadow-sm p-6 sm:p-8">
                            <div className="flex items-start justify-between gap-4 mb-8">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-2">
                                        Xếp theo bộ lọc
                                    </p>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">Dịch vụ doanh thu cao</h2>
                                </div>
                                <div className="size-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                    <BarChart3 size={24} />
                                </div>
                            </div>

                            {topServices.length > 0 ? (
                                <div className="overflow-hidden rounded-[2rem] border border-slate-100 dark:border-slate-700">
                                    <div className="grid grid-cols-[1.6fr_1fr_0.8fr] gap-4 px-5 py-4 bg-slate-900 dark:bg-slate-700 text-white text-[11px] font-black uppercase tracking-[0.18em]">
                                        <div>Dịch vụ</div>
                                        <div>Doanh thu</div>
                                        <div>Đơn hàng</div>
                                    </div>

                                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {topServices.map(service => (
                                            <div
                                                key={service.serviceName}
                                                className="grid grid-cols-[1.6fr_1fr_0.8fr] gap-4 px-5 py-4 items-center text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                            >
                                                <div className="font-bold text-slate-700 dark:text-slate-300">{service.serviceName}</div>
                                                <div className="font-black text-emerald-600 dark:text-emerald-400">
                                                    {currencyFormatter.format(service.revenue)}₫
                                                </div>
                                                <div className="font-black text-slate-900 dark:text-white">{service.bookingCount}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700 p-10 text-center bg-slate-50 dark:bg-slate-900/30">
                                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                                        Chưa có giao dịch thành công trong khoảng thời gian đã chọn.
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
