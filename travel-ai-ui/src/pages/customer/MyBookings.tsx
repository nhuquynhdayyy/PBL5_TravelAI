import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  ClipboardList,
  CreditCard,
  Download,
  Loader2,
  Package,
  QrCode,
  Receipt,
  RefreshCw,
  X,
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { formatVietnameseDate } from '../../utils/dateTimeUtils';
import { toVietnamTime } from '../../utils/dateUtils';

type BookingStatus = number | string;

type CustomerBooking = {
  bookingId: number;
  serviceName: string;
  serviceType?: string | number | null;
  checkInDate: string;
  quantity: number;
  totalAmount: number;
  status: BookingStatus;
  paymentMethod: string | null;
  createdAt: string;
  refundedAmount: number;
  estimatedRefundAmount: number;
  canCancel: boolean;
  cancelPolicy: string;
  cancellationReason?: string; // Lý do hủy đơn
  bookingQr?: BookingQr | null;
  tickets?: ElectronicTicket[];
};

type BookingQr = {
  bookingCode: string;
  bookingId: number;
  customerName: string;
  serviceName: string;
  useDate: string;
  quantity: number;
  paymentStatus: string;
  ticketType: string;
  qrPayloadJson: string;
  qrImageBase64: string;
};

type ElectronicTicket = {
  ticketId: number;
  ticketCode: string;
  bookingId: number;
  bookingItemId: number;
  customerName: string;
  serviceName: string;
  serviceType: string;
  bookingDate: string;
  travelDate: string;
  quantity: number;
  totalAmount: number;
  status: string;
  qrPayloadJson: string;
  qrImageBase64: string;
  qrCodeBase64?: string;
  createdAt: string;
  usedAt?: string | null;
};

const statusMap: Record<number, { label: string; className: string }> = {
  1: { label: 'Chờ thanh toán', className: 'bg-amber-100 text-amber-700 border border-amber-200' },
  2: { label: 'Đã thanh toán', className: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  3: { label: 'Đã hoàn tiền', className: 'bg-sky-100 text-sky-700 border border-sky-200' },
  4: { label: 'Đã hủy', className: 'bg-rose-100 text-rose-700 border border-rose-200' },
};

const stringStatusMap: Record<string, number> = {
  pending: 1,
  paid: 2,
  refunded: 3,
  cancelled: 4,
};

const currencyFormatter = new Intl.NumberFormat('vi-VN');

type BookingTypeFilter = 'All' | 'Hotel' | 'Tour' | 'Transport';
type BookingStateFilter = 'all' | 'pending' | 'bookingQr' | 'tickets' | 'paid' | 'cancelled';

const bookingTypeFilters: Array<{ value: BookingTypeFilter; label: string }> = [
  { value: 'All', label: 'All' },
  { value: 'Hotel', label: 'Khach san' },
  { value: 'Tour', label: 'Tour du lich' },
  { value: 'Transport', label: 'Ve xe & May Bay' },
];

const bookingStateFilters: Array<{ value: BookingStateFilter; label: string }> = [
  { value: 'all', label: 'Tat ca' },
  { value: 'pending', label: 'Cho thanh toan' },
  { value: 'bookingQr', label: 'Thanh toan tai quay' },
  { value: 'tickets', label: 'Ve dien tu' },
  // { value: 'paid', label: 'Da thanh toan' },
  { value: 'cancelled', label: 'Da huy' },
];

function normalizeServiceType(value: unknown): BookingTypeFilter | 'Other' {
  const normalized = String(value ?? '').trim().toLowerCase();

  if (normalized === 'hotel' || normalized === '0') return 'Hotel';
  if (normalized === 'tour' || normalized === '1') return 'Tour';
  if (normalized === 'transport' || normalized === '2') return 'Transport';

  return 'Other';
}

function resolveBookingServiceType(booking: CustomerBooking) {
  const directType = normalizeServiceType(booking.serviceType);
  if (directType !== 'Other') {
    return directType;
  }

  const ticketType = normalizeServiceType(booking.tickets?.[0]?.serviceType);
  return ticketType;
}

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
    return 'Chưa thanh toán';
  }

  if (paymentMethod.toLowerCase() === 'mock') {
    return 'Mock payment';
  }

  return paymentMethod;
}

function normalizePaymentMethod(paymentMethod: string | null) {
  return String(paymentMethod ?? '').trim().toLowerCase();
}

function isCounterPayment(booking: CustomerBooking) {
  return normalizePaymentMethod(booking.paymentMethod) === 'counter';
}

function hasCounterBookingQr(booking: CustomerBooking) {
  return resolveStatusKey(booking.status) === 1 && isCounterPayment(booking) && !!booking.bookingQr;
}

function hasElectronicTickets(booking: CustomerBooking) {
  return (booking.tickets?.length ?? 0) > 0;
}

function getCheckoutPaymentMethod(booking: CustomerBooking) {
  const paymentMethod = normalizePaymentMethod(booking.paymentMethod);

  if (paymentMethod === 'vnpay' || paymentMethod === 'vietqr' || paymentMethod === 'momo') {
    return paymentMethod;
  }

  return 'momo';
}

function getPendingPaymentActionLabel(booking: CustomerBooking) {
  const paymentMethod = normalizePaymentMethod(booking.paymentMethod);

  if (paymentMethod === 'vnpay') return 'Thanh toan VNPay';
  if (paymentMethod === 'vietqr') return 'Xem VietQR';

  return 'Thanh toan MoMo';
}

function matchesStateFilter(booking: CustomerBooking, filter: BookingStateFilter) {
  const statusKey = resolveStatusKey(booking.status);

  if (filter === 'pending') return statusKey === 1 && !isCounterPayment(booking);
  if (filter === 'bookingQr') return hasCounterBookingQr(booking);
  if (filter === 'tickets') return hasElectronicTickets(booking);
  if (filter === 'paid') return statusKey === 2;
  if (filter === 'cancelled') return statusKey === 4;

  return true;
}

function canCancelBooking(booking: CustomerBooking) {
  if (typeof booking.canCancel === 'boolean') {
    return booking.canCancel;
  }

  const statusKey = resolveStatusKey(booking.status);

  if (statusKey === 1) {
    return true;
  }

  if (statusKey !== 2) {
    return false;
  }

  // Chuyển sang giờ Việt Nam để so sánh
  const checkInVN = toVietnamTime(booking.checkInDate);
  const nowVN = new Date(Date.now() + 7 * 60 * 60 * 1000);
  
  return checkInVN ? checkInVN.getTime() > nowVN.getTime() + 24 * 60 * 60 * 1000 : false;
}

function getCancelPolicy(booking: CustomerBooking) {
  if (booking.cancelPolicy?.trim()) {
    return booking.cancelPolicy;
  }

  const statusKey = resolveStatusKey(booking.status);

  if (statusKey === 1) {
    return 'Booking đang chờ thanh toán, hệ thống sẽ giải phóng chỗ đã giữ.';
  }

  if (statusKey === 2) {
    return canCancelBooking(booking)
      ? 'Hủy trước 24 giờ: hoàn 100% giá trị thanh toán.'
      : 'Chỉ được hủy booking đã thanh toán khi check-in còn hơn 24 giờ.';
  }

  return 'Booking hiện tại không hỗ trợ hủy.';
}

function getEstimatedRefundAmount(booking: CustomerBooking) {
  if (typeof booking.estimatedRefundAmount === 'number' && booking.estimatedRefundAmount > 0) {
    return booking.estimatedRefundAmount;
  }

  return resolveStatusKey(booking.status) === 2 && canCancelBooking(booking)
    ? booking.totalAmount
    : 0;
}

function getTicketQrBase64(ticket: ElectronicTicket) {
  return ticket.qrImageBase64 || ticket.qrCodeBase64 || '';
}

const MyBookings = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedStateFilter = searchParams.get('filter') as BookingStateFilter | null;
  const initialStateFilter: BookingStateFilter = bookingStateFilters.some((filter) => filter.value === requestedStateFilter)
    ? requestedStateFilter as BookingStateFilter
    : searchParams.get('tickets') === '1'
      ? 'tickets'
      : 'all';
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<CustomerBooking | null>(null);
  const [selectedBookingQr, setSelectedBookingQr] = useState<BookingQr | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<ElectronicTicket | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<BookingTypeFilter>('All');
  const [stateFilter, setStateFilter] = useState<BookingStateFilter>(initialStateFilter);
  const onlyTickets = searchParams.get('tickets') === '1';

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/bookings/my-bookings');
      setBookings(res.data ?? []);
    } catch (error) {
      console.error('Lỗi lấy lịch sử đặt dịch vụ:', error);
      alert('Không thể tải lịch sử đặt dịch vụ lúc này.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedBooking || selectedBookingQr || selectedTicket) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedBooking, selectedBookingQr, selectedTicket]);

  const pendingBookings = bookings.filter((booking) => resolveStatusKey(booking.status) === 1).length;
  const paidBookings = bookings.filter((booking) => resolveStatusKey(booking.status) === 2).length;
  const cancelledBookings = bookings.filter((booking) => resolveStatusKey(booking.status) === 4).length;
  const bookingQrBookings = bookings.filter(hasCounterBookingQr).length;
  const ticketBookings = bookings.filter(hasElectronicTickets).length;
  const ticketScopedBookings = onlyTickets
    ? bookings.filter((booking) => (booking.tickets?.length ?? 0) > 0)
    : bookings;
  const stateScopedBookings = ticketScopedBookings.filter((booking) => matchesStateFilter(booking, stateFilter));
  const displayedBookings = typeFilter === 'All'
    ? stateScopedBookings
    : stateScopedBookings.filter((booking) => resolveBookingServiceType(booking) === typeFilter);

  const updateBooking = (bookingId: number, changes: Partial<CustomerBooking>) => {
    setBookings((current) =>
      current.map((booking) =>
        booking.bookingId === bookingId ? { ...booking, ...changes } : booking,
      ),
    );

    setSelectedBooking((current) =>
      current && current.bookingId === bookingId ? { ...current, ...changes } : current,
    );
  };

  const handleCancelBooking = async (booking: CustomerBooking) => {
    const estimatedRefundAmount = getEstimatedRefundAmount(booking);
    const cancelPolicy = getCancelPolicy(booking);

    const refundMessage = estimatedRefundAmount > 0
      ? `Số tiền hoàn dự kiến: ${currencyFormatter.format(estimatedRefundAmount)}đ`
      : 'Booking chưa thanh toán, hệ thống sẽ giải phóng chỗ đã giữ.';

    const confirmed = window.confirm(
      `Bạn có chắc muốn hủy booking này không?\n${refundMessage}\n${cancelPolicy}`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setCancellingId(booking.bookingId);
      const res = await axiosClient.post(`/bookings/${booking.bookingId}/cancel`);
      const refundAmount = Number(res.data?.refundAmount ?? 0);

      updateBooking(booking.bookingId, {
        status: 4,
        canCancel: false,
        refundedAmount: refundAmount,
        estimatedRefundAmount: 0,
        cancelPolicy: String(res.data?.refundPolicy ?? 'Booking đã được hủy.'),
      });

      alert(`Đã hủy booking thành công. Số tiền hoàn lại: ${currencyFormatter.format(refundAmount)}đ`);
    } catch (error) {
      console.error('Lỗi hủy booking:', error);
      alert('Không thể hủy booking lúc này.');
    } finally {
      setCancellingId(null);
    }
  };

  const downloadTicketQr = (ticket: ElectronicTicket) => {
    const qrBase64 = getTicketQrBase64(ticket);
    if (!qrBase64) {
      alert('Khong tim thay anh QR cua ve nay.');
      return;
    }

    const link = document.createElement('a');
    link.href = `data:image/png;base64,${qrBase64}`;
    link.download = `${ticket.ticketCode}.png`;
    link.click();
  };

  const downloadBookingQr = (bookingQr: BookingQr) => {
    if (!bookingQr.qrImageBase64) {
      alert('Khong tim thay anh QR dat cho.');
      return;
    }

    const link = document.createElement('a');
    link.href = `data:image/png;base64,${bookingQr.qrImageBase64}`;
    link.download = `${bookingQr.bookingCode}.png`;
    link.click();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <button
          onClick={() => navigate('/profile')}
          className="rounded-full border border-slate-200 px-5 py-2 text-sm font-black text-slate-500 transition-all hover:border-slate-300 hover:text-slate-700"
        >
          Lịch trình đã lưu
        </button>
        <button
          className="rounded-full bg-slate-900 px-5 py-2 text-sm font-black text-white shadow-lg"
        >
          Dịch vụ đã đặt
        </button>
      </div>

      <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-blue-600">
            <Receipt size={14} /> My bookings
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">DỊCH VỤ ĐÃ ĐẶT</h1>
          <p className="mt-3 max-w-2xl font-medium text-slate-500">
            Xem lại các booking đã tạo, mở chi tiết nhanh và hủy booking đang chờ thanh toán.
          </p>
        </div>

        <button
          onClick={fetchBookings}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black text-white shadow-lg transition-all hover:bg-blue-600 active:scale-95"
        >
          <RefreshCw size={18} /> Tải lại
        </button>
      </div>

      <div className="mb-10 grid grid-cols-1 gap-5 md:grid-cols-3 xl:grid-cols-5">
        <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Tổng booking</span>
            <ClipboardList className="text-blue-500" size={22} />
          </div>
          <div className="text-3xl font-black text-slate-900">{bookings.length}</div>
        </div>

        <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Chờ thanh toán</span>
            <Package className="text-amber-500" size={22} />
          </div>
          <div className="text-3xl font-black text-slate-900">{pendingBookings}</div>
        </div>

        <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Đã thanh toán</span>
            <CreditCard className="text-emerald-500" size={22} />
          </div>
          <div className="text-3xl font-black text-slate-900">{paidBookings}</div>
        </div>

        <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Vé điện tử</span>
            <QrCode className="text-blue-500" size={22} />
          </div>
          <div className="text-3xl font-black text-slate-900">{ticketBookings}</div>
        </div>

        <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Đã hủy</span>
            <X className="text-rose-500" size={22} />
          </div>
          <div className="text-3xl font-black text-slate-900">{cancelledBookings}</div>
        </div>
      </div>

      <div className="mb-4 overflow-x-auto custom-scrollbar-hide">
        <div className="inline-flex min-w-max items-center rounded-[1.25rem] border border-slate-200 bg-white p-1.5 shadow-sm">
          {bookingStateFilters.map((filter) => {
            const active = stateFilter === filter.value;

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStateFilter(filter.value)}
                className={`rounded-2xl px-5 py-2.5 text-sm font-black transition-all ${
                  active
                    ? 'bg-slate-900 text-white shadow-lg'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-8 overflow-x-auto custom-scrollbar-hide">
        <div className="inline-flex min-w-max items-center rounded-[1.25rem] border border-slate-200 bg-white p-1.5 shadow-sm">
          {bookingTypeFilters.map((filter) => {
            const active = typeFilter === filter.value;

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setTypeFilter(filter.value)}
                className={`rounded-2xl px-5 py-2.5 text-sm font-black transition-all ${
                  active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-32">
          <Loader2 className="animate-spin text-blue-600" size={48} />
        </div>
      ) : displayedBookings.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {displayedBookings.map((booking) => {
            const status = getStatusMeta(booking.status);
            const canCancel = canCancelBooking(booking);
            const isCancelling = cancellingId === booking.bookingId;
            const primaryTicket = booking.tickets?.[0];

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
                      Ngày sử dụng
                    </p>
                    <p className="flex items-center gap-2 font-bold text-slate-800">
                      <CalendarDays size={16} className="text-blue-500" />
                      {formatVietnameseDate(booking.checkInDate)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Tổng tiền
                    </p>
                    <p className="font-black text-emerald-600">
                      {currencyFormatter.format(booking.totalAmount)}đ
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Ngày đặt
                    </p>
                    <p className="font-bold text-slate-800">
                      {formatVietnameseDate(booking.createdAt)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Thanh toán
                    </p>
                    <p className="font-bold text-slate-800">{formatPaymentMethod(booking.paymentMethod)}</p>
                  </div>
                </div>

                {booking.refundedAmount > 0 && (
                  <div className="mt-4 rounded-2xl bg-sky-50 p-4 text-sm text-sky-700">
                    <span className="font-black uppercase tracking-[0.18em] text-[10px]">Đã hoàn tiền</span>
                    <div className="mt-1 text-lg font-black">
                      {currencyFormatter.format(booking.refundedAmount)}đ
                    </div>
                  </div>
                )}

                {hasCounterBookingQr(booking) && (
                  <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                    <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                      <QrCode size={14} />
                      Booking QR
                    </div>
                    <div className="flex flex-col gap-3 rounded-xl bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">{booking.bookingQr?.bookingCode}</p>
                        <p className="truncate text-xs font-bold text-slate-500">{booking.bookingQr?.serviceName}</p>
                        <p className="mt-1 text-[11px] font-bold text-amber-700">Cho thanh toan</p>
                      </div>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedBookingQr(booking.bookingQr ?? null);
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-white hover:bg-amber-700"
                      >
                        <QrCode size={14} />
                        Xem Booking QR
                      </button>
                    </div>
                  </div>
                )}

                {booking.tickets && booking.tickets.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                    <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
                      <QrCode size={14} />
                      Ve dien tu
                    </div>
                    <div className="space-y-3">
                      {booking.tickets.map((ticket) => (
                        <div
                          key={ticket.ticketId}
                          className="flex flex-col gap-3 rounded-xl bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-900">{ticket.ticketCode}</p>
                            <p className="truncate text-xs font-bold text-slate-500">{ticket.serviceName}</p>
                            <p className="mt-1 text-[11px] font-bold text-slate-500">
                              {formatVietnameseDate(ticket.travelDate)} · {ticket.status}
                            </p>
                          </div>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedTicket(ticket);
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-700"
                          >
                            <QrCode size={14} />
                            Xem ve dien tu
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    Bam vao the de xem chi tiet
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {hasCounterBookingQr(booking) && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedBookingQr(booking.bookingQr ?? null);
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-white transition-all hover:bg-amber-700"
                      >
                        <QrCode size={14} />
                        Xem Booking QR
                      </button>
                    )}
                    {resolveStatusKey(booking.status) === 1 && !isCounterPayment(booking) && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/checkout/${booking.bookingId}?method=${getCheckoutPaymentMethod(booking)}`);
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-pink-600 px-4 py-2 text-xs font-black text-white transition-all hover:bg-pink-700"
                      >
                        <CreditCard size={14} />
                        {getPendingPaymentActionLabel(booking)}
                      </button>
                    )}
                    {!hasCounterBookingQr(booking) && primaryTicket && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedTicket(primaryTicket);
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white transition-all hover:bg-blue-700"
                      >
                        <QrCode size={14} />
                        Xem ve dien tu
                      </button>
                    )}
                  {canCancel && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleCancelBooking(booking);
                      }}
                      disabled={isCancelling}
                      className="inline-flex items-center justify-center rounded-xl bg-rose-50 px-4 py-2 text-xs font-black text-rose-600 transition-all hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isCancelling ? 'Dang huy...' : 'Huy dat cho'}
                    </button>
                  )}
                  </div>
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
          <h2 className="mb-3 text-2xl font-black text-slate-900">
            {onlyTickets ? 'Chua co ve dien tu nao' : 'Chua co booking nao'}
          </h2>
          <p className="mx-auto max-w-md font-medium text-slate-500">
            {onlyTickets
              ? 'Sau khi thanh toan thanh cong, ve dien tu se xuat hien tai day.'
              : 'Sau khi dat dich vu, lich su booking se xuat hien tai day de ban theo doi.'}
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
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-8 overflow-y-auto custom-scrollbar"
          onClick={() => setSelectedBooking(null)}
        >
          <div 
            className="w-full max-w-2xl rounded-[2rem] bg-white p-8 shadow-2xl my-8 max-h-[90vh] overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
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
                  {formatVietnameseDate(selectedBooking.checkInDate)}
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
                  {formatVietnameseDate(selectedBooking.createdAt)}
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

              <div className="rounded-2xl bg-slate-50 p-5 md:col-span-2">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Chinh sach huy
                </p>
                <p className="font-bold text-slate-800">{getCancelPolicy(selectedBooking)}</p>
              </div>
            </div>

            {selectedBooking.refundedAmount > 0 && (
              <div className="mb-6 rounded-2xl bg-sky-50 p-5 text-sky-700">
                <p className="text-[10px] font-black uppercase tracking-[0.18em]">Tien da hoan</p>
                <p className="mt-2 text-2xl font-black">
                  {currencyFormatter.format(selectedBooking.refundedAmount)}d
                </p>
              </div>
            )}

            {hasCounterBookingQr(selectedBooking) && (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                    <QrCode size={16} />
                    Booking QR
                  </div>
                  <button
                    onClick={() => {
                      setSelectedBooking(null);
                      setSelectedBookingQr(selectedBooking.bookingQr ?? null);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-white hover:bg-amber-700"
                  >
                    <QrCode size={14} />
                    Xem Booking QR
                  </button>
                </div>
                <div className="rounded-2xl bg-white p-4 text-sm font-bold text-slate-700">
                  <p>Ma don: {selectedBooking.bookingQr?.bookingCode}</p>
                  <p>Trang thai: Cho thanh toan</p>
                  <p>Loai ve: {selectedBooking.bookingQr?.ticketType}</p>
                </div>
              </div>
            )}

            {selectedBooking.tickets && selectedBooking.tickets.length > 0 && (
              <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  <QrCode size={16} className="text-blue-500" />
                  E-ticket QR
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {selectedBooking.tickets.map((ticket) => (
                    <div key={ticket.ticketId} className="rounded-2xl bg-slate-50 p-4">
                      <img
                        src={`data:image/png;base64,${ticket.qrImageBase64}`}
                        alt={`QR ${ticket.ticketCode}`}
                        className="mx-auto size-44 rounded-xl bg-white p-2"
                      />
                      <div className="mt-3 text-center">
                        <p className="font-black text-slate-900">{ticket.ticketCode}</p>
                        <p className="text-xs font-bold text-slate-500">{ticket.serviceName}</p>
                        <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase text-emerald-700">
                          {ticket.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hiển thị lý do hủy trong modal chi tiết - CHỈ nếu có lý do từ customer */}
            {resolveStatusKey(selectedBooking.status) === 4 && selectedBooking.cancellationReason && 
             selectedBooking.cancellationReason !== "Quá hạn duyệt" && (
              <div className="mb-6 rounded-2xl bg-rose-50 border border-rose-200 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-600">Ly do huy</p>
                <p className="mt-2 text-sm font-semibold text-rose-700">
                  {selectedBooking.cancellationReason.replace(/^Partner rejected:\s*/i, '')}
                </p>
              </div>
            )}

            {canCancelBooking(selectedBooking) && getEstimatedRefundAmount(selectedBooking) > 0 && (
              <div className="mb-6 rounded-2xl bg-emerald-50 p-5 text-emerald-700">
                <p className="text-[10px] font-black uppercase tracking-[0.18em]">Hoan tien du kien</p>
                <p className="mt-2 text-2xl font-black">
                  {currencyFormatter.format(getEstimatedRefundAmount(selectedBooking))}d
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              {canCancelBooking(selectedBooking) && (
                <button
                  onClick={() => handleCancelBooking(selectedBooking)}
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

      {selectedBookingQr && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 px-4 py-8"
          onClick={() => setSelectedBookingQr(null)}
        >
          <div
            className="max-h-[calc(100vh-4rem)] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl custom-scrollbar"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-amber-600">
                  {selectedBookingQr.bookingCode}
                </div>
                <h2 className="text-2xl font-black leading-tight text-slate-900">
                  {selectedBookingQr.serviceName}
                </h2>
              </div>
              <button
                onClick={() => setSelectedBookingQr(null)}
                className="rounded-2xl bg-slate-100 p-3 text-slate-500 transition-all hover:bg-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="rounded-2xl bg-amber-50 p-5 text-center">
              <img
                src={`data:image/png;base64,${selectedBookingQr.qrImageBase64}`}
                alt={`QR ${selectedBookingQr.bookingCode}`}
                className="mx-auto size-64 rounded-xl bg-white p-3 shadow-sm"
              />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Ma don</p>
                <p className="mt-1 font-black text-slate-800">{selectedBookingQr.bookingCode}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Loai ve</p>
                <p className="mt-1 font-black text-slate-800">{selectedBookingQr.ticketType}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Khach hang</p>
                <p className="mt-1 font-black text-slate-800">{selectedBookingQr.customerName}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Trang thai</p>
                <p className="mt-1 font-black text-amber-700">Cho thanh toan</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Dich vu</p>
                <p className="mt-1 font-black text-slate-800">{selectedBookingQr.serviceName}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Ngay su dung</p>
                <p className="mt-1 font-black text-slate-800">{formatVietnameseDate(selectedBookingQr.useDate)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">So luong</p>
                <p className="mt-1 font-black text-slate-800">{selectedBookingQr.quantity}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => navigate(`/booking-qr/${encodeURIComponent(selectedBookingQr.bookingCode)}`)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-black"
              >
                <QrCode size={18} />
                Xem trang dat cho
              </button>
              <button
                onClick={() => downloadBookingQr(selectedBookingQr)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-600 px-5 py-3 text-sm font-black text-white hover:bg-amber-700"
              >
                <Download size={18} />
                Tai anh QR
              </button>
              <button
                onClick={() => setSelectedBookingQr(null)}
                className="rounded-2xl bg-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition-all hover:bg-slate-300"
              >
                Dong
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTicket && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 px-4 py-8"
          onClick={() => setSelectedTicket(null)}
        >
          <div
            className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                  {selectedTicket.ticketCode}
                </div>
                <h2 className="text-2xl font-black leading-tight text-slate-900">
                  {selectedTicket.serviceName}
                </h2>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="rounded-2xl bg-slate-100 p-3 text-slate-500 transition-all hover:bg-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5 text-center">
              <img
                src={`data:image/png;base64,${getTicketQrBase64(selectedTicket)}`}
                alt={`QR ${selectedTicket.ticketCode}`}
                className="mx-auto size-64 rounded-xl bg-white p-3 shadow-sm"
              />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Trang thai</p>
                <p className="mt-1 font-black text-slate-800">{selectedTicket.status}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Ngay su dung</p>
                <p className="mt-1 font-black text-slate-800">{formatVietnameseDate(selectedTicket.travelDate)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Khach hang</p>
                <p className="mt-1 font-black text-slate-800">{selectedTicket.customerName}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">So luong</p>
                <p className="mt-1 font-black text-slate-800">{selectedTicket.quantity}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => navigate(`/e-ticket/${encodeURIComponent(selectedTicket.ticketCode)}`)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-black"
              >
                <QrCode size={18} />
                Xem trang ve dien tu
              </button>
              <button
                onClick={() => downloadTicketQr(selectedTicket)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700"
              >
                <Download size={18} />
                Tai anh QR
              </button>
              <button
                onClick={() => setSelectedTicket(null)}
                className="rounded-2xl bg-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition-all hover:bg-slate-300"
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
