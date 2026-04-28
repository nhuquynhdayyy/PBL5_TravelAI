import type { FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import PrefForm from '../../components/User/PrefForm';
import { usePreferences } from '../../hooks/usePreferences';

const UserPreferences = () => {
    const { pref, setPref, loading, saving, updatePreferences } = usePreferences();

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        const result = await updatePreferences(pref);

        if (result.success) {
            alert('Cap nhat so thich thanh cong!');
            return;
        }

        alert('Co loi xay ra khi luu.');
    };

    if (loading) {
        return (
            <div className="flex justify-center p-20">
                <Loader2 className="animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto bg-white p-10 rounded-[2.5rem] shadow-2xl mt-10 mb-20">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-black text-slate-900 mb-2">Thiet lap AI Travel</h1>
                <p className="text-slate-500 italic">AI se dua vao day de lap lich trinh cho ban</p>
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
