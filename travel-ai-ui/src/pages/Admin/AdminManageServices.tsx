import { useEffect, useMemo, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import {
  AlertCircle,
  CheckCircle2,
  Compass,
  Eye,
  Hotel,
  Loader2,
  Search,
  Store,
  UserRound,
  XCircle
} from 'lucide-react';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

type ServiceItem = {
  serviceId: number;
  partnerId: number;
  partnerName: string;
  name: string;
  description: string;
  basePrice: number;
  serviceType: string;
  ratingAvg: number;
  spotId?: number | null;
  spotName?: string | null;
  imageUrls: string[];
  isActive: boolean;
};

const API_BASE_URL = 'http://localhost:5134';

const currency = new Intl.NumberFormat('vi-VN');

const AdminManageServices = () => {
  const [allServices, setAllServices] = useState<ServiceItem[]>([]);
  const [pendingServices, setPendingServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [allResponse, pendingResponse] = await Promise.all([
        axiosClient.get('/services/admin-all'),
        axiosClient.get('/admin/pending-services')
      ]);

      const nextAll = allResponse.data || [];
      const nextPending = pendingResponse.data || [];

      setAllServices(nextAll);
      setPendingServices(nextPending);

      setSelectedService((current) => {
        if (!current) {
          return nextPending[0] ?? nextAll[0] ?? null;
        }

        return nextAll.find((item: ServiceItem) => item.serviceId === current.serviceId)
          ?? nextPending.find((item: ServiceItem) => item.serviceId === current.serviceId)
          ?? nextPending[0]
          ?? nextAll[0]
          ?? null;
      });
    } catch (error) {
      console.error('Loi lay du lieu quan tri dich vu:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const filteredServices = useMemo(() => {
    const source = activeTab === 'pending' ? pendingServices : allServices;
    const keyword = searchQuery.trim().toLowerCase();

    if (!keyword) {
      return source;
    }

    return source.filter((service) =>
      [
        service.name,
        service.partnerName,
        service.serviceId.toString(),
        service.spotName ?? ''
      ].some((value) => value.toLowerCase().includes(keyword))
    );
  }, [activeTab, allServices, pendingServices, searchQuery]);

  useEffect(() => {
    if (!selectedService && filteredServices.length > 0) {
      setSelectedService(filteredServices[0]);
      return;
    }

    if (selectedService && !filteredServices.some((item) => item.serviceId === selectedService.serviceId)) {
      setSelectedService(filteredServices[0] ?? null);
    }
  }, [filteredServices, selectedService]);

  const handleApprove = async (serviceId: number) => {
    try {
      setActionLoading(serviceId);
      await axiosClient.post(`/admin/services/${serviceId}/approve`);
      await fetchData();
      setRejectReason('');
    } catch (error) {
      console.error(error);
      alert('Không thể duyệt dịch vụ lúc này.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (serviceId: number) => {
    if (!rejectReason.trim()) {
      alert('Vui long nhap ly do tu choi.');
      return;
    }

    try {
      setActionLoading(serviceId);
      await axiosClient.post(`/admin/services/${serviceId}/reject`, {
        reason: rejectReason.trim()
      });
      await fetchData();
      setRejectReason('');
    } catch (error) {
      console.error(error);
      alert('Không thể từ chối dịch vụ lúc này.');
    } finally {
      setActionLoading(null);
    }
  };

  const tabs = [
    { id: 'pending' as const, label: 'Dịch vụ cho duyet', count: pendingServices.length },
    { id: 'all' as const, label: 'Tất cả dịch vụ', count: allServices.length }
  ];

  return (
    <div className="admin-page">
      <AdminPageHeader
        eyebrow="Quản lý dịch vụ"
        title="Danh sách dịch vụ du lịch"
        description="Kiểm tra, cập nhật và quản lý các dịch vụ đang được cung cấp trên TravelAI."
      />

      <div className="mb-8 flex flex-col gap-4 sm:flex-row">
          <div className="admin-card px-6 py-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Chờ duyệt</p>
            <p className="text-3xl font-black text-blue-600">{pendingServices.length}</p>
          </div>
          <div className="admin-card px-6 py-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Tổng dịch vụ</p>
            <p className="text-3xl font-black text-slate-900">{allServices.length}</p>
          </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-5 py-3 text-sm font-black transition ${
                activeTab === tab.id
                  ? 'admin-button-primary'
                  : 'admin-button-secondary'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div className="relative w-full max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Tìm theo tên dịch vụ, doanh nghiệp, địa điểm..."
            className="admin-input py-3 pl-11 pr-5"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="admin-card overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-5 text-left">
              <h2 className="text-lg font-black text-slate-900">
                {activeTab === 'pending' ? 'Danh sách chờ duyệt' : 'Tất cả dịch vụ'}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Chọn một dịch vụ để xem preview và thao tác.
              </p>
            </div>

            <div className="max-h-[70vh] overflow-y-auto custom-scrollbar p-4">
              {filteredServices.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
                  <p className="font-bold text-slate-400">Không có dịch vụ nao phu hop bo loc hien tai.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredServices.map((service) => {
                    const selected = selectedService?.serviceId === service.serviceId;
                    const imageUrl = service.imageUrls?.[0]
                      ? `${API_BASE_URL}${service.imageUrls[0]}`
                      : 'https://via.placeholder.com/320x180?text=Service';

                    return (
                      <button
                        key={service.serviceId}
                        type="button"
                        onClick={() => setSelectedService(service)}
                        className={`flex w-full items-center gap-4 rounded-[1.5rem] border p-4 text-left transition ${
                          selected
                            ? 'border-blue-200 bg-blue-50/70 shadow-sm'
                            : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <img
                          src={imageUrl}
                          alt={service.name}
                          className="h-20 w-24 rounded-2xl object-cover shadow-sm"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <span className={`admin-badge ${
                              service.isActive
                                ? 'admin-badge-success'
                                : 'admin-badge-warning'
                            }`}>
                              {service.isActive ? 'Đã duyệt' : 'Chờ duyệt'}
                            </span>
                            <span className="text-[11px] font-bold text-slate-400">#{service.serviceId}</span>
                          </div>
                          <p className="line-clamp-1 text-base font-black text-slate-900">{service.name}</p>
                          <p className="mt-1 line-clamp-1 text-sm font-medium text-slate-500">
                            {service.partnerName}
                          </p>
                          <p className="mt-2 text-sm font-black text-blue-600">
                            {currency.format(service.basePrice)} VND
                          </p>
                        </div>
                        <Eye className="shrink-0 text-slate-300" size={18} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="admin-card p-6">
            {selectedService ? (
              <div className="text-left">
                <div className="mb-5 overflow-hidden rounded-[1.75rem] bg-slate-100">
                  <img
                    src={
                      selectedService.imageUrls?.[0]
                        ? `${API_BASE_URL}${selectedService.imageUrls[0]}`
                        : 'https://via.placeholder.com/720x400?text=Service+Preview'
                    }
                    alt={selectedService.name}
                    className="h-72 w-full object-cover"
                  />
                </div>

                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span className={`admin-badge ${
                    selectedService.isActive
                      ? 'admin-badge-success'
                      : 'admin-badge-warning'
                  }`}>
                    {selectedService.isActive ? 'Đang public' : 'Dịch vụ chờ duyệt'}
                  </span>
                  <span className="admin-badge admin-badge-neutral">
                    {selectedService.serviceType === 'Hotel' ? 'Khách sạn' : 'Tour du lịch'}
                  </span>
                </div>

                <h2 className="text-2xl font-black text-slate-900">{selectedService.name}</h2>
                <p className="mt-2 text-lg font-black text-blue-600">
                  {currency.format(selectedService.basePrice)} VND
                </p>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  <div className="admin-muted-card p-4">
                    <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                      <Store size={14} /> Doanh nghiep
                    </p>
                    <p className="font-bold text-slate-800">{selectedService.partnerName}</p>
                  </div>
                  <div className="admin-muted-card p-4">
                    <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                      <UserRound size={14} /> Điểm đến
                    </p>
                    <p className="font-bold text-slate-800">{selectedService.spotName || 'Chưa gắn địa điểm'}</p>
                  </div>
                </div>

                <div className="admin-muted-card mt-6 p-5">
                  <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Preview noi dung</p>
                  <p className="whitespace-pre-line text-sm leading-7 text-slate-600">
                    {selectedService.description || 'Dịch vụ chua co mo ta chi tiet.'}
                  </p>
                </div>

                {!selectedService.isActive && (
                  <div className="mt-6 space-y-4 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 shrink-0 text-amber-600" size={18} />
                      <div>
                        <p className="font-black text-amber-900">Xu ly dich vu cho duyet</p>
                        <p className="mt-1 text-sm font-medium text-amber-800">
                          Admin co the duyet de dua len public hoac tu choi kem ly do de partner dieu chinh.
                        </p>
                      </div>
                    </div>

                    <textarea
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      placeholder="Nhap ly do tu choi neu can..."
                      className="admin-input h-28 text-sm"
                    />

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => void handleApprove(selectedService.serviceId)}
                        disabled={actionLoading === selectedService.serviceId}
                        className="admin-button-success flex-1 px-5 py-3.5 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {actionLoading === selectedService.serviceId ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={16} />
                        )}
                        Duyet dich vu
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleReject(selectedService.serviceId)}
                        disabled={actionLoading === selectedService.serviceId}
                        className="admin-button-danger flex-1 px-5 py-3.5 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {actionLoading === selectedService.serviceId ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <XCircle size={16} />
                        )}
                        Tu choi
                      </button>
                    </div>
                  </div>
                )}

                {selectedService.isActive && (
                  <div className="mt-6 flex items-center gap-3 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
                    <CheckCircle2 size={18} className="shrink-0" />
                    <p className="text-sm font-semibold">
                      Dịch vụ nay da duoc duyet va dang hien thi tren khu vuc public.
                    </p>
                  </div>
                )}

                <div className="mt-6 flex items-center gap-3 text-sm font-semibold text-slate-500">
                  {selectedService.serviceType === 'Hotel' ? <Hotel size={16} /> : <Compass size={16} />}
                  <span>ID dich vu: #{selectedService.serviceId}</span>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[30rem] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <div>
                  <p className="text-lg font-black text-slate-500">Chưa có dịch vụ để preview</p>
                  <p className="mt-2 text-sm font-medium text-slate-400">
                    Danh sach ben trai se hien tai day khi co dich vu moi gui len.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManageServices;


