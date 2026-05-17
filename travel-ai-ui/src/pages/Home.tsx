import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bot,
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
import HomeSearch from '../components/HomeSearch';
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
    <div className="relative grid min-h-[560px] items-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
      <div>
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-blue-100 ring-1 ring-white/15">
          <Sparkles size={15} />
          TravelAI Planner
        </div>
        <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
          Lên lịch trình thông minh cho chuyến đi Việt Nam.
        </h1>
        <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-blue-50/85 md:text-lg">
          Tìm điểm đến, chọn dịch vụ phù hợp và để AI gợi ý lịch trình theo ngân sách, nhịp độ và sở thích của bạn.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/preferences"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0061ff] px-6 py-4 text-sm font-black text-white shadow-2xl shadow-blue-950/30 transition hover:bg-blue-700"
          >
            Tạo lịch trình AI <ArrowRight size={18} />
          </Link>
          <Link
            to="/destinations"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-6 py-4 text-sm font-black text-white ring-1 ring-white/20 transition hover:bg-white/15"
          >
            Khám phá điểm đến
          </Link>
        </div>
      </div>
      <div className="rounded-[28px] bg-white/95 p-4 shadow-2xl shadow-blue-950/30 ring-1 ring-white/30">
        <div className="rounded-3xl bg-slate-50 p-5">
          <p className="mb-4 text-sm font-black uppercase tracking-widest text-slate-500">Bạn muốn đi đâu?</p>
          <HomeSearch />
        </div>
      </div>
    </div>
  </section>
);

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
    <section className="bg-white py-16">
      <div className="mb-10 max-w-2xl">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-[#0061ff]">Tại sao chọn TravelAI?</p>
        <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
          AI không chỉ gợi ý, mà giúp bạn ra quyết định.
        </h2>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-xl"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0061ff] text-white">
                <Icon size={22} />
              </div>
              <h3 className="text-xl font-black text-slate-900">{item.title}</h3>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-500">{item.text}</p>
            </article>
          );
        })}
      </div>
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
        const response = await axiosClient.post('/services/filter', {
          pageNumber: 1,
          pageSize: 20,
          sortBy: 'rating',
          sortDescending: true,
        });

        const ranked = (response.data?.services || [])
          .filter(isHotelOrTour)
          .sort((a: any, b: any) => Number(b.ratingAvg || 0) - Number(a.ratingAvg || 0))
          .slice(0, 4);

        setServices(ranked);
      } catch (error) {
        console.error('Lỗi tải dịch vụ nổi bật:', error);
        setServices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  return (
    <section className="rounded-[28px] bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-[#0061ff]">Dịch vụ nổi bật</p>
          <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
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
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Hotel className="mx-auto mb-3 text-[#0061ff]" size={36} />
          <p className="font-bold text-slate-600">Dịch vụ nổi bật đang được cập nhật.</p>
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
    <section className="bg-white py-16">
      <div className="mb-10 max-w-2xl">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-[#0061ff]">Gợi ý từ cộng đồng</p>
        <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Những lịch trình đáng thử</h2>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {itineraries.map((item, index) => (
          <article
            key={item.id || item.title}
            className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-2xl"
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
              <p className="text-sm font-semibold text-slate-500">
                {item.days} ngày · {item.theme}
              </p>
              <button
                type="button"
                onClick={() => navigate('/preferences')}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm font-black text-[#0061ff] transition hover:bg-[#0061ff] hover:text-white"
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
    <footer className="rounded-[28px] bg-slate-950 px-6 py-10 text-white">
      <div className="flex flex-col justify-between gap-8 md:flex-row">
        <div>
          <div className="flex items-center gap-2 text-2xl font-black">
            <Compass className="text-[#0061ff]" />
            TravelAI
          </div>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
            Nền tảng lập lịch trình, khám phá điểm đến và đặt dịch vụ du lịch thông minh.
          </p>
        </div>
        <div className="grid gap-8 text-sm sm:grid-cols-3">
          <div>
            <h4 className="mb-3 font-black">Khám phá</h4>
            <Link className="block text-slate-400 hover:text-white" to="/destinations">Điểm đến</Link>
            <Link className="mt-2 block text-slate-400 hover:text-white" to="/services">Dịch vụ</Link>
          </div>
          <div>
            <h4 className="mb-3 font-black">AI Planner</h4>
            <Link className="block text-slate-400 hover:text-white" to="/preferences">Sở thích</Link>
            <Link className="mt-2 block text-slate-400 hover:text-white" to="/itinerary/latest">Lịch trình</Link>
          </div>
          <div>
            <h4 className="mb-3 font-black">Hỗ trợ</h4>
            <span className="block text-slate-400">support@travelai.local</span>
            <span className="mt-2 block text-slate-400">© {year} TravelAI</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

const Home: React.FC = () => (
  <div className="space-y-16 bg-white">
    <HeroSection />
    <WhyTravelAISection />
    <FeaturedServicesSection />
    <CommunitySection />
    <HomeFooter />
  </div>
);

export default Home;
