import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Clock, Info, ArrowLeft, Settings2, Sparkles, Plus, Search, Filter, ChevronDown, Compass } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import SpotCard from '../../components/SpotCard';

const SpotList: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const isAdmin = user?.roleName?.toLowerCase() === 'admin';

    const [dest, setDest] = useState<any>(null);
    const [spots, setSpots] = useState<any[]>([]);
    const [allDestinations, setAllDestinations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Search & Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDestId, setFilterDestId] = useState<string>('id || all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const SPOTS_PER_PAGE = 2;
    const [currentPage, setCurrentPage] = useState(1);

    const getImageUrl = (url: string) => {
        if (!url) return 'https://via.placeholder.com/800x400';
        return url.startsWith('http') ? url : `http://localhost:5134${url}`;
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [destRes, spotsRes, allDestsRes] = await Promise.all([
                axiosClient.get(`/destinations/${id}`),
                axiosClient.get(`/spots/by-destination/${id}`),
                axiosClient.get(`/destinations`)
            ]);
            setDest(destRes.data.data);
            setSpots(spotsRes.data.data);
            setAllDestinations(allDestsRes.data.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    
    useEffect(() => {
      setCurrentPage(1);
      if (filterDestId !== "all" && filterDestId !== id) {
        axiosClient
          .get(`/spots/by-destination/${filterDestId}`)
          .then((res) => setSpots(res.data.data))
          .catch(console.error);
      } else if (filterDestId === "all") {
        Promise.all(
          allDestinations.map((d) =>
            axiosClient
              .get(`/spots/by-destination/${d.id || d.destinationId}`)
              .then((res) => res.data.data)
              .catch(() => []),
          ),
        ).then((results) => {
          const allSpots = results.flat();
          setSpots(allSpots);
        });
      } else {
        axiosClient
          .get(`/spots/by-destination/${id}`)
          .then((res) => setSpots(res.data.data))
          .catch(console.error);
      }
    }, [filterDestId, allDestinations]);

    useEffect(() => {
    setCurrentPage(1);
    }, [searchQuery]);

    // Filter spots theo search query
    const filteredSpots = useMemo(() => {
        if (!searchQuery.trim()) return spots;
        const q = searchQuery.toLowerCase().trim();
        return spots.filter(spot =>
            (spot.name || spot.spotName || '').toLowerCase().includes(q) ||      
            (spot.location || spot.address || '').toLowerCase().includes(q)
        );
    }, [spots, searchQuery]);

    const totalPages = Math.ceil(filteredSpots.length / SPOTS_PER_PAGE);
    const paginatedSpots = filteredSpots.slice(
    (currentPage - 1) * SPOTS_PER_PAGE,
    currentPage * SPOTS_PER_PAGE
    );

    const handleDeleteSpot = async (spotId: number) => {
        if (window.confirm('Bạn có chắc muốn xóa địa danh này không?')) {
            try {
                await axiosClient.delete(`/spots/${spotId}`);
                setSpots(prev => prev.filter(s => (s.id || s.spotId) !== spotId));
                alert('Đã xóa địa danh thành công!');
            } catch (err) {
                alert('Lỗi khi xóa địa danh.');
            }
        }
    };

    const selectedDestName = filterDestId === 'all'
    ? 'Tất cả tỉnh/thành'
    : allDestinations.find(d => String(d.id || d.destinationId) === filterDestId)?.name || dest?.name || 'Chọn tỉnh/thành';

    if (loading) return (
        <div className="flex h-[60vh] items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
    );

    if (!dest) return <div className="p-10 text-center font-bold">Không tìm thấy địa điểm.</div>;

    return (
      <div className="max-w-6xl mx-auto p-6 mb-20">
        {/* Back button */}
        <button
          onClick={() => navigate("/destinations")}
          className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 font-bold transition-colors"
        >
          <ArrowLeft size={20} /> Quay lại danh sách tỉnh
        </button>

        {/* Hero Image */}
        <div className="relative h-[450px] rounded-[40px] overflow-hidden shadow-2xl mb-10 border-8 border-white">
          <img
            src={getImageUrl(dest.imageUrl)}
            className="w-full h-full object-cover"
            alt={dest.name}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-12">
            <h1 className="text-6xl font-black text-white tracking-tighter">
              {dest.name}
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            {/* Description */}
            <section className="mb-12">
              <h2 className="text-2xl font-black text-slate-800 mb-4 flex items-center gap-2">
                <Info className="text-blue-500" /> Giới thiệu về {dest.name}
              </h2>
              <p className="text-slate-600 leading-relaxed text-lg bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                {dest.description}
              </p>
            </section>

            {/* Spots Section */}
            <section>
              <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <MapPin className="text-red-500" /> Địa danh tham quan
                </h2>
                {isAdmin && (
                  <button
                    onClick={() =>
                      navigate(`/admin/spots/add?destinationId=${id}`)
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1 shadow-lg shadow-blue-200 transition-all active:scale-95"
                  >
                    <Plus size={18} /> Thêm địa danh
                  </button>
                )}
              </div>

              {/* ====== SEARCH & FILTER BAR ====== */}
              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm địa danh..."
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-slate-200 bg-white text-slate-700 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all text-sm shadow-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Destination Filter Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className="flex items-center gap-2 px-4 py-3 rounded-2xl border-2 border-slate-200 bg-white text-slate-700 font-semibold text-sm hover:border-blue-400 hover:bg-blue-50 focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all shadow-sm whitespace-nowrap min-w-[180px] justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Filter size={16} className="text-blue-500" />
                      <span className="truncate max-w-[130px]">
                        {selectedDestName}
                      </span>
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 transition-transform ${isFilterOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isFilterOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden">
                      <div className="p-2 max-h-72 overflow-y-auto">
                        {/* Option: Tất cả */}
                        <button
                          onClick={() => {
                            setFilterDestId("all");
                            setIsFilterOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition-colors ${filterDestId === "all" ? "bg-blue-500 text-white" : "hover:bg-slate-50 text-slate-700"}`}
                        >
                          🗺️ Tất cả tỉnh/thành
                        </button>

                        {/* Option: Tỉnh hiện tại */}
                        <button
                          onClick={() => {
                            setFilterDestId(String(id));
                            setIsFilterOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition-colors ${filterDestId === String(id) || filterDestId === id ? "bg-blue-500 text-white" : "hover:bg-slate-50 text-slate-700"}`}
                        >
                          📍 {dest.name} (hiện tại)
                        </button>

                        {allDestinations.length > 0 && (
                          <div className="my-1 border-t border-slate-100" />
                        )}

                        {/* Các tỉnh khác */}
                        {allDestinations
                          .filter(
                            (d) =>
                              String(d.id || d.destinationId) !== String(id),
                          )
                          .map((d) => {
                            const dId = String(d.id || d.destinationId);
                            return (
                              <button
                                key={dId}
                                onClick={() => {
                                  setFilterDestId(dId);
                                  setIsFilterOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${filterDestId === dId ? "bg-blue-500 text-white" : "hover:bg-slate-50 text-slate-600"}`}
                              >
                                {d.name}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Result info */}
              <div className="flex items-center gap-2 mb-4 text-sm text-slate-500">
                <span>
                  Tìm thấy{" "}
                  <span className="font-bold text-slate-800">
                    {filteredSpots.length}
                  </span>{" "}
                  địa danh
                </span>
                {searchQuery && (
                  <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg font-medium">
                    "{searchQuery}"
                  </span>
                )}
                {filterDestId !== "all" && filterDestId !== String(id) && (
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg font-medium">
                    {selectedDestName}
                  </span>
                )}
                {(searchQuery || filterDestId !== String(id)) && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setFilterDestId(String(id));
                    }}
                    className="ml-auto text-blue-500 hover:text-blue-700 font-semibold underline underline-offset-2"
                  >
                    Xóa bộ lọc
                  </button>
                )}
              </div>

              {/* Spots Carousel */}
              {filteredSpots.length > 0 ? (
                <div className="relative">
                  {/* Nút trái */}
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="absolute -left-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full border border-slate-200 bg-white shadow-md text-slate-600 text-xl font-bold hover:border-blue-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    ‹
                  </button>

                  {/* Grid 4 cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6">
                    {filteredSpots
                      .slice(
                        (currentPage - 1) * SPOTS_PER_PAGE,
                        currentPage * SPOTS_PER_PAGE,
                      )
                      .map((spot) => (
                        <SpotCard
                          key={spot.id || spot.spotId}
                          spot={spot}
                          isAdmin={isAdmin}
                          onDelete={handleDeleteSpot}
                        />
                      ))}
                  </div>

                  {/* Nút phải */}
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="absolute -right-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full border border-slate-200 bg-white shadow-md text-slate-600 text-xl font-bold hover:border-blue-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    ›
                  </button>
                </div>
              ) : (
                <div className="p-10 bg-slate-50 rounded-[40px] text-center text-slate-400 italic border-2 border-dashed border-slate-200">
                  {searchQuery
                    ? `Không tìm thấy địa danh nào khớp với "${searchQuery}"`
                    : "Dữ liệu địa danh đang được cập nhật..."}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden group">
              <Sparkles className="absolute -top-4 -right-4 size-24 text-white/10 group-hover:rotate-12 transition-transform" />
              <h3 className="text-2xl font-black mb-4 relative z-10">
                Lên kế hoạch thông minh?
              </h3>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed relative z-10">
                Để AI thiết kế lịch trình tối ưu nhất cho chuyến đi {dest.name}{" "}
                của bạn.
              </p>
              <button className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 relative z-10">
                Bắt đầu ngay
              </button>
            </div>

            {/* Quick filter card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h4 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                <MapPin size={16} className="text-red-400" /> Khám phá
                tỉnh/thành khác
              </h4>
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                {allDestinations
                  .filter((d) => String(d.id || d.destinationId) !== String(id))
                  .slice(0, 8)
                  .map((d) => (
                    <button
                      key={d.id || d.destinationId}
                      onClick={() =>
                        navigate(`/destinations/${d.id || d.destinationId}`)
                      }
                      className="text-left text-sm text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-xl font-medium transition-colors"
                    >
                      → {d.name}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Click outside to close dropdown */}
        {isFilterOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsFilterOpen(false)}
          />
        )}
      </div>
    );
};

export default SpotList;