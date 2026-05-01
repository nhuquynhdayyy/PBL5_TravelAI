import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { ArrowLeft, CheckCircle2, Loader2, QrCode, ShieldCheck } from 'lucide-react';

const providerLabels: Record<string, string> = {
  vnpay: 'VNPay',
  momo: 'MoMo',
};

const MockPayment = () => {
  const { provider = 'vnpay', bookingId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [paying, setPaying] = useState(false);

  const amount = Number(searchParams.get('amount') || 0);
  const providerName = providerLabels[provider.toLowerCase()] || provider.toUpperCase();
  const formattedAmount = useMemo(
    () => new Intl.NumberFormat('vi-VN').format(amount),
    [amount]
  );

  const confirmPayment = async () => {
    if (!bookingId || !amount) return;

    try {
      setPaying(true);
      const res = await axiosClient.post('/payments/mock/confirm', {
        bookingId: Number(bookingId),
        amount,
      });

      if (res.data.success) {
        navigate(`/booking-success/${bookingId}?paymentStatus=success&message=Mock ${providerName} payment confirmed`);
      }
    } catch (err) {
      console.error(err);
      alert('Khong xac nhan duoc thanh toan demo. Vui long thu lai.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <button
        onClick={() => navigate(-1)}
        className="mb-8 flex items-center gap-2 font-bold text-slate-500 transition-colors hover:text-blue-600"
      >
        <ArrowLeft size={20} /> Quay lai
      </button>

      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-2xl">
        <div className="bg-slate-900 px-8 py-6 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">Mock Gateway</p>
          <h1 className="mt-2 text-3xl font-black">Thanh toan qua {providerName}</h1>
          <p className="mt-2 text-sm text-slate-300">
            Trang demo nay thay the cong thanh toan that khi chua cau hinh merchant credentials.
          </p>
        </div>

        <div className="grid gap-8 p-8 md:grid-cols-[260px_1fr]">
          <div className="flex aspect-square items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50">
            <QrCode size={150} className="text-slate-800" />
          </div>

          <div className="flex flex-col justify-between gap-6 text-left">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Ma don hang</p>
                <p className="text-2xl font-black text-slate-900">#BK-000{bookingId}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">So tien</p>
                <p className="text-3xl font-black text-blue-600">{formattedAmount} VND</p>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-amber-800">
                <ShieldCheck className="mt-0.5 shrink-0" size={20} />
                <p className="text-sm font-medium">
                  Booking chi duoc confirm sau khi ban bam nut xac nhan demo ben duoi. Khong co
                  callback tu dong thanh cong.
                </p>
              </div>
            </div>

            <button
              onClick={confirmPayment}
              disabled={paying}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-sm font-black text-white transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {paying ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
              {paying ? 'DANG XAC NHAN...' : 'TOI DA THANH TOAN DEMO'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockPayment;
