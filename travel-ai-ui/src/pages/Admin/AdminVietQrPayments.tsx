import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw, Search } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

type PendingVietQrPayment = {
  paymentId: number;
  bookingId: number;
  transactionRef: string;
  amount: number;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  serviceName?: string | null;
  checkInDate?: string | null;
  quantity: number;
};

const currencyFormatter = new Intl.NumberFormat('vi-VN');

const AdminVietQrPayments = () => {
  const [payments, setPayments] = useState<PendingVietQrPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/payment/vietqr/pending');
      setPayments(res.data ?? []);
    } catch (err) {
      console.error(err);
      alert('Không tải được danh sách VietQR đang chờ xác nhận.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const filteredPayments = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return payments;
    }

    return payments.filter((payment) =>
      [
        payment.bookingId.toString(),
        payment.transactionRef,
        payment.customerName,
        payment.customerEmail,
        payment.serviceName ?? ''
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );
  }, [payments, search]);

  const confirmPayment = async (payment: PendingVietQrPayment) => {
    const confirmed = window.confirm(
      `Xác nhận đã nhận chuyển khoản VietQR cho booking #${payment.bookingId}?`
    );
    if (!confirmed) {
      return;
    }

    try {
      setConfirmingId(payment.paymentId);
      const res = await axiosClient.post('/payment/vietqr/confirm', {
        bookingId: payment.bookingId,
        amount: payment.amount
      });

      alert(res.data?.message || 'Đã xác nhận thanh toán VietQR.');
      await fetchPayments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể xác nhận thanh toán VietQR.');
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="admin-page text-left">
      <AdminPageHeader
        eyebrow="Thanh toán"
        title="Quản lý VietQR"
        description="Theo dõi cấu hình và giao dịch thanh toán qua VietQR trong hệ thống."
        actionLabel="Tải lại"
        actionIcon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />}
        onAction={fetchPayments}
        actionDisabled={loading}
      />

      <div className="admin-card mb-6 flex items-center gap-3 px-4 py-3">
        <Search className="text-slate-400" size={20} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm theo booking, mã giao dịch, tên/email khách hàng..."
          className="min-w-0 flex-1 font-bold text-slate-700 outline-none"
        />
      </div>

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center">
          <Loader2 className="animate-spin text-blue-600" size={44} />
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="admin-card border-dashed p-12 text-center">
          <h2 className="text-2xl font-black text-slate-900">Không có giao dịch đang chờ</h2>
          <p className="mt-2 font-medium text-slate-500">Các giao dịch VietQR đang chờ sẽ hiển thị tại đây.</p>
        </div>
      ) : (
        <div className="admin-card overflow-x-auto">
          <div className="grid min-w-[980px] grid-cols-[110px_1.5fr_1fr_1fr_150px] gap-4 border-b border-slate-100 bg-slate-50 px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">
            <span>Booking</span>
            <span>Khách hàng</span>
            <span>Dịch vụ</span>
            <span>Chuyển khoản</span>
            <span className="text-right">Thao tác</span>
          </div>
          <div className="divide-y divide-slate-100">
            {filteredPayments.map((payment) => (
              <article
                key={payment.paymentId}
                className="grid min-w-[980px] grid-cols-[110px_1.5fr_1fr_1fr_150px] gap-4 px-6 py-5 text-sm"
              >
                <div>
                  <p className="font-black text-slate-900">#{payment.bookingId}</p>
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    {new Date(payment.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
                <div>
                  <p className="font-black text-slate-900">{payment.customerName}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{payment.customerEmail}</p>
                </div>
                <div>
                  <p className="line-clamp-2 font-black text-slate-900">{payment.serviceName || 'Dịch vụ du lịch'}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {payment.checkInDate ? new Date(payment.checkInDate).toLocaleDateString('vi-VN') : 'Chưa có ngày'} -
                    {' '}{payment.quantity} khách
                  </p>
                </div>
                <div>
                  <p className="font-black text-blue-700">{currencyFormatter.format(payment.amount)} VND</p>
                  <p className="mt-1 break-all text-xs font-bold text-slate-500">{payment.transactionRef}</p>
                  <p className="mt-1 text-xs font-black text-slate-400">Nội dung: TRAVELAI BK{payment.bookingId}</p>
                </div>
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => confirmPayment(payment)}
                    disabled={confirmingId === payment.paymentId}
                    className="admin-button-success px-4 py-3 text-xs disabled:opacity-60"
                  >
                    {confirmingId === payment.paymentId ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    Xác nhận
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVietQrPayments;


