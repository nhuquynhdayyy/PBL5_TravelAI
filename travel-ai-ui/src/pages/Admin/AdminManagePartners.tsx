import { useEffect, useMemo, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle
} from 'lucide-react';

type PartnerItem = {
  profileId: number;
  userId: number;
  fullName: string;
  email: string;
  businessName: string;
  taxCode?: string | null;
  contactPhone?: string | null;
  bankAccount?: string | null;
  address?: string | null;
  description?: string | null;
  businessLicenseUrl?: string | null;
  verificationStatus: string;
  reviewNote?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
};

const API_BASE_URL = 'http://localhost:5134';

const AdminManagePartners = () => {
  const [allPartners, setAllPartners] = useState<PartnerItem[]>([]);
  const [pendingPartners, setPendingPartners] = useState<PartnerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<PartnerItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const [allResponse, pendingResponse] = await Promise.all([
        axiosClient.get('/admin/partners'),
        axiosClient.get('/admin/pending-partners')
      ]);

      const nextAll = allResponse.data || [];
      const nextPending = pendingResponse.data || [];

      setAllPartners(nextAll);
      setPendingPartners(nextPending);
      setSelectedPartner((current) =>
        nextAll.find((item: PartnerItem) => item.profileId === current?.profileId)
        ?? nextPending[0]
        ?? nextAll[0]
        ?? null
      );
    } catch (error) {
      console.error(error);
      alert('Khong the tai danh sach doi tac.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPartners();
  }, []);

  const filteredPartners = useMemo(() => {
    const source = activeTab === 'pending' ? pendingPartners : allPartners;
    const keyword = searchQuery.trim().toLowerCase();

    if (!keyword) {
      return source;
    }

    return source.filter((partner) =>
      [partner.fullName, partner.businessName, partner.email, partner.taxCode ?? '']
        .some((value) => value.toLowerCase().includes(keyword))
    );
  }, [activeTab, allPartners, pendingPartners, searchQuery]);

  useEffect(() => {
    if (!selectedPartner && filteredPartners.length > 0) {
      setSelectedPartner(filteredPartners[0]);
      return;
    }

    if (selectedPartner && !filteredPartners.some((item) => item.profileId === selectedPartner.profileId)) {
      setSelectedPartner(filteredPartners[0] ?? null);
    }
  }, [filteredPartners, selectedPartner]);

  const handleAction = async (type: 'approve' | 'reject' | 'need-more-info') => {
    if (!selectedPartner) {
      return;
    }

    if (type !== 'approve' && !reviewNote.trim()) {
      alert(type === 'reject' ? 'Vui long nhap ly do tu choi.' : 'Vui long nhap thong tin can bo sung.');
      return;
    }

    try {
      setActionLoading(selectedPartner.profileId);
      await axiosClient.post(`/admin/partners/${selectedPartner.profileId}/${type}`, {
        reviewNote: reviewNote.trim()
      });
      setReviewNote('');
      await fetchPartners();
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message ?? 'Khong the cap nhat ho so doi tac luc nay.');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusClassName = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-emerald-100 text-emerald-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'needmoreinfo':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-red-700">
            <ShieldCheck size={14} /> Admin Partner Approval
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">DUYET DOI TAC CUNG CAP DICH VU</h1>
          <p className="mt-3 max-w-3xl font-medium text-slate-500">
            Xac minh doi tac truoc khi cho phep dang dich vu tren he thong, dong thoi xem toan bo danh sach partner.
          </p>
        </div>

        <button
          onClick={() => void fetchPartners()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black text-white shadow-lg transition-all hover:bg-red-600 active:scale-95"
        >
          <RefreshCw size={18} /> Tai lai
        </button>
      </div>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`rounded-full px-5 py-3 text-sm font-black transition ${
              activeTab === 'pending'
                ? 'bg-slate-900 text-white shadow-lg'
                : 'bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 hover:text-slate-900'
            }`}
          >
            Cho duyet ({pendingPartners.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`rounded-full px-5 py-3 text-sm font-black transition ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-lg'
                : 'bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 hover:text-slate-900'
            }`}
          >
            Tat ca partner ({allPartners.length})
          </button>
        </div>

        <div className="relative w-full max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Tim theo ten, email, doanh nghiep, ma so thue..."
            className="w-full rounded-full border-2 border-slate-100 bg-white py-3 pl-11 pr-5 font-semibold text-slate-700 outline-none transition focus:border-red-400"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="animate-spin text-red-600" size={40} />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-xl">
            <div className="border-b border-slate-100 px-6 py-5 text-left">
              <h2 className="text-lg font-black text-slate-900">
                {activeTab === 'pending' ? 'Danh sach partner cho duyet' : 'Danh sach tat ca partner'}
              </h2>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4">
              {filteredPartners.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
                  <p className="font-bold text-slate-400">Khong co partner nao phu hop bo loc hien tai.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPartners.map((partner) => (
                    <button
                      key={partner.profileId}
                      type="button"
                      onClick={() => setSelectedPartner(partner)}
                      className={`w-full rounded-[1.5rem] border p-4 text-left transition ${
                        selectedPartner?.profileId === partner.profileId
                          ? 'border-red-200 bg-red-50/70 shadow-sm'
                          : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="font-black text-slate-900">{partner.businessName}</p>
                        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getStatusClassName(partner.verificationStatus)}`}>
                          {partner.verificationStatus}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-600">{partner.fullName}</p>
                      <p className="mt-1 text-sm text-slate-500">{partner.email}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-xl">
            {selectedPartner ? (
              <div className="text-left">
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-widest ${getStatusClassName(selectedPartner.verificationStatus)}`}>
                    {selectedPartner.verificationStatus}
                  </span>
                  <span className="text-sm font-bold text-slate-400">Profile #{selectedPartner.profileId}</span>
                </div>

                <h2 className="text-2xl font-black text-slate-900">{selectedPartner.businessName}</h2>
                <p className="mt-1 font-semibold text-slate-600">{selectedPartner.fullName}</p>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                      <Mail size={14} /> Email
                    </p>
                    <p className="font-bold text-slate-800">{selectedPartner.email}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                      <Phone size={14} /> Lien he
                    </p>
                    <p className="font-bold text-slate-800">{selectedPartner.contactPhone || 'Chua cap nhat'}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                      <Building2 size={14} /> Ma so thue
                    </p>
                    <p className="font-bold text-slate-800">{selectedPartner.taxCode || 'Chua cap nhat'}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                      <BadgeCheck size={14} /> Tai khoan thanh toan
                    </p>
                    <p className="font-bold text-slate-800">{selectedPartner.bankAccount || 'Chua cap nhat'}</p>
                  </div>
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5">
                  <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Dia chi</p>
                  <p className="text-sm leading-7 text-slate-600">{selectedPartner.address || 'Chua cap nhat dia chi doanh nghiep.'}</p>
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5">
                  <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Mo ta doanh nghiep</p>
                  <p className="text-sm leading-7 text-slate-600">{selectedPartner.description || 'Chua co mo ta doanh nghiep.'}</p>
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5">
                  <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Giay phep kinh doanh</p>
                  {selectedPartner.businessLicenseUrl ? (
                    <a
                      href={`${API_BASE_URL}${selectedPartner.businessLicenseUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-blue-600 shadow-sm hover:text-blue-700"
                    >
                      <ExternalLink size={16} /> Mo tai lieu
                    </a>
                  ) : (
                    <p className="text-sm font-semibold text-slate-500">Chua co tai lieu dinh kem.</p>
                  )}
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5">
                  <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Ghi chu review</p>
                  <p className="text-sm leading-7 text-slate-600">{selectedPartner.reviewNote || 'Chua co ghi chu review.'}</p>
                </div>

                <div className="mt-6 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5">
                  <p className="mb-3 text-xs font-black uppercase tracking-widest text-amber-700">Nhan xet kiem duyet</p>
                  <textarea
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    placeholder="Nhap ghi chu cho partner..."
                    className="h-28 w-full rounded-2xl border border-amber-200 bg-white p-4 text-sm font-medium text-slate-700 outline-none transition focus:border-amber-400"
                  />

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => void handleAction('approve')}
                      disabled={actionLoading === selectedPartner.profileId}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3.5 text-sm font-black text-white shadow-lg transition hover:bg-emerald-700 disabled:opacity-70"
                    >
                      {actionLoading === selectedPartner.profileId ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleAction('need-more-info')}
                      disabled={actionLoading === selectedPartner.profileId}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-3.5 text-sm font-black text-white shadow-lg transition hover:bg-amber-600 disabled:opacity-70"
                    >
                      {actionLoading === selectedPartner.profileId ? <Loader2 size={16} className="animate-spin" /> : <AlertCircle size={16} />}
                      Need more info
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleAction('reject')}
                      disabled={actionLoading === selectedPartner.profileId}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3.5 text-sm font-black text-white shadow-lg transition hover:bg-red-700 disabled:opacity-70"
                    >
                      {actionLoading === selectedPartner.profileId ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[30rem] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <div>
                  <p className="text-lg font-black text-slate-500">Khong co partner de hien thi</p>
                  <p className="mt-2 text-sm font-medium text-slate-400">Danh sach se hien o day khi co partner trong he thong.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagePartners;
