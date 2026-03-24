import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import MainLayout from '../../layouts/MainLayout';
import { Settings, Save, Loader2 } from 'lucide-react';

const UserPreferences = () => {
    // Giả định lấy userId từ localStorage sau khi login
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.userId || 1; 

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pref, setPref] = useState({
        travelStyle: '',
        budgetLevel: 0,
        travelPace: 0,
        cuisinePref: ''
    });

    useEffect(() => {
    const fetchCurrentPreferences = async () => {
        try {
            setLoading(true);
            // Gọi API GET (không cần truyền ID vì BE lấy từ Token)
            const res = await axiosClient.get('/preferences');
            
            if (res.data.success && res.data.data) {
                // Đổ dữ liệu từ DB vào State để hiện lên Form
                setPref(res.data.data);
            }
        } catch (err) {
            console.error("Chưa có sở thích cũ hoặc lỗi kết nối");
        } finally {
            setLoading(false);
        }
    };

    fetchCurrentPreferences();
}, []); // Chạy 1 lần duy nhất khi mở trang

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await axiosClient.put('/preferences', pref); 
            alert("Cập nhật thành công!");
        } catch (err) {
            alert("Có lỗi xảy ra");
        } finally { setSaving(false); }
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;

    return (
        <MainLayout>
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl shadow-xl border border-slate-100 mt-10">
                <div className="flex items-center gap-3 mb-8">
                    <Settings className="text-blue-500" size={28} />
                    <h1 className="text-2xl font-black text-slate-800">Cấu hình sở thích du lịch</h1>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Phong cách du lịch</label>
                        <select 
                            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            value={pref.travelStyle}
                            onChange={e => setPref({...pref, travelStyle: e.target.value})}
                        >
                            <option value="">Chọn phong cách</option>
                            <option value="Thám hiểm">Thám hiểm (Adventure)</option>
                            <option value="Nghỉ dưỡng">Nghỉ dưỡng (Relax)</option>
                            <option value="Văn hóa">Văn hóa (Cultural)</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Ngân sách (Budget)</label>
                            <select 
                                className="w-full p-3 border rounded-xl"
                                value={pref.budgetLevel}
                                onChange={e => setPref({...pref, budgetLevel: parseInt(e.target.value)})}
                            >
                                <option value={0}>Thấp (Economy)</option>
                                <option value={1}>Trung bình (Standard)</option>
                                <option value={2}>Cao (Luxury)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Nhịp độ (Pace)</label>
                            <select 
                                className="w-full p-3 border rounded-xl"
                                value={pref.travelPace}
                                onChange={e => setPref({...pref, travelPace: parseInt(e.target.value)})}
                            >
                                <option value={0}>Thong thả</option>
                                <option value={1}>Cân bằng</option>
                                <option value={2}>Dày đặc</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Sở thích ẩm thực</label>
                        <textarea 
                            className="w-full p-3 border rounded-xl h-24"
                            placeholder="Ví dụ: Thích ăn đồ biển, không ăn được cay..."
                            value={pref.cuisinePref || ''}
                            onChange={e => setPref({...pref, cuisinePref: e.target.value})}
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={saving}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:bg-slate-400"
                    >
                        {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        Lưu sở thích
                    </button>
                </form>
            </div>
        </MainLayout>
    );
};

export default UserPreferences;