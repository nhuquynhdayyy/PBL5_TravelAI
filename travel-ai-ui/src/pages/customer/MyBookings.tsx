import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  ClipboardList,
  CreditCard,
  Loader2,
  Package,
  Receipt,
  RefreshCw,
  X,
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';

type BookingStatus = number | string;

type CustomerBooking = {
  bookingId: number;
  serviceName: string;
  checkInDate: string;
  quantity: number;
  totalAmount: number;
  status: BookingStatus;
  paymentMethod: string | null;
  createdAt: string;
};

const statusMap: Record<number, { label: string; className: string }> = {
  1: { label: 'Cho thanh toan', className: 'bg-amber-100 text-amber-700 border border-amber-200' },
  2: { label: 'Da thanh toan', className: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  3: { label: 'Da hoan tien', className: 'bg-sky-100 text-sky-700 border border-sky-200' },
  4: { label: 'Da huy', className: 'bg-rose-100 text-rose-700 border border-rose-200' },
};

const stringStatusMap: Record<string, number> = {
  pending: 1,
  paid: 2,
  refunded: 3,
  cancelled: 4,
};

const currencyFormatter = new Intl.NumberFormat('vi-VN');

function resolveStatusKey(status: BookingStatus) {
  if (typeof status === 'number') {
    return status;
  }

  return stringStatusMap[status.toLowerCase()] ?? 0;
}

function getStatusMeta(status: BookingStatus) {
  const key = resolveStatusKey(status);

  return statusMap[key] ?? {
    label: String(status),
    className: 'bg-slate-100 text-slate-600 border border-slate-200',
  };
}

function formatPaymentMethod(paymentMethod: string | null) {
  if (!paymentMethod) {
    return 'Chua thanh toan';
  }

  if (paymentMethod.toLowerCase() === 'mock') {
    return 'Mock payment';
  }

  return paymentMethod;
}

const MyBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<CustomerBooking | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/bookings/my-bookings');
      setBookings(res.data ?? []);
    } catch (error) {
      console.error('Loi lay lich su dat dich vu:', error);
      alert('Khong the tai lich su dat dich vu luc nay.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const pendingBookings = bookings.filter((booking) => resolveStatusKey(booking.status) === 1).length;
  const paidBookings = bookings.filter((booking) => resolveStatusKey(booking.status) === 2).length;

  const updateBookingStatus = (bookingId: number, status: number) => {
    setBookings((current) =>
      current.map((booking) =>
        booking.bookingId === bookingId ? { ...booking, status } : booking,
      ),
    );

    setSelectedBooking((current) =>
      current && current.bookingId === bookingId ? { ...current, status } : current,
    );
  };

  const handleCancelBooking = async (bookingId: number) => {
    const confirmed = window.confirm('Ban co chac muon huy booking nay khong?');
    if (!confirmed) {
      return;
    }

    try {
      setCancellingId(bookingId);
      await axiosClient.post(`/bookings/${bookingId}/cancel`);
      updateBookingStatus(bookingId, 4);
    } catch (error) {
      console.error('Loi huy booking:', error);
      alert('Khong the huy booking luc nay.');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <button
          onClick={() => navigate('/profile')}
          className="rounded-full border border-slate-200 px-5 py-2 text-sm font-black text-slate-500 transition-all hover:border-slate-300 hover:text-slate-700"
        >
          Lich trinh da luu
        </button>
        <button
          className="rounded-full bg-slate-900 px-5 py-2 text-sm font-black text-white shadow-lg"
        >
          Dich vu da dat
        </button>
      </div>

      <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-blue-600">
            <Receipt size={14} /> My bookings
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">DICH VU DA DAT</h1>
          <p className="mt-3 max-w-2xl font-medium text-slate-500">
            Xem lai cac booking da tao, mo chi tiet nhanh va huy booking dang cho thanh toan.
          </p>
        </div>

        <button
          onClick={fetchBookings}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black text-white shadow-lg transition-all hover:bg-blue-600 active:scale-95"
        >
          <RefreshCw size={18} /> Tai lai
        </button>
      </div>

      <div className="mb-10 grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Tong booking</span>
            <ClipboardList className="text-blue-500" size={22} />
          </div>
          <div className="text-3xl font-black text-slate-900">{bookings.length}</div>
        </div>

        <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Cho thanh toan</span>
            <Package className="text-amber-500" size={22} />
          </div>
          <div className="text-3xl font-black text-slate-900">{pendingBookings}</div>
        </div>

        <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Da thanh toan</span>
            <CreditCard className="text-emerald-500" size={22} />
          </div>
          <div className="text-3xl font-black text-slate-900">{paidBookings}</div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-32">
          <Loader2 className="animate-spin text-blue-600" size={48} />
        </div>
      ) : bookings.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {bookings.map((booking) => {
            const status = getStatusMeta(booking.status);
            const isPending = resolveStatusKey(booking.status) === 1;
            const isCancelling = cancellingId === booking.bookingId;

            return (
              <div
                key={`${booking.bookingId}-${booking.createdAt}`}
                onClick={() => setSelectedBooking(booking)}
                className="cursor-pointer rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                      Booking #{booking.bookingId}
                    </div>
                    <h3 className="text-2xl font-black leading-tight text-slate-900">
                      {booking.serviceName}
                    </h3>
                  </div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black ${status.className}`}>
                    {status.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Ngay su dung
                    </p>
                    <p className="flex items-center gap-2 font-bold text-slate-800">
                      <CalendarDays size={16} className="text-blue-500" />
                      {new Date(booking.checkInDate).toLocaleDateString('vi-VN')}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Tong tien
                    </p>
                    <p className="font-black text-emerald-600">
                      {currencyFormatter.format(booking.totalAmount)}d
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Ngay dat
                    </p>
                    <p className="font-bold text-slate-800">
                      {new Date(booking.createdAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Thanh toan
                    </p>
                    <p className="font-bold text-slate-800">{formatPaymentMethod(booking.paymentMethod)}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    Bam vao the de xem chi tiet
                  </span>
                  {isPending && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleCancelBooking(booking.bookingId);
                      }}
                      disabled={isCancelling}
                      className="inline-flex items-center justify-center rounded-xl bg-rose-50 px-4 py-2 text-xs font-black text-rose-600 transition-all hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isCancelling ? 'Dang huy...' : 'Huy dat cho'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[3rem] border-2 border-dashed border-slate-200 bg-slate-50 p-14 text-center">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-3xl bg-white text-blue-500 shadow-sm">
            <ClipboardList size={30} />
          </div>
          <h2 className="mb-3 text-2xl font-black text-slate-900">Chua co booking nao</h2>
          <p className="mx-auto max-w-md font-medium text-slate-500">
            Sau khi dat dich vu, lich su booking se xuat hien tai day de ban theo doi.
          </p>
          <button
            onClick={() => navigate('/services')}
            className="mt-5 text-sm font-black text-blue-500 hover:underline"
          >
            Kham pha dich vu ngay
          </button>
        </div>
      )}

      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-8">
          <div className="w-full max-w-2xl rounded-[2rem] bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Booking #{selectedBooking.bookingId}
                </div>
                <h2 className="text-3xl font-black leading-tight text-slate-900">
                  {selectedBooking.serviceName}
                </h2>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="rounded-2xl bg-slate-100 p-3 text-slate-500 transition-all hover:bg-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Trang thai
                </p>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${getStatusMeta(selectedBooking.status).className}`}>
                  {getStatusMeta(selectedBooking.status).label}
                </span>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Thanh toan
                </p>
                <p className="font-bold text-slate-800">{formatPaymentMethod(selectedBooking.paymentMethod)}</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Ngay su dung
                </p>
                <p className="font-bold text-slate-800">
                  {new Date(selectedBooking.checkInDate).toLocaleDateString('vi-VN')}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  So luong
                </p>
                <p className="font-bold text-slate-800">{selectedBooking.quantity} khach</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Ngay dat
                </p>
                <p className="font-bold text-slate-800">
                  {new Date(selectedBooking.createdAt).toLocaleDateString('vi-VN')}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Tong tien
                </p>
                <p className="text-xl font-black text-emerald-600">
                  {currencyFormatter.format(selectedBooking.totalAmount)}d
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              {resolveStatusKey(selectedBooking.status) === 1 && (
                <button
                  onClick={() => handleCancelBooking(selectedBooking.bookingId)}
                  disabled={cancellingId === selectedBooking.bookingId}
                  className="rounded-2xl bg-rose-50 px-5 py-3 text-sm font-black text-rose-600 transition-all hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {cancellingId === selectedBooking.bookingId ? 'Dang huy booking...' : 'Huy dat cho'}
                </button>
              )}
              <button
                onClick={() => setSelectedBooking(null)}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition-all hover:bg-black"
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

export default MyBookings;
