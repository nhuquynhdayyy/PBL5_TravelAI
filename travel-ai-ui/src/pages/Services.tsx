import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, SlidersHorizontal, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import ServiceCard from '../components/ServiceCard';
import ServiceFilterSidebar, {
  defaultServiceFilters,
  type ServiceFilterState,
} from './Services/ServiceFilterSidebar';

interface ServicesProps {
  defaultType?: string;
}

interface FilterResponse {
  services: any[];
  totalCount: number;
  pageNumber: number;
  totalPages: number;
}

const typeFromRoute = (value: string) => {
  const routeMap: Record<string, string> = {
    '0': 'Hotel',
    '1': 'Tour',
    '2': 'Transport',
    Hotel: 'Hotel',
    Tour: 'Tour',
    Transport: 'Transport',
  };

  return routeMap[value] || '';
};

const buildRequest = (filters: ServiceFilterState, searchKeyword: string, pageNumber: number) => ({
  pageNumber,
  pageSize: 12,
  searchKeyword: searchKeyword.trim() || undefined,
  serviceType: filters.serviceType || undefined,
  minPrice: filters.minPrice === '' ? undefined : filters.minPrice,
  maxPrice: filters.maxPrice === '' ? undefined : filters.maxPrice,
  rating: filters.rating === '' ? undefined : filters.rating,
  hotelStars: filters.hotelStars === '' ? undefined : filters.hotelStars,
  hotelAmenities: filters.hotelAmenities.length ? filters.hotelAmenities : undefined,
  tourThemes: filters.tourThemes.length ? filters.tourThemes : undefined,
  tourDuration: filters.tourDuration || undefined,
  transportType: filters.transportType || undefined,
  departureTime: filters.departureTime || undefined,
});

const Services: React.FC<ServicesProps> = ({ defaultType = '' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialType = typeFromRoute(searchParams.get('type') || defaultType);
  const [filters, setFilters] = useState<ServiceFilterState>(defaultServiceFilters(initialType));
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedKeyword(searchKeyword), 450);
    return () => window.clearTimeout(timer);
  }, [searchKeyword]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchServices = async () => {
      try {
        setLoading(true);
        const requestBody = buildRequest(filters, debouncedKeyword, pageNumber);
        console.log('🔍 Services Filter Request:', requestBody);
        
        const response = await axiosClient.post<FilterResponse>(
          '/services/filter',
          requestBody,
          { signal: controller.signal },
        );

        console.log('✅ Services Response:', response.data);
        setServices(response.data.services || []);
        setTotalCount(response.data.totalCount || 0);
        setTotalPages(response.data.totalPages || 1);
      } catch (error: any) {
        if (error.name !== 'CanceledError') {
          console.error('❌ Lỗi lấy danh sách dịch vụ:', error);
          console.error('Error response:', error.response?.data);
          setServices([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchServices();
    return () => controller.abort();
  }, [filters, debouncedKeyword, pageNumber]);

  useEffect(() => {
    if (filters.serviceType) {
      setSearchParams({ type: filters.serviceType });
    } else {
      setSearchParams({});
    }
  }, [filters.serviceType, setSearchParams]);

  const pageTitle = useMemo(() => {
    switch (filters.serviceType) {
      case 'Hotel':
        return 'Khách sạn';
      case 'Tour':
        return 'Tour du lịch';
      case 'Transport':
        return 'Vé xe';
      default:
        return 'Dịch vụ TravelAI';
    }
  }, [filters.serviceType]);

  const handleFilterChange = (next: ServiceFilterState) => {
    setFilters(next);
    setPageNumber(1);
  };

  const resetFilters = () => {
    setFilters(defaultServiceFilters());
    setSearchKeyword('');
    setPageNumber(1);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.28em] text-teal-600">
            Services
          </p>
          <h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
            {pageTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-base font-medium text-slate-500">
            Lọc theo giá, đánh giá và thuộc tính riêng của từng loại dịch vụ để tìm lựa chọn phù hợp hơn.
          </p>
        </div>

        <div className="mb-8 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              value={searchKeyword}
              onChange={(event) => {
                setSearchKeyword(event.target.value);
                setPageNumber(1);
              }}
              placeholder="Tìm theo tên dịch vụ..."
              className="w-full rounded-xl bg-slate-50 py-4 pl-12 pr-10 text-sm font-semibold text-slate-700 outline-none transition focus:bg-white focus:ring-4 focus:ring-teal-50"
            />
            {searchKeyword && (
              <button
                type="button"
                onClick={() => setSearchKeyword('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowMobileFilter(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-4 text-sm font-black text-white shadow-sm transition hover:bg-teal-700 lg:hidden"
          >
            <SlidersHorizontal size={18} />
            Bộ lọc
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[310px_1fr]">
          <div className="hidden lg:block">
            <ServiceFilterSidebar value={filters} onChange={handleFilterChange} onReset={resetFilters} />
          </div>

          <main>
            <div className="mb-5 flex items-center justify-between gap-4">
              <p className="text-sm font-bold text-slate-600">
                Tìm thấy <span className="text-teal-700">{totalCount}</span> dịch vụ
              </p>
              <p className="text-sm font-semibold text-slate-400">
                Trang {pageNumber} / {totalPages}
              </p>
            </div>

            {loading ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white">
                <Loader2 className="animate-spin text-teal-600" size={42} />
                <p className="text-sm font-bold text-slate-400">Đang tải dịch vụ...</p>
              </div>
            ) : services.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {services.map((service) => (
                    <ServiceCard
                      key={service.serviceId}
                      service={service}
                      isAdminOrPartner={false}
                      onDelete={() => {}}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setPageNumber(page)}
                        className={`h-10 min-w-10 rounded-xl px-3 text-sm font-black transition ${
                          pageNumber === page
                            ? 'bg-teal-600 text-white'
                            : 'border border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-700'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center">
                <h3 className="text-2xl font-black text-slate-900">Không tìm thấy dịch vụ phù hợp</h3>
                <p className="mt-2 max-w-md text-sm font-medium text-slate-500">
                  Hãy thử nới khoảng giá, đổi đánh giá hoặc xóa các thuộc tính chuyên sâu.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-6 rounded-xl bg-teal-600 px-6 py-3 text-sm font-black text-white transition hover:bg-teal-700"
                >
                  Xóa tất cả bộ lọc
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {showMobileFilter && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 p-4 lg:hidden" onClick={() => setShowMobileFilter(false)}>
          <div
            className="ml-auto h-full max-w-sm overflow-y-auto rounded-2xl bg-white"
            onClick={(event) => event.stopPropagation()}
          >
            <ServiceFilterSidebar
              value={filters}
              onChange={(next) => {
                handleFilterChange(next);
                setShowMobileFilter(false);
              }}
              onReset={() => {
                resetFilters();
                setShowMobileFilter(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;
