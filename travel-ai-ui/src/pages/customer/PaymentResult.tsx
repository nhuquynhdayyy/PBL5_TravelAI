import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

const PaymentResult = () => {
  const { method = 'vnpay' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('Dang xac thuc ket qua thanh toan...');
  const [bookingId, setBookingId] = useState<string | null>(null);

  const normalizedMethod = useMemo(() => method.toLowerCase(), [method]);

  useEffect(() => {
    const confirmPayment = async () => {
      try {
        const callbackData = Object.fromEntries(searchParams.entries());
        if (Object.keys(callbackData).length === 0) {
          setSuccess(false);
          setMessage('Khong co du lieu callback tu cong thanh toan.');
          return;
        }

        const endpoint =
          normalizedMethod === 'momo' ? '/payment/momo/callback' : '/payment/vnpay/callback';
        const res = await axiosClient.post(endpoint, callbackData);

        setSuccess(Boolean(res.data.success));
        setBookingId(res.data.bookingId ? String(res.data.bookingId) : null);
        setMessage(res.data.message || 'Da xu ly ket qua thanh toan.');

        if (res.data.success) {
          const paidBookingId = res.data.bookingId ? String(res.data.bookingId) : null;
          window.setTimeout(
            () =>
              navigate(
                paidBookingId
                  ? `/booking-success/${paidBookingId}?paymentStatus=success&message=${encodeURIComponent(res.data.message || 'Thanh toan thanh cong')}`
                  : '/my-bookings'
              ),
            2000
          );
        }
      } catch (err) {
        console.error(err);
        const responseMessage =
          err && typeof err === 'object' && 'response' in err
            ? (err as any).response?.data?.message
            : null;
        setSuccess(false);
        setMessage(responseMessage || 'Khong xac thuc duoc ket qua thanh toan.');
      } finally {
        setLoading(false);
      }
    };

    confirmPayment();
  }, [navigate, normalizedMethod, searchParams]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <div
        className={`mb-6 inline-flex size-20 items-center justify-center rounded-full ${
          loading
            ? 'bg-blue-100 text-blue-600'
            : success
              ? 'bg-green-100 text-green-600'
              : 'bg-red-100 text-red-600'
        }`}
      >
        {loading ? (
          <Loader2 className="animate-spin" size={44} />
        ) : success ? (
          <CheckCircle2 size={44} />
        ) : (
          <AlertTriangle size={44} />
        )}
      </div>

      <h1 className="text-4xl font-black text-slate-900">
        {loading ? 'Dang xu ly thanh toan' : success ? 'Thanh toan thanh cong' : 'Thanh toan that bai'}
      </h1>
      <p className="mt-3 font-medium leading-relaxed text-slate-500">{message}</p>

      {!loading && (
        <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
          {success ? (
            <button
              onClick={() =>
                navigate(
                  bookingId
                    ? `/booking-success/${bookingId}?paymentStatus=success&message=${encodeURIComponent(message)}`
                    : '/my-bookings'
                )
              }
              className="flex-1 rounded-2xl bg-blue-600 py-4 text-sm font-black text-white hover:bg-blue-700"
            >
              XEM HOA DON
            </button>
          ) : (
            <button
              onClick={() => navigate(bookingId ? `/checkout/${bookingId}` : '/my-bookings')}
              className="flex-1 rounded-2xl bg-blue-600 py-4 text-sm font-black text-white hover:bg-blue-700"
            >
              THU LAI
            </button>
          )}
          <button
            onClick={() => navigate('/')}
            className="flex-1 rounded-2xl border border-slate-200 bg-white py-4 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            VE TRANG CHU
          </button>
        </div>
      )}
    </div>
  );
};

export default PaymentResult;
