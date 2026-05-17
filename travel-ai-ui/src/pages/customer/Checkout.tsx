import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import {
  CreditCard,
  ShieldCheck,
  Calendar,
  Users,
  ArrowLeft,
  Loader2,
  Wallet,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { formatVietnameseDate } from '../../utils/dateTimeUtils';

const Checkout = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('vnpay');

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const res = await axiosClient.get(`/bookings/${bookingId}`);
        setBooking(res.data);
      } catch (err) {
        console.error(err);
        alert('Khong tim thay thong tin don hang!');
        navigate('/services');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, navigate]);

  const handlePayment = async () => {
    if (!booking || !bookingId) return;

    try {
      setPaying(true);
      const endpoint =
        paymentMethod === 'momo' ? '/payments/momo/create-url' : '/payments/vnpay/create-url';

      const res = await axiosClient.post(endpoint, {
        bookingId: Number(bookingId),
        amount: booking.totalAmount,
      });

      if (res.data.paymentUrl) {
        window.location.href = res.data.paymentUrl;
      }
    } catch (err) {
      console.error(err);
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as any).response?.data?.message
          : null;
      alert(message || 'Khong tao duoc cong thanh toan. Vui long thu lai.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="font-bold text-slate-400">Dang tai thong tin thanh toan...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 text-left">
      <button
        onClick={() => navigate(-1)}
        className="mb-8 flex items-center gap-2 font-bold text-slate-500 transition-colors hover:text-blue-600"
      >
        <ArrowLeft size={20} /> Quay lai
      </button>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-xl">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-black text-slate-900">
              <CreditCard className="text-blue-600" /> Phuong thuc thanh toan
            </h2>

            <div className="space-y-4">
              <div
                onClick={() => setPaymentMethod('vnpay')}
                className={`flex cursor-pointer items-center justify-between rounded-3xl border-2 p-6 transition-all ${
                  paymentMethod === 'vnpay'
                    ? 'border-blue-600 bg-blue-50/50'
                    : 'border-slate-100 hover:border-blue-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                    <CreditCard className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-black text-slate-800">VNPay QR / ATM / The quoc te</p>
                    <p className="text-xs font-medium text-slate-400">
                      Chuyen sang cong thanh toan VNPay
                    </p>
                  </div>
                </div>
                {paymentMethod === 'vnpay' && <CheckCircle2 className="text-blue-600" size={24} />}
              </div>

              <div
                onClick={() => setPaymentMethod('momo')}
                className={`flex cursor-pointer items-center justify-between rounded-3xl border-2 p-6 transition-all ${
                  paymentMethod === 'momo'
                    ? 'border-blue-600 bg-blue-50/50'
                    : 'border-slate-100 hover:border-blue-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                    <Wallet className="text-pink-600" />
                  </div>
                  <div>
                    <p className="font-black text-slate-800">MoMo Wallet</p>
                    <p className="text-xs font-medium text-slate-400">
                      Chuyen sang cong thanh toan MoMo
                    </p>
                  </div>
                </div>
                {paymentMethod === 'momo' && <CheckCircle2 className="text-blue-600" size={24} />}
              </div>
            </div>

            <div className="mt-8 flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <ShieldCheck className="shrink-0 text-green-600" size={20} />
              <p className="text-xs italic leading-relaxed text-slate-500">
                TravelAI tao URL thanh toan tren backend, redirect sang cong thanh toan va chi xac
                nhan booking sau khi callback hop le thanh cong.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-32 overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 text-white shadow-2xl">
            <Lock className="absolute -right-4 -top-4 size-32 rotate-12 text-white/5" />

            <h3 className="relative z-10 mb-6 text-xl font-black">Tom tat don hang</h3>

            <div className="relative z-10 mb-8 space-y-4">
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Dich vu</p>
                <p className="line-clamp-2 text-lg font-black text-blue-400">
                  {booking.serviceName || 'Dich vu du lich'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Ngay di</p>
                  <div className="mt-1 flex items-center gap-1.5 font-bold">
                    <Calendar size={14} className="text-blue-400" />
                    {formatVietnameseDate(booking.checkInDate)}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">So luong</p>
                  <div className="mt-1 flex items-center gap-1.5 font-bold">
                    <Users size={14} className="text-blue-400" />
                    {booking.quantity} khach
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 mb-8 rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">Tong tien thanh toan</span>
                <span className="text-2xl font-black text-white">
                  {new Intl.NumberFormat('vi-VN').format(booking.totalAmount)} VND
                </span>
              </div>
              <p className="text-right text-[10px] text-slate-400">Da bao gom thue va phi dich vu</p>
            </div>

            <button
              onClick={handlePayment}
              disabled={paying}
              className="relative z-10 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-5 text-lg font-black text-white shadow-xl shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {paying ? (
                <Loader2 className="animate-spin" />
              ) : paymentMethod === 'momo' ? (
                'THANH TOAN QUA MOMO'
              ) : (
                'THANH TOAN QUA VNPAY'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
