import React from 'react';
import MainLayout from '../../layouts/MainLayout';
import PrefForm from '../../components/User/PrefForm';
import { usePreferences } from '../../hooks/usePreferences'; 
import { Loader2 } from 'lucide-react';

const UserPreferences = () => {
    // Lấy mọi thứ từ Hook ra
    const { pref, setPref, loading, saving, updatePreferences } = usePreferences();

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await updatePreferences(pref); // Gọi hàm update từ hook
        if (result.success) {
            alert("Cập nhật sở thích thành công!");
        } else {
            alert("Có lỗi xảy ra khi lưu.");
        }
    };

    if (loading) return (
        <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>
    );

    return (
        <MainLayout>
            <div className="max-w-3xl mx-auto bg-white p-10 rounded-[2.5rem] shadow-2xl mt-10 mb-20">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-black text-slate-900 mb-2">Thiết lập AI Travel</h1>
                    <p className="text-slate-500 italic">"AI sẽ dựa vào đây để lập lịch trình cho bạn"</p>
                </div>

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