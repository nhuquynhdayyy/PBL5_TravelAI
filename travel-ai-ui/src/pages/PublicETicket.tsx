import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarDays, Download, Hash, Loader2, Package, QrCode, UserRound } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { formatVietnameseDate } from '../utils/dateTimeUtils';

type PublicTicket = {
  ticketCode: string;
  bookingId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceName: string;
  quantity: number;
  useDate: string;
  status: string;
  qrCodeUrl: string;
  qrImageBase64: string;
};

const statusClassMap: Record<string, string> = {
  unused: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  used: 'border-slate-200 bg-slate-100 text-slate-700',
  cancelled: 'border-rose-200 bg-rose-50 text-rose-700',
};

function getStatusClass(status: string) {
  return statusClassMap[status.toLowerCase()] ?? 'border-blue-200 bg-blue-50 text-blue-700';
}

function getQrDataUrl(ticket: PublicTicket) {
  return ticket.qrImageBase64 ? `data:image/png;base64,${ticket.qrImageBase64}` : '';
}

async function downloadTicket(ticket: PublicTicket) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 760;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(64, 64, 1072, 632);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(64, 64, 1072, 632);

  ctx.fillStyle = '#0f172a';
  ctx.font = '700 44px Arial';
  ctx.fillText('TravelAI E-ticket', 112, 140);
  ctx.font = '700 28px Arial';
  ctx.fillText(ticket.ticketCode, 112, 190);

  ctx.font = '700 24px Arial';
  const rows = [
    ['Khach hang', ticket.customerName],
    ['Dich vu', ticket.serviceName],
    ['Ngay su dung', new Date(ticket.useDate).toLocaleDateString('vi-VN')],
    ['So luong', String(ticket.quantity)],
    ['Trang thai', ticket.status],
    ['Booking', `#${ticket.bookingId}`],
  ];

  rows.forEach(([label, value], index) => {
    const y = 280 + index * 62;
    ctx.fillStyle = '#64748b';
    ctx.fillText(label, 112, y);
    ctx.fillStyle = '#0f172a';
    ctx.fillText(value, 340, y);
  });

  const qrDataUrl = getQrDataUrl(ticket);
  if (qrDataUrl) {
    const qrImage = new Image();
    qrImage.src = qrDataUrl;
    await qrImage.decode();
    ctx.drawImage(qrImage, 780, 180, 280, 280);
  }

  ctx.fillStyle = '#475569';
  ctx.font = '700 18px Arial';
  ctx.fillText(ticket.qrCodeUrl, 112, 640);

  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `${ticket.ticketCode}.png`;
  link.click();
}

const PublicETicket = () => {
  const { ticketCode } = useParams<{ ticketCode: string }>();
  const [ticket, setTicket] = useState<PublicTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchTicket = async () => {
      if (!ticketCode) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setNotFound(false);
        const res = await axiosClient.get(`/tickets/public/${encodeURIComponent(ticketCode)}`);
        setTicket(res.data);
      } catch {
        setTicket(null);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    void fetchTicket();
  }, [ticketCode]);

  if (loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={34} />
      </div>
    );
  }

  if (notFound || !ticket) {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-2xl items-center justify-center text-center">
        <div className="rounded-2xl border border-rose-100 bg-white p-8 shadow-sm">
          <QrCode className="mx-auto mb-4 text-rose-500" size={44} />
          <h1 className="text-2xl font-black text-slate-900">Vé không hợp lệ hoặc đã bị xóa</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">E-ticket</p>
              <h1 className="mt-2 text-3xl font-black text-slate-900">{ticket.ticketCode}</h1>
            </div>
            <span className={`rounded-full border px-4 py-2 text-sm font-black ${getStatusClass(ticket.status)}`}>
              {ticket.status}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <UserRound className="mb-3 text-blue-500" size={22} />
              <p className="text-xs font-bold uppercase text-slate-500">Tên khách hàng</p>
              <p className="mt-1 text-lg font-black text-slate-900">{ticket.customerName}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <Package className="mb-3 text-emerald-500" size={22} />
              <p className="text-xs font-bold uppercase text-slate-500">Dịch vụ</p>
              <p className="mt-1 text-lg font-black text-slate-900">{ticket.serviceName}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <CalendarDays className="mb-3 text-amber-500" size={22} />
              <p className="text-xs font-bold uppercase text-slate-500">Ngày sử dụng</p>
              <p className="mt-1 text-lg font-black text-slate-900">{formatVietnameseDate(ticket.useDate)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <Hash className="mb-3 text-violet-500" size={22} />
              <p className="text-xs font-bold uppercase text-slate-500">Số lượng</p>
              <p className="mt-1 text-lg font-black text-slate-900">{ticket.quantity}</p>
            </div>
          </div>
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-64 w-64 items-center justify-center rounded-xl bg-slate-50 p-4">
            {ticket.qrImageBase64 ? (
              <img src={getQrDataUrl(ticket)} alt={`QR ${ticket.ticketCode}`} className="h-full w-full object-contain" />
            ) : (
              <QrCode className="text-slate-300" size={96} />
            )}
          </div>
          <button
            onClick={() => void downloadTicket(ticket)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700"
          >
            <Download size={18} />
            Tải vé
          </button>
        </aside>
      </div>
    </div>
  );
};

export default PublicETicket;
