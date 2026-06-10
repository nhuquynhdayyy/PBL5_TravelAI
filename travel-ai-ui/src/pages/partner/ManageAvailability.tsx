import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import {
    ArrowLeft,
    Calendar,
    CheckCircle2,
    DollarSign,
    Loader2,
    Package,
    Plus,
    RefreshCw,
    Save,
    Sparkles,
    Trash2,
    TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getDateAfterMonthsVietnam, getTodayVietnam } from '../../utils/dateUtils';
import { formatVietnameseDate } from '../../utils/dateTimeUtils';

type Service = {
    serviceId: number;
    name: string;
    serviceType?: string;
};

type Availability = {
    availId: number;
    date: string;
    price: number;
    basePrice: number;
    totalStock: number;
    bookedCount: number;
    heldCount: number;
    remaining: number;
};

type PricingRule = {
    ruleId: number;
    serviceId: number;
    startDate: string;
    endDate: string;
    priceMultiplier: number;
    description: string | null;
    createdAt: string;
};

type EditState = Record<number, { price: string; stock: string; saving: boolean }>;

const currencyFormatter = new Intl.NumberFormat('vi-VN');

const ManageAvailability = () => {
    const navigate = useNavigate();
    const [services, setServices] = useState<Service[]>([]);
    const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
    const [availabilities, setAvailabilities] = useState<Availability[]>([]);
    const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
    const [fetching, setFetching] = useState(true);
    const [loading, setLoading] = useState(false);
    const [savingBulk, setSavingBulk] = useState(false);
    const [editState, setEditState] = useState<EditState>({});
    const [activeTab, setActiveTab] = useState<'bulk' | 'calendar' | 'rules'>('bulk');

    const [bulkForm, setBulkForm] = useState({
        startDate: getTodayVietnam(),
        endDate: getDateAfterMonthsVietnam(1),
        price: '',
        stock: '',
        applyWeekendPricing: false,
        weekendMultiplier: '1.2'
    });

    const [ruleForm, setRuleForm] = useState({
        startDate: getTodayVietnam(),
        endDate: getDateAfterMonthsVietnam(1),
        priceMultiplier: '1.2',
        description: ''
    });

    useEffect(() => {
        fetchServices();
    }, []);

    useEffect(() => {
        if (selectedServiceId) {
            fetchAvailabilities(selectedServiceId);
            fetchPricingRules(selectedServiceId);
        } else {
            setAvailabilities([]);
            setPricingRules([]);
            setEditState({});
        }
    }, [selectedServiceId]);

    const fetchServices = async () => {
        try {
            setFetching(true);
            const response = await axiosClient.get('/services/my-services');
            const data = response.data as Service[];
            setServices(data);

            if (data.length > 0) {
                setSelectedServiceId(data[0].serviceId);
            }
        } catch (error) {
            console.error('Loi tai danh sach dich vu:', error);
            alert('Khong the tai danh sach dich vu.');
        } finally {
            setFetching(false);
        }
    };

    const fetchAvailabilities = async (serviceId = selectedServiceId) => {
        if (!serviceId) return;

        try {
            setLoading(true);
            const response = await axiosClient.get('/availability/my-services', {
                params: {
                    startDate: getTodayVietnam(),
                    endDate: getDateAfterMonthsVietnam(2)
                }
            });
const serviceAvailability = response.data.find((item: any) => item.serviceId === serviceId);
            const rows = (serviceAvailability?.availabilities ?? []) as Availability[];

            setAvailabilities(rows);
            setEditState(
                rows.reduce<EditState>((acc, item) => {
                    acc[item.availId] = {
                        price: String(item.basePrice),
                        stock: String(item.totalStock),
                        saving: false
                    };
                    return acc;
                }, {})
            );
        } catch (error) {
            console.error('Loi tai lich ton kho:', error);
            alert('Khong the tai lich ton kho.');
        } finally {
            setLoading(false);
        }
    };

    const fetchPricingRules = async (serviceId = selectedServiceId) => {
        if (!serviceId) return;

        try {
            const response = await axiosClient.get(`/pricing/rules/${serviceId}`);
            setPricingRules(response.data as PricingRule[]);
        } catch (error) {
            console.error('Loi tai pricing rules:', error);
        }
    };

    const handleBulkSet = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!selectedServiceId) {
            alert('Vui long chon dich vu.');
            return;
        }

        if (bulkForm.startDate > bulkForm.endDate) {
            alert('Ngay bat dau phai nho hon hoac bang ngay ket thuc.');
            return;
        }

        try {
            setSavingBulk(true);
            await axiosClient.post('/availability/bulk-set', {
                serviceId: selectedServiceId,
                startDate: bulkForm.startDate,
                endDate: bulkForm.endDate,
                price: Number(bulkForm.price),
                stock: Number(bulkForm.stock)
            });

            if (bulkForm.applyWeekendPricing) {
                await axiosClient.post('/availability/apply-weekend-pricing', {
                    serviceId: selectedServiceId,
                    startDate: bulkForm.startDate,
                    endDate: bulkForm.endDate,
                    weekendMultiplier: Number(bulkForm.weekendMultiplier)
                });
            }

            await fetchAvailabilities(selectedServiceId);
            alert('Da cap nhat lich ban thanh cong.');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Khong the cap nhat lich ban.');
        } finally {
            setSavingBulk(false);
        }
    };

    const handleUpdateDay = async (availId: number) => {
        const edit = editState[availId];
        if (!edit) return;

        try {
            setEditState(prev => ({
                ...prev,
                [availId]: { ...edit, saving: true }
            }));

            await axiosClient.put(`/availability/${availId}`, {
                Price: Number(edit.price),
                Stock: Number(edit.stock)
            });

            if (selectedServiceId) {
                await fetchAvailabilities(selectedServiceId);
            }
        } catch (error: any) {
            alert(error.response?.data?.message || 'Khong the cap nhat ngay nay.');
        } finally {
            setEditState(prev => ({
                ...prev,
[availId]: { ...(prev[availId] ?? edit), saving: false }
            }));
        }
    };

    const isWeekend = (date: string) => {
        const day = new Date(date).getDay();
        return day === 0 || day === 6;
    };

    const handleCreatePricingRule = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!selectedServiceId) {
            alert('Vui long chon dich vu.');
            return;
        }

        if (ruleForm.startDate > ruleForm.endDate) {
            alert('Ngay bat dau phai nho hon hoac bang ngay ket thuc.');
            return;
        }

        try {
            await axiosClient.post('/pricing/seasonal-rule', {
                serviceId: selectedServiceId,
                startDate: ruleForm.startDate,
                endDate: ruleForm.endDate,
                priceMultiplier: Number(ruleForm.priceMultiplier),
                description: ruleForm.description || null
            });

            await fetchPricingRules(selectedServiceId);
            await fetchAvailabilities(selectedServiceId);
            
            setRuleForm({
                startDate: getTodayVietnam(),
                endDate: getDateAfterMonthsVietnam(1),
                priceMultiplier: '1.2',
                description: ''
            });

            alert('Da tao pricing rule thanh cong.');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Khong the tao pricing rule.');
        }
    };

    const handleDeletePricingRule = async (ruleId: number) => {
        if (!confirm('Ban co chac chan muon xoa pricing rule nay?')) {
            return;
        }

        try {
            await axiosClient.delete(`/pricing/rule/${ruleId}`);
            await fetchPricingRules(selectedServiceId);
            await fetchAvailabilities(selectedServiceId);
            alert('Da xoa pricing rule thanh cong.');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Khong the xoa pricing rule.');
        }
    };

    if (fetching) {
        return (
            <div className="flex justify-center p-20">
                <Loader2 className="animate-spin text-emerald-600" size={40} />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto py-10 px-4 text-left">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 font-bold mb-8">
                <ArrowLeft size={20} /> Quay lai
            </button>

            <div className="bg-emerald-600 rounded-[2rem] p-8 text-white mb-8">
                <div className="flex items-center gap-3 mb-3">
                    <Calendar size={30} />
                    <h1 className="text-3xl font-black tracking-tight">Quan ly lich ban</h1>
                </div>
                <p className="text-emerald-50 font-medium">
                    Set ton kho va gia theo khoang ngay, ap gia cuoi tuan khi can, va sua tung ngay trong lich.
                </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                    Chon dich vu
                </label>
                <select
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-emerald-500"
                    value={selectedServiceId ?? ''}
                    onChange={event => setSelectedServiceId(Number(event.target.value))}
                >
                    {services.length === 0 ? (
                        <option value="">Chua co dich vu</option>
                    ) : (
                        services.map(service => (
                            <option key={service.serviceId} value={service.serviceId}>
                                {service.name}
                            </option>
                        ))
                    )}
                </select>
            </div>

            {selectedServiceId && (
                <>
                    {/* Tab Navigation */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 mb-6">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setActiveTab('bulk')}
                                className={`flex-1 py-3 px-4 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
                                    activeTab === 'bulk'
                                        ? 'bg-emerald-600 text-white shadow-lg'
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                <Sparkles size={18} />
                                Bulk Set & Lich
                            </button>
                            <button
                                onClick={() => setActiveTab('rules')}
                                className={`flex-1 py-3 px-4 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
                                    activeTab === 'rules'
                                        ? 'bg-emerald-600 text-white shadow-lg'
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                <TrendingUp size={18} />
                                Pricing Rules
                            </button>
                        </div>
                    </div>

                    {/* Bulk Set Tab */}
                    {activeTab === 'bulk' && (
                        <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
                    <form onSubmit={handleBulkSet} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6 h-fit">
                        <div className="flex items-center gap-3">
                            <Sparkles className="text-emerald-600" size={24} />
                            <h2 className="text-xl font-black text-slate-900">Bulk set</h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <label className="block">
<span className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Tu ngay</span>
                                <input
                                    type="date"
                                    value={bulkForm.startDate}
                                    onChange={event => setBulkForm({ ...bulkForm, startDate: event.target.value })}
                                    className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-none focus:border-emerald-500"
                                    required
                                />
                            </label>
                            <label className="block">
                                <span className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Den ngay</span>
                                <input
                                    type="date"
                                    value={bulkForm.endDate}
                                    onChange={event => setBulkForm({ ...bulkForm, endDate: event.target.value })}
                                    className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-none focus:border-emerald-500"
                                    required
                                />
                            </label>
                        </div>

                        <label className="block">
                            <span className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Gia goc (VND)</span>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    value={bulkForm.price}
                                    onChange={event => setBulkForm({ ...bulkForm, price: event.target.value })}
                                    className="w-full p-3 pl-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-none focus:border-emerald-500"
                                    required
                                />
                            </div>
                        </label>

                        <label className="block">
                            <span className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Tong stock</span>
                            <div className="relative">
                                <Package className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                <input
                                    type="number"
                                    min="0"
                                    value={bulkForm.stock}
onChange={event => setBulkForm({ ...bulkForm, stock: event.target.value })}
                                    className="w-full p-3 pl-11 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-none focus:border-emerald-500"
                                    required
                                />
                            </div>
                        </label>

                        <label className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <input
                                type="checkbox"
                                checked={bulkForm.applyWeekendPricing}
                                onChange={event => setBulkForm({ ...bulkForm, applyWeekendPricing: event.target.checked })}
                                className="size-5 accent-emerald-600"
                            />
                            <span className="font-bold text-slate-700">Ap gia cuoi tuan sau khi bulk-set</span>
                        </label>

                        {bulkForm.applyWeekendPricing && (
                            <label className="block">
                                <span className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">He so cuoi tuan</span>
                                <input
                                    type="number"
                                    min="1"
                                    step="0.05"
                                    value={bulkForm.weekendMultiplier}
                                    onChange={event => setBulkForm({ ...bulkForm, weekendMultiplier: event.target.value })}
                                    className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-none focus:border-emerald-500"
                                    required
                                />
                            </label>
                        )}

                        <button
                            type="submit"
                            disabled={savingBulk}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2 disabled:bg-slate-300"
                        >
                            {savingBulk ? <Loader2 className="animate-spin" /> : <Save size={22} />}
                            Cap nhat hang loat
                        </button>
                    </form>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                            <div>
                                <h2 className="text-xl font-black text-slate-900">Lich 2 thang toi</h2>
                                <p className="text-sm font-medium text-slate-500 mt-1">Sua gia goc hoac stock cho tung ngay.</p>
                            </div>
                            <button
                                onClick={() => fetchAvailabilities()}
                                disabled={loading}
                                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 text-white font-black text-sm hover:bg-emerald-600 transition-all disabled:bg-slate-300"
                            >
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                                Tai lai
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-24">
                                <Loader2 className="animate-spin text-emerald-600" size={40} />
                            </div>
                        ) : availabilities.length === 0 ? (
                            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                                <Calendar className="mx-auto mb-4 text-slate-300" size={56} />
                                <p className="font-bold text-slate-500">Chua co lich ban. Hay dung bulk-set de tao nhieu ngay cung luc.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-900 text-white">
                                            <th className="p-3 text-left font-black">Ngay</th>
                                            <th className="p-3 text-right font-black">Gia goc</th>
                                            <th className="p-3 text-right font-black">Gia hien thi</th>
                                            <th className="p-3 text-right font-black">Stock</th>
                                            <th className="p-3 text-right font-black">Da dat</th>
                                            <th className="p-3 text-right font-black">Con lai</th>
                                            <th className="p-3 text-right font-black">Luu</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {availabilities.map(item => {
                                            const edit = editState[item.availId];
                                            const hasPricingRule = item.price !== item.basePrice;

                                            return (
                                                <tr key={item.availId} className={`border-b border-slate-100 ${isWeekend(item.date) ? 'bg-emerald-50/60' : ''}`}>
                                                    <td className="p-3 font-bold text-slate-700">
                                                        <div>{formatVietnameseDate(item.date)}</div>
                                                        {isWeekend(item.date) && (
                                                            <span className="inline-flex mt-1 px-2 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase">
                                                                Cuoi tuan
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={edit?.price ?? ''}
                                                            onChange={event => setEditState(prev => ({
                                                                ...prev,
                                                                [item.availId]: {
                                                                    ...(prev[item.availId] ?? { stock: String(item.totalStock), saving: false }),
                                                                    price: event.target.value
                                                                }
                                                            }))}
                                                            className="w-32 p-2 text-right rounded-lg border border-slate-200 font-bold"
                                                        />
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <div className="font-black text-emerald-700">
                                                            {currencyFormatter.format(item.price)}d
                                                        </div>
                                                        {hasPricingRule && (
                                                            <div className="text-xs font-bold text-purple-600">Co pricing rule</div>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={edit?.stock ?? ''}
                                                            onChange={event => setEditState(prev => ({
                                                                ...prev,
                                                                [item.availId]: {
                                                                    ...(prev[item.availId] ?? { price: String(item.basePrice), saving: false }),
                                                                    stock: event.target.value
                                                                }
                                                            }))}
                                                            className="w-24 p-2 text-right rounded-lg border border-slate-200 font-bold"
                                                        />
                                                    </td>
                                                    <td className="p-3 text-right font-bold text-blue-600">{item.bookedCount}</td>
                                                    <td className="p-3 text-right font-black text-slate-900">{item.remaining}</td>
                                                    <td className="p-3 text-right">
                                                        <button
                                                            onClick={() => handleUpdateDay(item.availId)}
                                                            disabled={edit?.saving}
                                                            className="inline-flex items-center justify-center size-10 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all disabled:bg-slate-100 disabled:text-slate-400"
                                                            title="Luu thay doi"
                                                        >
                                                            {edit?.saving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={20} />}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                        </div>
                    )}

                    {/* Pricing Rules Tab */}
                    {activeTab === 'rules' && (
                        <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
                            <form onSubmit={handleCreatePricingRule} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6 h-fit">
                                <div className="flex items-center gap-3">
                                    <TrendingUp className="text-emerald-600" size={24} />
                                    <h2 className="text-xl font-black text-slate-900">Tao pricing rule</h2>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <label className="block">
                                        <span className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Tu ngay</span>
                                        <input
                                            type="date"
                                            value={ruleForm.startDate}
                                            onChange={event => setRuleForm({ ...ruleForm, startDate: event.target.value })}
                                            className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-none focus:border-emerald-500"
                                            required
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Den ngay</span>
                                        <input
                                            type="date"
                                            value={ruleForm.endDate}
                                            onChange={event => setRuleForm({ ...ruleForm, endDate: event.target.value })}
                                            className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-none focus:border-emerald-500"
                                            required
                                        />
                                    </label>
                                </div>

                                <label className="block">
                                    <span className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">He so gia (Multiplier)</span>
                                    <div className="relative">
                                        <TrendingUp className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                        <input
                                            type="number"
                                            min="0.1"
                                            step="0.05"
                                            value={ruleForm.priceMultiplier}
                                            onChange={event => setRuleForm({ ...ruleForm, priceMultiplier: event.target.value })}
                                            className="w-full p-3 pl-11 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-none focus:border-emerald-500"
                                            required
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2 font-medium">
                                        Vi du: 1.2 = tang 20%, 0.8 = giam 20%
                                    </p>
                                </label>

                                <label className="block">
                                    <span className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Mo ta (tuy chon)</span>
                                    <input
                                        type="text"
                                        value={ruleForm.description}
                                        onChange={event => setRuleForm({ ...ruleForm, description: event.target.value })}
                                        placeholder="Vi du: Gia cao diem mua le"
                                        className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-none focus:border-emerald-500"
                                    />
                                </label>

                                <button
                                    type="submit"
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus size={22} />
                                    Tao rule
                                </button>
                            </form>

                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900">Pricing Rules hien tai</h2>
                                        <p className="text-sm font-medium text-slate-500 mt-1">Quan ly cac quy tac dieu chinh gia.</p>
                                    </div>
                                    <button
                                        onClick={() => fetchPricingRules()}
                                        disabled={loading}
                                        className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 text-white font-black text-sm hover:bg-emerald-600 transition-all disabled:bg-slate-300"
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                                        Tai lai
                                    </button>
                                </div>

                                {pricingRules.length === 0 ? (
                                    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                                        <TrendingUp className="mx-auto mb-4 text-slate-300" size={56} />
                                        <p className="font-bold text-slate-500">Chua co pricing rule nao. Tao rule moi de dieu chinh gia theo mua.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {pricingRules.map(rule => {
                                            const percentChange = ((rule.priceMultiplier - 1) * 100).toFixed(0);
                                            const isIncrease = rule.priceMultiplier > 1;

                                            return (
                                                <div
                                                    key={rule.ruleId}
                                                    className="p-4 rounded-xl border-2 border-slate-100 bg-slate-50 hover:border-emerald-200 transition-all"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-black ${
                                                                    isIncrease 
                                                                        ? 'bg-red-100 text-red-700' 
                                                                        : 'bg-green-100 text-green-700'
                                                                }`}>
                                                                    {isIncrease ? '+' : ''}{percentChange}%
                                                                </span>
                                                                <span className="text-xs font-bold text-slate-500">
                                                                    x{rule.priceMultiplier}
                                                                </span>
                                                            </div>
                                                            <div className="text-sm font-bold text-slate-700 mb-1">
                                                                {formatVietnameseDate(rule.startDate)} - {formatVietnameseDate(rule.endDate)}
                                                            </div>
                                                            {rule.description && (
                                                                <div className="text-xs font-medium text-slate-500">
                                                                    {rule.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeletePricingRule(rule.ruleId)}
                                                            className="inline-flex items-center justify-center size-10 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all"
                                                            title="Xoa rule"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ManageAvailability;
