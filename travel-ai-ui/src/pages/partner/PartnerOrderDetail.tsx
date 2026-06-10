import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Calendar,
    CheckCircle,
    CreditCard,
    Loader2,
    Mail,
    Package,
    User,
    XCircle,
    AlertCircle,
    Clock,
    FileText
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../api/axiosClient';
import { 
    formatVietnameseDate, 
    formatVietnameseDateTime,
    formatVietnameseCurrency 
} from '../../utils/dateTimeUtils';

type OrderItem = {
    serviceId: number;
    serviceName: string;
    quantity: number;
    priceAtBooking: number;
    checkInDate: string;
    notes?: string;
};

type OrderDetail = {
    bookingId: number;
    customerName: string;
    customerEmail: string;
    status: number;
    totalAmount: number;
    createdAt: string;
    paymentMethod?: string;
    paymentTime?: string;
    refundedAmount: number;
    cancellationReason?: string;
    isApprovedByPartner?: boolean;
    approvedAt?: string;
    items: OrderItem[];
};

const statusMap: Record<number, { label: string; className: string; icon: any }> = {
    1: { 
        label: 'Chờ thanh toán', 
        className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50', 
        icon: AlertCircle 
    },
    2: { 
        label: 'Đã thanh toán', 
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50', 
        icon: CheckCircle 
    },
    3: { 
        label: 'Đã hoàn tiền', 
        className: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/50', 
        icon: Package 
    },
    4: { 
        label: 'Đã hủy', 
        className: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50', 
        icon: XCircle 
    },
    5: { 
        label: 'Đã duyệt', 
        className: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/50', 
        icon: CheckCircle 
    }
};

const PartnerOrderDetail = () => {
    const { bookingId } = useParams<{ bookingId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    // Modal states
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const { data: order, isLoading: loading } = useQuery<OrderDetail>({
        queryKey: ['partner-order-detail', bookingId],
        queryFn: async () => {
            const res = await axiosClient.get(`/partner/orders/${bookingId}`);
            return res.data;
        },
        enabled: !!bookingId,
    });

    const approveMutation = useMutation({
        mutationFn: () => axiosClient.post(`/partner/orders/${bookingId}/approve`),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['partner-order-detail', bookingId] });
            void queryClient.invalidateQueries({ queryKey: ['partner-orders'] });
            void queryClient.invalidateQueries({ queryKey: ['partner-pending-count'] });
        },
        onError: (error: any) => {
            alert(error.response?.data?.message || 'Không thể duyệt đơn hàng.');
        },
    });

    const rejectMutation = useMutation({
        mutationFn: (reason: string) =>
            axiosClient.post(`/partner/orders/${bookingId}/reject`, { reason }),
        onSuccess: () => {
            setShowRejectModal(false);
            setRejectReason('');
            void queryClient.invalidateQueries({ queryKey: ['partner-order-detail', bookingId] });
            void queryClient.invalidateQueries({ queryKey: ['partner-orders'] });
            void queryClient.invalidateQueries({ queryKey: ['partner-pending-count'] });
        },
        onError: (error: any) => {
            alert(error.response?.data?.message || 'Không thể từ chối đơn hàng.');
        },
    });

    const actionLoading = approveMutation.isPending || rejectMutation.isPending;

    // Lock body scroll when modal is open
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

    const handleApproveConfirm = async () => {
        try {
            await approveMutation.mutateAsync();
            setShowApproveModal(false);
            setSuccessMessage('✅ Đã duyệt đơn hàng thành công! Khách hàng sẽ nhận được email thông báo.');
            setShowSuccessModal(true);
        } catch (error) {
            console.error('Approve failed:', error);
        }
    };

    const handleRejectConfirm = async () => {
        if (!rejectReason.trim()) {
            alert('Vui lòng nhập lý do từ chối.');
            return;
        }
        try {
            await rejectMutation.mutateAsync(rejectReason);
            setShowRejectModal(false);
            setRejectReason('');
            setSuccessMessage('✅ Đã từ chối đơn hàng và hoàn tiền cho khách hàng. Email thông báo đã được gửi.');
            setShowSuccessModal(true);
        } catch (error) {
            console.error('Reject failed:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-slate-50 dark:bg-slate-900">
                <Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={48} />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-20 bg-slate-50 dark:bg-slate-900">
                <div className="text-center bg-white dark:bg-slate-800 rounded-[2.5rem] p-12 shadow-sm border border-slate-100 dark:border-slate-700/50">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">Không tìm thấy đơn hàng</h2>
                    <button
                        onClick={() => navigate('/partner/orders')}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black transition-all duration-300 active:scale-95 cursor-pointer"
                    >
                        <ArrowLeft size={18} /> Quay lại danh sách
                    </button>
                </div>
            </div>
        );
    }

    const statusKey = order.isApprovedByPartner && order.status === 2 ? 5 : order.status;
    const status = statusMap[statusKey] || statusMap[1];
    const StatusIcon = status.icon;
    const canApproveOrReject = order.status === 2 && !order.isApprovedByPartner;

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <button
                onClick={() => navigate('/partner/orders')}
                className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-bold mb-6 transition-colors duration-200"
            >
                <ArrowLeft size={20} /> Quay lại danh sách đơn hàng
            </button>

            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 shadow-xl p-8 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 mb-1">
                            Chi tiết đơn hàng
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white">#{order.bookingId}</h1>
                    </div>
                    <div>
                        <span className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-black border ${status.className}`}>
                            <StatusIcon size={16} />
                            {status.label}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-slate-50 dark:bg-slate-900/30 rounded-2xl p-5 border border-slate-100/50 dark:border-slate-800">
                        <div className="flex items-center gap-3 mb-3">
                            <User className="text-blue-500" size={20} />
                            <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                                Khách hàng
                            </span>
                        </div>
                        <p className="text-lg font-black text-slate-900 dark:text-white">{order.customerName}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2 mt-1">
                            <Mail size={14} />
                            {order.customerEmail}
                        </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/30 rounded-2xl p-5 border border-slate-100/50 dark:border-slate-800">
                        <div className="flex items-center gap-3 mb-3">
                            <CreditCard className="text-emerald-500" size={20} />
                            <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                                Thanh toán
                            </span>
                        </div>
                        <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                            {formatVietnameseCurrency(order.totalAmount)}₫
                        </p>
                        <div className="mt-1 flex flex-col gap-0.5 text-sm text-slate-600 dark:text-slate-400">
                            {order.paymentMethod && (
                                <p>
                                    Phương thức: <span className="font-bold text-slate-800 dark:text-slate-200">{order.paymentMethod}</span>
                                </p>
                            )}
                            {order.refundedAmount > 0 && (
                                <p className="text-rose-600 dark:text-rose-400 font-bold">
                                    Đã hoàn: {formatVietnameseCurrency(order.refundedAmount)}₫
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/30 rounded-2xl p-5 border border-slate-100/50 dark:border-slate-800">
                        <div className="flex items-center gap-3 mb-3">
                            <Calendar className="text-purple-500" size={20} />
                            <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                                Ngày đặt
                            </span>
                        </div>
                        <p className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Clock size={16} className="text-slate-400" />
                            {formatVietnameseDateTime(order.createdAt)}
                        </p>
                    </div>

                    {order.paymentTime && (
                        <div className="bg-slate-50 dark:bg-slate-900/30 rounded-2xl p-5 border border-slate-100/50 dark:border-slate-800">
                            <div className="flex items-center gap-3 mb-3">
                                <CheckCircle className="text-emerald-500" size={20} />
                                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                                    Ngày thanh toán
                                </span>
                            </div>
                            <p className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Clock size={16} className="text-slate-400" />
                                {formatVietnameseDateTime(order.paymentTime)}
                            </p>
                        </div>
                    )}

                    {order.isApprovedByPartner && order.approvedAt && (
                        <div className="bg-purple-50/50 dark:bg-purple-950/10 rounded-2xl p-5 border-2 border-purple-200 dark:border-purple-900/30 col-span-1 md:col-span-2">
                            <div className="flex items-center gap-3 mb-3">
                                <CheckCircle className="text-purple-600 dark:text-purple-400" size={20} />
                                <span className="text-xs font-black uppercase tracking-[0.18em] text-purple-600 dark:text-purple-400">
                                    Ngày duyệt của đối tác
                                </span>
                            </div>
                            <p className="text-lg font-bold text-purple-900 dark:text-purple-300">
                                {formatVietnameseDateTime(order.approvedAt)}
                            </p>
                            <p className="text-sm text-purple-600 dark:text-purple-400 mt-2 font-medium">
                                ✓ Đơn hàng đã được duyệt thành công bởi đối tác.
                            </p>
                        </div>
                    )}
                </div>

                {/* Hiển thị lý do hủy nếu đơn đã hủy */}
                {order.status === 4 && order.cancellationReason && (
                    <div className="mb-8 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border-2 border-rose-200 dark:border-rose-900/30 p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <XCircle className="text-rose-600 dark:text-rose-400" size={20} />
                            <span className="text-xs font-black uppercase tracking-[0.18em] text-rose-600 dark:text-rose-400">
                                Lý do hủy đơn
                            </span>
                        </div>
                        <p className="text-base font-semibold text-rose-700 dark:text-rose-400">
                            {order.cancellationReason.replace(/^Partner rejected:\s*/i, '')}
                        </p>
                    </div>
                )}

                <div className="border-t border-slate-200 dark:border-slate-700/60 pt-6">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Package size={20} className="text-blue-500" />
                        Chi tiết dịch vụ đã đặt
                    </h2>
                    <div className="space-y-4">
                        {order.items.map((item, index) => (
                            <div key={index} className="bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-2xl p-5">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white leading-snug">{item.serviceName}</h3>
                                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                        {formatVietnameseCurrency(item.priceAtBooking * item.quantity)}₫
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                    <div className="flex items-center justify-between sm:justify-start bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                        <span className="text-slate-400 font-bold">Số lượng:</span>
                                        <span className="ml-2 font-black text-slate-900 dark:text-white">{item.quantity}</span>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-start bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                        <span className="text-slate-400 font-bold">Đơn giá:</span>
                                        <span className="ml-2 font-black text-slate-900 dark:text-white">
                                            {formatVietnameseCurrency(item.priceAtBooking)}₫
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-start bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/50 sm:col-span-2">
                                        <span className="text-slate-400 font-bold">Ngày sử dụng (Check-in):</span>
                                        <span className="ml-2 font-black text-slate-900 dark:text-white">
                                            {formatVietnameseDate(item.checkInDate)}
                                        </span>
                                    </div>
                                    {item.notes && (
                                        <div className="sm:col-span-2 bg-amber-50/40 dark:bg-amber-950/10 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30">
                                            <span className="text-amber-800 dark:text-amber-400 font-bold text-xs uppercase tracking-wider block mb-1">Ghi chú từ khách:</span>
                                            <p className="text-slate-700 dark:text-slate-300 font-medium">{item.notes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {canApproveOrReject && (
                    <div className="border-t border-slate-200 dark:border-slate-700/60 pt-6 mt-6">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4">Thao tác xử lý</h2>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={() => setShowApproveModal(true)}
                                disabled={actionLoading}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black transition-all duration-300 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {actionLoading ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    <CheckCircle size={18} />
                                )}
                                Duyệt đơn hàng
                            </button>
                            <button
                                onClick={() => setShowRejectModal(true)}
                                disabled={actionLoading}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black transition-all duration-300 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <XCircle size={18} />
                                Từ chối đơn hàng
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Custom Approve Modal */}
            {showApproveModal && (
                <div 
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto animate-fade-in"
                    onClick={() => setShowApproveModal(false)}
                >
                    <div 
                        className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200 border border-slate-100 dark:border-slate-700"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center mb-6">
                            <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Xác nhận duyệt đơn</h2>
                            <p className="text-slate-600 dark:text-slate-400">
                                Bạn có chắc chắn muốn duyệt đơn hàng <span className="font-black text-slate-900 dark:text-white">#{order.bookingId}</span>?
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                                Hệ thống sẽ gửi email xác nhận cùng mã vé điện tử tới khách hàng.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowApproveModal(false)}
                                disabled={actionLoading}
                                className="flex-1 px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-300 cursor-pointer disabled:opacity-50"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleApproveConfirm}
                                disabled={actionLoading}
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

            {/* Custom Reject Modal */}
            {showRejectModal && (
                <div 
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto animate-fade-in"
                    onClick={() => {
                        setShowRejectModal(false);
                        setRejectReason('');
                    }}
                >
                    <div 
                        className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-700"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center mb-6">
                            <div className="mx-auto w-16 h-16 bg-rose-100 dark:bg-rose-950/40 rounded-full flex items-center justify-center mb-4">
                                <XCircle className="text-rose-600 dark:text-rose-400" size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Từ chối đơn hàng</h2>
                            <p className="text-slate-600 dark:text-slate-400 mb-4">
                                Vui lòng điền lý do từ chối đơn hàng <span className="font-black text-slate-900 dark:text-white">#{order.bookingId}</span>
                            </p>
                        </div>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Ví dụ: Dịch vụ hết chỗ, không thể phục vụ vào ngày này..."
                            className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent mb-4 font-medium"
                            rows={4}
                            disabled={actionLoading}
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                            ⚠️ Khách hàng sẽ nhận được email thông báo hủy đơn và hoàn lại 100% tiền qua phương thức đã thanh toán.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setRejectReason('');
                                }}
                                disabled={actionLoading}
                                className="flex-1 px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-300 cursor-pointer disabled:opacity-50"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleRejectConfirm}
                                disabled={actionLoading || !rejectReason.trim()}
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

            {/* Custom Success Modal */}
            {showSuccessModal && (
                <div 
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto"
                    onClick={() => setShowSuccessModal(false)}
                >
                    <div 
                        className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-700 animate-in zoom-in duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center font-bold">
                            <div className="mx-auto w-20 h-20 bg-emerald-100 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mb-4 animate-bounce">
                                <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Thành công!</h2>
                            <p className="text-slate-600 dark:text-slate-400 mb-6 font-medium whitespace-pre-line">
                                {successMessage}
                            </p>
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full px-6 py-3 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-700 transition-colors duration-300 cursor-pointer active:scale-95"
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

export default PartnerOrderDetail;

