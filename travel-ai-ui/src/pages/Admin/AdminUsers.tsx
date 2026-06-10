import { useCallback, useEffect, useMemo, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  ShieldOff,
  Store,
  User,
  Users,
  History,
  X,
  Clock,
  Database,
} from 'lucide-react';
import { formatVietnameseDate, formatVietnameseDateTime } from '../../utils/dateTimeUtils';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

type UserItem = {
  userId: number;
  fullName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  roleName: string;
  isActive: boolean;
  createdAt: string;
};

type UsersResponse = {
  items: UserItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
};

type ActivityLogItem = {
  logId: number;
  action: string;
  tableName: string;
  recordId: number;
  timestamp: string;
};

type ActivityLogResponse = {
  userId: number;
  userName: string;
  items: ActivityLogItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
};

type RoleTab = 'customer' | 'partner';

const TABS: { key: RoleTab; label: string; icon: React.ReactNode; color: string; activeColor: string }[] = [
  {
    key: 'customer',
    label: 'Khách hàng',
    icon: <Users size={14} />,
    color: 'admin-button-secondary',
    activeColor: 'admin-button-primary',
  },
  {
    key: 'partner',
    label: 'Đối tác',
    icon: <Store size={14} />,
    color: 'admin-button-secondary',
    activeColor: 'admin-button-primary',
  },
];

const AdminUsers = () => {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<RoleTab>('customer');
  
  // Activity Log Modal State
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [activityLogData, setActivityLogData] = useState<ActivityLogResponse | null>(null);
  const [activityLogLoading, setActivityLogLoading] = useState(false);
  const [activityLogPage, setActivityLogPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  const fetchUsers = useCallback(async (currentPage: number, keyword: string, role: string) => {
    try {
      setLoading(true);
      const response = await axiosClient.get('/admin/users', {
        params: { page: currentPage, search: keyword, role },
      });
      setData(response.data);
    } catch (error) {
      console.error(error);
      alert('Không thể tải danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers(page, searchQuery, activeTab);
  }, [page, searchQuery, activeTab, fetchUsers]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showActivityLog) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showActivityLog]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput.trim());
  };

  const handleTabChange = (tab: RoleTab) => {
    setActiveTab(tab);
    setPage(1);
    setSearchInput('');
    setSearchQuery('');
  };

  const handleToggleActive = async (user: UserItem) => {
    const action = user.isActive ? 'ban' : 'unban';
    try {
      setActionLoading(user.userId);
      await axiosClient.post(`/admin/users/${user.userId}/${action}`);
      await fetchUsers(page, searchQuery, activeTab);
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message ?? 'Không thể cập nhật trạng thái người dùng.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewActivityLog = async (user: UserItem) => {
    setSelectedUser(user);
    setShowActivityLog(true);
    setActivityLogPage(1);
    await fetchActivityLog(user.userId, 1);
  };

  const fetchActivityLog = async (userId: number, currentPage: number) => {
    try {
      setActivityLogLoading(true);
      const response = await axiosClient.get(`/admin/users/${userId}/activity-log`, {
        params: { page: currentPage, pageSize: 20 },
      });
      setActivityLogData(response.data);
    } catch (error) {
      console.error(error);
      alert('Không thể tải lịch sử hoạt động.');
    } finally {
      setActivityLogLoading(false);
    }
  };

  const handleCloseActivityLog = () => {
    setShowActivityLog(false);
    setActivityLogData(null);
    setSelectedUser(null);
    setActivityLogPage(1);
  };

  const users = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  const paginationRange = useMemo(() => {
    const range: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  }, [page, totalPages]);

  const getActionColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE':
        return 'admin-badge admin-badge-success';
      case 'UPDATE':
        return 'admin-badge admin-badge-info';
      case 'DELETE':
        return 'admin-badge admin-badge-danger';
      default:
        return 'admin-badge admin-badge-neutral';
    }
  };

  const activityLogPaginationRange = useMemo(() => {
    if (!activityLogData) return [];
    const range: number[] = [];
    const start = Math.max(1, activityLogPage - 2);
    const end = Math.min(activityLogData.totalPages, activityLogPage + 2);
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  }, [activityLogPage, activityLogData]);

  return (
    <div className="admin-page">
      <AdminPageHeader
        eyebrow="Người dùng"
        title="Quản lý tài khoản người dùng"
        description="Theo dõi, tìm kiếm và quản lý thông tin tài khoản người dùng."
        actionLabel="Tải lại"
        actionIcon={<RefreshCw size={18} />}
        onAction={() => void fetchUsers(page, searchQuery, activeTab)}
      />

      {/* Tabs + Search */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-3">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`${
                activeTab === tab.key ? tab.activeColor : tab.color
              }`}
            >
              {tab.icon}
              {tab.label}
              {data && activeTab === tab.key && (
                <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-black ${
                  activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {data.totalCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="relative w-full max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo tên hoặc email..."
            className="admin-input py-3 pl-11 pr-28"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-black text-white transition hover:bg-blue-700"
          >
            Tìm kiếm
          </button>
        </form>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      ) : (
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">
                    {activeTab === 'customer' ? 'Khách hàng' : 'Đối tác'}
                  </th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">
                    Liên hệ
                  </th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">
                    Ngày tạo
                  </th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">
                    Trạng thái
                  </th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 text-right">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="mx-auto max-w-sm">
                        <User size={48} className="mx-auto mb-4 text-slate-300" />
                        <p className="text-lg font-black text-slate-400">
                          Không tìm thấy {activeTab === 'customer' ? 'khách hàng' : 'đối tác'} nào
                        </p>
                        <p className="mt-2 text-sm font-medium text-slate-400">
                          Thử thay đổi từ khóa tìm kiếm.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.userId}
                      className="border-b border-slate-50 transition hover:bg-slate-50/50"
                    >
                      {/* User info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white shadow-sm">
                            {user.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt={user.fullName}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              user.fullName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{user.fullName}</p>
                            <p className="text-sm text-slate-500">ID: {user.userId}</p>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="flex items-center gap-1.5 text-sm text-slate-600">
                            <Mail size={13} className="text-slate-400" />
                            {user.email}
                          </p>
                          {user.phone && (
                            <p className="flex items-center gap-1.5 text-sm text-slate-500">
                              <Phone size={13} className="text-slate-400" />
                              {user.phone}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Created */}
                      <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                        {formatVietnameseDate(user.createdAt)}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span
                          className={`admin-badge ${
                            user.isActive
                              ? 'admin-badge-success'
                              : 'admin-badge-danger'
                          }`}
                        >
                          {user.isActive ? (
                            <>
                              <ShieldCheck size={12} /> Đang hoạt động
                            </>
                          ) : (
                            <>
                              <ShieldOff size={12} /> Đã khóa
                            </>
                          )}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleViewActivityLog(user)}
                            className="admin-button-secondary px-4 py-2.5 text-xs"
                          >
                            <History size={14} />
                            Lịch sử
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleToggleActive(user)}
                            disabled={actionLoading === user.userId}
                            className={`px-4 py-2.5 text-xs disabled:opacity-60 ${
                              user.isActive
                                ? 'admin-button-danger'
                                : 'admin-button-success'
                            }`}
                          >
                            {actionLoading === user.userId ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : user.isActive ? (
                              <ShieldOff size={14} />
                            ) : (
                              <ShieldCheck size={14} />
                            )}
                            {user.isActive ? 'Khóa' : 'Mở khóa'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
              <p className="text-sm font-semibold text-slate-500">
                Trang {page} / {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={page <= 1}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"
                >
                  <ChevronLeft size={18} />
                </button>
                {paginationRange.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setPage(p);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`min-w-[2.25rem] rounded-xl px-3 py-2 text-sm font-bold transition ${
                      p === page
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setPage((p) => Math.min(totalPages, p + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={page >= totalPages}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activity Log Modal */}
      {showActivityLog && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
          onClick={() => setShowActivityLog(false)}
        >
          <div 
            className="admin-card relative my-8 max-h-[90vh] w-full max-w-4xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-8 py-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="admin-eyebrow mb-2 px-3 py-1 text-xs">
                    <History size={12} /> Lịch sử hoạt động
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">
                    {selectedUser?.fullName}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {selectedUser?.email} • ID: {selectedUser?.userId}
                  </p>
                </div>
                <button
                  onClick={handleCloseActivityLog}
                  className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto custom-scrollbar p-8" style={{ maxHeight: 'calc(90vh - 180px)' }}>
              {activityLogLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="animate-spin text-blue-600" size={40} />
                </div>
              ) : activityLogData && activityLogData.items.length > 0 ? (
                <div className="space-y-3">
                  {activityLogData.items.map((log) => (
                    <div
                      key={log.logId}
                      className="admin-muted-card flex items-start gap-4 p-5 transition hover:border-slate-200 hover:bg-white"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                        <Database size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`${getActionColor(
                                  log.action
                                )}`}
                              >
                                {log.action}
                              </span>
                              <span className="text-sm font-bold text-slate-900">
                                {log.tableName}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-slate-600">
                              Record ID: <span className="font-semibold">{log.recordId}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                            <Clock size={12} />
                            {formatVietnameseDateTime(log.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center">
                  <History size={48} className="mx-auto mb-4 text-slate-300" />
                  <p className="text-lg font-black text-slate-400">
                    Chưa có lịch sử hoạt động
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-400">
                    Người dùng này chưa có hoạt động nào được ghi nhận.
                  </p>
                </div>
              )}
            </div>

            {/* Footer with Pagination */}
            {activityLogData && activityLogData.totalPages > 1 && (
              <div className="sticky bottom-0 border-t border-slate-100 bg-white px-8 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-500">
                    Trang {activityLogPage} / {activityLogData.totalPages} • Tổng:{' '}
                    {activityLogData.totalCount} hoạt động
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const newPage = Math.max(1, activityLogPage - 1);
                        setActivityLogPage(newPage);
                        if (selectedUser) void fetchActivityLog(selectedUser.userId, newPage);
                      }}
                      disabled={activityLogPage <= 1}
                      className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    {activityLogPaginationRange.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setActivityLogPage(p);
                          if (selectedUser) void fetchActivityLog(selectedUser.userId, p);
                        }}
                        className={`min-w-[2.25rem] rounded-xl px-3 py-2 text-sm font-bold transition ${
                          p === activityLogPage
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const newPage = Math.min(activityLogData.totalPages, activityLogPage + 1);
                        setActivityLogPage(newPage);
                        if (selectedUser) void fetchActivityLog(selectedUser.userId, newPage);
                      }}
                      disabled={activityLogPage >= activityLogData.totalPages}
                      className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;


