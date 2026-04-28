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
} from 'lucide-react';

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

type RoleTab = 'customer' | 'partner';

const TABS: { key: RoleTab; label: string; icon: React.ReactNode; color: string; activeColor: string }[] = [
  {
    key: 'customer',
    label: 'Khach hang',
    icon: <Users size={14} />,
    color: 'bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 hover:text-slate-900',
    activeColor: 'bg-slate-900 text-white shadow-lg',
  },
  {
    key: 'partner',
    label: 'Doi tac',
    icon: <Store size={14} />,
    color: 'bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 hover:text-slate-900',
    activeColor: 'bg-slate-900 text-white shadow-lg',
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

  const fetchUsers = useCallback(async (currentPage: number, keyword: string, role: string) => {
    try {
      setLoading(true);
      const response = await axiosClient.get('/admin/users', {
        params: { page: currentPage, search: keyword, role },
      });
      setData(response.data);
    } catch (error) {
      console.error(error);
      alert('Khong the tai danh sach nguoi dung.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers(page, searchQuery, activeTab);
  }, [page, searchQuery, activeTab, fetchUsers]);

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
      alert(error.response?.data?.message ?? 'Khong the cap nhat trang thai nguoi dung.');
    } finally {
      setActionLoading(null);
    }
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

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-indigo-700">
            <Users size={14} /> Quan ly nguoi dung
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">
            QUAN LY NGUOI DUNG
          </h1>
          <p className="mt-3 max-w-3xl font-medium text-slate-500">
            Xem danh sach, tim kiem va khoa/mo khoa tai khoan nguoi dung tren he thong.
          </p>
        </div>

        <button
          onClick={() => void fetchUsers(page, searchQuery, activeTab)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black text-white shadow-lg transition-all hover:bg-indigo-600 active:scale-95"
        >
          <RefreshCw size={18} /> Tai lai
        </button>
      </div>

      {/* Tabs + Search */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-3">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-black transition ${
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
            placeholder="Tim theo ten hoac email..."
            className="w-full rounded-full border-2 border-slate-100 bg-white py-3 pl-11 pr-28 font-semibold text-slate-700 outline-none transition focus:border-indigo-400"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-indigo-600 px-5 py-2 text-sm font-black text-white transition hover:bg-indigo-700"
          >
            Tim kiem
          </button>
        </form>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
        </div>
      ) : (
        <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">
                    {activeTab === 'customer' ? 'Khach hang' : 'Doi tac'}
                  </th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">
                    Lien he
                  </th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">
                    Ngay tao
                  </th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">
                    Trang thai
                  </th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 text-right">
                    Hanh dong
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
                          Khong tim thay {activeTab === 'customer' ? 'khach hang' : 'doi tac'} nao
                        </p>
                        <p className="mt-2 text-sm font-medium text-slate-400">
                          Thu thay doi tu khoa tim kiem.
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
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-black text-white shadow-sm">
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
                        {formatDate(user.createdAt)}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-widest ${
                            user.isActive
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {user.isActive ? (
                            <>
                              <ShieldCheck size={12} /> Active
                            </>
                          ) : (
                            <>
                              <ShieldOff size={12} /> Banned
                            </>
                          )}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => void handleToggleActive(user)}
                          disabled={actionLoading === user.userId}
                          className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black shadow-sm transition active:scale-95 disabled:opacity-60 ${
                            user.isActive
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          {actionLoading === user.userId ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : user.isActive ? (
                            <ShieldOff size={14} />
                          ) : (
                            <ShieldCheck size={14} />
                          )}
                          {user.isActive ? 'Khoa' : 'Mo khoa'}
                        </button>
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
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"
                >
                  <ChevronLeft size={18} />
                </button>
                {paginationRange.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`min-w-[2.25rem] rounded-xl px-3 py-2 text-sm font-bold transition ${
                      p === page
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
    </div>
  );
};

export default AdminUsers;
