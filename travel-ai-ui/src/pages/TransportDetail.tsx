import { useEffect, useState } from 'react';
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
  attributes: Array<{ attrKey: string; attrValue: string }>;
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
  const [rentalDays, setRentalDays] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isLoggedIn = Boolean(localStorage.getItem('token'));

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

  // Tính số ngày thuê và tổng tiền
  useEffect(() => {
    if (!startDate || !endDate || !service) {
      setRentalDays(0);
      setTotalPrice(0);
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (days > 0) {
      setRentalDays(days);
      setTotalPrice(service.basePrice * days * quantity);
    } else {
      setRentalDays(0);
      setTotalPrice(0);
    }
  }, [startDate, endDate, quantity, service]);

  const handleBooking = async () => {
    if (!service) return;

    if (!startDate || !endDate) {
      alert('Vui lòng chọn ngày nhận và ngày trả xe!');
      return;
    }

    if (rentalDays <= 0) {
      alert('Ngày trả phải sau ngày nhận!');
      return;
    }

    if (!isLoggedIn) {
      alert('Vui lòng đăng nhập để đặt xe!');
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
        alert(`Tạo đơn thuê xe thành công! Tổng tiền: ${totalPrice.toLocaleString('vi-VN')}₫`);
        navigate(`/checkout/${res.data.bookingId}`);
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Không thể đặt xe lúc này. Vui lòng thử lại!';
      alert(errorMsg);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!service) return;

    if (!startDate || !endDate) {
      alert('Vui lòng chọn ngày nhận và ngày trả xe trước khi thêm vào giỏ hàng.');
      return;
    }

    if (rentalDays <= 0) {
      alert('Ngày trả phải sau ngày nhận!');
      return;
    }

    addItem({
      serviceId: service.serviceId,
      serviceName: `${service.name} (${rentalDays} ngày)`,
      checkInDate: new Date(startDate),
      quantity,
      price: totalPrice
    });

    alert('Đã thêm xe vào giỏ hàng.');
  };

  // Lấy ngày tối thiểu (hôm nay)
  const today = new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  if (!service) {
    return <div className="p-20 text-center font-bold">Không tìm thấy dịch vụ.</div>;
  }

  // Lấy các thuộc tính xe từ ServiceAttributes
  const vehicleType = service.attributes.find(a => a.attrKey === 'VehicleType')?.attrValue || 'Xe';
  const brand = service.attributes.find(a => a.attrKey === 'Brand')?.attrValue;
  const transmission = service.attributes.find(a => a.attrKey === 'Transmission')?.attrValue;
  const insurance = service.attributes.find(a => a.attrKey === 'Insurance')?.attrValue;
  const helmet = service.attributes.find(a => a.attrKey === 'Helmet')?.attrValue;
  const seats = service.attributes.find(a => a.attrKey === 'Seats')?.attrValue;

  return (
    <div className="mx-auto mb-20 max-w-7xl px-4 py-10">
      <button
        onClick={() => navigate(-1)}
        className="mb-8 flex items-center gap-2 font-bold text-slate-500 hover:text-blue-600"
      >
        <ArrowLeft size={20} /> Quay lại danh sách
      </button>

      <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_500px]">
        {/* LEFT: Images + Info */}
        <div className="space-y-8">
          <div className="h-[580px] overflow-hidden rounded-[3rem] border-8 border-white shadow-2xl">
            <img
              src={`http://localhost:5134${service.imageUrls[activeImg]}`}
              className="h-full w-full object-cover"
              alt={service.name}
            />
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2">
            {service.imageUrls?.map((img, index) => (
              <img
                key={img}
                src={`http://localhost:5134${img}`}
                onClick={() => setActiveImg(index)}
                className={`h-24 w-32 cursor-pointer rounded-2xl object-cover border-4 transition-all ${
                  activeImg === index ? 'scale-105 border-blue-500' : 'border-transparent opacity-50'
                }`}
                alt={`${service.name}-${index + 1}`}
              />
            ))}
          </div>

          <div className="text-left">
            <div className="mb-4 inline-block rounded-full bg-blue-100 px-4 py-2 text-sm font-black text-blue-700">
              <Car className="inline mr-2" size={16} />
              {vehicleType}
            </div>
            <h1 className="mb-4 text-5xl font-black tracking-tighter text-slate-900">{service.name}</h1>
            <div className="mb-8 flex flex-wrap items-center gap-6 font-bold text-slate-500">
              <span className="flex items-center gap-1.5">
                <MapPin size={20} className="text-red-500" /> {service.spotName || 'Đà Nẵng'}
              </span>
              <span className="flex items-center gap-1.5">
                <Star size={20} className="fill-orange-400 text-orange-400" />{' '}
                {service.ratingAvg.toFixed(1)} đánh giá
              </span>
            </div>

            {/* Thông tin xe */}
            <div className="mb-8 grid grid-cols-2 gap-4">
              {brand && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold text-slate-400">Hãng xe</p>
                  <p className="text-lg font-black text-slate-900">{brand}</p>
                </div>
              )}
              {transmission && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold text-slate-400">Hộp số</p>
                  <p className="text-lg font-black text-slate-900">{transmission}</p>
                </div>
              )}
              {seats && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold text-slate-400">Số chỗ ngồi</p>
                  <p className="text-lg font-black text-slate-900">{seats} chỗ</p>
                </div>
              )}
            </div>

            {/* Tiện ích đi kèm */}
            <div className="mb-8 rounded-[3rem] border border-slate-100 bg-white p-8 shadow-sm">
              <h3 className="mb-4 text-xl font-black text-slate-800">Tiện ích đi kèm</h3>
              <div className="space-y-3">
                {insurance && (
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={20} className="text-green-500" />
                    <span className="font-semibold text-slate-700">Bảo hiểm: {insurance}</span>
                  </div>
                )}
                {helmet && (
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={20} className="text-green-500" />
                    <span className="font-semibold text-slate-700">Mũ bảo hiểm: {helmet}</span>
                  </div>
                )}
                {service.attributes
                  .filter(a => !['VehicleType', 'Brand', 'Transmission', 'Insurance', 'Helmet', 'Seats'].includes(a.attrKey))
                  .map(attr => (
                    <div key={attr.attrKey} className="flex items-center gap-3">
                      <CheckCircle2 size={20} className="text-green-500" />
                      <span className="font-semibold text-slate-700">{attr.attrKey}: {attr.attrValue}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="rounded-[3rem] border border-slate-100 bg-white p-10 text-lg leading-relaxed text-slate-600 shadow-sm">
              <h3 className="mb-4 text-xl font-black text-slate-800">Mô tả dịch vụ</h3>
              {service.description}
            </div>
          </div>
        </div>

        {/* RIGHT: Booking Card */}
        <div>
          <div className="sticky top-28 rounded-[2.5rem] border border-slate-100 bg-white p-3 text-left shadow-2xl shadow-slate-200/70 sm:p-4">
            <div className="mb-5 rounded-[2rem] bg-slate-50 p-5">
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Giá thuê mỗi ngày</p>
              <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                <span className="whitespace-nowrap text-4xl font-black leading-none text-blue-600">
                  {new Intl.NumberFormat('vi-VN').format(service.basePrice)}₫
                </span>
                <span className="pb-1 text-sm font-bold text-slate-400">/ ngày</span>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                  <Calendar size={14} /> Ngày nhận xe
                </label>
                <input
                  type="date"
                  min={today}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-3 text-sm font-bold outline-none transition-all focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                  <Calendar size={14} /> Ngày trả xe
                </label>
                <input
                  type="date"
                  min={startDate || today}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-3 text-sm font-bold outline-none transition-all focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase text-slate-400">
                  <Car size={14} /> Số lượng xe
                </label>
                <div className="flex items-center rounded-2xl border-2 border-slate-100 bg-slate-50 p-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="flex size-10 items-center justify-center rounded-xl bg-white text-xl font-black shadow-sm transition-all hover:bg-blue-500 hover:text-white"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center text-lg font-black">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="flex size-10 items-center justify-center rounded-xl bg-white text-xl font-black shadow-sm transition-all hover:bg-blue-500 hover:text-white"
                  >
                    +
                  </button>
                </div>
              </div>

              {rentalDays > 0 && (
                <div className="rounded-2xl border-2 border-blue-100 bg-blue-50 p-4">
                  <p className="text-sm font-bold text-blue-700">
                    Số ngày thuê: <span className="text-xl">{rentalDays}</span> ngày
                  </p>
                  <p className="mt-1 text-xs text-blue-600">
                    {service.basePrice.toLocaleString('vi-VN')}₫ × {rentalDays} ngày × {quantity} xe
                  </p>
                </div>
              )}

              <div className="rounded-3xl bg-blue-50 p-6">
                <div className="mb-1 flex items-center justify-between font-bold text-blue-900">
                  <span>Tổng cộng:</span>
                  <span className="text-xl font-black">
                    {new Intl.NumberFormat('vi-VN').format(totalPrice)}₫
                  </span>
                </div>
                <p className="text-[10px] font-bold uppercase text-blue-400">Đã bao gồm thuế và phí dịch vụ</p>
              </div>

              <button
                onClick={handleBooking}
                disabled={bookingLoading || rentalDays <= 0}
                className="flex w-full items-center justify-center gap-2 rounded-[2rem] bg-slate-900 py-5 text-lg font-black text-white shadow-xl transition-all active:scale-95 hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {bookingLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Zap size={20} fill="currentColor" />
                )}
                ĐẶT XE NGAY
              </button>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={rentalDays <= 0}
                className="flex w-full items-center justify-center gap-2 rounded-[2rem] border-2 border-slate-200 bg-white py-4 text-sm font-black text-slate-700 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 active:scale-95 disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <ShoppingCart size={18} /> THÊM VÀO GIỎ HÀNG
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransportDetail;
