import { Calendar, CheckSquare, Loader2, Minus, Plus, ShoppingCart, Square, Trash2, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

const getCartItemKey = (item: { serviceId: number; checkInDate: Date }) =>
  `${item.serviceId}-${formatDateForApi(item.checkInDate)}`;

const parseDateInput = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const normalizeAvailableDates = (data: any): string[] => {
  const source = Array.isArray(data) ? data : data?.data;
  if (!Array.isArray(source)) return [];

  return source
    .map((item) => (typeof item === 'string' ? item : item?.date))
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.split('T')[0])
    .sort();
};

const availableDatesCache = new Map<number, string[]>();

const Cart = () => {
  const navigate = useNavigate();
  const { items, updateItem, removeItem, clearCart, totalAmount } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => new Set(items.map((item) => getCartItemKey(item)))
  );

  // In-memory cache for available dates per service to avoid repeated API calls.
  const [availableMap, setAvailableMap] = useState<Record<number, { loading: boolean; dates: string[]; error?: string }>>({});

  useEffect(() => {
    setSelectedKeys((current) => {
      const availableKeys = new Set(items.map((item) => getCartItemKey(item)));
      const next = new Set([...current].filter((key) => availableKeys.has(key)));
      items.forEach((item) => {
        const key = getCartItemKey(item);
        if (!current.size || current.has(key)) {
          next.add(key);
        }
      });
      return next;
    });
  }, [items]);

  

  const selectedItems = useMemo(
    () => items.filter((item) => selectedKeys.has(getCartItemKey(item))),
    [items, selectedKeys]
  );

  const selectedAmount = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [selectedItems]
  );

  const hasUnavailableSelectedDate = useMemo(
    () =>
      selectedItems.some((item) => {
        const availability = availableMap[item.serviceId];
        const selectedDate = formatDateForApi(item.checkInDate);
        return !availability || availability.loading || !availability.dates.includes(selectedDate);
      }),
    [availableMap, selectedItems]
  );

  const allSelected = items.length > 0 && selectedItems.length === items.length;

  const toggleItem = (itemKey: string) => {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(itemKey)) {
        next.delete(itemKey);
      } else {
        next.add(itemKey);
      }
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedKeys(allSelected ? new Set() : new Set(items.map((item) => getCartItemKey(item))));
  };

  const handleUpdateItem = useCallback((
    item: { serviceId: number; checkInDate: Date },
    updates: { checkInDate?: Date; quantity?: number }
  ) => {
    const previousKey = getCartItemKey(item);
    const nextDate = updates.checkInDate ?? item.checkInDate;
    const nextKey = getCartItemKey({ serviceId: item.serviceId, checkInDate: nextDate });

    updateItem(item.serviceId, item.checkInDate, updates);

    setSelectedKeys((current) => {
      if (!current.has(previousKey)) {
        return current;
      }

      const next = new Set(current);
      next.delete(previousKey);
      next.add(nextKey);
      return next;
    });
  }, [updateItem]);

  // Fetch available dates for all services present in cart, with caching.
  // This runs after handlers are defined so we can auto-correct invalid dates.
  useEffect(() => {
    const serviceIds = Array.from(new Set(items.map((i) => i.serviceId)));

    serviceIds.forEach((serviceId) => {
      if (availableDatesCache.has(serviceId)) {
        const cached = availableDatesCache.get(serviceId)!;
        setAvailableMap((m) => ({ ...m, [serviceId]: { loading: false, dates: cached } }));
        return;
      }

      setAvailableMap((m) => ({ ...m, [serviceId]: { loading: true, dates: [] } }));

      axiosClient
        .get(`/services/${serviceId}/available-dates`)
        .then((res) => {
          const dates = normalizeAvailableDates(res.data);
          availableDatesCache.set(serviceId, dates);
          setAvailableMap((m) => ({ ...m, [serviceId]: { loading: false, dates } }));

          // If any cart items for this service have a checkInDate that is no longer available,
          // auto-select the nearest valid date (same day or next available). This improves UX
          // and prevents users from choosing invalid dates.
          const affected = items.filter((it) => it.serviceId === serviceId);
          affected.forEach((it) => {
            const current = formatDateForApi(it.checkInDate);
            if (!dates.includes(current)) {
              // find nearest date >= current, fallback to first available
              const candidate = dates.find((d) => d >= current) || dates[0];
              if (candidate) {
                handleUpdateItem(it, { checkInDate: parseDateInput(candidate) });
              }
            }
          });
        })
        .catch((err) => {
          setAvailableMap((m) => ({ ...m, [serviceId]: { loading: false, dates: [], error: 'Khong the tai lich' } }));
          console.error('Failed to fetch available dates for', serviceId, err);
        });
    });
  }, [items, handleUpdateItem]);

  const handleCheckout = async () => {
    if (selectedItems.length === 0) {
      alert('Vui long chon it nhat mot muc de thanh toan.');
      return;
    }

    if (hasUnavailableSelectedDate) {
      alert('Mot so muc da chon khong con lich trong. Vui long chon ngay khac truoc khi thanh toan.');
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
        items: selectedItems.map((item) => ({
          serviceId: item.serviceId,
          quantity: item.quantity,
          checkInDate: formatDateForApi(item.checkInDate)
        }))
      });

      if (res.data.bookingId) {
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
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
              <button
                type="button"
                onClick={toggleAll}
                className="inline-flex items-center gap-2 text-sm font-black text-slate-700 hover:text-blue-600"
              >
                {allSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                Chon tat ca
              </button>
              <span className="text-sm font-bold text-slate-500">
                Da chon {selectedItems.length}/{items.length} muc
              </span>
            </div>

            {items.map((item) => {
              const itemKey = getCartItemKey(item);
              const isSelected = selectedKeys.has(itemKey);

              return (
              <article
                key={itemKey}
                className={`flex flex-col gap-5 rounded-3xl border bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between ${
                  isSelected ? 'border-blue-200 ring-2 ring-blue-50' : 'border-slate-100'
                }`}
              >
                <div className="flex min-w-0 gap-4">
                  <button
                    type="button"
                    onClick={() => toggleItem(itemKey)}
                    className="mt-1 shrink-0 text-blue-600"
                    aria-label={isSelected ? 'Bo chon muc nay' : 'Chon muc nay'}
                  >
                    {isSelected ? <CheckSquare size={24} /> : <Square size={24} />}
                  </button>
                  <div className="min-w-0">
                    <h2 className="text-xl font-black text-slate-900">{item.serviceName}</h2>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold text-slate-500">
                      <span className="flex items-center gap-2">
                        <Calendar size={16} className="text-blue-500" />
                        {item.checkInDate.toLocaleDateString('vi-VN')}
                      </span>
                      <span>{item.quantity} khach</span>
                      <span>{currencyFormatter.format(item.price)} VND / khach</span>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-[180px_180px]">
                      <label className="block">
                        <span className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          <Calendar size={13} /> Ngay su dung
                        </span>
                        {/* Only allow selecting from available dates fetched from backend; prevent free typing */}
                        {(() => {
                          const svc = availableMap[item.serviceId];
                          const currentValue = formatDateForApi(item.checkInDate);
                          if (!svc || svc.loading) {
                            return (
                              <select disabled className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 bg-slate-50">
                                <option value={currentValue}>Đang tải lịch...</option>
                              </select>
                            );
                          }

                          if (!svc.dates || svc.dates.length === 0) {
                            return (
                              <select disabled className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 bg-slate-50">
                                <option>Khong con lich trong</option>
                              </select>
                            );
                          }

                          return (
                            <select
                              value={svc.dates.includes(currentValue) ? currentValue : svc.dates[0]}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (!v) return;
                                handleUpdateItem(item, { checkInDate: parseDateInput(v) });
                              }}
                              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 outline-none focus:border-blue-500 bg-white"
                            >
                              {svc.dates.map((d) => (
                                <option key={d} value={d}>
                                  {new Date(d).toLocaleDateString('vi-VN')}
                                </option>
                              ))}
                            </select>
                          );
                        })()}
                        {availableMap[item.serviceId]?.error && (
                          <p className="mt-1 text-xs text-red-400">{availableMap[item.serviceId].error}</p>
                        )}
                      </label>

                      <div>
                        <span className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          <Users size={13} /> So nguoi
                        </span>
                        <div className="grid grid-cols-[40px_1fr_40px] overflow-hidden rounded-2xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleUpdateItem(item, { quantity: item.quantity - 1 })}
                            disabled={item.quantity <= 1}
                            className="flex items-center justify-center bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Giam so nguoi"
                          >
                            <Minus size={16} />
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(event) => handleUpdateItem(item, { quantity: Number(event.target.value) || 1 })}
                            className="min-w-0 border-x border-slate-200 px-2 py-2 text-center text-sm font-black text-slate-800 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateItem(item, { quantity: item.quantity + 1 })}
                            className="flex items-center justify-center bg-slate-50 text-slate-600 hover:bg-slate-100"
                            aria-label="Tang so nguoi"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
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
              );
            })}
          </section>

          <aside className="h-fit rounded-3xl bg-slate-900 p-7 text-white shadow-2xl">
            <h2 className="text-xl font-black">Tong tien</h2>
            <div className="my-6 space-y-3 border-y border-white/10 py-5">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>So muc</span>
                <span className="font-bold">{selectedItems.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Tong gio hang</span>
                <span className="font-bold">{currencyFormatter.format(totalAmount)} VND</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Tam tinh</span>
                <span className="font-bold">{currencyFormatter.format(selectedAmount)} VND</span>
              </div>
            </div>
            <div className="mb-6 flex items-center justify-between">
              <span className="font-bold text-slate-300">Thanh toan</span>
              <span className="text-2xl font-black">{currencyFormatter.format(selectedAmount)} VND</span>
            </div>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={checkingOut || selectedItems.length === 0 || hasUnavailableSelectedDate}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {checkingOut && <Loader2 className="animate-spin" size={18} />}
              THANH TOAN CAC MUC DA CHON
            </button>
            {hasUnavailableSelectedDate && (
              <p className="mt-3 text-xs font-bold text-amber-200">
                Co muc dang tai lich hoac ngay da chon khong con trong.
              </p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
};

export default Cart;
