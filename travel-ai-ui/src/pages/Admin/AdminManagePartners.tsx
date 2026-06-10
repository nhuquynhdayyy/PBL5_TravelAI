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
  XCircle
} from 'lucide-react';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

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
  const [statusFilter, setStatusFilter] = useState<string>('all'); // all, Pending, Approved, Rejected, NeedMoreInfo

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
      alert('Không thể tải danh sách đối tác.');
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

    let result = source;

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter((partner) => partner.verificationStatus === statusFilter);
    }

    // Filter by search keyword
    if (keyword) {
      result = result.filter((partner) =>
        [partner.fullName, partner.businessName, partner.email, partner.taxCode ?? '']
          .some((value) => value.toLowerCase().includes(keyword))
      );
    }

    return result;
  }, [activeTab, allPartners, pendingPartners, searchQuery, statusFilter]);

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

    if (selectedPartner.verificationStatus.toLowerCase() === 'approved') {
      alert('Partner đã được duyệt. Vui lòng dùng action riêng nếu cần thu hồi phê duyệt.');
      return;
    }

    if (type !== 'approve' && !reviewNote.trim()) {
      alert(type === 'reject' ? 'Vui lòng nhập lý do từ chối.' : 'Vui lòng nhập thông tin cần bổ sung.');
      return;
    }

    try {
      setActionLoading(selectedPartner.profileId);
      await axiosClient.post(`/admin/partners/${selectedPartner.profileId}/${type}`, {
        reviewNote: reviewNote.trim()
      });
      setReviewNote('');
      await fetchPartners();
    } catch (error: unknown) {
      console.error(error);
      const message = typeof error === 'object'
        && error !== null
        && 'response' in error
        && typeof error.response === 'object'
        && error.response !== null
        && 'data' in error.response
        && typeof error.response.data === 'object'
        && error.response.data !== null
        && 'message' in error.response.data
        && typeof error.response.data.message === 'string'
          ? error.response.data.message
          : 'Không thể cập nhật hồ sơ đối tác lúc này.';
      alert(message);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusClassName = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'admin-badge-success';
      case 'rejected':
        return 'admin-badge-danger';
      case 'needmoreinfo':
        return 'admin-badge-warning';
      default:
        return 'admin-badge-info';
    }
  };

  const isSelectedPartnerApproved = selectedPartner?.verificationStatus.toLowerCase() === 'approved';

  return (
    <div className="admin-page">
      <AdminPageHeader
        eyebrow="Quản lý đối tác"
        title="Duyệt đối tác cung cấp dịch vụ"
        description="Xác minh thông tin đối tác trước khi cho phép đăng dịch vụ trên hệ thống."
        actionLabel="Tải lại"
        actionIcon={<RefreshCw size={18} />}
        onAction={() => void fetchPartners()}
      />

      <div className="mb-6 flex flex-col gap-4">
        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Tìm theo tên, email, doanh nghiệp, mã số thuế..."
            className="admin-input py-3 pl-11 pr-5"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-sm font-black text-slate-600">Lọc:</span>
          <button
            type="button"
            onClick={() => {
              setActiveTab('all');
              setStatusFilter('all');
            }}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              activeTab === 'all' && statusFilter === 'all'
                ? 'admin-button-primary'
                : 'admin-button-secondary'
            }`}
          >
            Tất cả ({allPartners.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('all');
              setStatusFilter('Pending');
            }}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              statusFilter === 'Pending'
                ? 'admin-button-primary'
                : 'admin-button-secondary'
            }`}
          >
            Chờ duyệt ({pendingPartners.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('all');
              setStatusFilter('Approved');
            }}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              statusFilter === 'Approved'
                ? 'admin-button-primary'
                : 'admin-button-secondary'
            }`}
          >
            Đã duyệt
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('all');
              setStatusFilter('Rejected');
            }}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              statusFilter === 'Rejected'
                ? 'admin-button-primary'
                : 'admin-button-secondary'
            }`}
          >
            Từ chối
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('all');
              setStatusFilter('NeedMoreInfo');
            }}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              statusFilter === 'NeedMoreInfo'
                ? 'admin-button-primary'
                : 'admin-button-secondary'
            }`}
          >
            Cần bổ sung
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="admin-card overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-5 text-left">
              <h2 className="text-lg font-black text-slate-900">
                {statusFilter === 'all' 
                  ? 'Tất cả đối tác' 
                  : statusFilter === 'Pending' 
                  ? 'Đối tác chờ duyệt'
                  : statusFilter === 'Approved'
                  ? 'Đối tác đã duyệt'
                  : statusFilter === 'Rejected'
                  ? 'Đối tác bị từ chối'
                  : 'Đối tác cần bổ sung thông tin'}
              </h2>
            </div>
            <div className="max-h-[70vh] overflow-y-auto custom-scrollbar p-4">
              {filteredPartners.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
                  <p className="font-bold text-slate-400">Không có partner nào phù hợp bộ lọc hiện tại.</p>
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
                          ? 'border-blue-200 bg-blue-50/70 shadow-sm'
                          : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="font-black text-slate-900">{partner.businessName}</p>
                        <span className={`admin-badge ${getStatusClassName(partner.verificationStatus)}`}>
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

          <div className="admin-card p-6">
            {selectedPartner ? (
              <div className="text-left">
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <span className={`admin-badge ${getStatusClassName(selectedPartner.verificationStatus)}`}>
                    {selectedPartner.verificationStatus}
                  </span>
                  <span className="text-sm font-bold text-slate-400">Profile #{selectedPartner.profileId}</span>
                </div>

                <h2 className="text-2xl font-black text-slate-900">{selectedPartner.businessName}</h2>
                <p className="mt-1 font-semibold text-slate-600">{selectedPartner.fullName}</p>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  <div className="admin-muted-card p-4">
                    <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                      <Mail size={14} /> Email
                    </p>
                    <p className="font-bold text-slate-800">{selectedPartner.email}</p>
                  </div>
                  <div className="admin-muted-card p-4">
                    <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                      <Phone size={14} /> Liên hệ
                    </p>
                    <p className="font-bold text-slate-800">{selectedPartner.contactPhone || 'Chưa cập nhật'}</p>
                  </div>
                  <div className="admin-muted-card p-4">
                    <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                      <Building2 size={14} /> Mã số thuế
                    </p>
                    <p className="font-bold text-slate-800">{selectedPartner.taxCode || 'Chưa cập nhật'}</p>
                  </div>
                  <div className="admin-muted-card p-4">
                    <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                      <BadgeCheck size={14} /> Tài khoản thanh toán
                    </p>
                    <p className="font-bold text-slate-800">{selectedPartner.bankAccount || 'Chưa cập nhật'}</p>
                  </div>
                </div>
<div className="admin-muted-card mt-5 p-5">
                  <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Địa chỉ</p>
                  <p className="text-sm leading-7 text-slate-600">{selectedPartner.address || 'Chưa cập nhật địa chỉ doanh nghiệp.'}</p>
                </div>

                <div className="admin-muted-card mt-5 p-5">
                  <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Mô tả doanh nghiệp</p>
                  <p className="text-sm leading-7 text-slate-600">{selectedPartner.description || 'Chưa có mô tả doanh nghiệp.'}</p>
                </div>

                <div className="admin-muted-card mt-5 p-5">
                  <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Giấy phép kinh doanh</p>
                  {selectedPartner.businessLicenseUrl ? (
                    <a
                      href={`${API_BASE_URL}${selectedPartner.businessLicenseUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="admin-button-secondary"
                    >
                      <ExternalLink size={16} /> Mở tài liệu
                    </a>
                  ) : (
                    <p className="text-sm font-semibold text-slate-500">Chưa có tài liệu đính kèm.</p>
                  )}
                </div>

                <div className="admin-muted-card mt-5 p-5">
                  <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Ghi chú review</p>
                  <p className="text-sm leading-7 text-slate-600">{selectedPartner.reviewNote || 'Chưa có ghi chú review.'}</p>
                </div>

                {!isSelectedPartnerApproved && (
                  <div className="mt-6 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5">
                    <p className="mb-3 text-xs font-black uppercase tracking-widest text-amber-700">Nhận xét kiểm duyệt</p>
                    <textarea
                      value={reviewNote}
                      onChange={(event) => setReviewNote(event.target.value)}
                      placeholder="Nhập ghi chú cho partner..."
                      className="admin-input h-28 text-sm"
                    />

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => void handleAction('approve')}
                        disabled={actionLoading === selectedPartner.profileId}
className="admin-button-success flex-1 px-5 py-3.5 disabled:opacity-70"
                      >
                        {actionLoading === selectedPartner.profileId ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
                        Duyệt
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleAction('need-more-info')}
                        disabled={actionLoading === selectedPartner.profileId}
                        className="admin-button-warning flex-1 px-5 py-3.5 disabled:opacity-70"
                      >
                        {actionLoading === selectedPartner.profileId ? <Loader2 size={16} className="animate-spin" /> : <AlertCircle size={16} />}
                        Cần bổ sung
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleAction('reject')}
                        disabled={actionLoading === selectedPartner.profileId}
                        className="admin-button-danger flex-1 px-5 py-3.5 disabled:opacity-70"
                      >
                        {actionLoading === selectedPartner.profileId ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                        Từ chối
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex min-h-[30rem] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <div>
                  <p className="text-lg font-black text-slate-500">Không có partner để hiển thị</p>
                  <p className="mt-2 text-sm font-medium text-slate-400">Danh sách sẽ hiển thị ở đây khi có partner trong hệ thống.</p>
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


