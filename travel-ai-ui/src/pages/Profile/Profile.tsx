import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, ShieldCheck, LogOut, Edit3, Loader2, Settings2, Save, X, Camera } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import MainLayout from '../../layouts/MainLayout';
import { DollarSign, ChevronRight, Calendar, MapPin } from 'lucide-react';

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [userPref, setUserPref] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false); // Trạng thái chỉnh sửa
  const [saving, setSaving] = useState(false);
 
  // State cho Form sửa
  const [editData, setEditData] = useState({ fullName: '', phone: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');


  const navigate = useNavigate();
  const API_BASE_URL = 'http://localhost:5134'; // ĐỔI PORT CHO ĐÚNG BACKEND CỦA BẠN (5134 hoặc 7243)
  const [myTrips, setMyTrips] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);


  const fetchData = async () => {
    try {
      setLoading(true);
      const [profileRes, prefRes, tripsRes] = await Promise.all([
        axiosClient.get('/users/me'),
        axiosClient.get('/preferences').catch(() => ({ data: { data: null } })),
        axiosClient.get('/itinerary/my-trips')
      ]);
     
      const userData = profileRes.data;
      setProfile(userData);
      setEditData({ fullName: userData.fullName, phone: userData.phone || '' });
     
      // Nếu có avatar trong DB thì hiển thị full URL
      if (userData.avatarUrl) {
        setPreviewUrl(`${API_BASE_URL}${userData.avatarUrl}`);
      }
     
      setUserPref(prefRes.data.data);
      setMyTrips(tripsRes.data.data);
    } catch (err) {
      console.error("Lỗi lấy dữ liệu:", err);
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
        // --- BẮT ĐẦU FIX BUG TẠI ĐÂY ---
        // 1. Lấy dữ liệu user hiện tại từ localStorage
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userData = JSON.parse(userStr);
         
          // 2. Cập nhật các thông tin mới vào object
          userData.fullName = editData.fullName;
         
          // Cập nhật lại đường dẫn ảnh mới nếu có trong phản hồi từ server
          if (response.data.avatarUrl) {
             userData.avatarUrl = response.data.avatarUrl;
          }
 
          // 3. Lưu ngược lại vào localStorage để Header nhận diện được sự thay đổi
          localStorage.setItem('user', JSON.stringify(userData));
        }
        // --- KẾT THÚC FIX BUG ---
 
        alert("Cập nhật thành công!");
        setIsEditing(false);
       
        // Load lại dữ liệu để cập nhật UI tại trang Profile
        await fetchData();
 
        // (Tùy chọn) Nếu Header không dùng Context/Redux, cách nhanh nhất để Header
        // cập nhật lại tên là phát một sự kiện storage hoặc reload nhẹ
        window.dispatchEvent(new Event("storage"));
        // Hoặc: window.location.reload(); (nếu muốn chắc chắn 100% đồng bộ mọi nơi)
      }
    } catch (err) {
      console.error(err);
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
      navigate('/itinerary/latest', { state: { data: detail.data.data } });
    } catch (err) {
      console.error('Loi lay chi tiet lich trinh:', err);
      alert('Khong the tai lai lich trinh luc nay.');
    }
  };


  if (loading) return (
    <MainLayout>
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-blue-500 size-10" />
      </div>
    </MainLayout>
  );


  return (
      <div className="max-w-2xl mx-auto mt-10">
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 mb-10">
          {/* Cover Image */}
          <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700"></div>


          <div className="px-8 pb-8 relative">
            {/* Avatar Section */}
            <div className="absolute -top-12 left-8">
              <div className="size-28 rounded-3xl bg-white p-1.5 shadow-xl relative group">
                <div className="size-full rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center text-slate-400">
                  {previewUrl ? (
                    <img src={previewUrl} className="size-full object-cover" alt="avatar" />
                  ) : (
                    <User size={50} />
                  )}
                </div>
               
                {/* Overlay nút Camera khi ở chế độ Edit */}
                {isEditing && (
                  <label className="absolute inset-1.5 flex items-center justify-center bg-black/40 rounded-2xl cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="text-white size-8" />
                    <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                  </label>
                )}
              </div>
            </div>


            {/* User Info Header */}
            <div className="pt-20 sm:pl-32 flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex-grow w-full">
                {isEditing ? (
                  <input
                    className="text-3xl font-black text-slate-900 border-b-2 border-blue-500 outline-none w-full bg-blue-50/30 px-2"
                    value={editData.fullName}
                    onChange={e => setEditData({...editData, fullName: e.target.value})}
                    placeholder="Nhập họ tên..."
                  />
                ) : (
                  <h1 className="text-3xl font-black text-slate-900 leading-tight">
                    {profile?.fullName || "Người dùng"}
                  </h1>
                )}
                <div className="flex items-center gap-2 mt-2">
                    <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-lg flex items-center gap-1 uppercase tracking-widest">
                        <ShieldCheck size={12} /> {profile?.roleName || "Customer"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                        Thành viên từ: {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '...'}
                    </span>
                </div>
              </div>
             
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleUpdate}
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:bg-slate-300"
                    >
                      {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} SAVE
                    </button>
                    <button
                      onClick={() => { setIsEditing(false); setPreviewUrl(profile.avatarUrl ? `${API_BASE_URL}${profile.avatarUrl}` : ''); }}
                      className="px-4 py-2.5 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all"
                    >
                      <X size={18} />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-black transition-all active:scale-95"
                  >
                    <Edit3 size={18} /> EDIT PROFILE
                  </button>
                )}
              </div>
            </div>


            {/* Contact Details */}
            <div className="mt-10 space-y-4">
              <div className="flex items-center gap-5 p-5 rounded-[1.5rem] bg-slate-50 border border-slate-100">
                <div className="p-3 bg-white rounded-xl shadow-sm text-blue-500"><Mail size={22} /></div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</p>
                  <p className="text-slate-700 font-bold">{profile?.email}</p>
                </div>
              </div>


              <div className="flex items-center gap-5 p-5 rounded-[1.5rem] bg-slate-50 border border-slate-100 transition-all">
                <div className="p-3 bg-white rounded-xl shadow-sm text-green-500"><Phone size={22} /></div>
                <div className="flex-grow">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Number</p>
                  {isEditing ? (
                    <input
                      className="bg-transparent border-b-2 border-slate-200 outline-none w-full text-slate-700 font-bold focus:border-green-500 transition-colors"
                      value={editData.phone}
                      onChange={e => setEditData({...editData, phone: e.target.value})}
                      placeholder="Nhập số điện thoại..."
                    />
                  ) : (
                    <p className="text-slate-700 font-bold">{profile?.phone || "Chưa cung cấp"}</p>
                  )}
                </div>
              </div>
            </div>


            {/* AI Preferences Shortcut */}
            {userPref && (
                <div className="mt-8 p-6 bg-indigo-50/50 rounded-3xl border border-dashed border-indigo-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">Sở thích du lịch của bạn</h3>
                        <Settings2 size={16} className="text-indigo-300" />
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <div className="px-3 py-1.5 bg-white border border-indigo-100 text-indigo-600 rounded-xl text-[10px] font-black shadow-sm uppercase tracking-tighter">
                            {userPref.travelStyle}
                        </div>
                        <div className="px-3 py-1.5 bg-white border border-indigo-100 text-indigo-600 rounded-xl text-[10px] font-black shadow-sm uppercase tracking-tighter">
                            PACE: {userPref.travelPace === 0 ? "Thong thả" : userPref.travelPace === 1 ? "Cân bằng" : "Dày đặc"}
                        </div>
                        <div className="px-3 py-1.5 bg-white border border-indigo-100 text-indigo-600 rounded-xl text-[10px] font-black shadow-sm uppercase tracking-tighter">
                            BUDGET: {userPref.budgetLevel === 0 ? "Tiết kiệm" : userPref.budgetLevel === 1 ? "Trung bình" : "Cao"}
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/preferences')}
                        className="mt-5 w-full text-[10px] font-black text-indigo-500 hover:underline"
                    >
                        Cập nhật sở thích ngay →
                    </button>
                </div>
            )}

            <div className="mt-10 mb-20">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
                        <MapPin className="text-blue-500" /> LỊCH TRÌNH ĐÃ LƯU
                    </h2>
                    <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-black">
                        {myTrips.length} TRIPS
                    </span>
                </div>

                {myTrips.length > 0 ? (
                    <div className="space-y-4">
                        {myTrips.map((trip, index) => (
                            <div
                                key={trip.itineraryId ?? index}
                                onClick={() => handleOpenTrip(trip.itineraryId)}
                                className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg text-slate-800 group-hover:text-blue-600 transition-colors">
                                            {trip.tripTitle}
                                        </h3>
                                        <div className="flex items-center gap-4 mt-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                                            <span className="flex items-center gap-1"><Calendar size={12}/> Vừa tạo</span>
                                            <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-md">
                                                <DollarSign size={12}/> {new Intl.NumberFormat('vi-VN').format(trip.totalEstimatedCost)}₫
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight className="text-slate-300 group-hover:text-blue-500 transition-all group-hover:translate-x-1" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-slate-50 p-10 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center">
                        <p className="text-slate-400 font-medium italic">Bạn chưa lưu lịch trình nào.</p>
                        <button 
                            onClick={() => navigate('/destinations')}
                            className="mt-4 text-blue-500 font-bold text-sm hover:underline"
                        >
                            Khám phá ngay →
                        </button>
                    </div>
                )}
            </div>
            <button
              onClick={handleLogout}
              className="w-full mt-10 flex items-center justify-center gap-2 py-5 bg-red-50 hover:bg-red-100 text-red-600 rounded-[1.5rem] font-black transition-all active:scale-[0.98]"
            >
              <LogOut size={20} /> LOGOUT ACCOUNT
            </button>
          </div>
        </div>
      </div>
  );
};


export default Profile;
