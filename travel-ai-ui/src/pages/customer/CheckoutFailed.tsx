import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, RefreshCcw } from 'lucide-react';

const CheckoutFailed = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <div className="mb-6 inline-flex size-20 items-center justify-center rounded-full bg-red-100 text-red-600">
        <AlertTriangle size={44} />
      </div>
      <h1 className="text-4xl font-black text-slate-900">Thanh toan that bai</h1>
      <p className="mt-3 font-medium text-slate-500">
        Cong thanh toan da tra ve trang thai khong thanh cong. Booking cua ban chua duoc xac nhan
        thanh toan.
      </p>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => navigate(`/checkout/${bookingId}`)}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-sm font-black text-white hover:bg-blue-700"
        >
          <RefreshCcw size={18} /> THU LAI
        </button>
        <button
          onClick={() => navigate('/my-bookings')}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-4 text-sm font-black text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft size={18} /> VE BOOKINGS
        </button>
      </div>
    </div>
  );
};

export default CheckoutFailed;
