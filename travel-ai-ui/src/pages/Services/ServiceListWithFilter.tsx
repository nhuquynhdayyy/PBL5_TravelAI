import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, Loader2, ChevronLeft, ChevronRight, SlidersHorizontal, X
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import FilterSidebar, { type FilterState } from './FilterSidebar';
import ServiceCard from '../../components/ServiceCard';

interface ServiceDTO {
  serviceId: number;
  partnerId: number;
  partnerName: string;
  name: string;
  description: string;
  basePrice: number;
  serviceType: string;
  ratingAvg: number;
  reviewCount: number;
  isActive: boolean;
  spotId?: number;
  spotName?: string;
  latitude: number;
  longitude: number;
  imageUrls: string[];
  attributes: Record<string, string>;
  hasAvailability: boolean;
}

interface FilterResponse {
  services: ServiceDTO[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const ServiceListWithFilter: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [services, setServices] = useState<ServiceDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  
  // Get initial service type from URL params
  const initialServiceType = searchParams.get('type') || '';
  const [filters, setFilters] = useState<FilterState>({
    types: initialServiceType ? [initialServiceType] : [],
    minPrice: '',
    maxPrice: '',
    ratings: [],
    hotelAmenities: [],
    tourThemes: [],
    cuisineTypes: [],
  });

  // Debounce search
  const [debouncedKeyword, setDebouncedKeyword] = useState(searchKeyword);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(searchKeyword);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  const fetchServices = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);

      // Build filter request
      const filterRequest: any = {
        pageNumber: page,
        pageSize: 20,
        searchKeyword: debouncedKeyword || undefined,
        serviceType: filters.types.length === 1 ? filters.types[0] : undefined,
        minPrice: filters.minPrice !== '' ? filters.minPrice : undefined,
        maxPrice: filters.maxPrice !== '' ? filters.maxPrice : undefined,
        minRating: filters.ratings.length > 0 ? Math.min(...filters.ratings) : undefined,
      };

      // Hotel specific
      if (filters.hotelStars) {
        filterRequest.hotelStars = filters.hotelStars;
      }
      if (filters.hotelAmenities && filters.hotelAmenities.length > 0) {
        filterRequest.hotelAmenities = filters.hotelAmenities;
      }

      // Tour specific
      if (filters.tourThemes && filters.tourThemes.length > 0) {
        filterRequest.tourThemes = filters.tourThemes;
      }
      if (filters.tourDuration) {
        filterRequest.tourDuration = filters.tourDuration;
      }

      // Transport specific
      if (filters.transportType) {
        filterRequest.transportType = filters.transportType;
      }
      if (filters.departureTime) {
        filterRequest.departureTime = filters.departureTime;
      }

      // Restaurant specific
      if (filters.cuisineTypes && filters.cuisineTypes.length > 0) {
        filterRequest.cuisineTypes = filters.cuisineTypes;
      }
      if (filters.mealType) {
        filterRequest.mealType = filters.mealType;
      }

      const response = await axiosClient.post<FilterResponse>('/services/filter', filterRequest);
      
      setServices(response.data.services || []);
      setTotalCount(response.data.totalCount || 0);
      setCurrentPage(response.data.pageNumber || 1);
      setTotalPages(response.data.totalPages || 1);
    } catch (err) {
      console.error('Lỗi lấy danh sách dịch vụ:', err);
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [filters, debouncedKeyword]);

  useEffect(() => {
    fetchServices(1);
  }, [fetchServices]);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setCurrentPage(1);
    
    // Update URL params
    if (newFilters.types.length === 1) {
      setSearchParams({ type: newFilters.types[0] });
    } else {
      setSearchParams({});
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchServices(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getServiceTypeLabel = () => {
    if (filters.types.length === 1) {
      const typeMap: Record<string, string> = {
        Hotel: 'KHÁCH SẠN',
        Tour: 'TOUR DU LỊCH',
        Transport: 'VẬN CHUYỂN',
        Restaurant: 'NHÀ HÀNG',
        Activity: 'HOẠT ĐỘNG',
      };
      return typeMap[filters.types[0]] || 'DỊCH VỤ';
    }
    return 'TẤT CẢ DỊCH VỤ';
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* HEADER */}
      <div className="text-left mb-8 animate-in fade-in slide-in-from-left duration-700">
        <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-3">
          {getServiceTypeLabel()}
        </h1>
        <p className="text-slate-500 font-medium text-lg max-w-2xl">
          Tìm kiếm và đặt dịch vụ du lịch tốt nhất với bộ lọc thông minh
        </p>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên dịch vụ..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-amber-500 transition-all font-medium text-slate-700 outline-none"
          />
          {searchKeyword && (
            <button
              onClick={() => setSearchKeyword('')}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Mobile Filter Toggle */}
        <button
          onClick={() => setShowMobileFilter(!showMobileFilter)}
          className="lg:hidden flex items-center gap-2 bg-amber-500 text-white px-6 py-4 rounded-2xl font-bold shadow-sm hover:bg-amber-600 transition-all"
        >
          <SlidersHorizontal size={18} />
          Bộ lọc
        </button>
      </div>

      {/* LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
        {/* SIDEBAR - Desktop */}
        <aside className="hidden lg:block">
          <FilterSidebar
            onFilterChange={handleFilterChange}
            selectedServiceType={filters.types.length === 1 ? filters.types[0] : undefined}
          />
        </aside>

        {/* SIDEBAR - Mobile */}
        {showMobileFilter && (
          <div className="lg:hidden fixed inset-0 bg-black/50 z-50" onClick={() => setShowMobileFilter(false)}>
            <div
              className="absolute left-0 top-0 bottom-0 w-[85%] max-w-sm bg-white overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4">
                <button
                  onClick={() => setShowMobileFilter(false)}
                  className="mb-4 flex items-center gap-2 text-slate-600 hover:text-slate-900"
                >
                  <X size={20} />
                  Đóng
                </button>
                <FilterSidebar
                  onFilterChange={(newFilters) => {
                    handleFilterChange(newFilters);
                    setShowMobileFilter(false);
                  }}
                  selectedServiceType={filters.types.length === 1 ? filters.types[0] : undefined}
                />
              </div>
            </div>
          </div>
        )}

        {/* MAIN CONTENT */}
        <main>
          {/* Results count */}
          <div className="mb-6 flex items-center justify-between">
            <p className="text-slate-600 font-medium">
              Tìm thấy <span className="font-bold text-amber-600">{totalCount}</span> kết quả
            </p>
            <p className="text-sm text-slate-400">
              Trang {currentPage} / {totalPages}
            </p>
          </div>

          {/* LOADING */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <Loader2 className="animate-spin text-amber-600" size={48} />
              <p className="text-slate-400 font-bold animate-pulse">Đang tải dữ liệu...</p>
            </div>
          ) : services.length > 0 ? (
            <>
              {/* SERVICE GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">
                {services.map((service) => (
                  <ServiceCard
                    key={service.serviceId}
                    service={service}
                    isAdminOrPartner={false}
                    onDelete={() => {}}
                  />
                ))}
              </div>

              {/* PAGINATION */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-slate-200 hover:border-amber-400 hover:text-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-4 py-2 rounded-lg font-bold transition-all ${
                          currentPage === pageNum
                            ? 'bg-amber-500 text-white shadow-md'
                            : 'border border-slate-200 hover:border-amber-400 hover:text-amber-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-slate-200 hover:border-amber-400 hover:text-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </>
          ) : (
            /* EMPTY STATE */
            <div className="text-center py-32 bg-white rounded-3xl border-4 border-dashed border-slate-100 flex flex-col items-center gap-4">
              <div className="text-7xl">🔍</div>
              <h3 className="text-2xl font-black text-slate-800">Không tìm thấy kết quả nào!</h3>
              <p className="text-slate-400 font-medium max-w-md">
                Hãy thử thay đổi tiêu chí lọc hoặc từ khóa tìm kiếm để tìm được dịch vụ phù hợp nhé.
              </p>
              <button
                onClick={() => {
                  setFilters({
                    types: [],
                    minPrice: '',
                    maxPrice: '',
                    ratings: [],
                    hotelAmenities: [],
                    tourThemes: [],
                    cuisineTypes: [],
                  });
                  setSearchKeyword('');
                }}
                className="mt-4 px-8 py-3 bg-amber-500 text-white rounded-2xl font-bold shadow-lg hover:bg-amber-600 transition-all active:scale-95"
              >
                XÓA TẤT CẢ BỘ LỌC
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ServiceListWithFilter;
