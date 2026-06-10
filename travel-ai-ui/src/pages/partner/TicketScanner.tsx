import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Loader2, QrCode, ShieldCheck, XCircle, FileText, Calendar, Info } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { formatVietnameseDate, formatVietnameseCurrency } from '../../utils/dateTimeUtils';

type VerifyResponse = {
  isValid: boolean;
  message: string;
  ticket?: {
    ticketCode: string;
    bookingId: number;
    customerName: string;
    serviceName: string;
    serviceType: string;
    travelDate: string;
    quantity: number;
    totalAmount: number;
    status: string;
  };
  booking?: {
    bookingCode: string;
    bookingId: number;
    customerName: string;
    serviceName: string;
    useDate: string;
    quantity: number;
    paymentStatus: string;
    ticketType: string;
  };
};

const TicketScanner = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [payload, setPayload] = useState('');
  const [scanning, setScanning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!scanning) {
      return;
    }

    let stream: MediaStream | null = null;
    let cancelled = false;

    const startCamera = async () => {
      setError('');
      const BarcodeDetectorCtor = (window as any).BarcodeDetector;
      if (!BarcodeDetectorCtor) {
        setError('Trình duyệt không hỗ trợ quét QR trực tiếp từ Camera. Vui lòng sao chép URL vé hoặc mã vé nhập vào khung dưới đây.');
        setScanning(false);
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        if (!videoRef.current) {
          return;
        }

        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });

        const scan = async () => {
          if (cancelled || !videoRef.current) {
            return;
          }

          try {
            const codes = await detector.detect(videoRef.current);
            const rawValue = codes?.[0]?.rawValue;
            if (rawValue) {
              setPayload(rawValue);
              setScanning(false);
              return;
            }
          } catch (e) {
            console.error('Barcode detection error:', e);
          }

          window.requestAnimationFrame(scan);
        };

        window.requestAnimationFrame(scan);
      } catch (err) {
        console.error('Camera open error:', err);
        setError('Không thể mở camera thiết bị. Vui lòng cấp quyền camera hoặc tự nhập mã vé vào khung dưới đây.');
        setScanning(false);
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [scanning]);

  const verifyTicket = async () => {
    if (!payload.trim()) {
      setError('Vui lòng nhập nội dung mã QR hoặc mã vé điện tử.');
      return;
    }

    try {
      setVerifying(true);
      setError('');
      setResult(null);
      const res = await axiosClient.post('/tickets/verify', {
        qrPayloadJson: payload,
        markAsUsed: true,
      });
      setResult(res.data);
    } catch (err: any) {
      setResult(err?.response?.data ?? null);
      setError(err?.response?.data?.message ?? 'Không thể xác minh vé điện tử này.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 text-left">
      <div className="mb-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
          <ShieldCheck size={16} />
          Kiểm soát vé dịch vụ
        </div>
        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Quét mã vé điện tử (E-ticket)</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
          Dùng camera để quét mã QR vé của khách hàng hoặc dán mã thủ công để đối soát sử dụng dịch vụ.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Scanner Controller */}
        <div className="rounded-[2.5rem] border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 p-6 sm:p-8 shadow-xl">
          <div className="mb-6 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700/60 pb-4">
            <div className="flex items-center gap-2 font-black text-slate-900 dark:text-white text-lg">
              <QrCode className="text-blue-500" size={24} />
              Quét mã QR trực tuyến
            </div>
            <button
              onClick={() => setScanning((current) => !current)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-sm font-black transition-all duration-200 active:scale-95 cursor-pointer shadow-md shadow-blue-500/10"
            >
              <Camera size={16} />
              {scanning ? 'Tắt camera' : 'Mở camera quét'}
            </button>
          </div>

          <div className="relative aspect-video w-full rounded-2xl bg-slate-950 overflow-hidden border-2 border-slate-200 dark:border-slate-700/70">
            {scanning ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {/* Scanner overlay square */}
                  <div className="size-48 sm:size-64 border-4 border-emerald-500 rounded-3xl animate-pulse relative">
                    {/* Corner accents */}
                    <div className="absolute -top-2 -left-2 size-6 border-t-4 border-l-4 border-white rounded-tl-md"></div>
                    <div className="absolute -top-2 -right-2 size-6 border-t-4 border-r-4 border-white rounded-tr-md"></div>
                    <div className="absolute -bottom-2 -left-2 size-6 border-b-4 border-l-4 border-white rounded-bl-md"></div>
                    <div className="absolute -bottom-2 -right-2 size-6 border-b-4 border-r-4 border-white rounded-br-md"></div>
                    {/* Laser line animation */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-[scan_2s_infinite_linear]"></div>
                  </div>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 p-6 text-center">
                <QrCode size={64} className="mb-4 text-slate-700 dark:text-slate-600 opacity-40 animate-pulse" />
                <p className="font-bold text-base">Camera đang tắt</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">Nhấn nút &ldquo;Mở camera quét&rdquo; ở góc trên để bắt đầu quét trực tiếp bằng camera thiết bị.</p>
              </div>
            )}
          </div>

          <div className="mt-6">
            <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
              Dán liên kết hoặc mã vé điện tử
            </label>
            <textarea
              value={payload}
              onChange={(event) => {
                setPayload(event.target.value);
                setError('');
              }}
              placeholder="Ví dụ: TA-20260603-000002 hoặc dán liên kết vé điện tử nhận được..."
              className="min-h-36 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-sm font-semibold text-slate-700 dark:text-white outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {error && (
            <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-rose-600 dark:text-rose-400 text-sm font-bold flex items-start gap-2">
              <XCircle className="shrink-0 mt-0.5" size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={verifyTicket}
            disabled={verifying || !payload.trim()}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white py-4 text-sm font-black transition-all active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/10 dark:shadow-none"
          >
            {verifying ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Đang xác minh...
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                Xác minh & Đánh dấu sử dụng
              </>
            )}
          </button>
        </div>

        {/* Results Panel */}
        <div className="rounded-[2.5rem] border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 p-6 sm:p-8 shadow-xl flex flex-col">
          <div className="mb-4 font-black text-slate-900 dark:text-white text-lg border-b border-slate-100 dark:border-slate-700/60 pb-4">
            Kết quả xác minh vé
          </div>
          <div className="flex-1 flex flex-col justify-center">
            {result ? (
              <div className={`w-full ${result.isValid ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                <div className="mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                  {result.isValid ? (
                    <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 animate-bounce" size={28} />
                  ) : (
                    <XCircle className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={28} />
                  )}
                  <div>
                    <h3 className="font-black text-lg leading-tight mb-1">{result.isValid ? 'Vé hợp lệ!' : 'Vé không hợp lệ!'}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{result.message}</p>
                  </div>
                </div>
{/* HIỂN THỊ KẾT QUẢ VÉ (TICKET) */}
            {result.ticket && (
              <div className="space-y-4 rounded-3xl bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/80 p-5 text-sm font-bold text-slate-700 dark:text-slate-300 animate-in fade-in zoom-in duration-300">
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/65">
                  <span className="text-slate-400">Mã vé (Code):</span>
                  <span className="font-black text-slate-900 dark:text-white text-base">{result.ticket.ticketCode}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/65">
                  <span className="text-slate-400">Mã đơn hàng (Booking):</span>
                  <span className="text-slate-900 dark:text-white">#{result.ticket.bookingId}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/65">
                  <span className="text-slate-400">Khách hàng:</span>
                  <span className="text-slate-900 dark:text-white">{result.ticket.customerName}</span>
                </div>
                <div className="flex justify-between items-start py-2 border-b border-slate-100 dark:border-slate-800/65 gap-4">
                  <span className="text-slate-400 whitespace-nowrap">Dịch vụ đặt:</span>
                  <span className="text-slate-900 dark:text-white text-right leading-snug">{result.ticket.serviceName}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/65">
                  <span className="text-slate-400">Ngày sử dụng:</span>
                  <span className="text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Calendar size={14} className="text-blue-500" />
                    {formatVietnameseDate(result.ticket.travelDate)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/65">
                  <span className="text-slate-400">Số lượng người đi:</span>
                  <span className="text-slate-900 dark:text-white text-base font-black">{result.ticket.quantity} người</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/65">
                  <span className="text-slate-400">Tổng tiền đơn vé:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-base font-black">{formatVietnameseCurrency(result.ticket.totalAmount)}₫</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-400">Trạng thái vé:</span>
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-black border ${
                    result.ticket.status.toLowerCase() === 'used' || result.ticket.status === 'Đã sử dụng'
                      ? 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-950/20 dark:text-slate-400 dark:border-slate-900/50'
                      : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50'
                  }`}>
                    {result.ticket.status}
                  </span>
                </div>
              </div>
            )}

            {/* HIỂN THỊ KẾT QUẢ ĐƠN HÀNG (BOOKING) - Cập nhật từ nhánh main */}
            {result.booking && (
              <div className="space-y-4 rounded-3xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/50 p-5 text-sm font-bold text-slate-700 dark:text-slate-300 animate-in fade-in zoom-in duration-300">
                <div className="flex justify-between items-center py-2 border-b border-amber-100/50 dark:border-slate-800/65">
                  <span className="text-amber-700/70 dark:text-amber-500/70">Loại đơn:</span>
                  <span className="font-black text-slate-900 dark:text-white">{result.booking.ticketType}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-amber-100/50 dark:border-slate-800/65">
                  <span className="text-amber-700/70 dark:text-amber-500/70">Mã đơn (Code):</span>
                  <span className="font-black text-slate-900 dark:text-white text-base">{result.booking.bookingCode}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-amber-100/50 dark:border-slate-800/65">
                  <span className="text-amber-700/70 dark:text-amber-500/70">Khách hàng:</span>
                  <span className="text-slate-900 dark:text-white">{result.booking.customerName}</span>
                </div>
                <div className="flex justify-between items-start py-2 border-b border-amber-100/50 dark:border-slate-800/65 gap-4">
                  <span className="text-amber-700/70 dark:text-amber-500/70 whitespace-nowrap">Dịch vụ:</span>
                  <span className="text-slate-900 dark:text-white text-right leading-snug">{result.booking.serviceName}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-amber-100/50 dark:border-slate-800/65">
                  <span className="text-amber-700/70 dark:text-amber-500/70">Ngày sử dụng:</span>
                  <span className="text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Calendar size={14} className="text-amber-500" />
                    {new Date(result.booking.useDate).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-amber-700/70 dark:text-amber-500/70">Trạng thái:</span>
                  <span className="bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-black border border-amber-200 dark:border-amber-900/50">
                    Chờ thanh toán
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* TRẠNG THÁI TRỐNG (EMPTY STATE) */
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <FileText size={48} className="mx-auto mb-4 opacity-20 text-slate-400" />
            <p className="font-bold text-sm">Chưa có thông tin xác minh</p>
            <p className="text-xs text-slate-500 mt-2 max-w-[200px] mx-auto leading-relaxed">
              Vui lòng quét mã QR hoặc nhập mã vé để bắt đầu kiểm tra.
            </p>
          </div>
        )}
        </div>
      </div>
    </div>
      
      {/* Laser scan keyframe style for scanning */}
      <style>{`
        @keyframes scan {
          0%, 100% { top: 0%; }
          50% { top: 100%; }
        }
      `}</style>
    </div>
  );
};

export default TicketScanner;
