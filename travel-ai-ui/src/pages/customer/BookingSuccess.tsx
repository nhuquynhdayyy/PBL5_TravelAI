import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import QRCode from 'react-qr-code';
import { CheckCircle, Printer, Home, Calendar, Users, Loader2, Store } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';

const CounterQrCode = QRCode as unknown as ComponentType<{ value: string; className?: string }>;

type BookingItem = {
  itemId: number;
  serviceId: number;
  serviceName: string;
  checkInDate: string;
  quantity: number;
  priceAtBooking: number;
  lineTotal: number;
};

const BookingSuccess = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { removeItems } = useCart();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [counterPayment, setCounterPayment] = useState<any>(null);

  const paymentStatus = searchParams.get('paymentStatus');
  const paymentMethod = searchParams.get('method');
  const paymentMessage = searchParams.get('message');
  const customerName = searchParams.get('customerName') || '';
  const isPaid = booking?.status === 2 && paymentStatus !== 'failed';
  const isOfflineSuccess = paymentStatus === 'offline';
  const isCounterPayment = isOfflineSuccess && (paymentMethod === 'counter' || booking?.paymentMethod === 'Counter');

  useEffect(() => {
    const fetchBill = async () => {
      try {
        const res = await axiosClient.get(`/bookings/${bookingId}`);
        setBooking(res.data);
        const cachedCounterPayment = localStorage.getItem(`travelai_counter_payment_${bookingId}`);
        if (cachedCounterPayment) {
          setCounterPayment(JSON.parse(cachedCounterPayment));
        }
        if ((res.data.status === 2 || paymentStatus === 'offline') && res.data.items?.length) {
          removeItems(
            res.data.items.map((item: BookingItem) => ({
              serviceId: item.serviceId,
              checkInDate: new Date(item.checkInDate),
            }))
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBill();
  }, [bookingId, paymentStatus, removeItems]);

  const counterQrPayload = counterPayment?.qrPayload || JSON.stringify({
    bookingId: Number(bookingId),
    customerName: counterPayment?.customerName || customerName,
    totalPrice: booking?.totalAmount ?? 0,
    paymentMethod: 'Counter',
  });

  const bookingItems: BookingItem[] = booking?.items?.length
    ? booking.items
    : booking
      ? [{
          itemId: booking.bookingId,
          serviceId: 0,
          serviceName: booking.serviceName || 'Dich vu du lich',
          checkInDate: booking.checkInDate,
          quantity: booking.quantity || 0,
          priceAtBooking: booking.quantity ? booking.totalAmount / booking.quantity : booking.totalAmount,
          lineTotal: booking.totalAmount,
        }]
      : [];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="mb-10 text-center animate-in zoom-in duration-500">
        <div
          className={`mb-4 inline-flex size-20 items-center justify-center rounded-full shadow-lg ${
            isPaid
              ? 'bg-green-100 text-green-600 shadow-green-100'
              : isOfflineSuccess
                ? 'bg-green-100 text-green-600 shadow-green-100'
              : 'bg-amber-100 text-amber-600 shadow-amber-100'
          }`}
        >
          <CheckCircle size={48} />
        </div>
        <h1 className="text-4xl font-black tracking-tighter text-slate-900">
          {isPaid ? 'Thanh toan hoan tat!' : isOfflineSuccess ? 'Dat cho thanh cong!' : 'Thanh toan chua hoan tat'}
        </h1>
        <p className="mt-2 font-medium text-slate-500">
          {isPaid && paymentStatus === 'success'
            ? paymentMessage || 'VNPay da xac nhan giao dich thanh cong.'
            : isOfflineSuccess
              ? paymentMessage || 'TravelAI da ghi nhan don hang va dang cho xac nhan thanh toan.'
            : paymentMessage || 'Booking chua duoc xac nhan thanh toan tu cong thanh toan.'}
        </p>
      </div>

      <div className="relative overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
        {(isPaid || isOfflineSuccess) && (
          <div className="pointer-events-none absolute right-10 top-10 rotate-12 rounded-xl border-4 border-red-500/30 px-4 py-2 text-2xl font-black uppercase text-red-500/30">
            {isPaid ? 'PAID - DA XAC NHAN' : 'CHO XAC NHAN'}
          </div>
        )}

        <div className="p-10">
          <div className="mb-8 flex items-start justify-between border-b border-dashed pb-8">
            <div className="text-left">
              <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Ma don hang
              </p>
              <p className="text-xl font-black text-blue-600">#BK-000{booking?.bookingId}</p>
            </div>
            <div className="text-right">
              <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Ngay giao dich
              </p>
              <p className="font-bold text-slate-700">{new Date().toLocaleDateString('vi-VN')}</p>
            </div>
          </div>

          <div className="space-y-6 text-left">
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Thong tin dich vu
              </p>
              <h2 className="text-2xl font-black leading-tight text-slate-900">
                {bookingItems.length} muc trong don hang
              </h2>
            </div>

            <div className="space-y-3 border-y border-slate-50 py-6">
              {bookingItems.map((item) => (
                <div key={item.itemId} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-black text-slate-900">{item.serviceName}</p>
                  <div className="mt-3 grid gap-3 text-sm font-bold text-slate-600 sm:grid-cols-3">
                    <span className="flex items-center gap-2">
                      <Calendar size={14} className="text-slate-400" />
                      {new Date(item.checkInDate).toLocaleDateString('vi-VN')}
                    </span>
                    <span className="flex items-center gap-2">
                      <Users size={14} className="text-slate-400" />
                      {item.quantity} nguoi lon
                    </span>
                    <span className="font-black text-blue-600 sm:text-right">
                      {new Intl.NumberFormat('vi-VN').format(item.lineTotal)} VND
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 rounded-3xl bg-slate-50 p-6">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-500">Don gia tam tinh:</span>
                <span className="font-bold text-slate-700">
                  {new Intl.NumberFormat('vi-VN').format(booking?.totalAmount)} VND
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-500">Thue va phi san:</span>
                <span className="font-bold text-slate-700">Mien phi</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <span className="text-lg font-black text-slate-900">TONG TIEN:</span>
                <span className="text-2xl font-black text-blue-600">
                  {new Intl.NumberFormat('vi-VN').format(booking?.totalAmount)} VND
                </span>
              </div>
            </div>

            {isCounterPayment && (
              <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                  <Store size={14} /> Thanh toán tại quầy
                </div>
                <div className="mx-auto flex size-52 items-center justify-center rounded-3xl bg-white p-4 shadow-sm">
                  <CounterQrCode value={counterQrPayload} className="h-full w-full" />
                </div>
                <p className="mt-4 font-black text-slate-900">Đưa mã QR này cho quầy để xác nhận thanh toán</p>
                <p className="mt-2 text-sm font-bold text-slate-600">
                  Mã thanh toán: {counterPayment?.paymentCode || `BK${String(booking?.bookingId ?? '').padStart(6, '0')}`}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="-mt-2 h-4 bg-[radial-gradient(circle,transparent_8px,#f8fafc_8px)] bg-[length:24px_24px] bg-repeat-x" />
      </div>

      <div className="mt-12 flex flex-col gap-4 sm:flex-row">
        <button
          onClick={() => navigate('/my-bookings')}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-sm font-black text-white transition-all hover:bg-blue-700 active:scale-95"
        >
          XEM BOOKINGS CUA TOI
        </button>
        <button
          onClick={() => navigate('/')}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-sm font-black text-white transition-all hover:bg-black active:scale-95"
        >
          <Home size={18} /> VE TRANG CHU
        </button>
        <button
          onClick={() => window.print()}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white py-4 text-sm font-black text-slate-700 transition-all hover:bg-slate-50 active:scale-95"
        >
          <Printer size={18} /> IN HOA DON
        </button>
      </div>
    </div>
  );
};

export default BookingSuccess;
