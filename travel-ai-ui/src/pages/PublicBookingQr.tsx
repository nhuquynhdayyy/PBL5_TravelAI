import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarDays, Clock, Download, Loader2, QrCode, Receipt, User } from 'lucide-react';
import axios from 'axios';
import axiosClient from '../api/axiosClient';
import { formatVietnameseDate } from '../utils/dateTimeUtils';

type PublicBookingQr = {
  bookingCode: string;
  bookingId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceName: string;
  serviceType: string;
  useDate: string;
  createdAt: string;
  quantity: number;
  totalAmount: number;
  paymentStatus: string;
  ticketType: string;
  qrPayloadJson: string;
  qrImageBase64: string;
};

const currencyFormatter = new Intl.NumberFormat('vi-VN');
type LoadError = 'not-found' | 'service-unavailable' | null;

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; bg: string }> = {
  pending: { label: 'Cho thanh toan tai quay', color: '#b45309', dot: '#f59e0b', bg: '#fffbeb' },
  paid: { label: 'Da thanh toan', color: '#15803d', dot: '#22c55e', bg: '#f0fdf4' },
  refunded: { label: 'Da hoan tien', color: '#0369a1', dot: '#38bdf8', bg: '#f0f9ff' },
  cancelled: { label: 'Da huy', color: '#b91c1c', dot: '#f87171', bg: '#fff1f2' },
};

function getStatusCfg(status: string) {
  return STATUS_CONFIG[status.toLowerCase()] ?? {
    label: status || 'Booking QR',
    color: '#1d4ed8',
    dot: '#60a5fa',
    bg: '#eff6ff',
  };
}

function getQrDataUrl(booking: PublicBookingQr) {
  return booking.qrImageBase64 ? `data:image/png;base64,${booking.qrImageBase64}` : '';
}

function InfoRow({ label, value, bold }: { label: string; value: ReactNode; bold?: boolean }) {
  return (
    <div className="flex items-start gap-4 border-b border-slate-100 py-3 last:border-0">
      <span className="w-44 shrink-0 pt-0.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className={`text-sm text-slate-800 ${bold ? 'font-bold' : 'font-medium'}`}>{value}</span>
    </div>
  );
}

async function downloadBookingQr(booking: PublicBookingQr) {
  const qrDataUrl = getQrDataUrl(booking);
  if (!qrDataUrl) return;

  const canvas = document.createElement('canvas');
  canvas.width = 1400;
  canvas.height = 860;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 48, 48, 1304, 764, 18);
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  roundRectTop(ctx, 48, 48, 1304, 104, 18);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 36px Arial';
  ctx.fillText('TravelAI', 80, 112);
  ctx.font = '500 22px Arial';
  ctx.fillText('Booking QR / Thanh toan tai quay', 250, 112);

  ctx.fillStyle = '#0f172a';
  ctx.font = '800 44px Arial';
  ctx.fillText(booking.bookingCode, 80, 220);

  const cfg = getStatusCfg(booking.paymentStatus);
  ctx.fillStyle = cfg.color;
  ctx.font = '700 20px Arial';
  ctx.fillText(`● ${cfg.label}`, 80, 260);

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(80, 286);
  ctx.lineTo(1320, 286);
  ctx.stroke();

  const rows: [string, string][] = [
    ['Ten khach hang', booking.customerName],
    ['Email', booking.customerEmail || '-'],
    ['So dien thoai', booking.customerPhone || '-'],
    ['Dich vu', booking.serviceName],
    ['Ngay su dung', new Date(booking.useDate).toLocaleDateString('vi-VN')],
    ['So luong', String(booking.quantity)],
    ['Tong tien', `${currencyFormatter.format(booking.totalAmount)}d`],
  ];

  rows.forEach(([label, value], index) => {
    const y = 326 + index * 58;
    ctx.fillStyle = '#64748b';
    ctx.font = '400 18px Arial';
    ctx.fillText(label, 80, y);
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 22px Arial';
    ctx.fillText(value, 400, y);
  });

  const qrImage = new Image();
  qrImage.src = qrDataUrl;
  await qrImage.decode();
  ctx.drawImage(qrImage, 950, 214, 280, 280);
  ctx.fillStyle = '#64748b';
  ctx.font = '500 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Quet ma khi den quay thanh toan', 1090, 522);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#94a3b8';
  ctx.font = '400 16px Arial';
  ctx.fillText('Ma nay dung de xac nhan booking chua thanh toan. Vui long thanh toan tai quay truoc khi su dung dich vu.', 80, 780);

  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `${booking.bookingCode}.png`;
  link.click();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function roundRectTop(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

const PublicBookingQr = () => {
  const { bookingCode } = useParams<{ bookingCode: string }>();
  const [booking, setBooking] = useState<PublicBookingQr | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<LoadError>(null);

  useEffect(() => {
    const fetchBookingQr = async () => {
      if (!bookingCode) {
        setLoadError('not-found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setLoadError(null);
        const res = await axiosClient.get(`/bookings/public-qr/${encodeURIComponent(bookingCode)}`);
        setBooking(res.data);
      } catch (error) {
        setBooking(null);
        if (axios.isAxiosError(error) && error.response?.status === 404 && error.response.data?.message) {
          setLoadError('not-found');
        } else {
          setLoadError('service-unavailable');
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchBookingQr();
  }, [bookingCode]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  if (loadError || !booking) {
    const isNotFound = loadError === 'not-found';

    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="rounded-2xl border border-red-100 bg-white px-10 py-12 text-center shadow-sm">
          <QrCode className="mx-auto mb-4 text-red-300" size={40} />
          <p className="text-lg font-bold text-slate-800">
            {isNotFound ? 'Booking QR khong hop le hoac da bi xoa' : 'Chua ket noi duoc Booking QR API'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {isNotFound
              ? 'Vui long kiem tra lai duong dan hoac lien he ho tro.'
              : 'Backend dang chay co the chua duoc restart sau khi cap nhat route public-qr.'}
          </p>
        </div>
      </div>
    );
  }

  const cfg = getStatusCfg(booking.paymentStatus);
  const qrDataUrl = getQrDataUrl(booking);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 font-sans">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
        <div className="flex items-center justify-between bg-slate-900 px-8 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">TravelAI</p>
            <p className="mt-0.5 text-lg font-bold leading-tight text-white">Booking QR</p>
          </div>
          <p className="text-right text-xs italic text-slate-400">
            Xuat trinh ma nay tai quay de thanh toan va nhan ve dien tu
          </p>
        </div>

        <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-400 to-blue-500" />

        <div className="grid md:grid-cols-[1fr_280px]">
          <div className="border-r border-slate-100 px-8 py-7">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Ma dat cho
                </p>
                <p className="text-3xl font-extrabold tracking-tight text-slate-900">
                  {booking.bookingCode}
                </p>
              </div>
              <span
                className="mt-1 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold"
                style={{ color: cfg.color, borderColor: `${cfg.color}55`, backgroundColor: cfg.bg }}
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
                {cfg.label}
              </span>
            </div>

            <div className="mb-5 border-t border-slate-100" />

            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Thong tin khach hang
            </p>
            <InfoRow label="Ten khach hang" value={booking.customerName} bold />
            {booking.customerEmail && <InfoRow label="Email" value={booking.customerEmail} />}
            <InfoRow label="So dien thoai" value={booking.customerPhone || '-'} />

            <p className="mb-2 mt-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Chi tiet dat cho
            </p>
            <InfoRow label="Dich vu" value={booking.serviceName} bold />
            <InfoRow label="Loai dich vu" value={booking.serviceType || '-'} />
            <InfoRow label="Ma booking" value={`#${booking.bookingId}`} />
            <InfoRow
              label="Ngay su dung"
              value={
                <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                  <CalendarDays size={13} />
                  {formatVietnameseDate(booking.useDate)}
                </span>
              }
            />
            <InfoRow
              label="Ngay dat"
              value={
                <span className="inline-flex items-center gap-1.5 text-slate-700">
                  <Clock size={14} className="text-slate-400" />
                  {formatVietnameseDate(booking.createdAt)}
                </span>
              }
            />
            <InfoRow
              label="So luong"
              value={
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                  {booking.quantity}
                </span>
              }
            />
            <InfoRow
              label="Tong tien"
              value={`${currencyFormatter.format(booking.totalAmount)}d`}
              bold
            />

            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-[11px] leading-relaxed text-amber-800">
                <span className="font-bold">Luu y: </span>
                Day la ma dat cho chua thanh toan. Booking chi duoc xac nhan su dung sau khi thanh toan tai quay hoac hoan tat thanh toan online.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center bg-slate-50/70 px-6 py-7">
            <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR ${booking.bookingCode}`}
                  className="size-52 rounded-xl bg-white"
                />
              ) : (
                <div className="flex size-52 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                  <QrCode size={48} />
                </div>
              )}
            </div>

            <div className="mb-5 text-center">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
                <Receipt size={13} />
                {booking.ticketType}
              </div>
              <p className="text-xs font-medium leading-5 text-slate-500">
                Quet ma de kiem tra booking tai quay thanh toan.
              </p>
            </div>

            <button
              onClick={() => void downloadBookingQr(booking)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-slate-700 active:scale-95"
            >
              <Download size={16} />
              Tai ve
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-8 py-4">
          <p className="inline-flex items-center gap-2 text-[11px] text-slate-400">
            <User size={13} />
            Ho tro 24/7: <span className="font-semibold text-slate-600">support@travelai.com</span>
          </p>
          <p className="text-[11px] text-slate-400">TravelAI - Booking QR</p>
        </div>
      </div>
    </div>
  );
};

export default PublicBookingQr;
