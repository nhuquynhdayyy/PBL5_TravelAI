import { Calendar, Loader2, ShoppingCart, Trash2 } from 'lucide-react';
import { useState, useMemo } from 'react';
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
  const { items, removeItem, clearCart, totalAmount, isLoading } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [removingItem, setRemovingItem] = useState<string | null>(null);

  // Tạo unique ID cho mỗi item trong giỏ hàng
  const getItemId = (item: any) => {
    return `${item.serviceId}-${formatDateForApi(item.checkInDate)}-${item.checkOutDate ? formatDateForApi(item.checkOutDate) : 'null'}`;
  };

  // Tính toán các item đã chọn
  const selectedCartItems = useMemo(() => {
    return items.filter(item => selectedItems.includes(getItemId(item)));
  }, [items, selectedItems]);

  // Tính tổng tiền của các item đã chọn
  const selectedTotalAmount = useMemo(() => {
    return selectedCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [selectedCartItems]);

  // Xử lý chọn/bỏ chọn tất cả
  const handleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(item => getItemId(item)));
    }
  };

  // Xử lý chọn/bỏ chọn một item
  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  // Xử lý xóa item (async)
  const handleRemoveItem = async (serviceId: number, checkInDate: Date, checkOutDate?: Date) => {
    const itemId = getItemId({ serviceId, checkInDate, checkOutDate });
    setRemovingItem(itemId);
    try {
      await removeItem(serviceId, checkInDate, checkOutDate);
      // Xóa item khỏi selectedItems nếu có
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    } catch (error) {
      console.error('Error removing item:', error);
    } finally {
      setRemovingItem(null);
    }
  };

  // Xử lý xóa tất cả
  const handleClearCart = () => {
    if (confirm('Ban co chac chan muon xoa tat ca muc trong gio hang?')) {
      clearCart();
      setSelectedItems([]);
    }
  };

  const handleCheckout = async () => {
    if (selectedItems.length === 0) {
      alert('Vui long chon it nhat 1 muc de thanh toan.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Vui long dang nhap de thanh toan.');
      navigate('/login');
      return;
    }

    try {
      setCheckingOut(true);
      const res = await axiosClient.post('/bookings/draft-cart', {
        items: selectedCartItems.map((item) => ({
          serviceId: item.serviceId,
          quantity: item.quantity,
          checkInDate: formatDateForApi(item.checkInDate),
          checkOutDate: item.checkOutDate ? formatDateForApi(item.checkOutDate) : null
        }))
      });

      if (res.data.bookingId) {
        // Lưu thông tin các item đã checkout để xóa sau khi thanh toán thành công
        const checkedOutItems = selectedCartItems.map(item => ({
          serviceId: item.serviceId,
          checkInDate: formatDateForApi(item.checkInDate),
          checkOutDate: item.checkOutDate ? formatDateForApi(item.checkOutDate) : null
        }));
        localStorage.setItem(`booking_${res.data.bookingId}_items`, JSON.stringify(checkedOutItems));
        
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
          <h1 className="mt-2 text-4xl font-black text-slate-900">Giỏ hàng của bạn</h1>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={handleClearCart}
            disabled={isLoading}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            XÓA TẤT CẢ
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
            {/* Checkbox Chọn tất cả */}
            <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-6 py-4">
              <input
                type="checkbox"
                id="select-all"
                checked={selectedItems.length === items.length && items.length > 0}
                onChange={handleSelectAll}
                className="h-5 w-5 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="select-all" className="cursor-pointer text-sm font-bold text-slate-700">
                Chọn tất cả ({items.length} mục)
              </label>
            </div>

            {items.map((item) => {
              const itemId = getItemId(item);
              const isSelected = selectedItems.includes(itemId);
              
              return (
                <article
                  key={itemId}
                  className={`flex flex-col gap-5 rounded-3xl border p-6 shadow-sm transition-all sm:flex-row sm:items-center ${
                    isSelected 
                      ? 'border-blue-300 bg-blue-50' 
                      : 'border-slate-100 bg-white'
                  }`}
                >
                  {/* Checkbox cho từng item */}
                  <div className="flex items-start gap-4 sm:items-center">
                    <input
                      type="checkbox"
                      id={itemId}
                      checked={isSelected}
                      onChange={() => handleSelectItem(itemId)}
                      className="mt-1 h-5 w-5 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 sm:mt-0"
                    />
                    <div className="flex-1">
                      <h2 className="text-xl font-black text-slate-900">{item.serviceName}</h2>
                      <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold text-slate-500">
                        <span className="flex items-center gap-2">
                          <Calendar size={16} className="text-blue-500" />
                          {item.checkOutDate
                            ? `${item.checkInDate.toLocaleDateString('vi-VN')} - ${item.checkOutDate.toLocaleDateString('vi-VN')}`
                            : item.checkInDate.toLocaleDateString('vi-VN')}
                        </span>
                        <span>{item.quantity} mục</span>
                        <span>{currencyFormatter.format(item.price)} VND / mục</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                    <p className="text-xl font-black text-blue-600">
                      {currencyFormatter.format(item.price * item.quantity)} VND
                    </p>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.serviceId, item.checkInDate, item.checkOutDate)}
                      disabled={removingItem === itemId}
                      className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-2 text-sm font-black text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {removingItem === itemId ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                      XÓA
                    </button>
                  </div>
                </article>
              );
            })}
          </section>

          <aside className="h-fit rounded-3xl bg-slate-900 p-7 text-white shadow-2xl">
            <h2 className="text-xl font-black">Tổng tiền</h2>
            <div className="my-6 space-y-3 border-y border-white/10 py-5">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Số mục đã chọn</span>
                <span className="font-bold">{selectedCartItems.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Tạm tinh</span>
                <span className="font-bold">{currencyFormatter.format(selectedTotalAmount)} VND</span>
              </div>
            </div>
            <div className="mb-6 flex items-center justify-between">
              <span className="font-bold text-slate-300">Thanh toán</span>
              <span className="text-2xl font-black">{currencyFormatter.format(selectedTotalAmount)} VND</span>
            </div>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={checkingOut || selectedItems.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {checkingOut && <Loader2 className="animate-spin" size={18} />}
              {selectedItems.length === 0 ? 'CHỌN MỤC ĐỂ THANH TOÁN' : 'TIẾN HÀNH THANH TOÁN'}
            </button>
          </aside>
        </div>
      )}
    </div>
  );
};

export default Cart;
