import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Clock, Info, ArrowLeft, Settings2, Sparkles, Plus, Search, Filter, ChevronDown, Compass, Wallet, Users, Loader2 } from 'lucide-react';
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
    const [loading, setLoading] = useState(true);

    // Search & Filter state
    const [searchQuery, setSearchQuery] = useState('');

    // Budget Planner states
    const [days, setDays] = useState<number>(3);
    const [budgetPeople, setBudgetPeople] = useState<number>(2);
    const [budgetStyle, setBudgetStyle] = useState<string>('Trung binh');
    const [budgetLoading, setBudgetLoading] = useState(false);
    const [budgetEstimate, setBudgetEstimate] = useState<any | null>(null);

    const handleEstimateBudget = async () => {
        if (!dest) return;
        try {
            setBudgetLoading(true);

            const response = await axiosClient.post('/ai/estimate-budget', {
                destination: dest.name,
                destination_id: Number(id),
                days,
                people: budgetPeople,
                travel_style: budgetStyle
            });

            setBudgetEstimate(response.data.data || response.data);
        } catch (error) {
            console.error('Lỗi khi ước tính ngân sách:', error);
        } finally {
            setBudgetLoading(false);
        }
    };

    useEffect(() => {
        if (dest) {
            handleEstimateBudget();
        }
    }, [dest, days, budgetPeople, budgetStyle]);

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(value);

    const getImageUrl = (url: string) => {
        if (!url) return 'https://via.placeholder.com/800x400';
        return url.startsWith('http') ? url : `http://localhost:5134${url}`;
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [destRes, spotsRes] = await Promise.all([
                axiosClient.get(`/destinations/${id}`),
                axiosClient.get(`/spots/by-destination/${id}`)
            ]);
            setDest(destRes.data.data);
            setSpots(spotsRes.data.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    // Filter spots theo search query
    const filteredSpots = useMemo(() => {
        if (!searchQuery.trim()) return spots;
        const q = searchQuery.toLowerCase().trim();
        return spots.filter(spot =>
            (spot.name || spot.spotName || '').toLowerCase().includes(q) ||      
            (spot.location || spot.address || '').toLowerCase().includes(q)
        );
    }, [spots, searchQuery]);



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
          onClick={() => navigate(`/destinations/${id}`)}
          className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 font-bold transition-colors"
        >
          <ArrowLeft size={20} /> Quay lại chi tiết {dest?.name || 'tỉnh/thành'}
        </button>
 
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            {/* Spots Section */}
            <section>
              <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <MapPin className="text-red-500" /> Địa danh tham quan tại {dest.name} ({filteredSpots.length})
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
 
              {/* ====== SEARCH BAR ====== */}
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
              </div>
 
              {/* Result info */}
              {searchQuery && (
                <div className="flex items-center gap-2 mb-4 text-sm text-slate-500">
                  <span>
                    Tìm thấy{" "}
                    <span className="font-bold text-slate-800">
                      {filteredSpots.length}
                    </span>{" "}
                    địa danh
                  </span>
                  <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg font-medium">
                    "{searchQuery}"
                  </span>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="ml-auto text-blue-500 hover:text-blue-700 font-semibold underline underline-offset-2"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              )}
 
              {/* Spots Grid */}
              {filteredSpots.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredSpots.map((spot) => (
                    <SpotCard
                      key={spot.id || spot.spotId}
                      spot={spot}
                      isAdmin={isAdmin}
                      onDelete={handleDeleteSpot}
                    />
                  ))}
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
            <div className="rounded-[32px] border border-blue-100 bg-white p-6 shadow-sm relative overflow-hidden">
                <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                        <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-1">
                            <Sparkles size={12} className="animate-pulse" /> AI Budget & Planner
                        </p>
                        <h3 className="text-xl font-black text-slate-900">Dự toán & Lập kế hoạch AI</h3>
                    </div>
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                        {budgetLoading ? <Loader2 size={22} className="animate-spin" /> : <Wallet size={22} />}
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Điểm đến
                        </label>
                        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                            <MapPin size={16} className="text-red-400" />
                            {dest.name}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Số ngày
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={30}
                                value={days}
                                onChange={(event) => setDays(Math.max(1, Number(event.target.value) || 1))}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Số người
                            </label>
                            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-3">
                                <Users size={16} className="text-slate-400" />
                                <input
                                    type="number"
                                    min={1}
                                    max={50}
                                    value={budgetPeople}
                                    onChange={(event) => setBudgetPeople(Math.max(1, Number(event.target.value) || 1))}
                                    className="w-full text-sm font-bold text-slate-700 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Phong cách
                        </label>
                        <select
                            value={budgetStyle}
                            onChange={(event) => setBudgetStyle(event.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                        >
                            <option value="Tiet kiem">Tiết kiệm</option>
                            <option value="Trung binh">Trung bình</option>
                            <option value="Cao cap">Cao cấp</option>
                        </select>
                    </div>
                </div>

                {budgetEstimate && (
                    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100">
                        <div className="bg-blue-50 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                                Tổng ngân sách dự kiến
                            </p>
                            <p className="text-2xl font-black text-slate-900">
                                {formatCurrency(budgetEstimate.total)}
                            </p>
                        </div>

                        <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                            {budgetEstimate.breakdown.map((item: any) => (
                                <div key={item.category} className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3">
                                    <div>
                                        <p className="text-sm font-black text-slate-800">{item.category}</p>
                                        <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.note}</p>
                                    </div>
                                    <p className="whitespace-nowrap text-sm font-black text-blue-600">
                                        {formatCurrency(item.amount)}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100">
                            <button
                                onClick={() => {
                                    const styleMap: Record<string, string> = {
                                        'Tiet kiem': 'low',
                                        'Trung binh': 'medium',
                                        'Cao cap': 'high'
                                    };
                                    const budgetStyleKey = styleMap[budgetStyle] || 'medium';
                                    navigate(`/planner/create?destinationId=${id}&days=${days}&people=${budgetPeople}&budgetStyle=${budgetStyleKey}&budgetTotal=${budgetEstimate.total}`);
                                }}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white transition-all shadow-lg hover:bg-blue-700 active:scale-95"
                            >
                                <Sparkles size={16} />
                                Lập lịch trình chi tiết từ ngân sách này
                            </button>
                        </div>
                    </div>
                )}
            </div>
          </div>
        </div>
      </div>
    );
};

export default SpotList;