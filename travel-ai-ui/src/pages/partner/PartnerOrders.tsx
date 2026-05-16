import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    CalendarDays,
    CheckCircle,
    ClipboardList,
    DollarSign,
    Eye,
    Loader2,
    Package,
    RefreshCw,
    Store,
    XCircle
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';

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
};

const statusMap: Record<number, { label: string; className: string }> = {
    1: { label: 'Cho thanh toan', className: 'bg-amber-100 text-amber-700 border border-amber-200' },
    2: { label: 'Da thanh toan', className: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
    3: { label: 'Da hoan tien', className: 'bg-sky-100 text-sky-700 border border-sky-200' },
    4: { label: 'Da huy', className: 'bg-rose-100 text-rose-700 border border-rose-200' },
    // Special status for approved orders
    5: { label: 'Da duyet', className: 'bg-purple-100 text-purple-700 border border-purple-200' }
};

const stringStatusMap: Record<string, number> = {
    pending: 1,
    paid: 2,
    refunded: 3,
    cancelled: 4
};

const currencyFormatter = new Intl.NumberFormat('vi-VN');

const PartnerOrders = () => {
    const [orders, setOrders] = useState<PartnerOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    
    // Modal states
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get('/partner/orders');
            setOrders(res.data ?? []);
        } catch (error) {
            console.error('Loi lay danh sach don hang cua partner:', error);
            alert('Khong the tai danh sach don hang luc nay.');
        } finally {
            setLoading(false);
        }
    };

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
            await axiosClient.post(`/partner/orders/${selectedBookingId}/approve`);
            setShowApproveModal(false);
            setSuccessMessage('✅ Da duyet don hang thanh cong! Khach hang se nhan duoc email thong bao.');
            setShowSuccessModal(true);
            await fetchOrders();
        } catch (error: any) {
            console.error('Loi duyet don hang:', error);
            alert(error.response?.data?.message || 'Khong the duyet don hang.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectConfirm = async () => {
        if (!selectedBookingId || !rejectReason.trim()) {
            alert('Vui long nhap ly do tu choi.');
            return;
        }

        try {
            setActionLoading(selectedBookingId);
            await axiosClient.post(`/partner/orders/${selectedBookingId}/reject`, { 
                reason: rejectReason 
            });
            setShowRejectModal(false);
            setRejectReason('');
            setSuccessMessage('✅ Da tu choi don hang va hoan tien cho khach hang. Email thong bao da duoc gui.');
            setShowSuccessModal(true);
            await fetchOrders();
        } catch (error: any) {
            console.error('Loi tu choi don hang:', error);
            alert(error.response?.data?.message || 'Khong the tu choi don hang.');
        } finally {
            setActionLoading(null);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const paidOrders = orders.filter(order => resolveStatusKey(order.status) === 2).length;

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
            return { text: 'Đã hết hạn', className: 'text-rose-600', urgent: true };
        }

        if (hoursUntilDeadline < 2) {
            const minutes = Math.floor(hoursUntilDeadline * 60);
            return { 
                text: `Còn ${minutes} phút`, 
                className: 'text-rose-600 animate-pulse', 
                urgent: true 
            };
        }

        if (hoursUntilDeadline < 12) {
            const hours = Math.floor(hoursUntilDeadline);
            return { 
                text: `Còn ${hours}h`, 
                className: 'text-amber-600', 
                urgent: true 
            };
        }

        const hours = Math.floor(hoursUntilDeadline);
        return { 
            text: `Còn ${hours}h`, 
            className: 'text-slate-600', 
            urgent: false 
        };
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
                <div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-xs font-black uppercase tracking-[0.2em] mb-4">
                        <Store size={14} /> Partner Orders
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">DON HANG DICH VU CUA TOI</h1>
                    <p className="mt-3 text-slate-500 font-medium max-w-2xl">
                        Theo doi cac booking khach da dat tren nhung dich vu do ban so huu.
                    </p>
                </div>

                <button
                    onClick={fetchOrders}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-sm shadow-lg hover:bg-blue-600 transition-all active:scale-95"
                >
                    <RefreshCw size={18} /> Tai lai
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
                <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Tong don</span>
                        <ClipboardList className="text-blue-500" size={22} />
                    </div>
                    <div className="text-3xl font-black text-slate-900">{orders.length}</div>
                </div>

                <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Da thanh toan</span>
                        <Package className="text-emerald-500" size={22} />
                    </div>
                    <div className="text-3xl font-black text-slate-900">{paidOrders}</div>
                </div>

                <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Tong gia tri</span>
                        <DollarSign className="text-amber-500" size={22} />
                    </div>
                    <div className="text-3xl font-black text-slate-900">{currencyFormatter.format(totalRevenue)}d</div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-32">
                    <Loader2 className="animate-spin text-blue-600" size={48} />
                </div>
            ) : orders.length > 0 ? (
                <>
                    <div className="hidden lg:block bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                        <div className="grid grid-cols-[0.8fr_1.2fr_1.2fr_1fr_0.8fr_1fr_1fr_1fr_1.5fr] gap-4 px-8 py-5 bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.18em]">
                            <div>Booking</div>
                            <div>Dich vu</div>
                            <div>Khach hang</div>
                            <div>Check-in</div>
                            <div>SL</div>
                            <div>Tong tien</div>
                            <div>Trang thai</div>
                            <div>Deadline</div>
                            <div>Hanh dong</div>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {orders.map(order => {
                                const status = getStatusMeta(order.status, order.isApprovedByPartner);
                                const isPaid = resolveStatusKey(order.status) === 2 && !order.isApprovedByPartner;
                                const isProcessing = actionLoading === order.bookingId;
                                const deadline = formatDeadlineCountdown(order.hoursUntilDeadline);

                                return (
                                    <div
                                        key={`${order.bookingId}-${order.serviceName}-${order.checkInDate}`}
                                        className="grid grid-cols-[0.8fr_1.2fr_1.2fr_1fr_0.8fr_1fr_1fr_1fr_1.5fr] gap-4 px-8 py-6 items-center text-sm"
                                    >
                                        <div className="font-black text-slate-900">#{order.bookingId}</div>
                                        <div className="font-bold text-slate-700">{order.serviceName}</div>
                                        <div className="font-medium text-slate-600">{order.customerName}</div>
                                        <div className="font-medium text-slate-600">
                                            {new Date(order.checkInDate).toLocaleDateString('vi-VN')}
                                        </div>
                                        <div className="font-black text-slate-900">{order.quantity}</div>
                                        <div className="font-black text-emerald-600">
                                            {currencyFormatter.format(order.totalAmount)}d
                                        </div>
                                        <div>
                                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-black ${status.className}`}>
                                                {status.label}
                                            </span>
                                        </div>
                                        <div>
                                            {isPaid && order.hoursUntilDeadline !== undefined && (
                                                <div className="flex items-center gap-1">
                                                    {deadline.urgent && (
                                                        <span className="text-rose-500">⚠️</span>
                                                    )}
                                                    <span className={`text-xs font-black ${deadline.className}`}>
                                                        {deadline.text}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Link
                                                to={`/partner/orders/${order.bookingId}`}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-100 text-blue-700 text-xs font-black hover:bg-blue-200 transition-colors"
                                            >
                                                <Eye size={14} />
                                                Xem
                                            </Link>
                                            {isPaid && (
                                                <>
                                                    <button
                                                        onClick={() => openApproveModal(order.bookingId)}
                                                        disabled={isProcessing}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-700 text-xs font-black hover:bg-emerald-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {isProcessing ? (
                                                            <Loader2 className="animate-spin" size={14} />
                                                        ) : (
                                                            <CheckCircle size={14} />
                                                        )}
                                                        Duyet
                                                    </button>
                                                    <button
                                                        onClick={() => openRejectModal(order.bookingId)}
                                                        disabled={isProcessing}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-100 text-rose-700 text-xs font-black hover:bg-rose-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <XCircle size={14} />
                                                        Tu choi
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="lg:hidden space-y-4">
                        {orders.map(order => {
                            const status = getStatusMeta(order.status, order.isApprovedByPartner);
                            const isPaid = resolveStatusKey(order.status) === 2 && !order.isApprovedByPartner;
                            const isProcessing = actionLoading === order.bookingId;
                            const deadline = formatDeadlineCountdown(order.hoursUntilDeadline);

                            return (
                                <div
                                    key={`${order.bookingId}-${order.serviceName}-${order.checkInDate}`}
                                    className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm"
                                >
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div>
                                            <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400 mb-2">
                                                Booking #{order.bookingId}
                                            </div>
                                            <h3 className="text-xl font-black text-slate-900 leading-tight">
                                                {order.serviceName}
                                            </h3>
                                        </div>
                                        <span className={`inline-flex px-3 py-1 rounded-full text-[11px] font-black ${status.className}`}>
                                            {status.label}
                                        </span>
                                    </div>

                                    {isPaid && order.hoursUntilDeadline !== undefined && (
                                        <div className={`mb-4 p-3 rounded-xl ${deadline.urgent ? 'bg-rose-50 border border-rose-200' : 'bg-slate-50'}`}>
                                            <div className="flex items-center gap-2">
                                                {deadline.urgent && <span className="text-rose-500">⚠️</span>}
                                                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                                    Thời hạn duyệt:
                                                </span>
                                                <span className={`text-sm font-black ${deadline.className}`}>
                                                    {deadline.text}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                        <div className="bg-slate-50 rounded-2xl p-4">
                                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-2">
                                                Khach hang
                                            </p>
                                            <p className="font-bold text-slate-800">{order.customerName}</p>
                                        </div>

                                        <div className="bg-slate-50 rounded-2xl p-4">
                                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-2">
                                                So luong
                                            </p>
                                            <p className="font-bold text-slate-800">{order.quantity}</p>
                                        </div>

                                        <div className="bg-slate-50 rounded-2xl p-4">
                                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-2">
                                                Check-in
                                            </p>
                                            <p className="font-bold text-slate-800 flex items-center gap-2">
                                                <CalendarDays size={16} className="text-blue-500" />
                                                {new Date(order.checkInDate).toLocaleDateString('vi-VN')}
                                            </p>
                                        </div>

                                        <div className="bg-slate-50 rounded-2xl p-4">
                                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-2">
                                                Tong tien
                                            </p>
                                            <p className="font-black text-emerald-600">
                                                {currencyFormatter.format(order.totalAmount)}d
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Link
                                            to={`/partner/orders/${order.bookingId}`}
                                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-black hover:bg-blue-700 transition-colors"
                                        >
                                            <Eye size={16} />
                                            Xem chi tiet
                                        </Link>
                                        {isPaid && (
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => openApproveModal(order.bookingId)}
                                                    disabled={isProcessing}
                                                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-black hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isProcessing ? (
                                                        <Loader2 className="animate-spin" size={16} />
                                                    ) : (
                                                        <CheckCircle size={16} />
                                                    )}
                                                    Duyet
                                                </button>
                                                <button
                                                    onClick={() => openRejectModal(order.bookingId)}
                                                    disabled={isProcessing}
                                                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-black hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <XCircle size={16} />
                                                    Tu choi
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : (
                <div className="bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 p-14 text-center">
                    <div className="mx-auto size-16 rounded-3xl bg-white text-blue-500 flex items-center justify-center shadow-sm mb-5">
                        <ClipboardList size={30} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-3">Chua co booking nao</h2>
                    <p className="text-slate-500 font-medium max-w-md mx-auto">
                        Khi khach dat cac dich vu cua ban, don hang se xuat hien tai day de ban theo doi.
                    </p>
                </div>
            )}

            {/* Approve Confirmation Modal */}
            {showApproveModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="text-center mb-6">
                            <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle className="text-emerald-600" size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-2">Xac nhan duyet don hang</h2>
                            <p className="text-slate-600">
                                Ban co chac chan muon duyet don hang <span className="font-black">#{selectedBookingId}</span>?
                            </p>
                            <p className="text-sm text-slate-500 mt-2">
                                Khach hang se nhan duoc email thong bao.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowApproveModal(false)}
                                disabled={actionLoading !== null}
                                className="flex-1 px-6 py-3 rounded-2xl bg-slate-200 text-slate-900 font-black hover:bg-slate-300 transition-colors disabled:opacity-50"
                            >
                                Huy
                            </button>
                            <button
                                onClick={handleApproveConfirm}
                                disabled={actionLoading !== null}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {actionLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Dang xu ly...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={18} />
                                        Xac nhan duyet
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="text-center mb-6">
                            <div className="mx-auto w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                                <XCircle className="text-rose-600" size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-2">Tu choi don hang</h2>
                            <p className="text-slate-600 mb-4">
                                Vui long nhap ly do tu choi don hang <span className="font-black">#{selectedBookingId}</span>
                            </p>
                        </div>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Vi du: Dich vu khong con san, khong the phuc vu vao ngay nay..."
                            className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent mb-4 font-medium"
                            rows={4}
                            disabled={actionLoading !== null}
                        />
                        <p className="text-xs text-slate-500 mb-4">
                            ⚠️ Khach hang se nhan duoc email thong bao va duoc hoan tien 100%.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setRejectReason('');
                                }}
                                disabled={actionLoading !== null}
                                className="flex-1 px-6 py-3 rounded-2xl bg-slate-200 text-slate-900 font-black hover:bg-slate-300 transition-colors disabled:opacity-50"
                            >
                                Huy
                            </button>
                            <button
                                onClick={handleRejectConfirm}
                                disabled={actionLoading !== null || !rejectReason.trim()}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-rose-600 text-white font-black hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {actionLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Dang xu ly...
                                    </>
                                ) : (
                                    <>
                                        <XCircle size={18} />
                                        Xac nhan tu choi
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="text-center">
                            <div className="mx-auto w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
                                <CheckCircle className="text-emerald-600" size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-3">Thanh cong!</h2>
                            <p className="text-slate-600 mb-6 whitespace-pre-line">
                                {successMessage}
                            </p>
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full px-6 py-3 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-700 transition-colors"
                            >
                                Dong
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PartnerOrders;
