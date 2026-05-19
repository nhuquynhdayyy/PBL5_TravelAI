import { useEffect, useState } from 'react';
import {
    CalendarDays,
    ClipboardList,
    DollarSign,
    Loader2,
    Package,
    RefreshCw,
    Store
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';

type PartnerOrder = {
    bookingId: number;
    serviceName: string;
    customerName: string;
    checkInDate: string;
    quantity: number;
    totalAmount: number;
    status: number | string;
};

const statusMap: Record<number, { label: string; className: string }> = {
    1: { label: 'Cho thanh toan', className: 'bg-amber-100 text-amber-700 border border-amber-200' },
    2: { label: 'Da thanh toan', className: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
    3: { label: 'Da hoan tien', className: 'bg-sky-100 text-sky-700 border border-sky-200' },
    4: { label: 'Da huy', className: 'bg-rose-100 text-rose-700 border border-rose-200' }
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

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get('/bookings/partner-orders');
            setOrders(res.data ?? []);
        } catch (error) {
            console.error('Loi lay danh sach don hang cua partner:', error);
            alert('Khong the tai danh sach don hang luc nay.');
        } finally {
            setLoading(false);
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

    function getStatusMeta(status: number | string) {
        const key = resolveStatusKey(status);
        return statusMap[key] ?? {
            label: String(status),
            className: 'bg-slate-100 text-slate-600 border border-slate-200'
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
                        <div className="grid grid-cols-[1fr_1.2fr_1.2fr_1fr_0.8fr_1fr_1fr] gap-4 px-8 py-5 bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.18em]">
                            <div>Booking</div>
                            <div>Dich vu</div>
                            <div>Khach hang</div>
                            <div>Check-in</div>
                            <div>SL</div>
                            <div>Tong tien</div>
                            <div>Trang thai</div>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {orders.map(order => {
                                const status = getStatusMeta(order.status);

                                return (
                                    <div
                                        key={`${order.bookingId}-${order.serviceName}-${order.checkInDate}`}
                                        className="grid grid-cols-[1fr_1.2fr_1.2fr_1fr_0.8fr_1fr_1fr] gap-4 px-8 py-6 items-center text-sm"
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
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="lg:hidden space-y-4">
                        {orders.map(order => {
                            const status = getStatusMeta(order.status);

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

                                    <div className="grid grid-cols-2 gap-4 text-sm">
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
        </div>
    );
};

export default PartnerOrders;
