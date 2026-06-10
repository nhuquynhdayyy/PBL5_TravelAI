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
  Loader2,
  MapPinned,
  RefreshCw,
  ShoppingBag,
  Store,
  Users,
} from 'lucide-react';
import { formatVietnameseDate, formatVietnameseDateShort } from '../../utils/dateTimeUtils';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

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
  paid: 'admin-badge-success',
  pending: 'admin-badge-warning',
  cancelled: 'admin-badge-danger',
  refunded: 'admin-badge-neutral',
};

const statusColors: Record<string, string> = {
  paid: '#34d399',
  pending: '#fbbf24',
  cancelled: '#fb7185',
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
      alert('Không thể tải thống kê hệ thống lúc này.');
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
      label: 'Tổng khách hàng',
      value: currencyFormatter.format(stats?.totalUsers ?? 0),
      icon: <Users size={22} />,
      shell: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Tổng đối tác',
value: currencyFormatter.format(stats?.totalPartners ?? 0),
      icon: <Store size={22} />,
      shell: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Tổng booking',
      value: currencyFormatter.format(stats?.totalBookings ?? 0),
      icon: <ShoppingBag size={22} />,
      shell: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Tổng doanh thu',
      value: `${currencyFormatter.format(stats?.totalRevenue ?? 0)} VND`,
      icon: <DollarSign size={22} />,
      shell: 'bg-blue-50 text-blue-600',
    },
  ];

  return (
    <div className="admin-page">
      <AdminPageHeader
        eyebrow="Tổng quan hệ thống"
        title="Thống kê"
        description="Theo dõi doanh thu, đơn đặt dịch vụ và hoạt động tổng quan của hệ thống."
        actionLabel="Tải lại"
        actionIcon={<RefreshCw size={18} />}
        onAction={() => void fetchStats()}
      />

      {loading ? (
        <div className="flex justify-center py-28">
          <Loader2 className="animate-spin text-blue-600" size={44} />
        </div>
      ) : (
        <>
          <div className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {overviewCards.map((card) => (
              <div
                key={card.label}
                className="admin-card p-6"
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
<div className="admin-card p-6 sm:p-8">
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    30 ngày gần nhất
                  </p>
                  <h2 className="text-2xl font-black text-slate-900">Dòng doanh thu hệ thống</h2>
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
                      labelFormatter={(value: number | string) => `Ngày ${value}`}
                    />
                    <Bar dataKey="revenue" fill="#2563eb" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="admin-card p-6 sm:p-8">
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Vận hành booking
                  </p>
                  <h2 className="text-2xl font-black text-slate-900">Trạng thái booking</h2>
                </div>
                <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
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
                          payload?.payload?.status ?? 'Trạng thái',
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  {statusChartData.map((item) => (
                    <div
                      key={item.status}
                      className="admin-muted-card px-4 py-3"
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
                        Giá trị: {currencyFormatter.format(item.amount)} VND
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8 grid gap-6 xl:grid-cols-[1.05fr_1.35fr]">
            <div className="admin-card p-6 sm:p-8">
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Xếp hạng theo booking
                  </p>
                  <h2 className="text-2xl font-black text-slate-900">Điểm đến nổi bật</h2>
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
                            return [`${currencyFormatter.format(Number(value))} booking`, 'Số booking'];
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
                  <p className="font-medium text-slate-500">Chưa có dữ liệu điểm đến từ booking trong hệ thống.</p>
                </div>
              )}
            </div>

            <div className="admin-card overflow-hidden">
              <div className="border-b border-slate-100 px-6 py-5">
                <h2 className="text-2xl font-black text-slate-900">Booking gần đây</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Giao dịch mới nhất để admin theo dõi tình hình vận hành.
                </p>
              </div>

              {stats?.recentBookings.length ? (
                <div className="overflow-x-auto">
                  <table className="admin-table">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/80">
                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">
                          Khách hàng
                        </th>
                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">
                          Dịch vụ
                        </th>
                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">
                          Booking
                        </th>
                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">
                          Giá trị
                        </th>
                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">
Trạng thái
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
                                {booking.primaryServiceName || 'Không có dịch vụ'}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                {booking.primaryDestinationName || 'Chưa gắn điểm đến'}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-900">#{booking.bookingId}</p>
                              <p className="mt-1 text-sm text-slate-500">
                                {booking.itemCount} mục • {formatVietnameseDate(booking.createdAt)}
                              </p>
                            </td>
                            <td className="px-6 py-4 text-sm font-black text-cyan-700">
                              {currencyFormatter.format(booking.totalAmount)} VND
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`admin-badge ${
                                  statusStyles[normalizedStatus] ?? 'admin-badge-neutral'
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
                  <p className="font-medium text-slate-500">Chưa có booking nào trong hệ thống.</p>
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


