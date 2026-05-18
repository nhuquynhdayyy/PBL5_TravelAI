import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Filter,
  MapPin,
  Mountain,
  Plus,
  Search,
  Trash2,
  Umbrella,
  X,
} from 'lucide-react';
import axiosClient from '../api/axiosClient';

type FilterRegion = 'all' | 'north' | 'central' | 'south';
type FilterTravelType = 'all' | 'beach' | 'mountain' | 'culture';

type DestinationStats = {
  hotels: number;
  tours: number;
};

const ITEMS_PER_PAGE = 8;

const regionOptions: { value: FilterRegion; label: string }[] = [
  { value: 'all', label: 'Tất cả vùng' },
  { value: 'north', label: 'Miền Bắc' },
  { value: 'central', label: 'Miền Trung' },
  { value: 'south', label: 'Miền Nam' },
];

const typeOptions: { value: FilterTravelType; label: string }[] = [
  { value: 'all', label: 'Tất cả loại hình' },
  { value: 'beach', label: 'Du lịch biển' },
  { value: 'mountain', label: 'Núi' },
  { value: 'culture', label: 'Văn hóa' },
];

const regionKeywords: Record<Exclude<FilterRegion, 'all'>, string[]> = {
  north: ['hà nội', 'ha noi', 'sapa', 'sa pa', 'lào cai', 'ha long', 'hạ long', 'quảng ninh', 'ninh bình', 'cao bằng', 'hà giang', 'mộc châu'],
  central: ['đà nẵng', 'da nang', 'huế', 'hue', 'hội an', 'hoi an', 'quảng nam', 'nha trang', 'khánh hòa', 'đà lạt', 'da lat', 'phú yên', 'quy nhơn'],
  south: ['hồ chí minh', 'ho chi minh', 'sài gòn', 'sai gon', 'phú quốc', 'phu quoc', 'cần thơ', 'can tho', 'vũng tàu', 'vung tau', 'đồng bằng', 'mekong'],
};

const travelTypeKeywords: Record<Exclude<FilterTravelType, 'all'>, string[]> = {
  beach: ['biển', 'beach', 'đảo', 'island', 'vịnh', 'bay', 'nha trang', 'phú quốc', 'đà nẵng', 'hạ long', 'vũng tàu'],
  mountain: ['núi', 'mountain', 'đồi', 'cao nguyên', 'sapa', 'sa pa', 'đà lạt', 'hà giang', 'mộc châu', 'cao bằng'],
  culture: ['văn hóa', 'culture', 'di sản', 'phố cổ', 'lịch sử', 'heritage', 'hà nội', 'huế', 'hội an', 'ninh bình'],
};

const getDestinationId = (destination: any) => destination.id || destination.destinationId;

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const matchesKeywords = (destination: any, keywords: string[]) => {
  const haystack = normalizeText(`${destination.name || ''} ${destination.description || ''} ${destination.region || ''} ${destination.type || ''}`);
  return keywords.some((keyword) => haystack.includes(normalizeText(keyword)));
};

const getImageUrl = (url?: string) => {
  if (!url) return 'https://images.unsplash.com/photo-1528127269322-539801943592?q=80&w=900';
  return url.startsWith('http') ? url : `http://localhost:5134${url}`;
};

const getServiceType = (service: any) => String(service.serviceType ?? '').toLowerCase();

const buildDestinationStats = (services: any[]) => {
  const stats: Record<string, DestinationStats> = {};

  services.forEach((service) => {
    const destinationKeys = [
      service.destinationId,
      service.destination?.id,
      service.destinationName,
      service.destination?.name,
    ].filter(Boolean);

    destinationKeys.forEach((key) => {
      const statKey = String(key).toLowerCase();
      const current = stats[statKey] || { hotels: 0, tours: 0 };
      const serviceType = getServiceType(service);

      if (serviceType === 'hotel' || serviceType === '0') current.hotels += 1;
      if (serviceType === 'tour' || serviceType === '1') current.tours += 1;

      stats[statKey] = current;
    });
  });

  return stats;
};

const getStatsForDestination = (destination: any, stats: Record<string, DestinationStats>) => {
  const id = String(getDestinationId(destination) || '').toLowerCase();
  const name = String(destination.name || '').toLowerCase();
  return stats[id] || stats[name] || { hotels: destination.hotelCount || 0, tours: destination.tourCount || 0 };
};

const FilterBar = ({
  searchKeyword,
  region,
  travelType,
  onSearchChange,
  onRegionChange,
  onTypeChange,
  onReset,
}: {
  searchKeyword: string;
  region: FilterRegion;
  travelType: FilterTravelType;
  onSearchChange: (value: string) => void;
  onRegionChange: (value: FilterRegion) => void;
  onTypeChange: (value: FilterTravelType) => void;
  onReset: () => void;
}) => (
  <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-[#0061ff]">
      <Filter size={16} />
      Bộ lọc điểm đến
    </div>
    <div className="grid gap-3 lg:grid-cols-[1fr_220px_240px_auto]">
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={searchKeyword}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm theo tên hoặc mô tả..."
          className="w-full rounded-xl bg-slate-50 py-3.5 pl-11 pr-10 text-sm font-semibold text-slate-700 outline-none transition focus:bg-white focus:ring-4 focus:ring-blue-50"
        />
        {searchKeyword && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
          >
            <X size={17} />
          </button>
        )}
      </div>
      <select
        value={region}
        onChange={(event) => onRegionChange(event.target.value as FilterRegion)}
        className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-700 outline-none transition focus:border-[#0061ff] focus:ring-4 focus:ring-blue-50"
      >
        {regionOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <select
        value={travelType}
        onChange={(event) => onTypeChange(event.target.value as FilterTravelType)}
        className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-700 outline-none transition focus:border-[#0061ff] focus:ring-4 focus:ring-blue-50"
      >
        {typeOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={onReset}
        className="rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#0061ff]"
      >
        Xóa lọc
      </button>
    </div>
  </section>
);

const DestinationGridCard = ({
  destination,
  isAdmin,
  stats,
  onDelete,
  onEdit,
}: {
  destination: any;
  isAdmin: boolean;
  stats: DestinationStats;
  onDelete: () => void;
  onEdit: () => void;
}) => (
  <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl">
    {isAdmin && (
      <div className="absolute right-3 top-3 z-20 flex gap-2 opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          onClick={onEdit}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/95 text-[#0061ff] shadow-lg transition hover:bg-[#0061ff] hover:text-white"
          title="Chỉnh sửa"
        >
          <Edit size={17} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/95 text-red-600 shadow-lg transition hover:bg-red-600 hover:text-white"
          title="Xóa"
        >
          <Trash2 size={17} />
        </button>
      </div>
    )}

    <Link to={`/destinations/${getDestinationId(destination)}`} className="flex h-full flex-col">
      <div className="relative h-56 overflow-hidden">
        <img
          src={getImageUrl(destination.imageUrl)}
          alt={destination.name}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <div className="mb-2 flex items-center gap-1 text-xs font-black uppercase tracking-widest text-blue-100">
            <MapPin size={14} />
            Việt Nam
          </div>
          <h3 className="text-2xl font-black leading-tight">{destination.name}</h3>
        </div>
        <div className="absolute inset-x-0 bottom-0 translate-y-full bg-[#0061ff]/95 p-4 text-white transition duration-300 group-hover:translate-y-0">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-blue-100">Dịch vụ đang có</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/15 p-3">
              <p className="text-2xl font-black">{stats.hotels}</p>
              <p className="text-xs font-semibold text-blue-50">Khách sạn</p>
            </div>
            <div className="rounded-xl bg-white/15 p-3">
              <p className="text-2xl font-black">{stats.tours}</p>
              <p className="text-xs font-semibold text-blue-50">Tour</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="line-clamp-3 text-sm font-medium leading-6 text-slate-500">
          {destination.description || 'Thông tin điểm đến đang được cập nhật.'}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-[#0061ff]">
            <Umbrella size={13} />
            Biển
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
            <Mountain size={13} />
            Trải nghiệm
          </span>
        </div>
      </div>
    </Link>
  </article>
);

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav className="mt-10 flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-[#0061ff] hover:text-[#0061ff] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={18} />
      </button>
      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
          className={`h-10 min-w-10 rounded-xl px-3 text-sm font-black transition ${
            currentPage === page
              ? 'bg-[#0061ff] text-white shadow-lg shadow-blue-200'
              : 'border border-slate-200 bg-white text-slate-600 hover:border-[#0061ff] hover:text-[#0061ff]'
          }`}
        >
          {page}
        </button>
      ))}
      <button
        type="button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-[#0061ff] hover:text-[#0061ff] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
};

const Destinations: React.FC = () => {
  const [destinations, setDestinations] = useState<any[]>([]);
  const [serviceStats, setServiceStats] = useState<Record<string, DestinationStats>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [region, setRegion] = useState<FilterRegion>('all');
  const [travelType, setTravelType] = useState<FilterTravelType>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.roleName?.toLowerCase() === 'admin';

  const fetchDestinations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosClient.get('/destinations');
      setDestinations(response.data?.data || []);
    } catch (err) {
      console.error('Lỗi tải điểm đến:', err);
      setError('Không thể tải danh sách điểm đến.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDestinations();
  }, []);

  useEffect(() => {
    const fetchServiceStats = async () => {
      try {
        const response = await axiosClient.post('/services/filter', {
          pageNumber: 1,
          pageSize: 200,
        });
        setServiceStats(buildDestinationStats(response.data?.services || []));
      } catch (err) {
        console.error('Lỗi tải thống kê dịch vụ theo điểm đến:', err);
        setServiceStats({});
      }
    };

    fetchServiceStats();
  }, []);

  const filteredDestinations = useMemo(() => {
    const keyword = normalizeText(searchKeyword.trim());

    return destinations.filter((destination) => {
      const content = normalizeText(`${destination.name || ''} ${destination.description || ''}`);
      const matchesSearch = !keyword || content.includes(keyword);
      const matchesRegion = region === 'all' || matchesKeywords(destination, regionKeywords[region]);
      const matchesType = travelType === 'all' || matchesKeywords(destination, travelTypeKeywords[travelType]);

      return matchesSearch && matchesRegion && matchesType;
    });
  }, [destinations, region, searchKeyword, travelType]);

  const totalPages = Math.max(1, Math.ceil(filteredDestinations.length / ITEMS_PER_PAGE));
  const paginatedDestinations = filteredDestinations.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [region, searchKeyword, travelType]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa điểm đến này? Thao tác này không thể hoàn tác.')) {
      return;
    }

    try {
      await axiosClient.delete(`/destinations/${id}`);
      setDestinations((prev) => prev.filter((destination) => getDestinationId(destination) !== id));
      alert('Đã xóa điểm đến thành công!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi xóa dữ liệu');
    }
  };

  const resetFilters = () => {
    setSearchKeyword('');
    setRegion('all');
    setTravelType('all');
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#0061ff]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <p className="text-xl font-bold text-red-500">{error}</p>
        <button onClick={fetchDestinations} className="mt-4 font-bold text-[#0061ff] underline">Thử lại</button>
      </div>
    );
  }

  return (
    <div className="py-10">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-[#0061ff]">Khám phá Việt Nam</p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 md:text-5xl">Điểm đến</h1>
          <p className="mt-3 max-w-2xl text-slate-500">
            Danh sách đầy đủ các tỉnh, thành và điểm đến nổi bật, có thể lọc theo vùng miền và phong cách trải nghiệm.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => navigate('/admin/destinations/add')}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#0061ff] px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 active:scale-95"
          >
            <Plus size={20} /> Thêm điểm đến
          </button>
        )}
      </div>

      <FilterBar
        searchKeyword={searchKeyword}
        region={region}
        travelType={travelType}
        onSearchChange={setSearchKeyword}
        onRegionChange={setRegion}
        onTypeChange={setTravelType}
        onReset={resetFilters}
      />

      <div className="mb-5 flex flex-col justify-between gap-2 text-sm font-bold text-slate-500 sm:flex-row sm:items-center">
        <span>
          Tìm thấy <span className="text-[#0061ff]">{filteredDestinations.length}</span> điểm đến
        </span>
        <span>Trang {currentPage} / {totalPages}</span>
      </div>

      {paginatedDestinations.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paginatedDestinations.map((destination) => {
              const destinationId = getDestinationId(destination);

              return (
                <DestinationGridCard
                  key={destinationId}
                  destination={destination}
                  isAdmin={isAdmin}
                  stats={getStatsForDestination(destination, serviceStats)}
                  onEdit={() => navigate(`/admin/destinations/edit/${destinationId}`)}
                  onDelete={() => handleDelete(destinationId)}
                />
              );
            })}
          </div>

          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <MapPin className="mx-auto mb-4 text-[#0061ff]" size={42} />
          <h3 className="text-2xl font-black text-slate-900">Không có điểm đến phù hợp</h3>
          <p className="mt-2 text-sm font-medium text-slate-500">Hãy thử đổi vùng miền, loại hình hoặc từ khóa tìm kiếm.</p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-6 rounded-xl bg-[#0061ff] px-6 py-3 text-sm font-black text-white transition hover:bg-blue-700"
          >
            Xóa tất cả bộ lọc
          </button>
        </div>
      )}
    </div>
  );
};

export default Destinations;
