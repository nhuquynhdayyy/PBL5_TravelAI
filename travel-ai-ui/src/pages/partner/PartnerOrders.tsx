import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    AlertTriangle,
    CalendarDays,
    CheckCircle,
    Clock,
    ClipboardList,
    DollarSign,
    Eye,
    Filter,
    Loader2,
    Package,
    Store,
    XCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../api/axiosClient';
import { 
    formatVietnameseDate, 
    formatVietnameseTime, 
    formatVietnameseCurrency 
} from '../../utils/dateTimeUtils';

type PartnerOrder = {
    bookingId: number;
    serviceName: string;
    customerName: string;
    customerEmail: string;
    checkInDate: string;
    quantity: number;
    totalAmount: number;
    status: number | string;
    createdAt: string;
    isApprovedByPartner?: boolean;
    approvedAt?: string;
    approvalDeadline?: string;
    hoursUntilDeadline?: number;
    cancellationReason?: string; // Lý do hủy đơn
};

const statusMap: Record<number, { label: string; className: string }> = {
    1: { label: 'Chờ thanh toán', className: 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50' },
    2: { label: 'Đã thanh toán', className: 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50' },
    3: { label: 'Đã hoàn tiền', className: 'bg-sky-100 text-sky-700 border border-sky-200 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/50' },
    4: { label: 'Đã hủy', className: 'bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50' },
    // Special status for approved orders
    5: { label: 'Đã duyệt', className: 'bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/50' }
};

const stringStatusMap: Record<string, number> = {
    pending: 1,
    paid: 2,
    refunded: 3,
    cancelled: 4
};

// Removed: const currencyFormatter = new Intl.NumberFormat('vi-VN');
// Now using formatVietnameseCurrency from dateTimeUtils

type FilterType = 'all' | 'pending-approval' | 'urgent' | 'approved' | 'cancelled';

const PartnerOrders = () => {
    const queryClient = useQueryClient();
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    
    // Modal states
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const { data: orders = [], isLoading: loading } = useQuery<PartnerOrder[]>({
        queryKey: ['partner-orders'],
        queryFn: async () => {
            const res = await axiosClient.get('/partner/orders');
            return res.data ?? [];
        },
    });

    const approveMutation = useMutation({
        mutationFn: (bookingId: number) =>
            axiosClient.post(`/partner/orders/${bookingId}/approve`),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['partner-orders'] });
            void queryClient.invalidateQueries({ queryKey: ['partner-pending-count'] });
        },
    });

    const rejectMutation = useMutation({
        mutationFn: ({ bookingId, reason }: { bookingId: number; reason: string }) =>
            axiosClient.post(`/partner/orders/${bookingId}/reject`, { reason }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['partner-orders'] });
            void queryClient.invalidateQueries({ queryKey: ['partner-pending-count'] });
        },
    });

    const openApproveModal = (bookingId: number) => {
        setSelectedBookingId(bookingId);
        setShowApproveModal(true);
    };

    const openRejectModal = (bookingId: number) => {
        setSelectedBookingId(bookingId);
        setRejectReason('');
        setShowRejectModal(true);
    };

    const handleApproveConfirm = async () => {
        if (!selectedBookingId) return;

        try {
            setActionLoading(selectedBookingId);
            await approveMutation.mutateAsync(selectedBookingId);
            setShowApproveModal(false);
            setSuccessMessage('✅ Đã duyệt đơn hàng thành công! Khách hàng sẽ nhận được email thông báo.');
            setShowSuccessModal(true);
        } catch (error: any) {
            console.error('Lỗi duyệt đơn hàng:', error);
            alert(error.response?.data?.message || 'Không thể duyệt đơn hàng.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectConfirm = async () => {
        if (!selectedBookingId || !rejectReason.trim()) {
            alert('Vui lòng nhập lý do từ chối.');
            return;
        }

        try {
            setActionLoading(selectedBookingId);
            await rejectMutation.mutateAsync({ bookingId: selectedBookingId, reason: rejectReason });
            setShowRejectModal(false);
            setRejectReason('');
            setSuccessMessage('✅ Đã từ chối đơn hàng và hoàn tiền cho khách hàng. Email thông báo đã được gửi.');
            setShowSuccessModal(true);
        } catch (error: any) {
            console.error('Lỗi từ chối đơn hàng:', error);
            alert(error.response?.data?.message || 'Không thể từ chối đơn hàng.');
        } finally {
            setActionLoading(null);
        }
    };

    // Lock body scroll when any modal is open
    useEffect(() => {
        if (showApproveModal || showRejectModal || showSuccessModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showApproveModal, showRejectModal, showSuccessModal]);

    // Filter orders based on active filter
    const filteredOrders = orders.filter(order => {
        const isPaid = resolveStatusKey(order.status) === 2 && !order.isApprovedByPartner;
        const deadline = formatDeadlineCountdown(order.hoursUntilDeadline);
        
        switch (activeFilter) {
            case 'pending-approval':
                // Chỉ hiện đơn chờ duyệt chưa quá hạn
                return isPaid && !deadline.expired;
            case 'urgent':
                return isPaid && deadline.urgent && !deadline.expired;
            case 'approved':
                return order.isApprovedByPartner;
            case 'cancelled':
                // Gộp cả đơn đã hủy và đơn quá hạn (sắp bị hủy)
                return resolveStatusKey(order.status) === 4 || (isPaid && deadline.expired);
            default:
                return true;
        }
    });

    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const paidOrders = orders.filter(order => resolveStatusKey(order.status) === 2).length;
    
    // Count for each filter
    const filterCounts = {
        all: orders.length,
        'pending-approval': orders.filter(order => {
            const isPaid = resolveStatusKey(order.status) === 2 && !order.isApprovedByPartner;
            const deadline = formatDeadlineCountdown(order.hoursUntilDeadline);
            // Chỉ đếm đơn chờ duyệt chưa quá hạn
            return isPaid && !deadline.expired;
        }).length,
        urgent: orders.filter(order => {
            const isPaid = resolveStatusKey(order.status) === 2 && !order.isApprovedByPartner;
            const deadline = formatDeadlineCountdown(order.hoursUntilDeadline);
            return isPaid && deadline.urgent && !deadline.expired;
        }).length,
        approved: orders.filter(order => order.isApprovedByPartner).length,
        cancelled: orders.filter(order => {
            const isPaid = resolveStatusKey(order.status) === 2 && !order.isApprovedByPartner;
            const deadline = formatDeadlineCountdown(order.hoursUntilDeadline);
            // Gộp cả đơn đã hủy và đơn quá hạn
            return resolveStatusKey(order.status) === 4 || (isPaid && deadline.expired);
        }).length,
    };

    function resolveStatusKey(status: number | string) {
        if (typeof status === 'number') {
            return status;
        }

        return stringStatusMap[status.toLowerCase()] ?? 0;
    }

    function getStatusMeta(status: number | string, isApproved?: boolean) {
        // Nếu đã được duyệt bởi partner, hiển thị status "Đã duyệt"
        if (isApproved && resolveStatusKey(status) === 2) {
            return statusMap[5]; // "Đã duyệt"
        }
        
        const key = resolveStatusKey(status);
        return statusMap[key] ?? {
            label: String(status),
            className: 'bg-slate-100 text-slate-600 border border-slate-200'
        };
    }

    function formatDeadlineCountdown(hoursUntilDeadline?: number) {
        if (!hoursUntilDeadline || hoursUntilDeadline <= 0) {
            return { 
                text: 'Quá hạn', 
                className: 'text-rose-600 font-black', 
                bgClassName: 'bg-rose-50 border-rose-200',
                icon: AlertTriangle,
                urgent: true,
                expired: true
            };
        }

        if (hoursUntilDeadline < 2) {
            const minutes = Math.floor(hoursUntilDeadline * 60);
            return { 
                text: `${minutes} phút`, 
                className: 'text-rose-600 font-black animate-pulse', 
                bgClassName: 'bg-rose-50 border-rose-200',
                icon: AlertTriangle,
                urgent: true,
                expired: false
            };
        }

        if (hoursUntilDeadline < 12) {
            const hours = Math.floor(hoursUntilDeadline);
            return { 
                text: `${hours} giờ`, 
                className: 'text-amber-600 font-black', 
                bgClassName: 'bg-amber-50 border-amber-200',
                icon: Clock,
                urgent: true,
                expired: false
            };
        }

        const hours = Math.floor(hoursUntilDeadline);
        return { 
            text: `${hours} giờ`, 
            className: 'text-slate-600 font-bold', 
            bgClassName: 'bg-slate-50 border-slate-200',
            icon: Clock,
            urgent: false,
            expired: false
        };
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
                <div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-[0.2em] mb-4">
                        <Store size={14} /> Đơn hàng đối tác
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">ĐƠN HÀNG DỊCH VỤ CỦA TÔI</h1>
                    <p className="mt-3 text-slate-500 dark:text-slate-400 font-medium max-w-2xl">
                        Theo dõi các booking khách đã đặt trên những dịch vụ do bạn sở hữu.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-700/50 shadow-sm transition-all duration-300 hover:shadow-md">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Tổng đơn hàng</span>
                        <ClipboardList className="text-blue-500" size={22} />
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white">{orders.length}</div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-700/50 shadow-sm transition-all duration-300 hover:shadow-md">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Đã thanh toán</span>
                        <Package className="text-emerald-500" size={22} />
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white">{paidOrders}</div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-700/50 shadow-sm transition-all duration-300 hover:shadow-md">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Tổng giá trị</span>
                        <DollarSign className="text-amber-500" size={22} />
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white">{formatVietnameseCurrency(totalRevenue)}₫</div>
                </div>
            </div>

            {/* Quick Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 mb-6">
                <div className="flex items-center gap-3 mb-3">
                    <Filter size={18} className="text-slate-600 dark:text-slate-400" />
                    <span className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Bộ lọc nhanh</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setActiveFilter('all')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer ${
                            activeFilter === 'all'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                    >
                        <ClipboardList size={16} />
                        Tất cả
                        <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                            activeFilter === 'all' ? 'bg-blue-700' : 'bg-slate-200 dark:bg-slate-600'
                        }`}>
                            {filterCounts.all}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveFilter('pending-approval')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer ${
                            activeFilter === 'pending-approval'
                                ? 'bg-emerald-600 text-white shadow-md'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                    >
                        <Clock size={16} />
                        Chờ duyệt
                        {filterCounts['pending-approval'] > 0 && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                                activeFilter === 'pending-approval' ? 'bg-emerald-700' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                            }`}>
                                {filterCounts['pending-approval']}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveFilter('urgent')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer ${
                            activeFilter === 'urgent'
                                ? 'bg-amber-600 text-white shadow-md'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                    >
                        <AlertTriangle size={16} />
                        Khẩn cấp
                        {filterCounts.urgent > 0 && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-black animate-pulse ${
                                activeFilter === 'urgent' ? 'bg-amber-700' : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                            }`}>
                                {filterCounts.urgent}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveFilter('approved')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer ${
                            activeFilter === 'approved'
                                ? 'bg-purple-600 text-white shadow-md'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                    >
                        <CheckCircle size={16} />
                        Đã duyệt
                        <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                            activeFilter === 'approved' ? 'bg-purple-700' : 'bg-slate-200 dark:bg-slate-600'
                        }`}>
                            {filterCounts.approved}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveFilter('cancelled')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer ${
                            activeFilter === 'cancelled'
                                ? 'bg-slate-600 text-white shadow-md'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                    >
                        <XCircle size={16} />
                        Đã hủy
                        <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                            activeFilter === 'cancelled' ? 'bg-slate-700' : 'bg-slate-200 dark:bg-slate-600'
                        }`}>
                            {filterCounts.cancelled}
                        </span>
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-32">
                    <Loader2 className="animate-spin text-blue-600" size={48} />
                </div>
            ) : filteredOrders.length > 0 ? (
                <>
                    {/* Desktop View - Simplified Layout */}
                    <div className="hidden lg:block space-y-3">
                        {filteredOrders.map(order => {
                            const status = getStatusMeta(order.status, order.isApprovedByPartner);
                            const isPaid = resolveStatusKey(order.status) === 2 && !order.isApprovedByPartner;
                            const isProcessing = actionLoading === order.bookingId;
                            const deadline = formatDeadlineCountdown(order.hoursUntilDeadline);
                            const DeadlineIcon = deadline.icon;

                            return (
                                <div
                                    key={`${order.bookingId}-${order.serviceName}-${order.checkInDate}`}
                                    className={`bg-white dark:bg-slate-800 rounded-2xl border-2 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md ${
                                        deadline.expired ? 'border-rose-200 dark:border-rose-950/40 bg-rose-50/10 dark:bg-rose-950/10' : 
                                        deadline.urgent ? 'border-amber-200 dark:border-amber-950/40' : 
                                        'border-slate-100 dark:border-slate-700/50'
                                    }`}
                                >
                                    {/* Header Row */}
                                    <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-700/30 border-b border-slate-100 dark:border-slate-700/50">
                                        <div className="flex items-center gap-6">
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                                                    Mã đơn
                                                </div>
                                                <div className="text-xl font-black text-slate-900 dark:text-white">
                                                    #{order.bookingId}
                                                </div>
                                            </div>
                                            
                                            <div className="h-12 w-px bg-slate-200 dark:bg-slate-700"></div>
                                            
                                            <div className="flex-1">
                                                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                                                    Dịch vụ
                                                </div>
                                                <div className="text-base font-bold text-slate-900 dark:text-white">
                                                    {order.serviceName}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <span className={`inline-flex px-4 py-2 rounded-full text-sm font-black border ${status.className}`}>
                                                {status.label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Deadline Warning Banner (if urgent or expired) */}
                                    {isPaid && order.hoursUntilDeadline !== undefined && (deadline.urgent || deadline.expired) && (
                                        <div className={`px-6 py-3 border-b-2 ${deadline.bgClassName} border-b-${deadline.expired ? 'rose' : 'amber'}-200`}>
                                            <div className="flex items-center gap-3">
                                                <DeadlineIcon className={deadline.className.split(' ')[0]} size={20} />
                                                <div className="flex-1">
                                                    <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        {deadline.expired ? 'ĐÃ QUÁ HẠN DUYỆT' : 'KHẨN CẤP - CẦN DUYỆT NGAY'}
                                                    </span>
                                                    <div className={`text-lg ${deadline.className}`}>
                                                        {deadline.expired ? 'Đơn hàng sẽ bị hủy do quá hạn' : `Còn lại ${deadline.text}`}
                                                    </div>
                                                </div>
                                                {deadline.expired && (
                                                    <div className="text-xs text-rose-600 font-bold bg-white dark:bg-slate-800 px-3 py-1 rounded-full">
                                                        Chờ hủy & hoàn tiền
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Content Row */}
                                    <div className="px-6 py-4">
                                        <div className="grid grid-cols-5 gap-4">
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                                                    Khách hàng
                                                </div>
                                                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{order.customerName}</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{order.customerEmail}</div>
                                            </div>

                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                                                    Ngày đặt
                                                </div>
                                                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1">
                                                    <Clock size={14} className="text-purple-500" />
                                                    {formatVietnameseDate(order.createdAt)}
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                    {formatVietnameseTime(order.createdAt)}
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                                                    Check-in
                                                </div>
                                                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1">
                                                    <CalendarDays size={14} className="text-blue-500" />
                                                    {formatVietnameseDate(order.checkInDate)}
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                    Số lượng: {order.quantity}
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                                                    Tổng tiền
                                                </div>
                                                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                                                    {formatVietnameseCurrency(order.totalAmount)}₫
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    to={`/partner/orders/${order.bookingId}`}
                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-black hover:bg-blue-700 transition-colors duration-300"
                                                >
                                                    <Eye size={16} />
                                                    Chi tiết
                                                </Link>
                                                {isPaid && !deadline.expired && (
                                                    <>
                                                        <button
                                                            onClick={() => openApproveModal(order.bookingId)}
                                                            disabled={isProcessing}
                                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-black hover:bg-emerald-700 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                        >
                                                            {isProcessing ? (
                                                                <Loader2 className="animate-spin" size={16} />
                                                            ) : (
                                                                <CheckCircle size={16} />
                                                            )}
                                                            Duyệt
                                                        </button>
                                                        <button
                                                            onClick={() => openRejectModal(order.bookingId)}
                                                            disabled={isProcessing}
                                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-black hover:bg-rose-700 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                        >
                                                            <XCircle size={16} />
                                                            Từ chối
                                                        </button>
                                                    </>
                                                )}
                                                {isPaid && deadline.expired && (
                                                    <div className="text-xs text-slate-500 italic px-3">
                                                        Chờ hủy & hoàn tiền...
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Mobile View */}
                    <div className="lg:hidden space-y-4">
                        {filteredOrders.map(order => {
                            const status = getStatusMeta(order.status, order.isApprovedByPartner);
                            const isPaid = resolveStatusKey(order.status) === 2 && !order.isApprovedByPartner;
                            const isProcessing = actionLoading === order.bookingId;
                            const deadline = formatDeadlineCountdown(order.hoursUntilDeadline);
                            const DeadlineIcon = deadline.icon;

                            return (
                                <div
                                    key={`${order.bookingId}-${order.serviceName}-${order.checkInDate}`}
                                    className={`bg-white dark:bg-slate-800 rounded-2xl border-2 shadow-sm overflow-hidden ${
                                        deadline.expired ? 'border-rose-200 dark:border-rose-950/40' : 
                                        deadline.urgent ? 'border-amber-200 dark:border-amber-950/40' : 
                                        'border-slate-100 dark:border-slate-700/50'
                                    }`}
                                >
                                    {/* Header */}
                                    <div className="flex items-start justify-between gap-4 p-5 bg-slate-50 dark:bg-slate-700/30 border-b border-slate-100 dark:border-slate-700/50">
                                        <div>
                                            <div className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                                                Đơn hàng #{order.bookingId}
                                            </div>
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                                                {order.serviceName}
                                            </h3>
                                        </div>
                                        <span className={`inline-flex px-3 py-1.5 rounded-full text-xs font-black ${status.className}`}>
                                            {status.label}
                                        </span>
                                    </div>

                                    {/* Deadline Warning */}
                                    {isPaid && order.hoursUntilDeadline !== undefined && (deadline.urgent || deadline.expired) && (
                                        <div className={`p-4 border-b-2 ${deadline.bgClassName}`}>
                                            <div className="flex items-center gap-3">
                                                <DeadlineIcon className={deadline.className.split(' ')[0]} size={24} />
                                                <div className="flex-1">
                                                    <div className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">
                                                        {deadline.expired ? 'Quá hạn - Chờ hủy' : 'Khẩn cấp'}
                                                    </div>
                                                    <div className={`text-base ${deadline.className}`}>
                                                        {deadline.expired ? 'Chờ hủy & hoàn tiền' : `Còn lại ${deadline.text}`}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Content */}
                                    <div className="p-5">
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="bg-slate-50 dark:bg-slate-900/30 rounded-xl p-3">
                                                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                                                    Khách hàng
                                                </div>
                                                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{order.customerName}</div>
                                            </div>

                                            <div className="bg-slate-50 dark:bg-slate-900/30 rounded-xl p-3">
                                                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                                                    Ngày đặt
                                                </div>
                                                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1">
                                                    <Clock size={14} className="text-purple-500" />
                                                    {formatVietnameseDate(order.createdAt)}
                                                </div>
                                            </div>

                                            <div className="bg-slate-50 dark:bg-slate-900/30 rounded-xl p-3">
                                                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                                                    Check-in
                                                </div>
                                                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1">
                                                    <CalendarDays size={14} className="text-blue-500" />
                                                    {formatVietnameseDate(order.checkInDate)}
                                                </div>
                                            </div>

                                            <div className="bg-slate-50 dark:bg-slate-900/30 rounded-xl p-3">
                                                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                                                    Số lượng
                                                </div>
                                                <div className="font-black text-slate-900 dark:text-white text-lg">{order.quantity}</div>
                                            </div>

                                            <div className="bg-slate-50 dark:bg-slate-900/30 rounded-xl p-3 col-span-2">
                                                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                                                    Tổng tiền
                                                </div>
                                                <div className="font-black text-emerald-600 dark:text-emerald-400 text-xl">
                                                    {formatVietnameseCurrency(order.totalAmount)}₫
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-col gap-2">
                                            <Link
                                                to={`/partner/orders/${order.bookingId}`}
                                                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-black hover:bg-blue-700 transition-colors duration-300"
                                            >
                                                <Eye size={16} />
                                                Xem chi tiết
                                            </Link>
                                            {isPaid && !deadline.expired && (
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => openApproveModal(order.bookingId)}
                                                        disabled={isProcessing}
                                                        className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-black hover:bg-emerald-700 transition-colors duration-300 disabled:opacity-50 cursor-pointer"
                                                    >
                                                        {isProcessing ? (
                                                            <Loader2 className="animate-spin" size={16} />
                                                        ) : (
                                                            <CheckCircle size={16} />
                                                        )}
                                                        Duyệt
                                                    </button>
                                                    <button
                                                        onClick={() => openRejectModal(order.bookingId)}
                                                        disabled={isProcessing}
                                                        className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-600 text-white text-sm font-black hover:bg-rose-700 transition-colors duration-300 disabled:opacity-50 cursor-pointer"
                                                    >
                                                        <XCircle size={16} />
                                                        Từ chối
                                                    </button>
                                                </div>
                                            )}
                                            {isPaid && deadline.expired && (
                                                <div className="text-center text-sm text-slate-500 italic py-2">
                                                    Chờ hủy & hoàn tiền...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : orders.length > 0 ? (
                <div className="bg-slate-50 dark:bg-slate-900/30 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-700 p-14 text-center">
                    <div className="mx-auto size-16 rounded-3xl bg-white dark:bg-slate-800 text-slate-400 flex items-center justify-center shadow-sm mb-5">
                        <Filter size={30} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Không có đơn hàng phù hợp</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium max-w-md mx-auto mb-4">
                        Không tìm thấy đơn hàng nào với bộ lọc hiện tại.
                    </p>
                    <button
                        onClick={() => setActiveFilter('all')}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-700 transition-colors duration-300 cursor-pointer"
                    >
                        <ClipboardList size={18} />
                        Xem tất cả đơn hàng
                    </button>
                </div>
            ) : (
                <div className="bg-slate-50 dark:bg-slate-900/30 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-700 p-14 text-center">
                    <div className="mx-auto size-16 rounded-3xl bg-white dark:bg-slate-800 text-blue-500 flex items-center justify-center shadow-sm mb-5">
                        <ClipboardList size={30} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Chưa có booking nào</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium max-w-md mx-auto">
                        Khi khách đặt các dịch vụ của bạn, đơn hàng sẽ xuất hiện tại đây để bạn theo dõi.
                    </p>
                </div>
            )}

            {/* Approve Confirmation Modal */}
            {showApproveModal && (
                <div 
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto"
                    onClick={() => setShowApproveModal(false)}
                >
                    <div 
                        className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200 my-8 border border-slate-100 dark:border-slate-700"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center mb-6">
                            <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Xác nhận duyệt đơn hàng</h2>
                            <p className="text-slate-600 dark:text-slate-400">
                                Bạn có chắc chắn muốn duyệt đơn hàng <span className="font-black text-slate-900 dark:text-white">#{selectedBookingId}</span>?
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                                Khách hàng sẽ nhận được email thông báo và mã vé điện tử.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowApproveModal(false)}
                                disabled={actionLoading !== null}
                                className="flex-1 px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-200 font-black hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors duration-300 cursor-pointer disabled:opacity-50"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleApproveConfirm}
                                disabled={actionLoading !== null}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-700 transition-colors duration-300 cursor-pointer disabled:opacity-50"
                            >
                                {actionLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Đang xử lý...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={18} />
                                        Duyệt đơn
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div 
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto"
                    onClick={() => {
                        setShowRejectModal(false);
                        setRejectReason('');
                    }}
                >
                    <div 
                        className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar border border-slate-100 dark:border-slate-700"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center mb-6">
                            <div className="mx-auto w-16 h-16 bg-rose-100 dark:bg-rose-950/40 rounded-full flex items-center justify-center mb-4">
                                <XCircle className="text-rose-600 dark:text-rose-400" size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Từ chối đơn hàng</h2>
                            <p className="text-slate-600 dark:text-slate-400 mb-4">
                                Vui lòng nhập lý do từ chối đơn hàng <span className="font-black text-slate-900 dark:text-white">#{selectedBookingId}</span>
                            </p>
                        </div>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Ví dụ: Dịch vụ không còn sản phẩm/chỗ trống, không thể phục vụ vào ngày này..."
                            className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent mb-4 font-medium"
                            rows={4}
                            disabled={actionLoading !== null}
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                            ⚠️ Khách hàng sẽ nhận được email thông báo từ chối và được hoàn lại 100% tiền hàng.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setRejectReason('');
                                }}
                                disabled={actionLoading !== null}
                                className="flex-1 px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-200 font-black hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors duration-300 cursor-pointer disabled:opacity-50"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleRejectConfirm}
                                disabled={actionLoading !== null || !rejectReason.trim()}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-rose-600 text-white font-black hover:bg-rose-700 transition-colors duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {actionLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Đang xử lý...
                                    </>
                                ) : (
                                    <>
                                        <XCircle size={18} />
                                        Từ chối đơn
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div 
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto"
                    onClick={() => setShowSuccessModal(false)}
                >
                    <div 
                        className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200 my-8 border border-slate-100 dark:border-slate-700"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center">
                            <div className="mx-auto w-20 h-20 bg-emerald-100 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mb-4 animate-bounce">
                                <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Thành công!</h2>
                            <p className="text-slate-600 dark:text-slate-400 mb-6 whitespace-pre-line">
                                {successMessage}
                            </p>
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full px-6 py-3 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-700 transition-colors duration-300 cursor-pointer"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PartnerOrders;
