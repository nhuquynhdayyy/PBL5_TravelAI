import { Calendar, Loader2, ShoppingCart, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { useCart } from '../../contexts/CartContext';

const currencyFormatter = new Intl.NumberFormat('vi-VN');

const formatDateForApi = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const Cart = () => {
  const navigate = useNavigate();
  const { items, removeItem, clearCart, totalAmount } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);

  const handleCheckout = async () => {
    if (items.length === 0) return;

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Vui long dang nhap de thanh toan.');
      navigate('/login');
      return;
    }

    try {
      setCheckingOut(true);
      const res = await axiosClient.post('/bookings/draft-cart', {
        items: items.map((item) => ({
          serviceId: item.serviceId,
          quantity: item.quantity,
          checkInDate: formatDateForApi(item.checkInDate)
        }))
      });

      if (res.data.bookingId) {
        clearCart();
        navigate(`/checkout/${res.data.bookingId}`);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Khong the tao don hang tu gio hang.');
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 text-left">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-600">Cart</p>
          <h1 className="mt-2 text-4xl font-black text-slate-900">Gio hang cua ban</h1>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={clearCart}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50"
          >
            XOA TAT CA
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <ShoppingCart className="mb-4 text-slate-300" size={56} />
          <h2 className="text-2xl font-black text-slate-900">Gio hang dang trong</h2>
          <p className="mt-2 max-w-md font-medium text-slate-500">
            Hay chon dich vu, ngay su dung va so luong truoc khi tien hanh thanh toan.
          </p>
          <button
            type="button"
            onClick={() => navigate('/services')}
            className="mt-8 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white hover:bg-blue-700"
          >
            XEM DICH VU
          </button>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <section className="space-y-4">
            {items.map((item) => (
              <article
                key={`${item.serviceId}-${formatDateForApi(item.checkInDate)}`}
                className="flex flex-col gap-5 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h2 className="text-xl font-black text-slate-900">{item.serviceName}</h2>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold text-slate-500">
                    <span className="flex items-center gap-2">
                      <Calendar size={16} className="text-blue-500" />
                      {item.checkInDate.toLocaleDateString('vi-VN')}
                    </span>
                    <span>{item.quantity} khach</span>
                    <span>{currencyFormatter.format(item.price)} VND / khach</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                  <p className="text-xl font-black text-blue-600">
                    {currencyFormatter.format(item.price * item.quantity)} VND
                  </p>
                  <button
                    type="button"
                    onClick={() => removeItem(item.serviceId, item.checkInDate)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-2 text-sm font-black text-red-600 hover:bg-red-100"
                  >
                    <Trash2 size={16} /> XOA
                  </button>
                </div>
              </article>
            ))}
          </section>

          <aside className="h-fit rounded-3xl bg-slate-900 p-7 text-white shadow-2xl">
            <h2 className="text-xl font-black">Tong tien</h2>
            <div className="my-6 space-y-3 border-y border-white/10 py-5">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>So muc</span>
                <span className="font-bold">{items.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Tam tinh</span>
                <span className="font-bold">{currencyFormatter.format(totalAmount)} VND</span>
              </div>
            </div>
            <div className="mb-6 flex items-center justify-between">
              <span className="font-bold text-slate-300">Thanh toan</span>
              <span className="text-2xl font-black">{currencyFormatter.format(totalAmount)} VND</span>
            </div>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={checkingOut}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {checkingOut && <Loader2 className="animate-spin" size={18} />}
              TIEN HANH THANH TOAN
            </button>
          </aside>
        </div>
      )}
    </div>
  );
};

export default Cart;
