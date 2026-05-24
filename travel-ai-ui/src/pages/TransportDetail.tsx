import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Car,
  CheckCircle2,
  Loader2,
  MapPin,
  ShoppingCart,
  Star,
  Zap
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useCart } from '../contexts/CartContext';

type Attribute = { attrKey: string; attrValue: string };

type ServiceDetailDto = {
  serviceId: number;
  partnerId: number;
  partnerName: string;
  serviceType: string;
  name: string;
  description: string;
  basePrice: number;
  ratingAvg: number;
  spotName?: string;
  imageUrls: string[];
  attributes: Record<string, string> | Attribute[];
};

type AvailabilityDto = {
  date: string;
  price: number;
  remaining: number;
  isAvailable: boolean;
};

const currencyFormatter = new Intl.NumberFormat('vi-VN');

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeAttributes = (attributes: ServiceDetailDto['attributes'] = {}) => {
  if (Array.isArray(attributes)) {
    return attributes;
  }

  return Object.entries(attributes).map(([attrKey, attrValue]) => ({
    attrKey,
    attrValue: String(attrValue)
  }));
};

const getImageUrl = (path?: string) => {
  if (!path) return '';
  return path.startsWith('http') ? path : `http://localhost:5134${path}`;
};

const TransportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [service, setService] = useState<ServiceDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [remainingStock, setRemainingStock] = useState<number | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState('');

  const isLoggedIn = Boolean(localStorage.getItem('token'));
  const today = toDateInputValue(new Date());

  useEffect(() => {
    const fetchServiceDetail = async () => {
      try {
        setLoading(true);
        const res = await axiosClient.get(`/services/${id}`);
        setService(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchServiceDetail();
  }, [id]);

  const rentalDays = useMemo(() => {
    if (!startDate || !endDate) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    return days >= 1 ? days : 0;
  }, [endDate, startDate]);

  const totalPrice = useMemo(() => {
    if (!service || rentalDays <= 0) return 0;
    return service.basePrice * rentalDays * quantity;
  }, [quantity, rentalDays, service]);

  useEffect(() => {
    if (!service || !startDate || !endDate || rentalDays <= 0) {
      setRemainingStock(null);
      setAvailabilityMessage('');
      return;
    }

    const controller = new AbortController();

    const fetchAvailability = async () => {
      try {
        setAvailabilityLoading(true);
        const res = await axiosClient.get<AvailabilityDto[]>(`/availability/${service.serviceId}`, {
          params: { start: startDate, end: endDate },
          signal: controller.signal
        });

        const rows = res.data || [];
        if (rows.length !== rentalDays) {
          setRemainingStock(0);
          setAvailabilityMessage('Xe khong du lich mo ban cho toan bo khoang ngay nay.');
          return;
        }

        const minRemaining = Math.min(...rows.map((row) => row.remaining));
        setRemainingStock(Math.max(0, minRemaining));
        setAvailabilityMessage(
          minRemaining > 0
            ? `Con ${minRemaining} xe trong toan bo khoang ngay da chon.`
            : 'Xe da het trong mot ngay thuoc khoang da chon.'
        );
      } catch (err: any) {
        if (err?.name !== 'CanceledError') {
          setRemainingStock(null);
          setAvailabilityMessage('Chua kiem tra duoc ton kho. Vui long thu lai.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setAvailabilityLoading(false);
        }
      }
    };

    fetchAvailability();

    return () => controller.abort();
  }, [endDate, rentalDays, service, startDate]);

  useEffect(() => {
    if (remainingStock !== null && quantity > remainingStock && remainingStock > 0) {
      setQuantity(remainingStock);
    }
  }, [quantity, remainingStock]);

  const attributes = useMemo(() => normalizeAttributes(service?.attributes), [service]);
  const getAttribute = (...keys: string[]) =>
    attributes.find((attribute) =>
      keys.some((key) => attribute.attrKey.trim().toLowerCase() === key.trim().toLowerCase())
    )?.attrValue;

  const vehicleType = getAttribute('VehicleType', 'TransportType', 'Loai xe', 'Loại xe') || 'Xe';
  const brand = getAttribute('Brand', 'Hang xe', 'Hãng xe');
  const transmission = getAttribute('Transmission', 'Hop so', 'Hộp số');
  const insurance = getAttribute('Insurance', 'Bao hiem', 'Bảo hiểm');
  const helmet = getAttribute('Helmet', 'Mu bao hiem', 'Mũ bảo hiểm');
  const seats = getAttribute('Seats', 'So cho', 'Số chỗ');
  const canBook = rentalDays > 0 && !availabilityLoading && remainingStock !== null && remainingStock >= quantity;

  const requireValidSelection = () => {
    if (!service) return false;

    if (!startDate || !endDate) {
      alert('Vui long chon ngay nhan va ngay tra xe.');
      return false;
    }

    if (rentalDays <= 0) {
      alert('Ngay tra phai lon hon hoac bang ngay nhan xe.');
      return false;
    }

    if (!canBook) {
      alert('So luong xe con trong khong du cho khoang ngay da chon.');
      return false;
    }

    return true;
  };

  const handleBooking = async () => {
    if (!service || !requireValidSelection()) return;

    if (!isLoggedIn) {
      alert('Vui long dang nhap de dat xe.');
      navigate('/login');
      return;
    }

    try {
      setBookingLoading(true);
      const res = await axiosClient.post('/bookings/draft', {
        serviceId: service.serviceId,
        quantity,
        checkInDate: startDate,
        checkOutDate: endDate
      });

      if (res.data.bookingId) {
        navigate(`/checkout/${res.data.bookingId}`);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Khong the dat xe luc nay. Vui long thu lai.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!service || !requireValidSelection()) return;

    addItem({
      serviceId: service.serviceId,
      serviceName: `${service.name} (${rentalDays} ngay)`,
      checkInDate: new Date(startDate),
      checkOutDate: new Date(endDate),
      quantity,
      price: service.basePrice * rentalDays
    });

    alert('Da them xe vao gio hang.');
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  if (!service) {
    return <div className="p-20 text-center font-bold">Khong tim thay dich vu.</div>;
  }

  const hiddenAttributeKeys = ['VehicleType', 'TransportType', 'Loai xe', 'Loại xe', 'Brand', 'Hang xe', 'Hãng xe', 'Transmission', 'Hop so', 'Hộp số', 'Insurance', 'Bao hiem', 'Bảo hiểm', 'Helmet', 'Mu bao hiem', 'Mũ bảo hiểm', 'Seats', 'So cho', 'Số chỗ'];

  return (
    <div className="mx-auto mb-20 max-w-7xl px-4 py-10">
      <button
        onClick={() => navigate(-1)}
        className="mb-8 flex items-center gap-2 font-bold text-slate-500 hover:text-blue-600"
      >
        <ArrowLeft size={20} /> Quay lai danh sach
      </button>

      <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_500px]">
        <div className="space-y-8">
          <div className="h-[580px] overflow-hidden rounded-[2rem] border-8 border-white shadow-2xl">
            {service.imageUrls?.length ? (
              <img
                src={getImageUrl(service.imageUrls[activeImg])}
                className="h-full w-full object-cover"
                alt={service.name}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                <Car size={72} />
              </div>
            )}
          </div>

          {service.imageUrls?.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {service.imageUrls.map((img, index) => (
                <button key={img} type="button" onClick={() => setActiveImg(index)}>
                  <img
                    src={getImageUrl(img)}
                    className={`h-24 w-32 rounded-2xl object-cover border-4 transition-all ${
                      activeImg === index ? 'scale-105 border-blue-500' : 'border-transparent opacity-50'
                    }`}
                    alt={`${service.name}-${index + 1}`}
                  />
                </button>
              ))}
            </div>
          )}

          <div className="text-left">
            <div className="mb-4 inline-flex items-center rounded-full bg-blue-100 px-4 py-2 text-sm font-black text-blue-700">
              <Car className="mr-2" size={16} />
              {vehicleType}
            </div>
            <h1 className="mb-4 text-5xl font-black tracking-tight text-slate-900">{service.name}</h1>
            <div className="mb-8 flex flex-wrap items-center gap-6 font-bold text-slate-500">
              <span className="flex items-center gap-1.5">
                <MapPin size={20} className="text-red-500" /> {service.spotName || 'Da Nang'}
              </span>
              <span className="flex items-center gap-1.5">
                <Star size={20} className="fill-orange-400 text-orange-400" />
                {service.ratingAvg.toFixed(1)} danh gia
              </span>
            </div>

            <div className="mb-8 grid grid-cols-2 gap-4">
              {brand && <InfoTile label="Hang xe" value={brand} />}
              {transmission && <InfoTile label="Hop so" value={transmission} />}
              {seats && <InfoTile label="So cho ngoi" value={`${seats} cho`} />}
              {insurance && <InfoTile label="Bao hiem" value={insurance} />}
            </div>

            <div className="mb-8 rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
              <h3 className="mb-4 text-xl font-black text-slate-800">Tien ich di kem</h3>
              <div className="space-y-3">
                {helmet && <FeatureLine label={`Mu bao hiem: ${helmet}`} />}
                {attributes
                  .filter((attribute) => !hiddenAttributeKeys.some((key) => key.toLowerCase() === attribute.attrKey.toLowerCase()))
                  .map((attribute) => (
                    <FeatureLine key={attribute.attrKey} label={`${attribute.attrKey}: ${attribute.attrValue}`} />
                  ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-10 text-lg leading-relaxed text-slate-600 shadow-sm">
              <h3 className="mb-4 text-xl font-black text-slate-800">Mo ta dich vu</h3>
              {service.description}
            </div>
          </div>
        </div>

        <div>
          <div className="sticky top-28 rounded-3xl border border-slate-100 bg-white p-4 text-left shadow-2xl shadow-slate-200/70">
            <div className="mb-5 rounded-3xl bg-slate-50 p-5">
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Gia thue moi ngay</p>
              <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                <span className="whitespace-nowrap text-4xl font-black leading-none text-blue-600">
                  {currencyFormatter.format(service.basePrice)} VND
                </span>
                <span className="pb-1 text-sm font-bold text-slate-400">/ ngay</span>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DateInput
                  label="Ngay nhan xe"
                  min={today}
                  value={startDate}
                  onChange={(value) => {
                    setStartDate(value);
                    if (endDate && value > endDate) {
                      setEndDate(value);
                    }
                  }}
                />
                <DateInput
                  label="Ngay tra xe"
                  min={startDate || today}
                  value={endDate}
                  onChange={setEndDate}
                />
              </div>

              <div>
                <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase text-slate-400">
                  <Car size={14} /> So luong xe
                </label>
                <div className="flex items-center rounded-2xl border-2 border-slate-100 bg-slate-50 p-2">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="flex size-10 items-center justify-center rounded-xl bg-white text-xl font-black shadow-sm transition-all hover:bg-blue-500 hover:text-white"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center text-lg font-black">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((current) => current + 1)}
                    disabled={remainingStock !== null && quantity >= remainingStock}
                    className="flex size-10 items-center justify-center rounded-xl bg-white text-xl font-black shadow-sm transition-all hover:bg-blue-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>

              {rentalDays > 0 && (
                <div className="rounded-2xl border-2 border-blue-100 bg-blue-50 p-4">
                  <p className="text-sm font-bold text-blue-700">
                    So ngay thue: <span className="text-xl">{rentalDays}</span> ngay
                  </p>
                  <p className="mt-1 text-xs text-blue-600">
                    {currencyFormatter.format(service.basePrice)} VND x {rentalDays} ngay x {quantity} xe
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-slate-100 bg-white p-4">
                <div className="flex items-center justify-between gap-3 text-sm font-bold">
                  <span className="text-slate-500">Ton kho</span>
                  <span className={canBook ? 'text-emerald-600' : 'text-red-500'}>
                    {availabilityLoading ? 'Dang kiem tra...' : availabilityMessage || 'Chon ngay de kiem tra'}
                  </span>
                </div>
              </div>

              <div className="rounded-3xl bg-blue-50 p-6">
                <div className="mb-1 flex items-center justify-between font-bold text-blue-900">
                  <span>Tong cong:</span>
                  <span className="text-xl font-black">{currencyFormatter.format(totalPrice)} VND</span>
                </div>
                <p className="text-[10px] font-bold uppercase text-blue-400">Da bao gom thue va phi dich vu</p>
              </div>

              <button
                onClick={handleBooking}
                disabled={bookingLoading || !canBook}
                className="flex w-full items-center justify-center gap-2 rounded-3xl bg-slate-900 py-5 text-lg font-black text-white shadow-xl transition-all hover:bg-blue-600 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {bookingLoading ? <Loader2 className="animate-spin" /> : <Zap size={20} fill="currentColor" />}
                THUE NGAY
              </button>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!canBook}
                className="flex w-full items-center justify-center gap-2 rounded-3xl border-2 border-slate-200 bg-white py-4 text-sm font-black text-slate-700 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <ShoppingCart size={18} /> THEM VAO GIO HANG
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoTile = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <p className="text-xs font-bold text-slate-400">{label}</p>
    <p className="text-lg font-black text-slate-900">{value}</p>
  </div>
);

const FeatureLine = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3">
    <CheckCircle2 size={20} className="text-green-500" />
    <span className="font-semibold text-slate-700">{label}</span>
  </div>
);

const DateInput = ({
  label,
  min,
  value,
  onChange
}: {
  label: string;
  min: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <div>
    <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
      <Calendar size={14} /> {label}
    </label>
    <input
      type="date"
      min={min}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-3 text-sm font-bold outline-none transition-all focus:border-blue-500 focus:bg-white"
    />
  </div>
);

export default TransportDetail;
