import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Loader2,
  MapPin,
  MessageSquareReply,
  ShoppingCart,
  Star,
  Users,
  Zap
} from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import AvailabilityCalendar, { getDisplayAvailabilityPrice } from '../components/AvailabilityCalendar';
import { useCart } from '../contexts/CartContext';
import { formatVietnameseDate, formatVietnameseDateTime } from '../utils/dateTimeUtils';
import { getTodayVietnam } from '../utils/dateUtils';

type ServiceDetailDto = {
  serviceId: number;
  partnerId: number;
  partnerName: string;
  name: string;
  description: string;
  basePrice: number;
  ratingAvg: number;
  spotName?: string;
  imageUrls: string[];
  serviceType?: string; // "Hotel", "Tour", "Transport", "Restaurant"
};

type ReviewItem = {
  reviewId: number;
  customerName: string;
  customerAvatarUrl?: string | null;
  rating: number;
  comment?: string | null;
  replyText?: string | null;
  replyTime?: string | null;
  createdAt: string;
};

type ReviewEligibility = {
  canReview: boolean;
  hasPaidBooking: boolean;
  hasReviewed: boolean;
  isOwnerPartner: boolean;
};

const emptyEligibility: ReviewEligibility = {
  canReview: false,
  hasPaidBooking: false,
  hasReviewed: false,
  isOwnerPartner: false
};

const renderStars = (rating: number, onClick?: (value: number) => void) => (
  <div className="flex items-center gap-1">
    {Array.from({ length: 5 }, (_, index) => {
      const value = index + 1;
      const active = value <= rating;

      return (
        <button
          key={value}
          type="button"
          onClick={onClick ? () => onClick(value) : undefined}
          className={onClick ? 'cursor-pointer transition-transform hover:scale-110' : 'cursor-default'}
        >
          <Star
            size={18}
            className={active ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}
          />
        </button>
      );
    })}
  </div>
);

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

const getApiErrorMessage = (err: any, fallback: string) => {
  const data = err?.response?.data;

  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message;
  }

  if (typeof data?.title === 'string' && data.title.trim()) {
    return data.title;
  }

  const firstValidationError = data?.errors
    ? Object.values(data.errors).flat().find((value) => typeof value === 'string')
    : null;

  if (typeof firstValidationError === 'string' && firstValidationError.trim()) {
    return firstValidationError;
  }

  return fallback;
};

const ServiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addItem } = useCart();
  const preselectedDate = new URLSearchParams(location.search).get('date') ?? '';

  const [service, setService] = useState<ServiceDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [replySubmittingId, setReplySubmittingId] = useState<number | null>(null);
  const [activeImg, setActiveImg] = useState(0);

  const [selectedDate, setSelectedDate] = useState(preselectedDate);
  const [checkOutDate, setCheckOutDate] = useState(''); // For hotels and transport
  const [quantity, setQuantity] = useState(1);
  const [actualPrice, setActualPrice] = useState(0);
  const [priceLoading, setPriceLoading] = useState(false); // Loading state for multi-day price calculation
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [eligibility, setEligibility] = useState<ReviewEligibility>(emptyEligibility);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [reviewSummary, setReviewSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isLoggedIn = Boolean(localStorage.getItem('token'));

  // Check if service is Hotel or Transport (multi-day booking)
  const isMultiDayService = service?.serviceType === 'Hotel' || service?.serviceType === 'Transport';
  const isHotel = service?.serviceType === 'Hotel';
  const isTransport = service?.serviceType === 'Transport';

  const fetchServiceDetail = async () => {
    const res = await axiosClient.get(`/services/${id}`);
    setService(res.data);
    setActualPrice(res.data?.basePrice ?? 0);
  };

  const fetchReviews = async () => {
    setReviewsLoading(true);
    try {
      const res = await axiosClient.get(`/reviews/service/${id}`);
      setReviews(res.data ?? []);
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchEligibility = async () => {
    if (!isLoggedIn) {
      setEligibility(emptyEligibility);
      return;
    }

    try {
      const res = await axiosClient.get(`/reviews/service/${id}/eligibility`);
      setEligibility(res.data);
    } catch {
      setEligibility(emptyEligibility);
    }
  };

  const fetchReviewSummary = async () => {
    if (reviews.length === 0) {
      setReviewSummary(null);
      return;
    }

    setSummaryLoading(true);
    try {
      const res = await axiosClient.get(`/services/${id}/review-summary`);
      setReviewSummary(res.data?.summary || null);
    } catch {
      setReviewSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    const loadPage = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchServiceDetail(), fetchReviews(), fetchEligibility()]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [id]);

  useEffect(() => {
    if (reviews.length > 0) {
      fetchReviewSummary();
    }
  }, [reviews]);

  useEffect(() => {
    if (!service) {
      return;
    }

    if (!selectedDate) {
      setActualPrice(service.basePrice ?? 0);
      setPriceLoading(false);
      return;
    }

    let isActive = true;

    // Calculate price for multi-day bookings
    if (isMultiDayService && checkOutDate) {
      const checkIn = new Date(selectedDate);
      const checkOut = new Date(checkOutDate);
      
      if (checkOut <= checkIn) {
        setActualPrice(service.basePrice ?? 0);
        setPriceLoading(false);
        return;
      }

      // Fetch actual prices for each day in the range
      const fetchMultiDayPrice = async () => {
        try {
          setPriceLoading(true);
          const nights = isHotel 
            ? Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
            : Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) + 1;

          let totalPrice = 0;
          const promises = [];

          // For hotels, don't include checkout day
          const endDate = isHotel ? checkOut : new Date(checkOut.getTime() + 86400000);

          for (let date = new Date(checkIn); date < endDate; date.setDate(date.getDate() + 1)) {
            const dateStr = date.toISOString().split('T')[0];
            promises.push(
              axiosClient
                .get(`/availability/check/${service.serviceId}`, {
                  params: { date: dateStr, qty: 1 }
                })
                .then((res) => {
                  const price = res.data?.price ?? service.basePrice ?? 0;
                  return getDisplayAvailabilityPrice({ date: dateStr, price });
                })
                .catch(() => service.basePrice ?? 0)
            );
          }

          const prices = await Promise.all(promises);
          totalPrice = prices.reduce((sum, price) => sum + price, 0);

          if (isActive) {
            setActualPrice(totalPrice);
            setPriceLoading(false);
          }
        } catch (error) {
          console.error('Error fetching multi-day prices:', error);
          // Fallback to base price calculation
          const days = isHotel 
            ? Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
            : Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          
          if (isActive) {
            setActualPrice((service.basePrice ?? 0) * days);
            setPriceLoading(false);
          }
        }
      };

      fetchMultiDayPrice();
      return () => {
        isActive = false;
      };
    }

    // Single day booking
    setPriceLoading(true);
    axiosClient
      .get(`/availability/check/${service.serviceId}`, {
        params: { date: selectedDate, qty: 1 }
      })
      .then((res) => {
        if (!isActive) return;
        const price = res.data?.price ?? service.basePrice ?? 0;
        setActualPrice(getDisplayAvailabilityPrice({ date: selectedDate, price }));
        setPriceLoading(false);
      })
      .catch(() => {
        if (!isActive) return;
        setActualPrice(service.basePrice ?? 0);
        setPriceLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [selectedDate, checkOutDate, service, isMultiDayService, isHotel]);

  const handleBooking = async () => {
    if (!service) return;

    if (!selectedDate) {
      alert(isHotel ? 'Vui lòng chọn ngày nhận phòng!' : 'Vui lòng chọn ngày bạn muốn sử dụng dịch vụ!');
      return;
    }

    if (isMultiDayService && !checkOutDate) {
      alert(isHotel ? 'Vui lòng chọn ngày trả phòng!' : 'Vui lòng chọn ngày trả xe!');
      return;
    }

    if (!isLoggedIn) {
      alert('Vui lòng đăng nhập để đặt chỗ!');
      navigate('/login');
      return;
    }

    try {
      setBookingLoading(true);
      const res = await axiosClient.post('/bookings/draft', {
        serviceId: service.serviceId,
        quantity,
        checkInDate: selectedDate,
        ...(isMultiDayService && checkOutDate && { checkOutDate })
      });

      if (res.data.bookingId) {
        alert('Tạo đơn hàng thành công! Đang chuyển đến trang thanh toán...');
        navigate(`/checkout/${res.data.bookingId}`);
      }
    } catch (err: any) {
      alert(getApiErrorMessage(err, 'Ngày này đã hết chỗ, vui lòng chọn ngày khác!'));
    } finally {
      setBookingLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!service) return;

    if (!selectedDate) {
      alert('Vui long chon ngay su dung truoc khi them vao gio hang.');
      return;
    }

    if (isMultiDayService && !checkOutDate) {
      alert(isHotel ? 'Vui lòng chọn ngày trả phòng!' : 'Vui lòng chọn ngày trả xe!');
      return;
    }

    try {
      await addItem({
        serviceId: service.serviceId,
        serviceName: service.name,
        checkInDate: new Date(selectedDate),
        ...(isMultiDayService && checkOutDate && { checkOutDate: new Date(checkOutDate) }),
        quantity,
        price: actualPrice
      });

      alert('Da them dich vu vao gio hang thanh cong.');
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Co loi khi them vao gio hang.');
    }
  };

  const handleSubmitReview = async () => {
    if (!service) return;

    try {
      setReviewSubmitting(true);
      await axiosClient.post('/reviews', {
        serviceId: service.serviceId,
        rating: reviewRating,
        comment: reviewComment
      });

      setReviewComment('');
      setReviewRating(5);
      await Promise.all([fetchReviews(), fetchEligibility(), fetchServiceDetail()]);
      alert('Cảm ơn bạn đã gửi đánh giá!');
    } catch (err: any) {
      alert(getApiErrorMessage(err, 'Không thể gửi đánh giá lúc này.'));
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleReply = async (review: ReviewItem) => {
    const replyText = (replyDrafts[review.reviewId] ?? review.replyText ?? '').trim();
    if (!replyText) {
      alert('Vui lòng nhập nội dung phản hồi.');
      return;
    }

    try {
      setReplySubmittingId(review.reviewId);
      await axiosClient.post(`/reviews/${review.reviewId}/reply`, { replyText });
      await fetchReviews();
      setReplyDrafts((prev) => ({ ...prev, [review.reviewId]: '' }));
      alert('Đã phản hồi review thành công!');
    } catch (err: any) {
      alert(getApiErrorMessage(err, 'Không thể gửi phản hồi lúc này.'));
    } finally {
      setReplySubmittingId(null);
    }
  };

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
            <h1 className="mb-4 text-5xl font-black tracking-tighter text-slate-900">{service.name}</h1>
            <div className="mb-8 flex flex-wrap items-center gap-6 font-bold text-slate-500">
              <span className="flex items-center gap-1.5">
                <MapPin size={20} className="text-red-500" /> {service.spotName || 'Đang cập nhật địa điểm'}
              </span>
              <span className="flex items-center gap-1.5">
                <Star size={20} className="fill-orange-400 text-orange-400" />{' '}
                {service.ratingAvg.toFixed(1)} đánh giá
              </span>
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
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">
                {isHotel && checkOutDate && selectedDate 
                  ? 'Giá tổng' 
                  : isHotel 
                  ? 'Giá mỗi đêm từ' 
                  : isTransport && checkOutDate && selectedDate
                  ? 'Giá tổng'
                  : isTransport 
                  ? 'Giá mỗi ngày từ' 
                  : 'Giá mỗi lượt từ'}
              </p>
              <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                {priceLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin text-blue-600" size={32} />
                    <span className="text-lg font-bold text-slate-500">Đang tính giá...</span>
                  </div>
                ) : (
                  <>
                    <span className="whitespace-nowrap text-4xl font-black leading-none text-blue-600">
                      {new Intl.NumberFormat('vi-VN').format(actualPrice)}₫
                    </span>
                    <span className="pb-1 text-sm font-bold text-slate-400">
                      {isHotel && checkOutDate && selectedDate
                        ? `cho ${Math.floor((new Date(checkOutDate).getTime() - new Date(selectedDate).getTime()) / (1000 * 60 * 60 * 24))} đêm`
                        : isHotel 
                        ? '/ đêm'
                        : isTransport && checkOutDate && selectedDate
                        ? `cho ${Math.floor((new Date(checkOutDate).getTime() - new Date(selectedDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} ngày`
                        : isTransport
                        ? '/ ngày'
                        : '/ khách'}
                    </span>
                  </>
                )}
              </div>
              {isMultiDayService && (!checkOutDate || !selectedDate) && (
                <p className="mt-3 text-xs text-slate-500">
                  💡 Chọn ngày {isHotel ? 'nhận & trả phòng' : 'nhận & trả xe'} để xem giá tổng
                </p>
              )}
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                  <Calendar size={14} /> {isHotel ? 'Ngày nhận phòng' : isTransport ? 'Ngày nhận xe' : 'Chọn ngày sử dụng'}
                </label>
                <AvailabilityCalendar
                  serviceId={service.serviceId}
                  selectedDate={selectedDate}
                  onSelect={(day) => {
                    setSelectedDate(day.date);
                    if (!isMultiDayService) {
                      setActualPrice(day.price);
                    }
                  }}
                />
              </div>

              {isMultiDayService && (
                <div>
                  <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                    <Calendar size={14} /> {isHotel ? 'Ngày trả phòng' : 'Ngày trả xe'}
                  </label>
                  <input
                    type="date"
                    value={checkOutDate}
                    min={selectedDate ? new Date(new Date(selectedDate).getTime() + 86400000).toISOString().split('T')[0] : getTodayVietnam()}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    placeholder={isHotel ? 'Chọn ngày trả phòng' : 'Chọn ngày trả xe'}
                    className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-blue-500 focus:bg-white"
                  />
                  {selectedDate && checkOutDate && new Date(checkOutDate) > new Date(selectedDate) && (
                    <div className="mt-2 flex items-center justify-between rounded-xl bg-blue-50 px-4 py-2">
                      <span className="text-xs font-semibold text-blue-700">
                        {isHotel ? '🌙 Tổng số đêm:' : '🚗 Tổng số ngày:'}
                      </span>
                      <span className="text-sm font-black text-blue-600">
                        {isHotel 
                          ? `${Math.floor((new Date(checkOutDate).getTime() - new Date(selectedDate).getTime()) / (1000 * 60 * 60 * 24))} đêm`
                          : `${Math.floor((new Date(checkOutDate).getTime() - new Date(selectedDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} ngày`}
                      </span>
                    </div>
                  )}
                  {!selectedDate && (
                    <p className="mt-2 text-xs text-amber-600">
                      ⚠️ Vui lòng chọn {isHotel ? 'ngày nhận phòng' : 'ngày nhận xe'} trước
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase text-slate-400">
                  <Users size={14} /> {isHotel ? 'Số phòng' : isTransport ? 'Số xe' : 'Số lượng người'}
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

              <div className="rounded-3xl bg-blue-50 p-6">
                <div className="mb-1 flex items-center justify-between font-bold text-blue-900">
                  <span>Tổng cộng:</span>
                  <span className="text-xl font-black">
                    {new Intl.NumberFormat('vi-VN').format(actualPrice * quantity)}₫
                  </span>
                </div>
                <p className="text-[10px] font-bold uppercase text-blue-400">Đã bao gồm thuế và phí dịch vụ</p>
              </div>

              <button
                onClick={handleBooking}
                disabled={bookingLoading}
                className="flex w-full items-center justify-center gap-2 rounded-[2rem] bg-slate-900 py-5 text-lg font-black text-white shadow-xl transition-all active:scale-95 hover:bg-blue-600"
              >
                {bookingLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Zap size={20} fill="currentColor" />
                )}
                ĐẶT CHỖ NGAY
              </button>
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex w-full items-center justify-center gap-2 rounded-[2rem] border-2 border-slate-200 bg-white py-4 text-sm font-black text-slate-700 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 active:scale-95"
              >
                <ShoppingCart size={18} /> THEM VAO GIO HANG
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <section className="mt-16 rounded-[3rem] border border-slate-100 bg-white p-8 shadow-sm md:p-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-500">Đánh giá từ khách hàng</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">Trải nghiệm thực tế sau khi sử dụng</h2>
          </div>
          <div className="rounded-3xl bg-amber-50 px-5 py-4 text-right">
            <div className="text-3xl font-black text-amber-500">{service.ratingAvg.toFixed(1)}</div>
            <div className="text-sm font-bold text-amber-700">{reviews.length} đánh giá</div>
          </div>
        </div>

        {/* AI Review Summary */}
        {reviewSummary && (
          <div className="mb-8 rounded-[2rem] border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-purple-50 p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-2xl">📝</span>
              <h3 className="text-lg font-black text-blue-900">Tóm Tắt Đánh Giá Từ AI</h3>
            </div>
            {summaryLoading ? (
              <div className="flex items-center gap-2 text-blue-600">
                <Loader2 className="animate-spin" size={20} />
                <span className="font-medium">Đang phân tích đánh giá...</span>
              </div>
            ) : (
              <p className="leading-relaxed text-slate-700">{reviewSummary}</p>
            )}
          </div>
        )}

        {user?.roleName?.toLowerCase() === 'customer' && (
          <div className="mb-10 rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
            <h3 className="text-xl font-black text-slate-900">Viết đánh giá của bạn</h3>

            {eligibility.canReview ? (
              <>
                <div className="mt-4">{renderStars(reviewRating, setReviewRating)}</div>
                <textarea
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Chia sẻ cảm nhận của bạn về dịch vụ này..."
                  className="mt-4 w-full rounded-3xl border border-slate-200 bg-white p-4 text-slate-700 outline-none transition-all focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleSubmitReview}
                  disabled={reviewSubmitting}
                  className="mt-4 rounded-2xl bg-slate-900 px-6 py-3 font-black text-white transition-all hover:bg-blue-600 disabled:bg-slate-300"
                >
                  {reviewSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                </button>
              </>
            ) : (
              <div className="mt-4 rounded-2xl bg-white p-4 text-sm font-medium text-slate-600">
                {!isLoggedIn && 'Đăng nhập để viết đánh giá.'}
                {isLoggedIn && eligibility.hasReviewed && 'Bạn đã đánh giá dịch vụ này rồi.'}
                {isLoggedIn && !eligibility.hasReviewed && !eligibility.hasPaidBooking &&
                  'Bạn cần có booking đã thanh toán cho dịch vụ này trước khi đánh giá.'}
              </div>
            )}
          </div>
        )}

        {reviewsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-blue-500" size={36} />
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-slate-500">
            Chưa có đánh giá nào cho dịch vụ này.
          </div>
        ) : (
          <div className="space-y-6">
            {reviews.map((review) => (
              <article key={review.reviewId} className="rounded-[2rem] border border-slate-100 bg-slate-50 p-6">
                <div className="flex items-start gap-4">
                  {review.customerAvatarUrl ? (
                    <img
                      src={`http://localhost:5134${review.customerAvatarUrl}`}
                      alt={review.customerName}
                      className="h-14 w-14 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white">
                      {getInitials(review.customerName)}
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="text-lg font-black text-slate-900">{review.customerName}</h4>
                        <p className="text-sm text-slate-400">{formatVietnameseDate(review.createdAt)}</p>
                      </div>
                      {renderStars(review.rating)}
                    </div>

                    <p className="mt-4 leading-relaxed text-slate-700">
                      {review.comment || 'Khách hàng chưa để lại bình luận.'}
                    </p>

                    {review.replyText && (
                      <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                        <div className="flex items-center gap-2 text-sm font-black text-blue-700">
                          <MessageSquareReply size={16} /> Phản hồi
                        </div>
                        <p className="mt-2 text-slate-700">{review.replyText}</p>
                        {review.replyTime && (
                          <p className="mt-2 text-xs text-slate-500">
                            Phản hồi lúc {formatVietnameseDateTime(review.replyTime)}
                          </p>
                        )}
                      </div>
                    )}

                    {eligibility.isOwnerPartner && (
                      <div className="mt-5">
                        <label className="text-sm font-black text-slate-700">Phản hồi review</label>
                        <textarea
                          rows={3}
                          value={replyDrafts[review.reviewId] ?? review.replyText ?? ''}
                          onChange={(e) =>
                            setReplyDrafts((prev) => ({ ...prev, [review.reviewId]: e.target.value }))
                          }
                          placeholder="Cảm ơn khách hàng và phản hồi thêm nếu cần..."
                          className="mt-2 w-full rounded-3xl border border-slate-200 bg-white p-4 text-slate-700 outline-none transition-all focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleReply(review)}
                          disabled={replySubmittingId === review.reviewId}
                          className="mt-3 rounded-2xl bg-slate-900 px-5 py-3 font-black text-white transition-all hover:bg-blue-600 disabled:bg-slate-300"
                        >
                          {replySubmittingId === review.reviewId ? 'Đang gửi...' : 'Gửi phản hồi'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ServiceDetail;
