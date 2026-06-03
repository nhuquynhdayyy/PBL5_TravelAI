import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Loader2, QrCode } from 'lucide-react';
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

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  unused: { label: 'Chưa sử dụng', color: '#15803d', dot: '#22c55e' },
  used:   { label: 'Đã sử dụng',   color: '#475569', dot: '#94a3b8' },
  cancelled: { label: 'Đã huỷ',    color: '#b91c1c', dot: '#f87171' },
};

function getStatusCfg(status: string) {
  return STATUS_CONFIG[status.toLowerCase()] ?? { label: status, color: '#1d4ed8', dot: '#60a5fa' };
}

function getQrDataUrl(ticket: PublicTicket) {
  return ticket.qrImageBase64 ? `data:image/png;base64,${ticket.qrImageBase64}` : '';
}

async function downloadTicket(ticket: PublicTicket) {
  const canvas = document.createElement('canvas');
  canvas.width = 1400;
  canvas.height = 860;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Card
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 48, 48, 1304, 764, 16);
  ctx.fill();

  // Header bar
  ctx.fillStyle = '#0f172a';
  roundRectTop(ctx, 48, 48, 1304, 100, 16);
  ctx.fill();

  // Header text
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 36px Georgia, serif';
  ctx.fillText('TravelAI', 80, 112);
  ctx.font = '400 22px Georgia, serif';
  ctx.fillText('E-ticket / Vé Điện Tử', 220, 112);

  // Ticket code
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 42px Georgia, serif';
  ctx.fillText(ticket.ticketCode, 80, 210);

  // Status badge
  const cfg = getStatusCfg(ticket.status);
  ctx.fillStyle = cfg.color;
  ctx.font = '600 20px Arial';
  ctx.fillText(`● ${cfg.label}`, 80, 250);

  // Divider
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(80, 272); ctx.lineTo(1320, 272); ctx.stroke();

  // Info rows
  const rows: [string, string][] = [
    ['Tên khách hàng', ticket.customerName],
    ['Email', ticket.customerEmail || '—'],
    ['Số điện thoại', ticket.customerPhone || '—'],
    ['Dịch vụ', ticket.serviceName],
    ['Ngày sử dụng', new Date(ticket.useDate).toLocaleDateString('vi-VN')],
    ['Số lượng', String(ticket.quantity)],
    ['Mã đặt dịch vụ', `#${ticket.bookingId}`],
  ];

  rows.forEach(([label, value], i) => {
    const y = 310 + i * 60;
    ctx.fillStyle = '#64748b';
    ctx.font = '400 18px Arial';
    ctx.fillText(label, 80, y);
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 22px Arial';
    ctx.fillText(value, 400, y);
  });

  // QR
  const qrDataUrl = getQrDataUrl(ticket);
  if (qrDataUrl) {
    const qrImage = new Image();
    qrImage.src = qrDataUrl;
    await qrImage.decode();
    ctx.drawImage(qrImage, 950, 200, 280, 280);
    ctx.font = '400 16px Arial';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText('Quét mã để xác thực vé', 1090, 500);
    ctx.textAlign = 'left';
  }

  // Footer note
  ctx.fillStyle = '#94a3b8';
  ctx.font = '400 16px Arial';
  ctx.fillText('Vui lòng xuất trình vé này (bản in hoặc điện tử) khi đến sử dụng dịch vụ.', 80, 780);

  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `${ticket.ticketCode}.png`;
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

// ─── Row helper ─────────────────────────────────────────────────────────────
function InfoRow({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) {
  return (
    <div className="flex items-start gap-4 py-3 border-b border-slate-100 last:border-0">
      <span className="w-44 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400 pt-0.5">
        {label}
      </span>
      <span className={`text-sm text-slate-800 ${bold ? 'font-bold' : 'font-medium'}`}>{value}</span>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
const PublicETicket = () => {
  const { ticketCode } = useParams<{ ticketCode: string }>();
  const [ticket, setTicket] = useState<PublicTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchTicket = async () => {
      if (!ticketCode) { setNotFound(true); setLoading(false); return; }
      try {
        setLoading(true);
        setNotFound(false);
        const res = await axiosClient.get(`/tickets/public/${encodeURIComponent(ticketCode)}`);
        console.log('ticket data:', res.data); 
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  if (notFound || !ticket) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="rounded-2xl border border-red-100 bg-white px-10 py-12 text-center shadow-sm">
          <QrCode className="mx-auto mb-4 text-red-300" size={40} />
          <p className="text-lg font-bold text-slate-800">Vé không hợp lệ hoặc đã bị xóa</p>
          <p className="mt-1 text-sm text-slate-500">Vui lòng kiểm tra lại đường dẫn hoặc liên hệ hỗ trợ.</p>
        </div>
      </div>
    );
  }

  const cfg = getStatusCfg(ticket.status);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 font-sans">
      {/* ── Booking Confirmation card ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">

        {/* ── Header ── */}
        <div className="bg-slate-900 px-8 py-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">TravelAI</p>
            <p className="mt-0.5 text-lg font-bold text-white leading-tight">Xác nhận đặt dịch vụ</p>
          </div>
          <p className="text-xs text-slate-500 italic">
            Vui lòng xuất trình vé khi đến sử dụng dịch vụ
          </p>
        </div>

        {/* ── Red accent bar ── */}
        <div className="h-1 bg-gradient-to-r from-rose-500 via-orange-400 to-amber-400" />

        <div className="grid md:grid-cols-[1fr_220px]">

          {/* ── Left: info ── */}
          <div className="px-8 py-7 border-r border-slate-100">

            {/* Ticket code + status */}
            <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                  Mã vé điện tử
                </p>
                <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {ticket.ticketCode}
                </p>
              </div>
              <span
                className="mt-1 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold"
                style={{ color: cfg.color, borderColor: cfg.color + '55', backgroundColor: cfg.color + '11' }}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: cfg.dot }}
                />
                {cfg.label}
              </span>
            </div>

            {/* Divider */}
            <div className="mb-5 border-t border-slate-100" />

            {/* Customer section */}
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Thông tin khách hàng
            </p>
            <InfoRow label="Tên khách hàng" value={ticket.customerName} bold />
            {ticket.customerEmail && (
              <InfoRow label="Email" value={ticket.customerEmail} />
            )}
            <InfoRow label="Số điện thoại" value={ticket.customerPhone || '—'} />

            {/* Booking section */}
            <p className="mb-2 mt-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Chi tiết đặt dịch vụ
            </p>
            <InfoRow label="Dịch vụ" value={ticket.serviceName} bold />
            <InfoRow label="Mã đặt dịch vụ" value={`#${ticket.bookingId}`} />
            <InfoRow
              label="Ngày sử dụng"
              value={
                <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-0.5 text-amber-700 font-semibold border border-amber-200 text-xs">
                  {formatVietnameseDate(ticket.useDate)}
                </span>
              }
            />
            <InfoRow
              label="Số lượng"
              value={
                <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-slate-100 text-slate-700 font-bold text-sm">
                  {ticket.quantity}
                </span>
              }
            />

            {/* Policy note */}
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                <span className="font-bold text-slate-700">Lưu ý: </span>
                Vé này không thể hoàn trả hoặc chuyển nhượng sau khi đặt thành công. Vui lòng liên hệ bộ phận hỗ trợ nếu cần thay đổi.
              </p>
            </div>
          </div>

          {/* ── Right: download ── */}
          <div className="flex flex-col items-center justify-center px-6 py-7 bg-slate-50/60">
            <button
              onClick={() => void downloadTicket(ticket)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-slate-700 active:scale-95"
            >
              <Download size={16} />
              Tải về
            </button>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-slate-100 bg-slate-50 px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400">
            Hỗ trợ 24/7: <span className="font-semibold text-slate-600">support@travelai.com</span>
            {' · '}
            <span className="font-semibold text-slate-600">+84 123 456 789</span>
          </p>
          <p className="text-[11px] text-slate-400">
            TravelAI — Smart travel powered by AI
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicETicket;