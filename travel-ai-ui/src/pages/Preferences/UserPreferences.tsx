import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import PrefForm from '../../components/User/PrefForm';
import { usePreferences } from '../../hooks/usePreferences';

const UserPreferences = () => {
    const navigate = useNavigate();
    const { pref, setPref, loading, saving, updatePreferences } = usePreferences();
    const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null);

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        const result = await updatePreferences(pref);

        if (result.success) {
            setToast({
                show: true,
                message: 'Cập nhật sở thích thành công!',
                type: 'success'
            });
            setTimeout(() => {
                setToast(null);
                navigate('/profile');
            }, 1500);
            return;
        }

        setToast({
            show: true,
            message: 'Có lỗi xảy ra khi lưu sở thích.',
            type: 'error'
        });
        setTimeout(() => {
            setToast(null);
        }, 3000);
    };

    if (loading) {
        return (
            <div className="flex justify-center p-20">
                <Loader2 className="animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto bg-white p-10 rounded-[2.5rem] shadow-2xl mt-10 mb-20 relative">
            {toast && toast.show && (
                <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-5 ${
                    toast.type === 'success' 
                        ? 'bg-emerald-500/95 border-emerald-400 text-white' 
                        : 'bg-rose-500/95 border-rose-400 text-white'
                }`}>
                    {toast.type === 'success' ? (
                        <CheckCircle2 className="size-5 shrink-0 animate-bounce" />
                    ) : (
                        <XCircle className="size-5 shrink-0" />
                    )}
                    <span className="font-bold text-sm tracking-wide">{toast.message}</span>
                </div>
            )}

            <div className="text-center mb-12">
                <h1 className="text-4xl font-black text-slate-900 mb-2">Thiết lập AI Travel</h1>
                <p className="text-slate-500 italic">AI sẽ dựa vào đây để lập lịch trình cho bạn</p>
            </div>

            <PrefForm
                formData={pref}
                onChange={setPref}
                onSave={handleSave}
                saving={saving}
            />
        </div>
    );
};

export default UserPreferences;
