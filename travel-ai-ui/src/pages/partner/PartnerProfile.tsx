import { useEffect, useState } from 'react';
import {
    Building2,
    CreditCard,
    Loader2,
    MapPin,
    RefreshCw,
    ReceiptText,
    Save,
    ShieldCheck
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';

type PartnerProfileForm = {
    businessName: string;
    taxCode: string;
    bankAccount: string;
    address: string;
    description: string;
};

const emptyForm: PartnerProfileForm = {
    businessName: '',
    taxCode: '',
    bankAccount: '',
    address: '',
    description: ''
};

const PartnerProfile = () => {
    const [formData, setFormData] = useState<PartnerProfileForm>(emptyForm);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const response = await axiosClient.get('/partner/profile');
            setFormData({
                businessName: response.data?.businessName ?? '',
                taxCode: response.data?.taxCode ?? '',
                bankAccount: response.data?.bankAccount ?? '',
                address: response.data?.address ?? '',
                description: response.data?.description ?? ''
            });
        } catch (error) {
            console.error('Loi lay thong tin doanh nghiep:', error);
            alert('Khong the tai thong tin doanh nghiep luc nay.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const handleChange = (field: keyof PartnerProfileForm, value: string) => {
        setFormData(previous => ({
            ...previous,
            [field]: value
        }));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!formData.businessName.trim()) {
            alert('Vui long nhap ten doanh nghiep.');
            return;
        }

        try {
            setSaving(true);
            const response = await axiosClient.put('/partner/profile', formData);
            setFormData({
                businessName: response.data?.businessName ?? '',
                taxCode: response.data?.taxCode ?? '',
                bankAccount: response.data?.bankAccount ?? '',
                address: response.data?.address ?? '',
                description: response.data?.description ?? ''
            });
            alert('Da cap nhat thong tin doanh nghiep thanh cong.');
        } catch (error) {
            console.error('Loi cap nhat thong tin doanh nghiep:', error);
            alert('Khong the cap nhat thong tin doanh nghiep luc nay.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-32">
                <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
                <div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-xs font-black uppercase tracking-[0.2em] mb-4">
                        <Building2 size={14} /> Partner Business
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">HO SO DOANH NGHIEP</h1>
                    <p className="mt-3 text-slate-500 font-medium max-w-2xl">
                        Cap nhat thong tin doanh nghiep, tai khoan nhan tien va mo ta de san sang cho thanh toan thuc te.
                    </p>
                </div>

                <button
                    onClick={fetchProfile}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-sm shadow-lg hover:bg-blue-600 transition-all active:scale-95"
                >
                    <RefreshCw size={18} /> Tai lai
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-6">
                <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6 sm:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <label className="block">
                            <span className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700">
                                <Building2 size={16} className="text-blue-500" /> Ten doanh nghiep
                            </span>
                            <input
                                value={formData.businessName}
                                onChange={(event) => handleChange('businessName', event.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-medium text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                placeholder="Cong ty du lich ABC"
                            />
                        </label>

                        <label className="block">
                            <span className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700">
                                <ReceiptText size={16} className="text-emerald-500" /> Ma so thue
                            </span>
                            <input
                                value={formData.taxCode}
                                onChange={(event) => handleChange('taxCode', event.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-medium text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                placeholder="Nhap ma so thue"
                            />
                        </label>

                        <label className="block md:col-span-2">
                            <span className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700">
                                <CreditCard size={16} className="text-amber-500" /> Tai khoan ngan hang
                            </span>
                            <input
                                value={formData.bankAccount}
                                onChange={(event) => handleChange('bankAccount', event.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-medium text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                placeholder="So tai khoan / ten ngan hang"
                            />
                        </label>

                        <label className="block md:col-span-2">
                            <span className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700">
                                <MapPin size={16} className="text-rose-500" /> Dia chi doanh nghiep
                            </span>
                            <input
                                value={formData.address}
                                onChange={(event) => handleChange('address', event.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-medium text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                placeholder="Nhap dia chi doanh nghiep"
                            />
                        </label>

                        <label className="block md:col-span-2">
                            <span className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700">
                                <ShieldCheck size={16} className="text-indigo-500" /> Mo ta doanh nghiep
                            </span>
                            <textarea
                                value={formData.description}
                                onChange={(event) => handleChange('description', event.target.value)}
                                rows={6}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-medium text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                placeholder="Gioi thieu ngan gon ve doanh nghiep, the manh va dich vu cua ban"
                            />
                        </label>
                    </div>

                    <div className="mt-8 flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 text-white font-black text-sm shadow-lg hover:bg-blue-500 transition-all active:scale-95 disabled:bg-slate-300"
                        >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            Luu thong tin
                        </button>
                    </div>
                </form>

                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 rounded-[2.5rem] text-white p-6 sm:p-8 shadow-xl">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200 mb-4">
                        Thanh toan thuc te
                    </p>
                    <h2 className="text-2xl font-black leading-tight mb-4">
                        Thong tin doanh nghiep day du giup doi soat va nhan tien nhanh hon
                    </h2>
                    <p className="text-sm font-medium text-slate-200 leading-7">
                        Day la bo thong tin quan trong de doi chieu doi tac, xac minh doanh nghiep va chuan bi cho cac buoc thanh toan thuc te sau nay.
                    </p>

                    <div className="mt-8 space-y-3">
                        <div className="rounded-2xl bg-white/10 px-4 py-4 border border-white/10">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-200 mb-1">Business name</p>
                            <p className="font-bold text-white">{formData.businessName || 'Chua cap nhat'}</p>
                        </div>
                        <div className="rounded-2xl bg-white/10 px-4 py-4 border border-white/10">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-200 mb-1">Tax code</p>
                            <p className="font-bold text-white">{formData.taxCode || 'Chua cap nhat'}</p>
                        </div>
                        <div className="rounded-2xl bg-white/10 px-4 py-4 border border-white/10">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-200 mb-1">Bank account</p>
                            <p className="font-bold text-white">{formData.bankAccount || 'Chua cap nhat'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PartnerProfile;
