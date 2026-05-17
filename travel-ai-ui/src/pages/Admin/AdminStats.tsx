import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  DollarSign,
  Globe2,
  Loader2,
  MapPinned,
  RefreshCw,
  ShoppingBag,
  Store,
  Users,
} from 'lucide-react';
import { formatVietnameseDate, formatVietnameseDateShort } from '../../utils/dateTimeUtils';

type TopDestination = {
  destinationId: number;
  name: string;
  bookingCount: number;
  revenue: number;
};

type RecentBooking = {
  bookingId: number;
  customerName: string;
  customerEmail: string;
  status: string;
  totalAmount: number;
  itemCount: number;
  primaryServiceName?: string | null;
  primaryDestinationName?: string | null;
  createdAt: string;
};

type DailyRevenue = {
  date: string;
  revenue: number;
};

type BookingStatusBreakdown = {
  status: string;
  count: number;
  amount: number;
};

type AdminStatsResponse = {
  totalUsers: number;
  totalPartners: number;
  totalBookings: number;
  totalRevenue: number;
  topDestinations: TopDestination[];
  bookingStatusBreakdown: BookingStatusBreakdown[];
  recentBookings: RecentBooking[];
  revenueByDay: DailyRevenue[];
};

const currencyFormatter = new Intl.NumberFormat('vi-VN');

const statusStyles: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-rose-100 text-rose-700',
  refunded: 'bg-slate-200 text-slate-700',
};

const statusColors: Record<string, string> = {
  paid: '#10b981',
  pending: '#f59e0b',
  cancelled: '#f43f5e',
  refunded: '#64748b',
};

const AdminStats = () => {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get('/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error(error);
      alert('Khong the tai thong ke he thong luc nay.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStats();
  }, []);

  const revenueChartData = (stats?.revenueByDay ?? []).map((item) => ({
    ...item,
    label: formatVietnameseDateShort(item.date)
  }));

  const statusChartData = (stats?.bookingStatusBreakdown ?? []).map((item) => ({
    ...item,
    normalizedStatus: item.status.toLowerCase(),
    fill: statusColors[item.status.toLowerCase()] ?? '#94a3b8',
  }));

  const destinationChartData = (stats?.topDestinations ?? [])
    .map((item) => ({
      ...item,
      shortName: item.name.length > 18 ? `${item.name.slice(0, 18)}...` : item.name,
    }))
    .reverse();

  const overviewCards = [
    {
      label: 'Tong khach hang',
      value: currencyFormatter.format(stats?.totalUsers ?? 0),
      icon: <Users size={22} />,
      shell: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Tong doi tac',
value: currencyFormatter.format(stats?.totalPartners ?? 0),
      icon: <Store size={22} />,
      shell: 'bg-orange-50 text-orange-600',
    },
    {
      label: 'Tong booking',
      value: currencyFormatter.format(stats?.totalBookings ?? 0),
      icon: <ShoppingBag size={22} />,
      shell: 'bg-violet-50 text-violet-600',
    },
    {
      label: 'Tong doanh thu',
      value: `${currencyFormatter.format(stats?.totalRevenue ?? 0)} VND`,
      icon: <DollarSign size={22} />,
      shell: 'bg-emerald-50 text-emerald-600',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-cyan-50 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-700">
            <Globe2 size={14} /> Admin control tower
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">
            TONG QUAN HE THONG
          </h1>
          <p className="mt-3 max-w-3xl font-medium text-slate-500">
            Dashboard van hanh danh cho admin: theo doi giao dich, phan bo booking va diem den dang tao doanh thu.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchStats()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black text-white shadow-lg transition-all hover:bg-cyan-600 active:scale-95"
        >
          <RefreshCw size={18} /> Tai lai
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-28">
          <Loader2 className="animate-spin text-cyan-600" size={44} />
        </div>
      ) : (
        <>
          <div className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {overviewCards.map((card) => (
              <div
                key={card.label}
                className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    {card.label}
                  </span>
                  <div className={`flex size-11 items-center justify-center rounded-2xl ${card.shell}`}>
                    {card.icon}
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900">{card.value}</div>
              </div>
            ))}
          </div>

          <div className="mb-8 grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
<div className="rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    30 ngay gan nhat
                  </p>
                  <h2 className="text-2xl font-black text-slate-900">Dong doanh thu he thong</h2>
                </div>
                <div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
                  <Activity size={24} />
                </div>
              </div>

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueChartData} barCategoryGap={10}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      tickFormatter={(value: number) => `${Math.round(Number(value) / 1000000)}m`}
                    />
                    <Tooltip
                      cursor={{ fill: '#f1f5f9' }}
                      formatter={(value: number | string) => [
                        `${currencyFormatter.format(Number(value))} VND`,
                        'Doanh thu',
                      ]}
                      labelFormatter={(value: number | string) => `Ngay ${value}`}
                    />
                    <Bar dataKey="revenue" fill="#06b6d4" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Van hanh booking
                  </p>
                  <h2 className="text-2xl font-black text-slate-900">Trang thai booking</h2>
                </div>
                <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                  <ShoppingBag size={24} />
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] xl:grid-cols-1">
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        dataKey="count"
                        nameKey="status"
                        innerRadius={58}
                        outerRadius={88}
paddingAngle={3}
                      >
                        {statusChartData.map((item) => (
                          <Cell key={item.status} fill={item.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number | string, _name, payload) => [
                          `${currencyFormatter.format(Number(value))} booking`,
                          payload?.payload?.status ?? 'Trang thai',
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  {statusChartData.map((item) => (
                    <div
                      key={item.status}
                      className="rounded-[1.5rem] border border-slate-100 bg-slate-50 px-4 py-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex size-3 rounded-full"
                            style={{ backgroundColor: item.fill }}
                          />
                          <p className="text-sm font-black text-slate-900">{item.status}</p>
                        </div>
                        <p className="text-sm font-black text-slate-900">{item.count}</p>
                      </div>
                      <p className="text-xs font-semibold text-slate-500">
                        Gia tri: {currencyFormatter.format(item.amount)} VND
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8 grid gap-6 xl:grid-cols-[1.05fr_1.35fr]">
            <div className="rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Xep hang theo booking
                  </p>
                  <h2 className="text-2xl font-black text-slate-900">Top destinations</h2>
                </div>
                <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <MapPinned size={24} />
                </div>
              </div>

              {destinationChartData.length ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={destinationChartData} layout="vertical" margin={{ left: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis
                        type="number"
tick={{ fontSize: 12, fill: '#64748b' }}
                        tickFormatter={(value: number) => `${Math.round(Number(value))}`}
                      />
                      <YAxis
                        type="category"
                        dataKey="shortName"
                        width={110}
                        tick={{ fontSize: 12, fill: '#475569' }}
                      />
                      <Tooltip
                        formatter={(value: number | string, name: string, payload) => {
                          if (name === 'bookingCount') {
                            return [`${currencyFormatter.format(Number(value))} booking`, 'So booking'];
                          }

                          return [
                            `${currencyFormatter.format(payload?.payload?.revenue ?? 0)} VND`,
                            'Doanh thu',
                          ];
                        }}
                      />
                      <Bar dataKey="bookingCount" fill="#2563eb" radius={[0, 10, 10, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                  <p className="font-medium text-slate-500">Chua co du lieu diem den tu booking trong he thong.</p>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <h2 className="text-2xl font-black text-slate-900">Recent bookings</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Giao dich moi nhat de admin theo doi tinh hinh van hanh.
                </p>
              </div>

              {stats?.recentBookings.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/80">
                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">
                          Khach hang
                        </th>
                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">
                          Dich vu
                        </th>
                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">
                          Booking
                        </th>
                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">
                          Gia tri
                        </th>
                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">
Trang thai
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentBookings.map((booking) => {
                        const normalizedStatus = booking.status.toLowerCase();
                        return (
                          <tr key={booking.bookingId} className="border-b border-slate-50 align-top">
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-900">{booking.customerName}</p>
                              <p className="mt-1 text-sm text-slate-500">{booking.customerEmail}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-900">
                                {booking.primaryServiceName || 'Khong co dich vu'}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                {booking.primaryDestinationName || 'Chua gan diem den'}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-900">#{booking.bookingId}</p>
                              <p className="mt-1 text-sm text-slate-500">
                                {booking.itemCount} muc • {formatVietnameseDate(booking.createdAt)}
                              </p>
                            </td>
                            <td className="px-6 py-4 text-sm font-black text-cyan-700">
                              {currencyFormatter.format(booking.totalAmount)} VND
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-widest ${
                                  statusStyles[normalizedStatus] ?? 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {booking.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-6 py-16 text-center">
                  <p className="font-medium text-slate-500">Chua co booking nao trong he thong.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminStats;
