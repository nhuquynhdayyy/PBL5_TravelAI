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
  ShieldCheck,
  Store,
  UserRound,
  XCircle
} from 'lucide-react';

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
      alert('Khong the duyet dich vu luc nay.');
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
      alert('Khong the tu choi dich vu luc nay.');
    } finally {
      setActionLoading(null);
    }
  };

  const tabs = [
    { id: 'pending' as const, label: 'Dich vu cho duyet', count: pendingServices.length },
    { id: 'all' as const, label: 'Tat ca dich vu', count: allServices.length }
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="text-left">
          <h1 className="flex items-center gap-3 text-4xl font-black tracking-tight text-slate-900">
            <ShieldCheck className="text-red-600" size={36} />
            Quan tri duyet <span className="text-red-600">dich vu Partner</span>
          </h1>
          <p className="mt-2 max-w-3xl font-medium text-slate-500">
            Kiem tra dich vu moi, xem preview truoc khi public va xu ly phe duyet hoac tu choi.
          </p>
        </div>

        <div className="flex gap-4">
          <div className="rounded-3xl border border-red-100 bg-red-50 px-6 py-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400">Cho duyet</p>
            <p className="text-3xl font-black text-red-600">{pendingServices.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-100 bg-white px-6 py-4 text-center shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Tong dich vu</p>
            <p className="text-3xl font-black text-slate-900">{allServices.length}</p>
          </div>
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
                  ? 'bg-slate-900 text-white shadow-lg'
                  : 'bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 hover:text-slate-900'
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
            placeholder="Tim theo ten dich vu, doanh nghiep, dia diem..."
            className="w-full rounded-full border-2 border-slate-100 bg-white py-3 pl-11 pr-5 font-semibold text-slate-700 outline-none transition focus:border-red-400"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="animate-spin text-red-600" size={40} />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-xl">
            <div className="border-b border-slate-100 px-6 py-5 text-left">
              <h2 className="text-lg font-black text-slate-900">
                {activeTab === 'pending' ? 'Danh sach cho duyet' : 'Tat ca dich vu'}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Chon mot dich vu de xem preview va thao tac.
              </p>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-4">
              {filteredServices.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
                  <p className="font-bold text-slate-400">Khong co dich vu nao phu hop bo loc hien tai.</p>
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
                            ? 'border-red-200 bg-red-50/70 shadow-sm'
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
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                              service.isActive
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {service.isActive ? 'Da duyet' : 'Cho duyet'}
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

          <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-xl">
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
                  <span className={`rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-widest ${
                    selectedService.isActive
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {selectedService.isActive ? 'Dang public' : 'Dich vu cho duyet'}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-slate-600">
                    {selectedService.serviceType === 'Hotel' ? 'Khach san' : 'Tour du lich'}
                  </span>
                </div>

                <h2 className="text-2xl font-black text-slate-900">{selectedService.name}</h2>
                <p className="mt-2 text-lg font-black text-blue-600">
                  {currency.format(selectedService.basePrice)} VND
                </p>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                      <Store size={14} /> Doanh nghiep
                    </p>
                    <p className="font-bold text-slate-800">{selectedService.partnerName}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                      <UserRound size={14} /> Diem den
                    </p>
                    <p className="font-bold text-slate-800">{selectedService.spotName || 'Chua gan dia diem'}</p>
                  </div>
                </div>

                <div className="mt-6 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5">
                  <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Preview noi dung</p>
                  <p className="whitespace-pre-line text-sm leading-7 text-slate-600">
                    {selectedService.description || 'Dich vu chua co mo ta chi tiet.'}
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
                      className="h-28 w-full rounded-2xl border border-amber-200 bg-white p-4 text-sm font-medium text-slate-700 outline-none transition focus:border-amber-400"
                    />

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => void handleApprove(selectedService.serviceId)}
                        disabled={actionLoading === selectedService.serviceId}
                        className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3.5 text-sm font-black text-white shadow-lg transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
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
                        className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3.5 text-sm font-black text-white shadow-lg transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
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
                      Dich vu nay da duoc duyet va dang hien thi tren khu vuc public.
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
                  <p className="text-lg font-black text-slate-500">Chua co dich vu de preview</p>
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
