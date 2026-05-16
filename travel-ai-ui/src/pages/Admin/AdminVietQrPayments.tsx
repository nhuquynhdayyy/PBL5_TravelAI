import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Landmark, Loader2, RefreshCw, Search } from 'lucide-react';
import axiosClient from '../../api/axiosClient';

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
      alert('Khong tai duoc danh sach VietQR dang cho xac nhan.');
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
      `Xac nhan da nhan chuyen khoan VietQR cho booking #${payment.bookingId}?`
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

      alert(res.data?.message || 'Da xac nhan thanh toan VietQR.');
      await fetchPayments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Khong the xac nhan thanh toan VietQR.');
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 text-left">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.25em] text-emerald-600">
            <Landmark size={16} /> VietQR
          </p>
          <h1 className="mt-2 text-4xl font-black text-slate-900">Xac nhan chuyen khoan</h1>
          <p className="mt-2 max-w-2xl font-medium text-slate-500">
            Kiem tra sao ke ngan hang theo noi dung chuyen khoan, sau do xac nhan de chuyen booking sang da thanh toan.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchPayments}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-700 disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> TAI LAI
        </button>
      </div>

      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Search className="text-slate-400" size={20} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tim theo booking, ma giao dich, ten/email khach hang..."
          className="min-w-0 flex-1 font-bold text-slate-700 outline-none"
        />
      </div>

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center">
          <Loader2 className="animate-spin text-emerald-600" size={44} />
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <h2 className="text-2xl font-black text-slate-900">Khong co giao dich dang cho</h2>
          <p className="mt-2 font-medium text-slate-500">Cac giao dich VietQR pending se hien thi tai day.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-white shadow-xl">
          <div className="grid min-w-[980px] grid-cols-[110px_1.5fr_1fr_1fr_150px] gap-4 border-b border-slate-100 bg-slate-50 px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">
            <span>Booking</span>
            <span>Khach hang</span>
            <span>Dich vu</span>
            <span>Chuyen khoan</span>
            <span className="text-right">Thao tac</span>
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
                  <p className="line-clamp-2 font-black text-slate-900">{payment.serviceName || 'Dich vu du lich'}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {payment.checkInDate ? new Date(payment.checkInDate).toLocaleDateString('vi-VN') : 'Chua co ngay'} -
                    {' '}{payment.quantity} khach
                  </p>
                </div>
                <div>
                  <p className="font-black text-emerald-700">{currencyFormatter.format(payment.amount)} VND</p>
                  <p className="mt-1 break-all text-xs font-bold text-slate-500">{payment.transactionRef}</p>
                  <p className="mt-1 text-xs font-black text-slate-400">Noi dung: TRAVELAI BK{payment.bookingId}</p>
                </div>
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => confirmPayment(payment)}
                    disabled={confirmingId === payment.paymentId}
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {confirmingId === payment.paymentId ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    XAC NHAN
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
