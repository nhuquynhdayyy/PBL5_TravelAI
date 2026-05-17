import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { CheckCircle, Printer, Home, Calendar, Users, Loader2 } from 'lucide-react';
import { formatVietnameseDate } from '../../utils/dateTimeUtils';
import { getTodayVietnam } from '../../utils/dateUtils';

const BookingSuccess = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const paymentStatus = searchParams.get('paymentStatus');
  const paymentMessage = searchParams.get('message');
  const isPaid = booking?.status === 2 && paymentStatus !== 'failed';

  useEffect(() => {
    const fetchBill = async () => {
      try {
        const res = await axiosClient.get(`/bookings/${bookingId}`);
        setBooking(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBill();
  }, [bookingId]);

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
              : 'bg-amber-100 text-amber-600 shadow-amber-100'
          }`}
        >
          <CheckCircle size={48} />
        </div>
        <h1 className="text-4xl font-black tracking-tighter text-slate-900">
          {isPaid ? 'Thanh toan hoan tat!' : 'Thanh toan chua hoan tat'}
        </h1>
        <p className="mt-2 font-medium text-slate-500">
          {isPaid && paymentStatus === 'success'
            ? paymentMessage || 'VNPay da xac nhan giao dich thanh cong.'
            : paymentMessage || 'Booking chua duoc xac nhan thanh toan tu cong thanh toan.'}
        </p>
      </div>

      <div className="relative overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
        {isPaid && (
          <div className="pointer-events-none absolute right-10 top-10 rotate-12 rounded-xl border-4 border-red-500/30 px-4 py-2 text-2xl font-black uppercase text-red-500/30">
            PAID - DA XAC NHAN
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
              <p className="font-bold text-slate-700">{getTodayVietnam()}</p>
            </div>
          </div>

          <div className="space-y-6 text-left">
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Thong tin dich vu
              </p>
              <h2 className="text-2xl font-black leading-tight text-slate-900">{booking?.serviceName}</h2>
            </div>

            <div className="grid grid-cols-2 gap-8 border-y border-slate-50 py-6">
              <div>
                <div className="mb-1 flex items-center gap-2 text-slate-400">
                  <Calendar size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Ngay nhan</span>
                </div>
                <p className="font-bold text-slate-700">
                  {formatVietnameseDate(booking?.checkInDate)}
                </p>
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2 text-slate-400">
                  <Users size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Khach hang</span>
                </div>
                <p className="font-bold text-slate-700">{booking?.quantity} nguoi lon</p>
              </div>
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
