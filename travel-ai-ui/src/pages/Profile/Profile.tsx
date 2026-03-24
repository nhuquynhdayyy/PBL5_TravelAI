import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, ShieldCheck, LogOut, Edit3, Loader2, Settings2 } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import MainLayout from '../../layouts/MainLayout';

interface UserProfile {
  fullName: string;
  email: string;
  phone: string | null;
  roleName: string;
}

const Profile: React.FC = () => {
  // --- 1. TẤT CẢ HOOKS PHẢI ĐẶT Ở ĐÂY (TRƯỚC MỌI LỆNH IF RETURN) ---
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userPref, setUserPref] = useState<any>(null); // Lưu sở thích
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  // Effect lấy Profile
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Gọi song song cả 2 API để tối ưu tốc độ
        const [profileRes, prefRes] = await Promise.all([
          axiosClient.get('/users/me'),
          axiosClient.get('/preferences').catch(() => ({ data: { data: null } })) // Nếu lỗi pref thì coi như null
        ]);
        
        setProfile(profileRes.data);
        setUserPref(prefRes.data.data);
      } catch (err) {
        console.error("Lỗi lấy dữ liệu:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
    window.location.reload();
  };

  // --- 2. CÁC ĐIỀU KIỆN RENDER PHỤ (LOADING/ERROR) ĐẶT SAU HOOKS ---
  if (loading) {
    return (
      <MainLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="animate-spin text-blue-500 size-10" />
        </div>
      </MainLayout>
    );
  }

  // --- 3. GIAO DIỆN CHÍNH ---
  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto mt-10">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 mb-10">
          {/* Cover Image */}
          <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600"></div>

          <div className="px-8 pb-8 relative">
            {/* Avatar - Dùng pl-28 để né Logo */}
            <div className="absolute -top-12 left-8">
              <div className="size-24 rounded-2xl bg-white p-1 shadow-lg">
                <div className="size-full rounded-xl bg-slate-200 flex items-center justify-center text-slate-500">
                  <User size={48} />
                </div>
              </div>
            </div>

            <div className="pt-14 sm:pl-28 flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <h1 className="text-3xl font-black text-slate-900 leading-tight">
                  {profile?.fullName || "Người dùng"}
                </h1>
                <p className="text-blue-600 font-bold flex items-center gap-1 mt-1 uppercase text-xs tracking-widest bg-blue-50 w-fit px-2 py-1 rounded-md">
                  <ShieldCheck size={14} /> {profile?.roleName || "Customer"}
                </p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors shrink-0">
                <Edit3 size={16} /> Edit Profile
              </button>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="p-2 bg-white rounded-lg shadow-sm text-blue-500"><Mail size={20} /></div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Email Address</p>
                  <p className="text-slate-700 font-medium">{profile?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="p-2 bg-white rounded-lg shadow-sm text-green-500"><Phone size={20} /></div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Phone Number</p>
                  <p className="text-slate-700 font-medium">{profile?.phone || "Not provided"}</p>
                </div>
              </div>
            </div>

            {/* Mục hiển thị sở thích hiện tại */}
            {userPref && (
                <div className="mt-6 p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 tracking-widest">Sở thích du lịch hiện tại</h3>
                    <div className="flex flex-wrap gap-3">
                        <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-xl text-xs font-black shadow-sm">
                            STYLE: {userPref.travelStyle}
                        </span>
                        <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-xl text-xs font-black shadow-sm">
                            PACE: {userPref.travelPace === 0 ? "Thong thả" : userPref.travelPace === 1 ? "Cân bằng" : "Dày đặc"}
                        </span>
                        <span className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-xl text-xs font-black shadow-sm">
                            BUDGET: {userPref.budgetLevel === 0 ? "Tiết kiệm" : userPref.budgetLevel === 1 ? "Trung bình" : "Cao"}
                        </span>
                    </div>
                </div>
            )}

            {/* Nút bấm sang trang chỉnh sửa - CHỈ ĐỂ 1 NÚT DUY NHẤT */}
            <div className="mt-6">
              <button 
                onClick={() => navigate('/preferences')}
                className="w-full flex items-center justify-between p-5 rounded-2xl bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                    <Settings2 size={24} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-800">Cấu hình AI Planner</p>
                    <p className="text-xs text-slate-500">Cập nhật sở thích để AI gợi ý lịch trình chính xác hơn</p>
                  </div>
                </div>
                <div className="text-blue-500 font-bold">→</div>
              </button>
            </div>

            <button 
              onClick={handleLogout}
              className="w-full mt-8 flex items-center justify-center gap-2 py-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-black transition-all active:scale-95"
            >
              <LogOut size={20} /> Logout
            </button>
          </div>
        </div>
        
        {error && (
          <p className="mt-4 text-center text-red-500 text-sm italic">
            * Hệ thống gặp sự cố khi lấy dữ liệu thật. Vui lòng kiểm tra kết nối Backend.
          </p>
        )}
      </div>
    </MainLayout>
  );
};

export default Profile;