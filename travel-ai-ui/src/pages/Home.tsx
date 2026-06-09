import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Building2,
  CalendarCheck,
  Compass,
  Hotel,
  Loader2,
  MapPin,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import HeroSearchBar from '../components/HeroSearchBar';
import ServiceCard from '../components/ServiceCard';

type ItineraryItem = {
  id?: number | string;
  title: string;
  destination: string;
  days: number;
  theme: string;
  cover: string;
};

const fallbackItineraries: ItineraryItem[] = [
  {
    title: 'Đà Nẵng 3 ngày cân bằng',
    destination: 'Đà Nẵng',
    days: 3,
    theme: 'Biển, ẩm thực, phố cổ',
    cover: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?q=80&w=1200',
  },
  {
    title: 'Hà Nội cuối tuần văn hóa',
    destination: 'Hà Nội',
    days: 2,
    theme: 'Bảo tàng, phố cổ, cà phê',
    cover: 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?q=80&w=1200',
  },
  {
    title: 'Hội An nhẹ nhàng',
    destination: 'Hội An',
    days: 2,
    theme: 'Resort, phố đèn lồng, ăn tối ven sông',
    cover: 'https://images.unsplash.com/photo-1558522104-66c276d6c7a1?q=80&w=1200',
  },
];

const getImageUrl = (url?: string) => {
  if (!url) return 'https://images.unsplash.com/photo-1528127269322-539801943592?q=80&w=1200';
  return url.startsWith('http') ? url : `http://localhost:5134${url}`;
};

const isHotelOrTour = (service: any) => {
  const type = String(service.serviceType ?? '').toLowerCase();
  return type === 'hotel' || type === 'tour' || type === '0' || type === '1';
};

const HeroSection = () => (
  <section className="relative overflow-hidden rounded-[32px] bg-slate-950 text-white">
    <img
      src="https://images.unsplash.com/photo-1528127269322-539801943592?q=80&w=1800"
      alt="Du lịch Việt Nam"
      className="absolute inset-0 h-full w-full object-cover opacity-40"
    />
    <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/80 to-[#0061ff]/55" />
    <div className="relative px-5 py-16 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-blue-100 ring-1 ring-white/15">
          <Sparkles size={15} />
          TravelAI Planner
        </div>
        <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">
          Đơn giản hóa hành trình của bạn
        </h1>
        <p className="mt-6 text-base font-medium leading-8 text-blue-50/85 md:text-lg">
          Trải nghiệm thế giới với lập kế hoạch được hỗ trợ bởi AI
        </p>
        <div className="mt-10">
          <HeroSearchBar />
        </div>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/preferences"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-6 py-3 text-sm font-black text-white ring-1 ring-white/20 transition hover:bg-white/15"
          >
            Tạo lịch trình AI <ArrowRight size={18} />
          </Link>
          <Link
            to="/destinations"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-6 py-3 text-sm font-black text-white ring-1 ring-white/20 transition hover:bg-white/15"
          >
            Khám phá điểm đến
          </Link>
        </div>
      </div>
    </div>
  </section>
);

const ServicesStripSection = () => {
  const navigate = useNavigate();

  const services = [
    {
      icon: Hotel,
      label: 'Khách sạn',
      description: 'Tìm chỗ ở ưng ý',
      path: '/hotels',
      color: 'blue',
      bgColor: 'bg-blue-50',
      hoverBg: 'hover:bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      icon: Compass,
      label: 'Tour du lịch',
      description: 'Trải nghiệm thú vị',
      path: '/tours',
      color: 'emerald',
      bgColor: 'bg-emerald-50',
      hoverBg: 'hover:bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      icon: MapPin,
      label: 'Vận chuyển',
      description: 'Di chuyển tiện lợi',
      path: '/transportation',
      color: 'purple',
      bgColor: 'bg-purple-50',
      hoverBg: 'hover:bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      icon: Hotel,
      label: 'Thuê xe',
      description: 'Tự do khám phá',
      path: '/services?type=transport',  // Redirect đến trang dịch vụ với filter Transport
      color: 'orange',
      bgColor: 'bg-orange-50',
      hoverBg: 'hover:bg-orange-100',
      iconColor: 'text-orange-600',
    },
  ];

  return (
    <section className="py-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {services.map((service) => {
          const Icon = service.icon;
          return (
            <button
              key={service.label}
              onClick={() => navigate(service.path)}
              className="app-card group flex flex-col items-center gap-3 p-6 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl"
            >
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 ${service.iconColor} shadow-sm ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-110`}>
                <Icon size={28} strokeWidth={2} />
              </div>
              <div className="text-center">
                <h3 className="text-sm font-black text-slate-900">{service.label}</h3>
                <p className="mt-1 text-xs font-medium text-slate-500">{service.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

const WhyTravelAISection = () => {
  const items = [
    {
      icon: Bot,
      title: 'AI hiểu gu du lịch',
      text: 'Gợi ý lịch trình theo ngân sách, tốc độ di chuyển, ẩm thực và phong cách trải nghiệm.',
    },
    {
      icon: CalendarCheck,
      title: 'Lịch trình có thể đặt',
      text: 'Ưu tiên khách sạn, tour và dịch vụ có trong hệ thống để bạn đi từ ý tưởng đến đặt chỗ nhanh hơn.',
    },
    {
      icon: ShieldCheck,
      title: 'Dữ liệu có kiểm chứng',
      text: 'Kết hợp điểm đến, dịch vụ, đánh giá và khả dụng để giảm những gợi ý mơ hồ.',
    },
  ];

  return (
    <section className="app-section px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10 max-w-2xl">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-[#0061ff]">Tại sao chọn TravelAI?</p>
        <h2 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white md:text-4xl">
          AI không chỉ gợi ý, mà giúp bạn ra quyết định.
        </h2>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-500 dark:hover:bg-slate-700"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0061ff] text-white">
                <Icon size={22} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{item.title}</h3>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">{item.text}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
};

const TrendingDestinationsSection = () => {
  const navigate = useNavigate();
  const [destinations, setDestinations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fallbackDestinations = [
    {
      id: 1,
      name: 'Đà Nẵng',
      description: 'Thành phố đáng sống bên bờ biển',
      imageUrl: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?q=80&w=1200',
      rating: 4.9,
      estimatedPrice: 850000,
    },
    {
      id: 2,
      name: 'Hà Nội',
      description: 'Thủ đô ngàn năm văn hiến',
      imageUrl: 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?q=80&w=1200',
      rating: 4.8,
      estimatedPrice: 720000,
    },
    {
      id: 3,
      name: 'Hội An',
      description: 'Phố cổ đèn lồng lung linh',
      imageUrl: 'https://images.unsplash.com/photo-1558522104-66c276d6c7a1?q=80&w=1200',
      rating: 4.9,
      estimatedPrice: 650000,
    },
    {
      id: 4,
      name: 'Nha Trang',
      description: 'Thiên đường biển đảo',
      imageUrl: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?q=80&w=1200',
      rating: 4.7,
      estimatedPrice: 900000,
    },
  ];

  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        setLoading(true);
        const response = await axiosClient.get('/destinations');
        const data = response.data?.data || response.data || [];
        
        if (Array.isArray(data) && data.length > 0) {
          // Lấy top 4 destinations
          const topDestinations = data.slice(0, 4).map((dest: any) => ({
            id: dest.id || dest.destinationId,
            name: dest.name,
            description: dest.description || 'Khám phá điểm đến tuyệt vời',
            imageUrl: getImageUrl(dest.imageUrl),
            rating: dest.rating || 4.5,
            estimatedPrice: dest.estimatedPrice || 500000,
          }));
          setDestinations(topDestinations);
        } else {
          setDestinations(fallbackDestinations);
        }
      } catch (error) {
        console.error('❌ Lỗi tải trending destinations:', error);
        setDestinations(fallbackDestinations);
      } finally {
        setLoading(false);
      }
    };

    fetchDestinations();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  return (
    <section className="app-section px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-[#0061ff]">Điểm đến nổi bật</p>
          <h2 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white md:text-4xl">
            Khám phá những nơi đáng đến nhất
          </h2>
        </div>
        <Link
          to="/destinations"
          className="inline-flex items-center gap-2 text-sm font-black text-[#0061ff] transition hover:gap-3"
        >
          Xem tất cả <ArrowRight size={16} />
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-[#0061ff]" size={42} />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {destinations.map((dest) => (
            <article
              key={dest.id}
              onClick={() => navigate(`/destinations/${dest.id}`)}
              className="app-image-card group cursor-pointer overflow-hidden rounded-2xl bg-white shadow-md transition-all duration-300"
            >
              <div className="relative h-56 overflow-hidden">
                <img
                  src={dest.imageUrl}
                  alt={dest.name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-xs font-black text-slate-900 shadow-lg backdrop-blur-sm">
                  <span className="text-yellow-500">★</span>
                  {dest.rating}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-2xl font-black text-white drop-shadow-lg">{dest.name}</h3>
                </div>
              </div>
              <div className="p-5">
                <p className="mb-3 text-sm font-medium text-slate-600 line-clamp-2 dark:text-slate-300">
                  {dest.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-medium text-slate-500 dark:text-slate-400">Từ </span>
                    <span className="font-black text-[#0061ff]">{formatPrice(dest.estimatedPrice)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[#0061ff] transition-transform group-hover:translate-x-1">
                    <span className="text-xs font-black">Khám phá</span>
                    <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

const FeaturedServicesSection = () => {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const requestBody = {
          pageNumber: 1,
          pageSize: 20,
          sortBy: 'rating',
          sortDescending: true,
        };
        console.log('🏠 Home Services Request:', requestBody);
        
        const response = await axiosClient.post('/services/filter', requestBody);

        console.log('✅ Home Services Response:', response.data);
        const ranked = (response.data?.services || [])
          .filter(isHotelOrTour)
          .sort((a: any, b: any) => Number(b.ratingAvg || 0) - Number(a.ratingAvg || 0))
          .slice(0, 4);

        setServices(ranked);
      } catch (error) {
        console.error('❌ Lỗi tải dịch vụ nổi bật:', error);
        setServices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  return (
    <section className="app-section px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-[#0061ff]">Dịch vụ nổi bật</p>
          <h2 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white md:text-4xl">
            Khách sạn và tour được đánh giá cao
          </h2>
        </div>
        <Link to="/services" className="inline-flex items-center gap-2 text-sm font-black text-[#0061ff]">
          Xem tất cả <ArrowRight size={16} />
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-[#0061ff]" size={42} />
        </div>
      ) : services.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <ServiceCard key={service.serviceId} service={service} isAdminOrPartner={false} onDelete={() => {}} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-600 dark:bg-slate-700">
          <Hotel className="mx-auto mb-3 text-[#0061ff]" size={36} />
          <p className="font-bold text-slate-600 dark:text-slate-300">Dịch vụ nổi bật đang được cập nhật.</p>
        </div>
      )}
    </section>
  );
};

const CommunitySection = () => {
  const navigate = useNavigate();
  const [itineraries, setItineraries] = useState<ItineraryItem[]>(fallbackItineraries);

  useEffect(() => {
    const fetchPublicItineraries = async () => {
      try {
        const response = await axiosClient.get('/itineraries/public');
        const items = response.data?.data || response.data || [];

        if (Array.isArray(items) && items.length > 0) {
          setItineraries(
            items.slice(0, 3).map((item: any) => ({
              id: item.id || item.itineraryId,
              title: item.title || item.name || 'Lịch trình cộng đồng',
              destination: item.destinationName || item.destination || 'Việt Nam',
              days: item.days || item.numberOfDays || 2,
              theme: item.theme || item.description || 'Gợi ý công khai từ cộng đồng',
              cover: getImageUrl(item.coverImageUrl || item.imageUrl),
            })),
          );
        }
      } catch {
        setItineraries(fallbackItineraries);
      }
    };

    fetchPublicItineraries();
  }, []);

  return (
    <section className="app-section px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10 max-w-2xl">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-[#0061ff]">Gợi ý từ cộng đồng</p>
        <h2 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white md:text-4xl">Những lịch trình đáng thử</h2>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {itineraries.map((item, index) => (
          <article
            key={item.id || item.title}
            className="app-image-card group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition"
          >
            <div className="relative h-56 overflow-hidden">
              <img src={item.cover} alt={item.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 to-transparent" />
              <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-[#0061ff]">
                #{index + 1}
              </div>
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold">
                  <MapPin size={14} /> {item.destination}
                </div>
                <h3 className="text-2xl font-black leading-tight">{item.title}</h3>
              </div>
            </div>
            <div className="p-5">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {item.days} ngày · {item.theme}
              </p>
              <button
                type="button"
                onClick={() => navigate('/preferences')}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm font-black text-[#0061ff] transition hover:bg-[#0061ff] hover:text-white dark:bg-blue-900/30 dark:hover:bg-[#0061ff]"
              >
                Dùng làm cảm hứng <ArrowRight size={15} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

const HomeFooter = () => {
  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <footer className="rounded-[32px] bg-slate-950 px-6 py-12 text-white">
      <div className="flex flex-col justify-between gap-10 md:flex-row">
        {/* Brand */}
        <div className="max-w-xs">
          <div className="flex items-center gap-2 text-2xl font-black">
            <Compass className="text-[#0061ff]" />
            TravelAI
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Nền tảng lập lịch trình, khám phá điểm đến và đặt dịch vụ du lịch thông minh tại Việt Nam.
          </p>
          {/* Partner CTA */}
          <Link
            to="/partner/dashboard"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600/20 px-4 py-2.5 text-sm font-black text-blue-400 ring-1 ring-blue-500/30 transition hover:bg-blue-600 hover:text-white"
          >
            <Building2 size={16} />
            Trở thành Đối tác
          </Link>
        </div>

        {/* Links */}
        <div className="grid gap-8 text-sm sm:grid-cols-4">
          <div>
            <h4 className="mb-4 font-black uppercase tracking-widest text-slate-300 text-xs">Khám phá</h4>
            <Link className="block text-slate-400 transition hover:text-white" to="/destinations">Điểm đến</Link>
            <Link className="mt-2 block text-slate-400 transition hover:text-white" to="/services">Dịch vụ</Link>
            <Link className="mt-2 block text-slate-400 transition hover:text-white" to="/hotels">Khách sạn</Link>
            <Link className="mt-2 block text-slate-400 transition hover:text-white" to="/tours">Tour du lịch</Link>
          </div>
          <div>
            <h4 className="mb-4 font-black uppercase tracking-widest text-slate-300 text-xs">AI Planner</h4>
            <Link className="block text-slate-400 transition hover:text-white" to="/preferences">Tạo lịch trình</Link>
            <Link className="mt-2 block text-slate-400 transition hover:text-white" to="/itinerary/latest">Lịch trình của tôi</Link>
          </div>
          <div>
            <h4 className="mb-4 font-black uppercase tracking-widest text-slate-300 text-xs">Đối tác</h4>
            <Link className="block text-slate-400 transition hover:text-white" to="/partner/dashboard">Cổng đối tác</Link>
            <Link className="mt-2 block text-slate-400 transition hover:text-white" to="/partner/services">Quản lý dịch vụ</Link>
            <Link className="mt-2 block text-slate-400 transition hover:text-white" to="/partner/orders">Đơn hàng</Link>
          </div>
          <div>
            <h4 className="mb-4 font-black uppercase tracking-widest text-slate-300 text-xs">Hỗ trợ</h4>
            <span className="block text-slate-400">support@travelai.local</span>
            <span className="mt-2 block text-slate-400">© {year} TravelAI</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

const Home: React.FC = () => (
  <div className="space-y-16 bg-slate-50 transition-colors duration-300 dark:bg-[#0B1220]">
    <HeroSection />
    <ServicesStripSection />
    <WhyTravelAISection />
    <TrendingDestinationsSection />
    <FeaturedServicesSection />
    <CommunitySection />
    <HomeFooter />
  </div>
);

export default Home;
