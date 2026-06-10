import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, ShieldCheck, LogOut, Settings2, Save, Camera, QrCode, 
  ChevronRight, Calendar, MapPin, Loader2, Sparkles, Wallet, Zap, Lock, CreditCard
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { formatVietnameseDate, formatVietnameseCurrency } from '../../utils/dateTimeUtils';

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [userPref, setUserPref] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
 
  // State cho Form sửa
  const [editData, setEditData] = useState({ fullName: '', phone: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const navigate = useNavigate();
  const API_BASE_URL = (axiosClient.defaults.baseURL || 'http://localhost:5134/api').replace('/api', '');
  const [myTrips, setMyTrips] = useState<any[]>([]);

  // Tab state
  const [activeTab, setActiveTab] = useState<'itineraries' | 'bookings' | 'preferences' | 'settings'>('itineraries');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const profilePromise = axiosClient.get('/users/me').catch(e => {
        console.error("Profile error", e);
        return { error: e };
      });
      const prefPromise = axiosClient.get('/preferences').catch(e => {
        console.error("Preferences error", e);
        return { error: e };
      });
      const tripsPromise = axiosClient.get('/itinerary/my-trips').catch(e => {
        console.error("Trips error", e);
        return { error: e };
      });

      const [profileRes, prefRes, tripsRes] = await Promise.all([
        profilePromise,
        prefPromise,
        tripsPromise
      ]);

      if ('error' in profileRes) {
        const e = (profileRes as any).error;
        setErrorMsg(prev => prev + `[Profile API Error: ${e.message} (Status: ${e.response?.status}) - Data: ${JSON.stringify(e.response?.data)}] `);
      } else {
        let userData = profileRes.data;
        // Hỗ trợ nếu backend trả về bọc trong data field
        if (userData && userData.success && userData.data) {
          userData = userData.data;
        } else if (userData && userData.data && !userData.success) {
          userData = userData.data;
        }
        
        setProfile(userData);

        // Trích xuất các trường hỗ trợ cả camelCase và PascalCase
        const name = userData?.fullName || userData?.FullName || '';
        const phoneVal = userData?.phone || userData?.Phone || '';
        setEditData({ fullName: name, phone: phoneVal });
       
        // Nếu có avatar trong DB thì hiển thị full URL (hỗ trợ cả camelCase và PascalCase)
        const avatar = userData?.avatarUrl || userData?.AvatarUrl;
        if (avatar) {
          setPreviewUrl(`${API_BASE_URL}${avatar}`);
        } else {
          setPreviewUrl('');
        }
      }

      if ('error' in prefRes) {
        // Preferences error is fine
      } else {
        const prefData = prefRes.data?.data || prefRes.data;
        setUserPref(prefData);
      }

      if ('error' in tripsRes) {
        const e = (tripsRes as any).error;
        setErrorMsg(prev => prev + `[Trips API Error: ${e.message} (Status: ${e.response?.status}) - Data: ${JSON.stringify(e.response?.data)}] `);
      } else {
        const tripsData = tripsRes.data?.data || tripsRes.data || [];
        setMyTrips(Array.isArray(tripsData) ? tripsData : []);
      }
    } catch (err) {
      console.error("Lỗi lấy dữ liệu tổng hợp:", err);
      setErrorMsg(prev => prev + `[Fatal: ${err instanceof Error ? err.message : String(err)}]`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file)); // Xem trước ảnh ngay lập tức
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
        // 1. Lấy dữ liệu user hiện tại từ localStorage
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userData = JSON.parse(userStr);
         
          // 2. Cập nhật các thông tin mới vào object (hỗ trợ cả hai loại casing)
          if (userData.fullName !== undefined) userData.fullName = editData.fullName;
          if (userData.FullName !== undefined) userData.FullName = editData.fullName;
         
          // Cập nhật lại đường dẫn ảnh mới nếu có trong phản hồi từ server
          const newAvatar = response.data.avatarUrl || response.data.AvatarUrl;
          if (newAvatar) {
             if (userData.avatarUrl !== undefined) userData.avatarUrl = newAvatar;
             if (userData.AvatarUrl !== undefined) userData.AvatarUrl = newAvatar;
          }
 
          // 3. Lưu ngược lại vào localStorage để Header nhận diện được sự thay đổi
          localStorage.setItem('user', JSON.stringify(userData));
        }
 
        alert("Cập nhật thành công!");
        
        // Load lại dữ liệu để cập nhật UI tại trang Profile
        await fetchData();
 
        // Phát sự kiện userUpdated để Header đồng bộ ngay lập tức mà không cần reload
        window.dispatchEvent(new Event("userUpdated"));
      }
    } catch (err) {
      console.error(err);
      alert("Cập nhật thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      const name = profile.fullName || profile.FullName || '';
      const phoneVal = profile.phone || profile.Phone || '';
      setEditData({ fullName: name, phone: phoneVal });

      const avatar = profile.avatarUrl || profile.AvatarUrl;
      setPreviewUrl(avatar ? `${API_BASE_URL}${avatar}` : '');
      setSelectedFile(null);
    }
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (tab !== 'settings') {
      handleCancel();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('travelai_cart'); // Xóa cart trong memory
    navigate('/login');
    window.location.reload();
  };

  const handleOpenTrip = async (itineraryId: number) => {
    try {
      const detail = await axiosClient.get(`/itinerary/${itineraryId}`);
      // Lấy chi tiết lịch trình hỗ trợ cả camelCase và PascalCase
      const detailData = detail.data?.data || detail.data;
      navigate('/itinerary/latest', { state: { data: detailData } });
    } catch (err) {
      console.error('Loi lay chi tiet lich trinh:', err);
      alert('Không thể tải lại lịch trình lúc này.');
    }
  };

  if (loading) return (
    <div className="flex h-[60vh] items-center justify-center">
      <Loader2 className="animate-spin text-blue-500 size-10" />
    </div>
  );

  // Khai báo các biến an toàn hỗ trợ cả hai loại camelCase/PascalCase
  const displayName = profile?.fullName || profile?.FullName || "Người dùng";
  const displayEmail = profile?.email || profile?.Email || "";
  const displayRole = profile?.roleName || profile?.RoleName || "Customer";
  const displayPhone = profile?.phone || profile?.Phone || "Chưa cung cấp";
  const createdAtVal = profile?.createdAt || profile?.CreatedAt;

  return (
    <div className="bg-slate-50/40 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Cover Banner */}
        <div className="relative h-44 sm:h-52 w-full rounded-3xl overflow-hidden shadow-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 mb-8">
          <div className="absolute inset-0 bg-black/10"></div>
          {/* Decorative shapes */}
          <div className="absolute -top-12 -right-12 size-48 rounded-full bg-white/10 blur-2xl"></div>
          <div className="absolute -bottom-16 -left-16 size-64 rounded-full bg-white/10 blur-3xl"></div>
          <div className="absolute bottom-6 left-8 text-white z-10">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Hồ Sơ Cá Nhân</h1>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 font-medium">Quản lý thông tin tài khoản, sở thích cá nhân và lịch trình của bạn.</p>
          </div>
        </div>

        {/* Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Panel - Profile Sidebar Card */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 relative">
              {/* Profile Overview */}
              <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100">
                {/* Avatar with edit overlay */}
                <div className="relative group size-28 mb-4">
                  <div className="size-full rounded-full bg-slate-100 overflow-hidden ring-4 ring-indigo-50 flex items-center justify-center text-slate-300 shadow-md">
                    {previewUrl ? (
                      <img src={previewUrl} className="size-full object-cover transition-transform group-hover:scale-105 duration-300" alt="Avatar" />
                    ) : (
                      <User size={50} className="text-slate-300" />
                    )}
                  </div>
                  {/* Camera overlay - visible in settings tab */}
                  {activeTab === 'settings' && (
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Camera size={22} />
                      <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                    </label>
                  )}
                </div>

                <h2 className="text-lg font-bold text-slate-900 leading-snug">{displayName}</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{displayEmail}</p>

                {/* Role & Date joined badges */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-3.5">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    <ShieldCheck size={12} />
                    {displayRole}
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-50 border border-slate-100 text-slate-500 text-[10px] font-bold rounded-full">
                    Gia nhập: {createdAtVal ? formatVietnameseDate(createdAtVal) : '...'}
                  </span>
                </div>
              </div>

              {/* Navigation Menu */}
              <div className="py-6 space-y-1">
                <button
                  onClick={() => handleTabChange('itineraries')}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-xs font-bold transition-all duration-200 ${
                    activeTab === 'itineraries'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <MapPin size={16} />
                  <span>Lịch trình đã lưu</span>
                  <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-black ${
                    activeTab === 'itineraries' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {myTrips.length}
                  </span>
                </button>

                <button
                  onClick={() => handleTabChange('bookings')}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-xs font-bold transition-all duration-200 ${
                    activeTab === 'bookings'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <CreditCard size={16} />
                  <span>Dịch vụ & Vé của tôi</span>
                </button>

                <button
                  onClick={() => handleTabChange('preferences')}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-xs font-bold transition-all duration-200 ${
                    activeTab === 'preferences'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Sparkles size={16} />
                  <span>Sở thích du lịch AI</span>
                </button>

                <button
                  onClick={() => handleTabChange('settings')}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-xs font-bold transition-all duration-200 ${
                    activeTab === 'settings'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Settings2 size={16} />
                  <span>Cài đặt tài khoản</span>
                </button>
              </div>

              {/* Logout Button */}
              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 rounded-2xl font-bold transition-all duration-150 text-xs tracking-wider uppercase"
                >
                  <LogOut size={15} />
                  <span>Đăng xuất tài khoản</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel - Detailed Content Card */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8 min-h-[480px] flex flex-col">
              
              {/* Tab 1: Saved Itineraries */}
              {activeTab === 'itineraries' && (
                <div className="flex-grow flex flex-col">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Lịch Trình Đã Lưu</h2>
                      <p className="text-xs text-slate-400 mt-1 font-medium">Danh sách các hành trình du lịch bạn đã tạo và lưu lại.</p>
                    </div>
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full">
                      {myTrips.length} chuyến đi
                    </span>
                  </div>

                  {myTrips.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myTrips.map((trip, index) => (
                        <div
                          key={trip.itineraryId ?? trip.ItineraryId ?? index}
                          onClick={() => handleOpenTrip(trip.itineraryId || trip.ItineraryId)}
                          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer group flex flex-col justify-between min-h-[140px]"
                        >
                          <div>
                            <div className="flex items-start justify-between">
                              <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                                <MapPin size={18} />
                              </span>
                              <ChevronRight className="text-slate-400 group-hover:text-indigo-600 transition-all transform group-hover:translate-x-1 size-5" />
                            </div>
                            <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors mt-3 text-sm line-clamp-2 leading-snug">
                              {trip.tripTitle || trip.TripTitle}
                            </h3>
                          </div>

                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                            <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5">
                              <Calendar size={12} />
                              Vừa tạo
                            </span>
                            <span className="text-xs font-bold text-indigo-700 bg-indigo-50/70 px-2.5 py-1 rounded-lg">
                              {formatVietnameseCurrency(trip.totalEstimatedCost || trip.TotalEstimatedCost || 0)}₫
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-grow flex flex-col items-center justify-center text-center p-8 bg-slate-50/30 rounded-2xl border-2 border-dashed border-slate-200">
                      <div className="p-4 bg-white rounded-full shadow-sm text-slate-350 mb-4">
                        <MapPin size={32} />
                      </div>
                      <p className="text-slate-500 font-medium max-w-sm text-sm">Bạn chưa lưu lịch trình du lịch nào. Hãy bắt đầu lên lịch ngay!</p>
                      <button
                        onClick={() => navigate('/destinations')}
                        className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 hover:shadow-lg transition-all"
                      >
                        Khám phá ngay →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Bookings & Tickets */}
              {activeTab === 'bookings' && (
                <div className="flex-grow flex flex-col">
                  <div className="border-b border-slate-100 pb-5 mb-6">
                    <h2 className="text-lg font-bold text-slate-900">Dịch Vụ & Vé Của Tôi</h2>
                    <p className="text-xs text-slate-400 mt-1 font-medium">Truy cập lịch sử đặt dịch vụ và lấy mã QR vé điện tử nhanh.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Booked Services Card */}
                    <div className="bg-slate-50/50 hover:bg-slate-50/80 rounded-2xl border border-slate-100 p-6 flex flex-col justify-between transition-all group">
                      <div>
                        <div className="size-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
                          <CreditCard size={22} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 mt-4">Lịch Sử Đặt Dịch Vụ</h3>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                          Xem lại thông tin và tình trạng đặt chỗ đối với các khách sạn, tour du lịch hoặc phương tiện di chuyển bạn đã đặt.
                        </p>
                      </div>
                      <button
                        onClick={() => navigate('/my-bookings')}
                        className="mt-6 w-full py-2.5 bg-white border border-slate-200 hover:border-blue-500 text-slate-700 hover:text-blue-600 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1"
                      >
                        <span>Danh sách dịch vụ</span>
                        <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>

                    {/* E-Tickets Card */}
                    <div className="bg-slate-50/50 hover:bg-slate-50/80 rounded-2xl border border-slate-100 p-6 flex flex-col justify-between transition-all group">
                      <div>
                        <div className="size-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
                          <QrCode size={22} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 mt-4">Vé Điện Tử & Check-in</h3>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                          Lấy mã QR check-in điện tử nhanh chóng để xuất trình khi sử dụng dịch vụ tại điểm đến.
                        </p>
                      </div>
                      <button
                        onClick={() => navigate('/my-bookings?tickets=1')}
                        className="mt-6 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-50/50 flex items-center justify-center gap-1.5"
                      >
                        <span>Mở vé điện tử</span>
                        <QrCode size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: AI Preferences */}
              {activeTab === 'preferences' && (
                <div className="flex-grow flex flex-col">
                  <div className="border-b border-slate-100 pb-5 mb-6">
                    <h2 className="text-lg font-bold text-slate-900">Sở Thích Du Lịch AI</h2>
                    <p className="text-xs text-slate-400 mt-1 font-medium">Các thiết lập sở thích cá nhân giúp AI thiết kế lịch trình tối ưu.</p>
                  </div>

                  {userPref ? (
                    <div className="space-y-6">
                      <div className="p-6 rounded-2xl border border-indigo-50 bg-gradient-to-br from-indigo-50/30 via-purple-50/20 to-white relative overflow-hidden">
                        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 text-indigo-100/30 pointer-events-none">
                          <Sparkles size={110} />
                        </div>
                        
                        <div className="flex justify-between items-center mb-6 z-10 relative">
                          <h3 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Cấu Hình Hành Trình</h3>
                          <span className="p-1.5 bg-white rounded-lg shadow-sm border border-indigo-50 text-indigo-500">
                            <Sparkles size={14} />
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 z-10 relative">
                          {/* Style */}
                          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100/80">
                            <div className="flex items-center gap-2 text-indigo-500 mb-2">
                              <Sparkles size={14} />
                              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Phong cách</span>
                            </div>
                            <p className="text-sm font-bold text-slate-800 line-clamp-1">
                              {userPref.travelStyle || userPref.TravelStyle}
                            </p>
                          </div>

                          {/* Pace */}
                          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100/80">
                            <div className="flex items-center gap-2 text-violet-500 mb-2">
                              <Zap size={14} />
                              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Nhịp độ</span>
                            </div>
                            <p className="text-sm font-bold text-slate-800">
                              {(userPref.travelPace === 0 || userPref.TravelPace === 0) ? "Thong thả" : 
                               (userPref.travelPace === 1 || userPref.TravelPace === 1) ? "Cân bằng" : "Dày đặc"}
                            </p>
                          </div>

                          {/* Budget */}
                          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100/80">
                            <div className="flex items-center gap-2 text-emerald-500 mb-2">
                              <Wallet size={14} />
                              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Ngân sách</span>
                            </div>
                            <p className="text-sm font-bold text-slate-800">
                              {(userPref.budgetLevel === 0 || userPref.BudgetLevel === 0) ? "Tiết kiệm" : 
                               (userPref.budgetLevel === 1 || userPref.BudgetLevel === 1) ? "Cân bằng" : "Sang chảnh"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 flex justify-end z-10 relative">
                          <button
                            onClick={() => navigate('/preferences')}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                          >
                            <span>Thay đổi tùy chọn sở thích</span>
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-grow flex flex-col items-center justify-center text-center p-8 bg-slate-50/30 rounded-2xl border-2 border-dashed border-slate-200">
                      <div className="p-4 bg-white rounded-full shadow-sm text-indigo-300 mb-4">
                        <Sparkles size={32} />
                      </div>
                      <p className="text-slate-500 font-medium max-w-sm text-sm">Bạn chưa cài đặt sở thích du lịch. Thiết lập ngay để nhận gợi ý tốt nhất!</p>
                      <button
                        onClick={() => navigate('/preferences')}
                        className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 hover:shadow-lg transition-all"
                      >
                        Thiết lập ngay
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Account Settings */}
              {activeTab === 'settings' && (
                <div className="flex-grow flex flex-col">
                  <div className="border-b border-slate-100 pb-5 mb-6">
                    <h2 className="text-lg font-bold text-slate-900">Cài Đặt Tài Khoản</h2>
                    <p className="text-xs text-slate-400 mt-1 font-medium">Chỉnh sửa thông tin liên hệ và cập nhật ảnh đại diện của bạn.</p>
                  </div>

                  <div className="space-y-5 flex-grow">
                    {/* Họ và Tên */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Họ và Tên</label>
                      <input
                        className="w-full bg-slate-50 hover:bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all text-sm"
                        value={editData.fullName}
                        onChange={e => setEditData({...editData, fullName: e.target.value})}
                        placeholder="Nhập họ tên..."
                      />
                    </div>

                    {/* Số Điện Thoại */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Số Điện Thoại</label>
                      <input
                        className="w-full bg-slate-50 hover:bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all text-sm"
                        value={editData.phone}
                        onChange={e => setEditData({...editData, phone: e.target.value})}
                        placeholder="Nhập số điện thoại..."
                      />
                    </div>

                    {/* Email (Read-only) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span>Địa Chỉ Email</span>
                        <Lock size={11} className="text-slate-400" />
                        <span className="text-[10px] font-semibold text-slate-400 lowercase tracking-normal">(không thể thay đổi)</span>
                      </label>
                      <div className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-slate-400 font-medium text-sm flex items-center justify-between">
                        <span>{displayEmail}</span>
                        <Lock size={13} className="text-slate-300" />
                      </div>
                    </div>

                    {/* Vai Trò (Read-only) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span>Vai Trò Tài Khoản</span>
                        <Lock size={11} className="text-slate-400" />
                      </label>
                      <div className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-slate-400 font-medium text-sm flex items-center justify-between">
                        <span className="capitalize">{displayRole}</span>
                        <ShieldCheck size={13} className="text-slate-300" />
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                      onClick={handleCancel}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      onClick={handleUpdate}
                      disabled={saving}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition-all flex items-center gap-1.5"
                    >
                      {saving ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>Đang lưu...</span>
                        </>
                      ) : (
                        <>
                          <Save size={13} />
                          <span>Lưu thay đổi</span>
                        </>
                      )}
                    </button>
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
