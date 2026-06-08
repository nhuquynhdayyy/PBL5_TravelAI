import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Loader2, QrCode, ShieldCheck, XCircle } from 'lucide-react';
import axiosClient from '../../api/axiosClient';

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
};

const currencyFormatter = new Intl.NumberFormat('vi-VN');

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
        setError('Camera QR scan is not supported in this browser. Paste the ticket URL or code below.');
        setScanning(false);
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
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

          const codes = await detector.detect(videoRef.current);
          const rawValue = codes?.[0]?.rawValue;
          if (rawValue) {
            setPayload(rawValue);
            setScanning(false);
            return;
          }

          window.requestAnimationFrame(scan);
        };

        window.requestAnimationFrame(scan);
      } catch {
        setError('Cannot open camera. Paste the ticket URL or code below.');
        setScanning(false);
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [scanning]);

  const verifyTicket = async () => {
    if (!payload.trim()) {
      setError('QR payload is required.');
      return;
    }

    try {
      setVerifying(true);
      setError('');
      const res = await axiosClient.post('/tickets/verify', {
        qrPayloadJson: payload,
        markAsUsed: true,
      });
      setResult(res.data);
    } catch (err: any) {
      setResult(err?.response?.data ?? null);
      setError(err?.response?.data?.message ?? 'Cannot verify this ticket.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
          <ShieldCheck size={16} />
          Ticket verification
        </div>
        <h1 className="text-4xl font-black text-slate-900">E-ticket QR scanner</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-black text-slate-900">
              <QrCode className="text-blue-500" size={22} />
              Scan QR
            </div>
            <button
              onClick={() => setScanning((current) => !current)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white"
            >
              <Camera size={16} />
              {scanning ? 'Stop camera' : 'Open camera'}
            </button>
          </div>

          <video
            ref={videoRef}
            className="aspect-video w-full rounded-2xl bg-slate-950 object-cover"
            muted
            playsInline
          />

          <textarea
            value={payload}
            onChange={(event) => setPayload(event.target.value)}
            placeholder="Paste ticket URL or code, for example https://travelai.vn/e-ticket/TA-20260603-000002"
            className="mt-4 min-h-36 w-full rounded-2xl border border-slate-200 p-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400"
          />

          {error && <p className="mt-3 text-sm font-bold text-rose-600">{error}</p>}

          <button
            onClick={verifyTicket}
            disabled={verifying}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white disabled:opacity-70"
          >
            {verifying ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
            Verify and mark used
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 font-black text-slate-900">Verification result</div>
          {result ? (
            <div className={result.isValid ? 'text-emerald-700' : 'text-rose-700'}>
              <div className="mb-4 flex items-center gap-2 text-lg font-black">
                {result.isValid ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                {result.message}
              </div>
              {result.ticket && (
                <div className="space-y-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
                  <p>Code: {result.ticket.ticketCode}</p>
                  <p>Booking: #{result.ticket.bookingId}</p>
                  <p>Customer: {result.ticket.customerName}</p>
                  <p>Service: {result.ticket.serviceName}</p>
                  <p>Type: {result.ticket.serviceType}</p>
                  <p>Travel date: {new Date(result.ticket.travelDate).toLocaleDateString('vi-VN')}</p>
                  <p>Quantity: {result.ticket.quantity}</p>
                  <p>Total: {currencyFormatter.format(result.ticket.totalAmount)}d</p>
                  <p>Status: {result.ticket.status}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm font-semibold text-slate-500">No ticket has been verified yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketScanner;
