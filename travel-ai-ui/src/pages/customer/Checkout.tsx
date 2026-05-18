import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  MapPin,
  QrCode,
  ShieldCheck,
  Store,
  Tag,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import { formatVietnameseDate } from '../../utils/dateTimeUtils';

const promotions: Record<string, { percent: number; maxAmount: number }> = {
  TRAVELAI10: { percent: 10, maxAmount: 100000 },
  WELCOME5: { percent: 5, maxAmount: 50000 },
};

const Checkout = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'vnpay' | 'momo' | 'vietqr' | 'counter'>('vnpay');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [promotionCode, setPromotionCode] = useState('');
  const [appliedPromotion, setAppliedPromotion] = useState<string | null>(null);
  const [promotionMessage, setPromotionMessage] = useState('');
  const [offlinePayment, setOfflinePayment] = useState<any>(null);

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

  const discountAmount = useMemo(() => {
    if (!booking || !appliedPromotion) return 0;
    const promo = promotions[appliedPromotion];
    if (!promo) return 0;

    return Math.min((booking.totalAmount * promo.percent) / 100, promo.maxAmount);
  }, [appliedPromotion, booking]);

  const finalAmount = useMemo(() => {
    if (!booking) return 0;
    return Math.max(0, booking.totalAmount - discountAmount);
  }, [booking, discountAmount]);

  const applyPromotion = () => {
    const normalizedCode = promotionCode.trim().toUpperCase();
    if (!normalizedCode) {
      setAppliedPromotion(null);
      setPromotionMessage('Nhap ma giam gia de ap dung.');
      return;
    }

    if (!promotions[normalizedCode]) {
      setAppliedPromotion(null);
      setPromotionMessage('Ma giam gia khong hop le hoac da het han.');
      return;
    }

    setAppliedPromotion(normalizedCode);
    setPromotionMessage(`Da ap dung ma ${normalizedCode}.`);
  };

  const handlePayment = async () => {
    if (!booking || !bookingId) return;

    if (offlinePayment?.type === 'vietqr' && paymentMethod === 'vietqr') {
      navigate(
        `/booking-success/${bookingId}?paymentStatus=offline&message=${encodeURIComponent(
          'Da ghi nhan thong tin chuyen khoan VietQR. TravelAI se doi soat va xac nhan thanh toan.'
        )}`
      );
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Vui long nhap thong tin khach hang.');
      return;
    }

    try {
      setPaying(true);
      setOfflinePayment(null);

      if (paymentMethod === 'vietqr') {
        const res = await axiosClient.post('/payment/vietqr/create', {
          bookingId: Number(bookingId),
          amount: finalAmount,
        });

        setOfflinePayment({ type: 'vietqr', ...res.data });
        return;
      }

      if (paymentMethod === 'counter') {
        const res = await axiosClient.post('/payment/counter/create', {
          bookingId: Number(bookingId),
          amount: finalAmount,
        });

        setOfflinePayment({ type: 'counter', ...res.data });
        navigate(
          `/booking-success/${bookingId}?paymentStatus=offline&message=${encodeURIComponent(
            res.data.message || 'Da dat cho thanh cong. Vui long thanh toan tai quay de hoan tat.'
          )}`
        );
        return;
      }

      const endpoint =
        paymentMethod === 'momo' ? '/payment/momo/create' : '/payment/vnpay/create';

      const res = await axiosClient.post(endpoint, {
        bookingId: Number(bookingId),
        returnUrl: `${window.location.origin}/payment-result/${paymentMethod}`,
      });

      const paymentUrl = res.data.paymentUrl || res.data.payUrl || res.data.deeplink;
      if (!paymentUrl) {
        alert(res.data.message || 'Cong thanh toan khong tra ve duong dan thanh toan.');
        return;
      }

      window.location.href = paymentUrl;
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

      <div className="grid gap-10 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-3xl border border-slate-100 bg-white p-8 shadow-xl">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-black text-slate-900">
              <User className="text-blue-600" /> Thong tin khach hang
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-blue-500"
                placeholder="Ho ten khach hang"
              />
              <input
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-blue-500"
                placeholder="So dien thoai"
              />
            </div>
          </section>

          <section className="rounded-3xl border border-slate-100 bg-white p-8 shadow-xl">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-black text-slate-900">
              <CreditCard className="text-blue-600" /> Phuong thuc thanh toan
            </h2>

            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setPaymentMethod('vnpay')}
                className={`flex w-full items-center justify-between rounded-3xl border-2 p-6 text-left transition-all ${
                  paymentMethod === 'vnpay'
                    ? 'border-blue-600 bg-blue-50/50'
                    : 'border-slate-100 hover:border-blue-200'
                }`}
              >
                <span className="flex items-center gap-4">
                  <span className="rounded-2xl bg-white p-3 shadow-sm">
                    <CreditCard className="text-blue-600" />
                  </span>
                  <span>
                    <span className="block font-black text-slate-800">VNPay QR</span>
                    <span className="text-xs font-medium text-slate-400">Redirect sang cong VNPay</span>
                  </span>
                </span>
                {paymentMethod === 'vnpay' && <CheckCircle2 className="text-blue-600" size={24} />}
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('momo')}
                className={`flex w-full items-center justify-between rounded-3xl border-2 p-6 text-left transition-all ${
                  paymentMethod === 'momo'
                    ? 'border-blue-600 bg-blue-50/50'
                    : 'border-slate-100 hover:border-blue-200'
                }`}
              >
                <span className="flex items-center gap-4">
                  <span className="rounded-2xl bg-white p-3 shadow-sm">
                    <Wallet className="text-pink-600" />
                  </span>
                  <span>
                    <span className="block font-black text-slate-800">MoMo Wallet</span>
                    <span className="text-xs font-medium text-slate-400">Redirect sang cong MoMo</span>
                  </span>
                </span>
                {paymentMethod === 'momo' && <CheckCircle2 className="text-blue-600" size={24} />}
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('vietqr')}
                className={`flex w-full items-center justify-between rounded-3xl border-2 p-6 text-left transition-all ${
                  paymentMethod === 'vietqr'
                    ? 'border-blue-600 bg-blue-50/50'
                    : 'border-slate-100 hover:border-blue-200'
                }`}
              >
                <span className="flex items-center gap-4">
                  <span className="rounded-2xl bg-white p-3 shadow-sm">
                    <Landmark className="text-emerald-600" />
                  </span>
                  <span>
                    <span className="block font-black text-slate-800">VietQR VietinBank</span>
                    <span className="text-xs font-medium text-slate-400">Quet QR den STK 0888233738</span>
                  </span>
                </span>
                {paymentMethod === 'vietqr' && <CheckCircle2 className="text-blue-600" size={24} />}
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('counter')}
                className={`flex w-full items-center justify-between rounded-3xl border-2 p-6 text-left transition-all ${
                  paymentMethod === 'counter'
                    ? 'border-blue-600 bg-blue-50/50'
                    : 'border-slate-100 hover:border-blue-200'
                }`}
              >
                <span className="flex items-center gap-4">
                  <span className="rounded-2xl bg-white p-3 shadow-sm">
                    <Store className="text-slate-700" />
                  </span>
                  <span>
                    <span className="block font-black text-slate-800">Thanh toan tai quay</span>
                    <span className="text-xs font-medium text-slate-400">Nhan ma thanh toan va tra tien tai quay</span>
                  </span>
                </span>
                {paymentMethod === 'counter' && <CheckCircle2 className="text-blue-600" size={24} />}
              </button>
            </div>
          </section>

          {offlinePayment?.type === 'vietqr' && paymentMethod === 'vietqr' && (
            <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-8 shadow-xl">
              <h2 className="mb-6 flex items-center gap-2 text-2xl font-black text-slate-900">
                <QrCode className="text-emerald-600" /> VietQR
              </h2>
              <div className="grid gap-6 md:grid-cols-[220px_1fr]">
                <div className="flex aspect-square items-center justify-center rounded-2xl bg-white p-3 shadow-sm">
                  <img src={offlinePayment.qrImageUrl} alt="VietQR" className="h-full w-full object-contain" />
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Ngan hang</p>
                    <p className="font-black text-slate-900">{offlinePayment.bankName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-700">So tai khoan</p>
                    <p className="text-xl font-black text-slate-900">{offlinePayment.accountNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Noi dung</p>
                    <p className="font-black text-slate-900">{offlinePayment.transferContent}</p>
                  </div>
                  <p className="rounded-2xl bg-white p-3 text-sm font-bold text-slate-600">
                    {offlinePayment.message}
                  </p>
                </div>
              </div>
            </section>
          )}

          {offlinePayment?.type === 'counter' && paymentMethod === 'counter' && (
            <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
              <h2 className="mb-6 flex items-center gap-2 text-2xl font-black text-slate-900">
                <Store className="text-slate-700" /> Thanh toan tai quay
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Ma thanh toan</p>
                  <p className="mt-2 text-3xl font-black text-blue-600">{offlinePayment.paymentCode}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Dia diem</p>
                  <p className="mt-2 flex items-center gap-2 font-black text-slate-900">
                    <MapPin size={18} /> {offlinePayment.paymentLocation}
                  </p>
                </div>
              </div>
              <p className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm font-bold text-slate-600">
                {offlinePayment.message}
              </p>
            </section>
          )}

          <section className="rounded-3xl border border-slate-100 bg-white p-8 shadow-xl">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-black text-slate-900">
              <Tag className="text-emerald-600" /> Ma giam gia
            </h2>
            <div className="flex gap-3">
              <input
                value={promotionCode}
                onChange={(event) => setPromotionCode(event.target.value)}
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 font-bold uppercase outline-none focus:border-emerald-500"
                placeholder="TRAVELAI10"
              />
              <button
                type="button"
                onClick={applyPromotion}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700"
              >
                AP DUNG
              </button>
            </div>
            {promotionMessage && (
              <p className="mt-3 text-sm font-bold text-slate-500">{promotionMessage}</p>
            )}
          </section>
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-32 overflow-hidden rounded-3xl bg-slate-900 p-8 text-white shadow-2xl">
            <h3 className="mb-6 text-xl font-black">Tom tat don hang</h3>
            <div className="mb-8 space-y-4">
              <div>
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

            <div className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                <span>Tam tinh</span>
                <span className="font-bold">{new Intl.NumberFormat('vi-VN').format(booking.totalAmount)} VND</span>
              </div>
              <div className="mb-3 flex items-center justify-between text-sm text-slate-300">
                <span>Giam gia</span>
                <span className="font-bold">-{new Intl.NumberFormat('vi-VN').format(discountAmount)} VND</span>
              </div>
              {discountAmount > 0 && (
                <p className="mb-3 rounded-xl bg-emerald-400/10 p-2 text-xs font-bold text-emerald-300">
                  Đã áp dụng mã giảm giá thành công.
                </p>
              )}
              <div className="flex items-center justify-between border-t border-white/10 pt-3">
                <span className="text-sm font-medium text-slate-300">Tong tien</span>
                <span className="text-2xl font-black text-white">
                  {new Intl.NumberFormat('vi-VN').format(finalAmount)} VND
                </span>
              </div>
            </div>

            <button
              onClick={handlePayment}
              disabled={paying}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-5 text-lg font-black text-white shadow-xl shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {paying ? (
                <Loader2 className="animate-spin" />
              ) : offlinePayment?.type === 'vietqr' && paymentMethod === 'vietqr' ? (
                'ĐÃ CHUYỂN KHOẢN'
              ) : paymentMethod === 'vietqr' ? (
                'TẠO MÃ VIETQR'
              ) : paymentMethod === 'counter' ? (
                'ĐẶT CHỖ NGAY'
              ) : (
                'THANH TOAN'
              )}
            </button>

            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <ShieldCheck className="shrink-0 text-green-400" size={20} />
              <p className="text-xs italic leading-relaxed text-slate-300">
                TravelAI chi xac nhan booking sau khi callback hop le tu cong thanh toan.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Checkout;
