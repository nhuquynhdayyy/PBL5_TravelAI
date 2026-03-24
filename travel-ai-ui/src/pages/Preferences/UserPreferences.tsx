import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import MainLayout from '../../layouts/MainLayout';
import PrefForm from '../../components/User/PrefForm'; // Import component mới
import { Loader2 } from 'lucide-react';

const UserPreferences = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // State lưu trữ dữ liệu sở thích
    const [pref, setPref] = useState({
        travelStyle: '',
        budgetLevel: 0,
        travelPace: 0,
        cuisinePref: ''
    });

    // 1. Lấy dữ liệu cũ từ Server khi mở trang
    useEffect(() => {
        const fetchCurrentPreferences = async () => {
            try {
                setLoading(true);
                const res = await axiosClient.get('/preferences');
                if (res.data.success && res.data.data) {
                    setPref(res.data.data);
                }
            } catch (err) {
                console.error("Chưa có sở thích cũ");
            } finally {
                setLoading(false);
            }
        };
        fetchCurrentPreferences();
    }, []);

    // 2. Hàm lưu dữ liệu khi nhấn nút Save
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await axiosClient.put('/preferences', pref);
            alert("Cập nhật sở thích thành công! AI đã sẵn sàng phục vụ bạn.");
        } catch (err) {
            alert("Có lỗi xảy ra khi lưu.");
        } finally { 
            setSaving(false); 
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20">
            <Loader2 className="animate-spin text-blue-500 mb-2" size={40} />
            <p className="text-slate-500 font-medium">Đang tải sở thích của bạn...</p>
        </div>
    );

    return (
        <MainLayout>
            <div className="max-w-3xl mx-auto bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 mt-10 mb-20">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Thiết lập AI Travel</h1>
                    <p className="text-slate-500 italic">"Hãy cho AI biết gu của bạn để nhận lịch trình hoàn hảo nhất"</p>
                </div>

                {/* TRUYỀN DATA VÀO FORM COMPONENT */}
                <PrefForm 
                    formData={pref} 
                    onChange={setPref} 
                    onSave={handleSave} 
                    saving={saving} 
                />
            </div>
        </MainLayout>
    );
};

export default UserPreferences;