// src/pages/Profile/Profile.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Phone, ShieldCheck, LogOut, Edit3, Loader2, Settings2, Save, X,
  Camera, QrCode, Ticket, Ban, Package, ChevronRight, Calendar, MapPin,
  Sparkles, Wallet, Zap, Lock, CreditCard, Bell, Globe, Heart, History
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { formatVietnameseDate, formatVietnameseCurrency } from '../../utils/dateTimeUtils';

// --- TYPES & INTERFACES ---
type BookingStatus = number | string;

type ProfileBookingQr = {
  bookingCode: string;
  bookingId: number;
  serviceName: string;
};

type ProfileTicket = {
  ticketId: number;
  ticketCode: string;
  serviceName: string;
  travelDate: string;
  status: string;
};

type ProfileBooking = {
  bookingId: number;
  serviceName: string;
  checkInDate: string;
  totalAmount: number;
  status: BookingStatus;
  paymentMethod: string | null;
  bookingQr?: ProfileBookingQr | null;
  tickets?: ProfileTicket[];
};

// --- HELPER FUNCTIONS ---
const bookingStatusMap: Record<string, number> = {
  pending: 1,
  paid: 2,
  refunded: 3,
  cancelled: 4,
};

function resolveBookingStatus(status: BookingStatus) {
  if (typeof status === 'number') return status;
  return bookingStatusMap[status.toLowerCase()] ?? 0;
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/**
 * Hàm chuẩn hóa dữ liệu User từ API và LocalStorage
 * Giúp tránh lỗi khi Backend trả về camelCase hoặc PascalCase
 */
function normalizeUserProfile(apiData: any) {
  const data = apiData?.data ?? apiData ?? {};
  const storedUser = getStoredUser() ?? {};

  return {
    ...storedUser,
    ...data,
    fullName: data.fullName ?? data.FullName ?? storedUser.fullName ?? storedUser.FullName ?? 'Người dùng',
    email: data.email ?? data.Email ?? storedUser.email ?? storedUser.Email ?? '',
    phone: data.phone ?? data.Phone ?? storedUser.phone ?? storedUser.Phone ?? '',
    roleName: data.roleName ?? data.RoleName ?? storedUser.roleName ?? storedUser.RoleName ?? 'Customer',
    avatarUrl: data.avatarUrl ?? data.AvatarUrl ?? storedUser.avatarUrl ?? storedUser.AvatarUrl ?? '',
    createdAt: data.createdAt ?? data.CreatedAt ?? storedUser.createdAt ?? storedUser.CreatedAt ?? null,
  };
}

const Profile: React.FC = () => {
  // --- STATE MANAGEMENT ---
  const [profile, setProfile] = useState<any>(null);
  const [userPref, setUserPref] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'itineraries' | 'bookings' | 'preferences' | 'settings'>('itineraries');

  const [editData, setEditData] = useState({ fullName: '', phone: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const [myTrips, setMyTrips] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<ProfileBooking[]>([]);

  const navigate = useNavigate();
  const API_BASE_URL = (axiosClient.defaults.baseURL || 'http://localhost:5134/api').replace('/api', '');
  const isCustomer = (profile?.roleName ?? 'Customer').toLowerCase() === 'customer';

  // --- EFFECT: FETCH DATA ---
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Gọi đồng thời 4 API quan trọng nhất của Profile
      const [profileRes, prefRes, tripsRes, bookingsRes] = await Promise.all([
        axiosClient.get('/users/me'),
        axiosClient.get('/preferences').catch(() => ({ data: { data: null } })),
        axiosClient.get('/itinerary/my-trips').catch(() => ({ data: { data: [] } })),
        axiosClient.get('/bookings/my-bookings').catch(() => ({ data: [] }))
      ]);

      const userData = normalizeUserProfile(profileRes.data);
      setProfile(userData);
      setEditData({ fullName: userData.fullName, phone: userData.phone || '' });

      if (userData.avatarUrl) {
        setPreviewUrl(`${API_BASE_URL}${userData.avatarUrl}`);
      }

      setUserPref(prefRes.data?.data ?? prefRes.data ?? null);
      setMyTrips(tripsRes.data?.data ?? tripsRes.data ?? []);
      setMyBookings(bookingsRes.data?.data ?? bookingsRes.data ?? []);
    } catch (err) {
      console.error("Lỗi lấy dữ liệu Profile:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLERS ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpdate = async () => {
    if (!editData.fullName.trim()) {
      alert("Họ và tên không được để trống.");
      return;
    }
    setSaving(true);
    const formData = new FormData();
    formData.append('fullName', editData.fullName);
    formData.append('phone', editData.phone);
    if (selectedFile) formData.append('avatar', selectedFile);

    try {
      const response = await axiosClient.put('/users/update-profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        // Cập nhật LocalStorage để Header đồng bộ
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userData = JSON.parse(userStr);
          userData.fullName = editData.fullName;
          const newAvatar = response.data.avatarUrl || response.data.AvatarUrl;
          if (newAvatar) userData.avatarUrl = newAvatar;
          localStorage.setItem('user', JSON.stringify(userData));
        }
        alert("Cập nhật thành công!");
        await fetchData();
        window.dispatchEvent(new Event("userUpdated"));
      }
    } catch (err) {
      alert("Cập nhật thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
    window.location.reload();
  };

  const handleOpenTrip = async (itineraryId: number) => {
    try {
      const detail = await axiosClient.get(`/itinerary/${itineraryId}`);
      const detailData = detail.data?.data || detail.data;
      navigate('/itinerary/latest', { state: { data: detailData } });
    } catch (err) {
      alert('Không thể tải lại lịch trình.');
    }
  };

  // Các biến tính toán cho Dashboard Booking (từ nhánh main)
  const activeBookings = myBookings.filter((b) => resolveBookingStatus(b.status) === 2);
  const cancelledBookings = myBookings.filter((b) => resolveBookingStatus(b.status) === 4);
  const electronicTicketCount = myBookings.reduce((total, b) => total + (b.tickets?.length ?? 0), 0);
  const bookingQrCount = myBookings.filter((b) =>
    resolveBookingStatus(b.status) === 1 &&
    String(b.paymentMethod ?? '').toLowerCase() === 'counter' &&
    b.bookingQr
  ).length;

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="animate-spin text-blue-500 size-12 mx-auto mb-4" />
        <p className="text-slate-500 font-bold animate-pulse">Đang tải hồ sơ của bạn...</p>
      </div>
    </div>
  );

  return (
    <div className="bg-slate-50/50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* TOP BANNER */}
        <div className="relative h-48 sm:h-56 w-full rounded-[2.5rem] overflow-hidden shadow-2xl mb-10 bg-gradient-to-br from-blue-700 via-indigo-600 to-purple-700">
          <div className="absolute inset-0 bg-black/5"></div>
          <div className="absolute top-10 right-10 size-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-8 left-10 text-white z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl"><User size={20} /></div>
              <span className="text-xs font-black uppercase tracking-[0.2em] opacity-80">Hồ sơ tài khoản</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter">Chào mừng, {profile?.fullName?.split(' ').pop()}!</h1>
            <p className="text-blue-100 text-sm mt-2 font-medium opacity-90 max-w-md">Quản lý chuyến đi, dịch vụ đã đặt và tùy chỉnh trải nghiệm AI của bạn tại đây.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* LEFT PANEL: SIDEBAR */}
          <div className="lg:col-span-4 sticky top-24">
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
              {/* Profile Overview */}
              <div className="flex flex-col items-center text-center pb-8 border-b border-slate-50">
                <div className="relative group size-32 mb-5">
                  <div className="size-full rounded-full bg-slate-100 overflow-hidden ring-[6px] ring-indigo-50 shadow-inner flex items-center justify-center">
                    {previewUrl ? (
                      <img src={previewUrl} className="size-full object-cover transition-transform group-hover:scale-110 duration-500" alt="Avatar" />
                    ) : (
                      <User size={60} className="text-slate-300" />
                    )}
                  </div>
                  {activeTab === 'settings' && (
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm">
                      <Camera size={24} />
                      <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                    </label>
                  )}
                </div>

                <h2 className="text-xl font-black text-slate-900 tracking-tight">{profile?.fullName}</h2>
                <div className="flex items-center gap-1.5 text-slate-400 mt-1">
                  <Mail size={14} />
                  <span className="text-xs font-bold">{profile?.email}</span>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white text-[10px] font-black rounded-full uppercase tracking-wider shadow-lg shadow-indigo-100">
                    <ShieldCheck size={12} /> {profile?.roleName}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-slate-100 text-slate-500 text-[10px] font-black rounded-full uppercase">
                    <Calendar size={12} /> {profile?.createdAt ? formatVietnameseDate(profile.createdAt) : 'Mới'}
                  </span>
                </div>
              </div>

              {/* Sidebar Menu */}
              <div className="py-8 space-y-2">
                {[
                  { id: 'itineraries', icon: MapPin, label: 'Lịch trình đã lưu', count: myTrips.length, color: 'blue' },
                  { id: 'bookings', icon: CreditCard, label: 'Dịch vụ & Vé của tôi', color: 'emerald' },
                  { id: 'preferences', icon: Sparkles, label: 'Sở thích du lịch', color: 'purple' },
                  { id: 'settings', icon: Settings2, label: 'Cài đặt tài khoản', color: 'slate' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black transition-all duration-300 ${activeTab === item.id
                      ? 'bg-slate-900 text-white shadow-xl translate-x-2'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                  >
                    <item.icon size={18} className={activeTab === item.id ? 'text-blue-400' : ''} />
                    <span>{item.label}</span>
                    {item.count !== undefined && (
                      <span className={`ml-auto px-2 py-0.5 rounded-lg text-[10px] ${activeTab === item.id ? 'bg-white/20' : 'bg-slate-100 text-slate-400'}`}>
                        {item.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-4 px-5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl font-black transition-all duration-200 text-xs uppercase tracking-widest border border-rose-100"
              >
                <LogOut size={16} /> Đăng xuất ngay
              </button>
            </div>
          </div>

          {/* RIGHT PANEL: MAIN CONTENT */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8 sm:p-10 min-h-[600px]">

              {/* TAB 1: ITINERARIES */}
              {activeTab === 'itineraries' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-8">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
                        <MapPin className="text-blue-500" /> LỊCH TRÌNH ĐÃ LƯU
                      </h2>
                      <p className="text-sm text-slate-400 font-bold mt-1">Nơi lưu trữ các hành trình du lịch bạn đã tạo.</p>
                    </div>
                    <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-2xl font-black text-xs">
                      {myTrips.length} TRIPS
                    </div>
                  </div>

                  {myTrips.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {myTrips.map((trip, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleOpenTrip(trip.itineraryId || trip.ItineraryId)}
                          className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-blue-100 transition-all cursor-pointer relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight size={20} className="text-blue-500 transform translate-x-[-10px] group-hover:translate-x-0 transition-transform" />
                          </div>
                          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl w-fit mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <MapPin size={22} />
                          </div>
                          <h3 className="font-black text-slate-800 text-lg line-clamp-2 leading-tight mb-4 group-hover:text-blue-600 transition-colors">
                            {trip.tripTitle || trip.TripTitle}
                          </h3>
                          <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                            <div className="flex items-center gap-1.5 text-slate-400 font-black text-[10px] uppercase">
                              <Calendar size={12} /> {formatVietnameseDate(trip.createdAt || trip.CreatedAt)}
                            </div>
                            <div className="text-sm font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                              {formatVietnameseCurrency(trip.totalEstimatedCost || 0)}₫
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-24 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                      <MapPin size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400 font-black tracking-tight">Bạn chưa có lịch trình nào được lưu.</p>
                      <button onClick={() => navigate('/destinations')} className="mt-5 text-blue-600 font-black text-sm hover:underline">Tạo lịch trình ngay →</button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: BOOKINGS (Dashboard mới) */}
              {activeTab === 'bookings' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="border-b border-slate-100 pb-6 mb-8">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
                      <CreditCard className="text-emerald-500" /> DỊCH VỤ CỦA TÔI
                    </h2>
                    <p className="text-sm text-slate-400 font-bold mt-1">Quản lý vé, booking và mã check-in QR của bạn.</p>
                  </div>

                  {isCustomer ? (
                    <div className="space-y-8">
                      {/* Thống kê nhanh */}
                      <div className="bg-slate-50/70 p-8 rounded-[2.5rem] border border-slate-100">
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Tổng quan dịch vụ</p>
                            <h3 className="text-2xl font-black tracking-tighter mt-1">Booking, Vé và QR</h3>
                          </div>
                          <button onClick={() => navigate('/my-bookings')} className="bg-slate-900 hover:bg-black text-white px-6 py-2.5 rounded-full text-xs font-black shadow-xl transition-all active:scale-95">
                            XEM CHI TIẾT
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {[
                            { label: 'Đã đặt', count: activeBookings.length, icon: Package, color: 'emerald', link: '/my-bookings?filter=paid' },
                            { label: 'Đã hủy', count: cancelledBookings.length, icon: Ban, color: 'rose', link: '/my-bookings?filter=cancelled' },
                            { label: 'Vé điện tử', count: electronicTicketCount, icon: Ticket, color: 'blue', link: '/my-bookings?filter=tickets' },
                            { label: 'Mã QR', count: bookingQrCount, icon: QrCode, color: 'amber', link: '/my-bookings?filter=bookingQr' }
                          ].map((item, i) => (
                            <button
                              key={i}
                              onClick={() => navigate(item.link)}
                              className="bg-white p-6 rounded-3xl text-left shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
                            >
                              <div className={`size-12 rounded-2xl bg-${item.color}-50 text-${item.color}-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                <item.icon size={24} />
                              </div>
                              <p className="text-3xl font-black text-slate-900">{item.count}</p>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{item.label}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Khám phá thêm nếu trống */}
                      {myBookings.length === 0 && (
                        <div className="p-10 border-2 border-dashed border-slate-200 rounded-[2rem] text-center">
                          <p className="text-slate-400 font-bold">Bạn chưa có đặt chỗ nào.</p>
                          <button onClick={() => navigate('/hotels')} className="text-blue-600 font-black mt-3 hover:underline">Tìm khách sạn & Tour →</button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-20 text-center">
                      <Lock size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400 font-bold italic">Tính năng này chỉ dành cho tài khoản khách hàng.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: AI PREFERENCES */}
              {activeTab === 'preferences' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="border-b border-slate-100 pb-6 mb-8">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
                      <Sparkles className="text-purple-500" /> SỞ THÍCH DU LỊCH
                    </h2>
                    <p className="text-sm text-slate-400 font-bold mt-1">AI sử dụng các tùy chọn này để gợi ý lịch trình phù hợp nhất.</p>
                  </div>

                  {userPref ? (
                    <div className="bg-gradient-to-br from-indigo-50/50 to-white p-8 rounded-[2.5rem] border border-indigo-50 relative overflow-hidden">
                      <Sparkles size={120} className="absolute -right-5 -bottom-5 text-indigo-100/30 rotate-12" />

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 relative z-10">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                          <div className="flex items-center gap-2 text-blue-500 mb-3"><Sparkles size={16} /><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phong cách</span></div>
                          <p className="text-lg font-black text-slate-800">{userPref.travelStyle || "Tự do"}</p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                          <div className="flex items-center gap-2 text-orange-500 mb-3"><Zap size={16} /><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nhịp độ</span></div>
                          <p className="text-lg font-black text-slate-800">{userPref.travelPace === 0 ? "Thong thả" : userPref.travelPace === 1 ? "Cân bằng" : "Nhanh"}</p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                          <div className="flex items-center gap-2 text-emerald-500 mb-3"><Wallet size={16} /><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ngân sách</span></div>
                          <p className="text-lg font-black text-slate-800">{userPref.budgetLevel === 0 ? "Tiết kiệm" : "Cao cấp"}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => navigate('/preferences')}
                        className="mt-8 bg-white border-2 border-indigo-100 text-indigo-600 px-8 py-3 rounded-2xl font-black text-xs hover:bg-indigo-600 hover:text-white transition-all shadow-lg shadow-indigo-100/50"
                      >
                        CẬP NHẬT SỞ THÍCH
                      </button>
                    </div>
                  ) : (
                    <div className="py-24 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                      <Sparkles size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400 font-black">AI chưa biết sở thích của bạn.</p>
                      <button onClick={() => navigate('/preferences')} className="mt-5 text-indigo-600 font-black text-sm hover:underline">Thiết lập ngay →</button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: SETTINGS */}
              {activeTab === 'settings' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="border-b border-slate-100 pb-6 mb-8">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
                      <Settings2 className="text-slate-500" /> CÀI ĐẶT TÀI KHOẢN
                    </h2>
                    <p className="text-sm text-slate-400 font-bold mt-1">Thay đổi thông tin liên hệ và ảnh đại diện của bạn.</p>
                  </div>

                  <div className="space-y-6 max-w-2xl">
                    {/* Form Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Họ và tên</label>
                        <div className="relative">
                          <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all outline-none"
                            value={editData.fullName}
                            onChange={e => setEditData({ ...editData, fullName: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số điện thoại</label>
                        <div className="relative">
                          <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all outline-none"
                            value={editData.phone}
                            onChange={e => setEditData({ ...editData, phone: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">Địa chỉ Email <Lock size={12} /></label>
                      <div className="bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl text-slate-400 font-bold flex justify-between items-center opacity-70">
                        {profile?.email} <Lock size={16} />
                      </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100 flex justify-end gap-3">
                      <button
                        onClick={() => { fetchData(); setSelectedFile(null); }}
                        className="px-8 py-3.5 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs hover:bg-slate-200 transition-all"
                      >
                        HỦY BỎ
                      </button>
                      <button
                        onClick={handleUpdate}
                        disabled={saving}
                        className="px-10 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-xs shadow-xl shadow-blue-200 hover:bg-blue-700 disabled:bg-slate-300 transition-all flex items-center gap-2"
                      >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {saving ? "ĐANG LƯU..." : "LƯU THAY ĐỔI"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;