import { useEffect, useState } from 'react';
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
    AlertCircle
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';

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
    isApprovedByPartner?: boolean;
    approvedAt?: string;
    items: OrderItem[];
};

const statusMap: Record<number, { label: string; className: string; icon: any }> = {
    1: { label: 'Cho thanh toan', className: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertCircle },
    2: { label: 'Da thanh toan', className: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle },
    3: { label: 'Da hoan tien', className: 'bg-sky-100 text-sky-700 border-sky-200', icon: Package },
    4: { label: 'Da huy', className: 'bg-rose-100 text-rose-700 border-rose-200', icon: XCircle },
    5: { label: 'Da duyet', className: 'bg-purple-100 text-purple-700 border-purple-200', icon: CheckCircle }
};

const currencyFormatter = new Intl.NumberFormat('vi-VN');

const PartnerOrderDetail = () => {
    const { bookingId } = useParams<{ bookingId: string }>();
    const navigate = useNavigate();
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);

    useEffect(() => {
        fetchOrderDetail();
    }, [bookingId]);

    const fetchOrderDetail = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get(`/partner/orders/${bookingId}`);
            setOrder(res.data);
        } catch (error) {
            console.error('Loi lay chi tiet don hang:', error);
            alert('Khong the tai chi tiet don hang.');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!window.confirm('Ban co chac chan muon duyet don hang nay?')) {
            return;
        }

        try {
            setActionLoading(true);
            await axiosClient.post(`/partner/orders/${bookingId}/approve`);
            alert('Da duyet don hang thanh cong!');
            fetchOrderDetail();
        } catch (error: any) {
            console.error('Loi duyet don hang:', error);
            alert(error.response?.data?.message || 'Khong the duyet don hang.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            alert('Vui long nhap ly do tu choi.');
            return;
        }

        try {
            setActionLoading(true);
            await axiosClient.post(`/partner/orders/${bookingId}/reject`, {
                reason: rejectReason
            });
            alert('Da tu choi don hang va hoan tien cho khach hang.');
            setShowRejectModal(false);
            setRejectReason('');
            fetchOrderDetail();
        } catch (error: any) {
            console.error('Loi tu choi don hang:', error);
            alert(error.response?.data?.message || 'Khong the tu choi don hang.');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-10">
                <div className="text-center">
                    <h2 className="text-2xl font-black text-slate-900 mb-3">Khong tim thay don hang</h2>
                    <button
                        onClick={() => navigate('/partner/orders')}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white font-black"
                    >
                        <ArrowLeft size={18} /> Quay lai
                    </button>
                </div>
            </div>
        );
    }

    const statusKey = order.isApprovedByPartner && order.status === 2 ? 5 : order.status;
    const status = statusMap[statusKey] || statusMap[1];
    const StatusIcon = status.icon;
    const canApproveOrReject = order.status === 2 && !order.isApprovedByPartner; // Paid and not approved yet

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <button
                onClick={() => navigate('/partner/orders')}
                className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold mb-6"
            >
                <ArrowLeft size={20} /> Quay lai danh sach
            </button>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-8 mb-6">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400 mb-2">
                            Don hang
                        </div>
                        <h1 className="text-3xl font-black text-slate-900">#{order.bookingId}</h1>
                    </div>
                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black border ${status.className}`}>
                        <StatusIcon size={16} />
                        {status.label}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-slate-50 rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <User className="text-blue-500" size={20} />
                            <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                                Khach hang
                            </span>
                        </div>
                        <p className="text-lg font-black text-slate-900">{order.customerName}</p>
                        <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                            <Mail size={14} />
                            {order.customerEmail}
                        </p>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <CreditCard className="text-emerald-500" size={20} />
                            <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                                Thanh toan
                            </span>
                        </div>
                        <p className="text-lg font-black text-emerald-600">
                            {currencyFormatter.format(order.totalAmount)}d
                        </p>
                        {order.paymentMethod && (
                            <p className="text-sm text-slate-600 mt-1">
                                Phuong thuc: {order.paymentMethod}
                            </p>
                        )}
                        {order.refundedAmount > 0 && (
                            <p className="text-sm text-rose-600 mt-1">
                                Da hoan: {currencyFormatter.format(order.refundedAmount)}d
                            </p>
                        )}
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <Calendar className="text-purple-500" size={20} />
                            <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                                Ngay dat
                            </span>
                        </div>
                        <p className="text-lg font-bold text-slate-900">
                            {new Date(order.createdAt).toLocaleString('vi-VN')}
                        </p>
                    </div>

                    {order.paymentTime && (
                        <div className="bg-slate-50 rounded-2xl p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <CheckCircle className="text-emerald-500" size={20} />
                                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                                    Ngay thanh toan
                                </span>
                            </div>
                            <p className="text-lg font-bold text-slate-900">
                                {new Date(order.paymentTime).toLocaleString('vi-VN')}
                            </p>
                        </div>
                    )}

                    {order.isApprovedByPartner && order.approvedAt && (
                        <div className="bg-purple-50 rounded-2xl p-5 border-2 border-purple-200">
                            <div className="flex items-center gap-3 mb-3">
                                <CheckCircle className="text-purple-600" size={20} />
                                <span className="text-xs font-black uppercase tracking-[0.18em] text-purple-600">
                                    Ngay duyet
                                </span>
                            </div>
                            <p className="text-lg font-bold text-purple-900">
                                {new Date(order.approvedAt).toLocaleString('vi-VN')}
                            </p>
                            <p className="text-sm text-purple-600 mt-2">
                                ✓ Don hang da duoc duyet boi partner
                            </p>
                        </div>
                    )}
                </div>

                <div className="border-t border-slate-200 pt-6">
                    <h2 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
                        <Package size={20} />
                        Chi tiet dich vu
                    </h2>
                    <div className="space-y-4">
                        {order.items.map((item, index) => (
                            <div key={index} className="bg-slate-50 rounded-2xl p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="text-lg font-black text-slate-900">{item.serviceName}</h3>
                                    <span className="text-lg font-black text-emerald-600">
                                        {currencyFormatter.format(item.priceAtBooking * item.quantity)}d
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-slate-500">So luong:</span>
                                        <span className="ml-2 font-bold text-slate-900">{item.quantity}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Don gia:</span>
                                        <span className="ml-2 font-bold text-slate-900">
                                            {currencyFormatter.format(item.priceAtBooking)}d
                                        </span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-slate-500">Check-in:</span>
                                        <span className="ml-2 font-bold text-slate-900">
                                            {new Date(item.checkInDate).toLocaleDateString('vi-VN')}
                                        </span>
                                    </div>
                                    {item.notes && (
                                        <div className="col-span-2">
                                            <span className="text-slate-500">Ghi chu:</span>
                                            <p className="mt-1 text-slate-700">{item.notes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {canApproveOrReject && (
                    <div className="border-t border-slate-200 pt-6 mt-6">
                        <h2 className="text-lg font-black text-slate-900 mb-4">Hanh dong</h2>
                        <div className="flex gap-4">
                            <button
                                onClick={handleApprove}
                                disabled={actionLoading}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {actionLoading ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    <CheckCircle size={18} />
                                )}
                                Duyet don hang
                            </button>
                            <button
                                onClick={() => setShowRejectModal(true)}
                                disabled={actionLoading}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-rose-600 text-white font-black hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <XCircle size={18} />
                                Tu choi don hang
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[2rem] p-8 max-w-md w-full">
                        <h2 className="text-2xl font-black text-slate-900 mb-4">Tu choi don hang</h2>
                        <p className="text-slate-600 mb-4">
                            Vui long nhap ly do tu choi don hang. Khach hang se nhan duoc email thong bao va duoc hoan tien.
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Nhap ly do tu choi..."
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 mb-4"
                            rows={4}
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setRejectReason('');
                                }}
                                disabled={actionLoading}
                                className="flex-1 px-6 py-3 rounded-2xl bg-slate-200 text-slate-900 font-black hover:bg-slate-300 disabled:opacity-50"
                            >
                                Huy
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={actionLoading || !rejectReason.trim()}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-rose-600 text-white font-black hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {actionLoading ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    <XCircle size={18} />
                                )}
                                Xac nhan tu choi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PartnerOrderDetail;
