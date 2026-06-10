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
    TrendingUp,
    CheckCircle,
    XCircle,
    Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getDateAfterMonthsVietnam, getTodayVietnam } from '../../utils/dateUtils';
import { formatVietnameseDate, formatVietnameseCurrency } from '../../utils/dateTimeUtils';

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
    const [activeTab, setActiveTab] = useState<'bulk' | 'rules'>('bulk');

    // Custom Modal states
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedRuleIdForDelete, setSelectedRuleIdForDelete] = useState<number | null>(null);

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

    // Lock body scroll when modals are open
    useEffect(() => {
        if (showSuccessModal || showErrorModal || showDeleteModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showSuccessModal, showErrorModal, showDeleteModal]);

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
            console.error('Lỗi tải danh sách dịch vụ:', error);
            setErrorMessage('Không thể tải danh sách dịch vụ của đối tác.');
            setShowErrorModal(true);
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
            console.error('Lỗi tải lịch tồn kho:', error);
            setErrorMessage('Không thể tải dữ liệu lịch bán và tồn kho.');
            setShowErrorModal(true);
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
            console.error('Lỗi tải pricing rules:', error);
        }
    };

    const handleBulkSet = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!selectedServiceId) {
            setErrorMessage('Vui lòng chọn dịch vụ trước khi thực hiện.');
            setShowErrorModal(true);
            return;
        }

        if (bulkForm.startDate > bulkForm.endDate) {
            setErrorMessage('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.');
            setShowErrorModal(true);
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
            setSuccessMessage('✅ Cập nhật lịch bán hàng loạt thành công!');
            setShowSuccessModal(true);
        } catch (error: any) {
            setErrorMessage(error.response?.data?.message || 'Không thể cập nhật lịch bán.');
            setShowErrorModal(true);
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
            setErrorMessage(error.response?.data?.message || 'Không thể cập nhật thông tin ngày này.');
            setShowErrorModal(true);
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
            setErrorMessage('Vui lòng chọn dịch vụ.');
            setShowErrorModal(true);
            return;
        }

        if (ruleForm.startDate > ruleForm.endDate) {
            setErrorMessage('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.');
            setShowErrorModal(true);
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

            setSuccessMessage('✅ Tạo quy tắc điều chỉnh giá thành công!');
            setShowSuccessModal(true);
        } catch (error: any) {
            setErrorMessage(error.response?.data?.message || 'Không thể tạo quy tắc điều chỉnh giá.');
            setShowErrorModal(true);
        }
    };

    const handleDeletePricingRuleClick = (ruleId: number) => {
        setSelectedRuleIdForDelete(ruleId);
        setShowDeleteModal(true);
    };

    const handleDeletePricingRuleConfirm = async () => {
        if (!selectedRuleIdForDelete) return;

        try {
            await axiosClient.delete(`/pricing/rule/${selectedRuleIdForDelete}`);
            await fetchPricingRules(selectedServiceId);
            await fetchAvailabilities(selectedServiceId);
            setShowDeleteModal(false);
            setSuccessMessage('✅ Đã xóa quy tắc điều chỉnh giá thành công!');
            setShowSuccessModal(true);
        } catch (error: any) {
            setErrorMessage(error.response?.data?.message || 'Không thể xóa quy tắc điều chỉnh giá.');
            setShowErrorModal(true);
        } finally {
            setSelectedRuleIdForDelete(null);
        }
    };

    if (fetching) {
        return (
            <div className="flex justify-center items-center min-h-[60vh] bg-slate-50 dark:bg-slate-900">
                <Loader2 className="animate-spin text-emerald-600 dark:text-emerald-400" size={40} />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 text-left">
            <button 
                onClick={() => navigate(-1)} 
                className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-bold mb-8 transition-colors duration-250 active:scale-95 cursor-pointer"
            >
                <ArrowLeft size={20} /> Quay lại trang trước
            </button>

            <div className="bg-emerald-600 dark:bg-emerald-700 rounded-[2.5rem] p-8 text-white mb-8 shadow-md">
                <div className="flex items-center gap-3 mb-3">
                    <Calendar size={32} />
                    <h1 className="text-3xl font-black tracking-tight uppercase">Quản lý lịch bán dịch vụ</h1>
                </div>
                <p className="text-emerald-50 font-medium max-w-3xl">
                    Thiết lập tồn kho và giá bán theo khoảng ngày, áp dụng phụ thu cuối tuần khi cần, và tinh chỉnh chi tiết từng ngày trong lịch bán.
                </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
                <label className="block text-xs font-black text-slate-400 dark:text-slate-555 uppercase tracking-widest mb-3">
                    Chọn dịch vụ cần thiết lập
                </label>
                <select
                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500 cursor-pointer"
                    value={selectedServiceId ?? ''}
                    onChange={event => setSelectedServiceId(Number(event.target.value))}
                >
                    {services.length === 0 ? (
                        <option value="">Chưa có dịch vụ nào</option>
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
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-2 mb-6">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setActiveTab('bulk')}
                                className={`flex-1 py-3 px-4 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                    activeTab === 'bulk'
                                        ? 'bg-emerald-600 text-white shadow-md'
                                        : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                <Sparkles size={18} />
                                Thiết lập nhanh & Lịch bán
                            </button>
                            <button
                                onClick={() => setActiveTab('rules')}
                                className={`flex-1 py-3 px-4 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                    activeTab === 'rules'
                                        ? 'bg-emerald-600 text-white shadow-md'
                                        : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-355 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                <TrendingUp size={18} />
                                Quy tắc tăng/giảm giá (Rules)
                            </button>
                        </div>
                    </div>

                    {/* Bulk Set Tab */}
                    {activeTab === 'bulk' && (
                        <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
                            <form onSubmit={handleBulkSet} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6 h-fit">
                                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/60 pb-3">
                                    <Sparkles className="text-emerald-600 dark:text-emerald-400" size={24} />
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Thiết lập hàng loạt</h2>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <label className="block">
                                        <span className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Từ ngày</span>
                                        <input
                                            type="date"
                                            value={bulkForm.startDate}
                                            onChange={event => setBulkForm({ ...bulkForm, startDate: event.target.value })}
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                                            required
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Đến ngày</span>
                                        <input
                                            type="date"
                                            value={bulkForm.endDate}
                                            onChange={event => setBulkForm({ ...bulkForm, endDate: event.target.value })}
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                                            required
                                        />
                                    </label>
                                </div>

<label className="block">
    <span className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Giá bán gốc (VNĐ)</span>
    <div className="relative">
        <DollarSign className="absolute left-4 top-3.5 text-slate-400" size={18} />
        <input
            type="number"
            min="0"
            value={bulkForm.price}
            onChange={event => setBulkForm({ ...bulkForm, price: event.target.value })}
            className="w-full p-3 pl-11 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
            required
        />
    </div>
</label>
                              <label className="block">
    <span className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Tổng Stock (Số lượng)</span>
    <div className="relative">
        <Package className="absolute left-4 top-3.5 text-slate-400" size={18} />
        <input
            type="number"
            value={bulkForm.stock}
            onChange={event => setBulkForm({ ...bulkForm, stock: event.target.value })}
            className="w-full p-3 pl-11 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white outline-none"
            required
        />
    </div>
</label>

                                <label className="block">
                                    <span className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Số lượng chỗ tối đa (Stock)</span>
                                    <div className="relative">
                                        <Package className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                        <input
                                            type="number"
                                            min="0"
                                            value={bulkForm.stock}
                                            onChange={event => setBulkForm({ ...bulkForm, stock: event.target.value })}
                                            placeholder="Ví dụ: 50"
                                            className="w-full p-3 pl-11 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                                            required
                                        />
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={bulkForm.applyWeekendPricing}
                                        onChange={event => setBulkForm({ ...bulkForm, applyWeekendPricing: event.target.checked })}
                                        className="size-5 accent-emerald-600"
                                    />
                                    <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">Phụ thu cuối tuần (Thứ 7 & Chủ Nhật)</span>
                                </label>

                                {bulkForm.applyWeekendPricing && (
                                    <label className="block animate-in slide-in-from-top-3 duration-200">
                                        <span className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Hệ số nhân cuối tuần (Ví dụ: 1.2 = tăng 20%)</span>
                                        <input
                                            type="number"
                                            min="1"
                                            step="0.05"
                                            value={bulkForm.weekendMultiplier}
                                            onChange={event => setBulkForm({ ...bulkForm, weekendMultiplier: event.target.value })}
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                                            required
                                        />
                                    </label>
                                )}

                                <button
                                    type="submit"
                                    disabled={savingBulk}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black shadow-lg shadow-emerald-100 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2 disabled:bg-slate-350 dark:disabled:bg-slate-800 cursor-pointer"
                                >
                                    {savingBulk ? (
                                        <>
                                            <Loader2 className="animate-spin" size={20} />
                                            Đang xử lý...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={20} />
                                            Cập nhật hàng loạt
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-slate-100 dark:border-slate-700/60 pb-4">
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 dark:text-white">Lịch bán 2 tháng tới</h2>
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Sửa trực tiếp giá bán hoặc tồn kho của từng ngày.</p>
                                    </div>
                                    <button
                                        onClick={() => fetchAvailabilities()}
                                        disabled={loading}
                                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-emerald-600 dark:hover:bg-emerald-600 text-white font-black text-sm transition-all disabled:opacity-50 cursor-pointer"
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                                        Tải lại lịch
                                    </button>
                                </div>

                                {loading ? (
                                    <div className="flex justify-center py-24">
                                        <Loader2 className="animate-spin text-emerald-600" size={40} />
                                    </div>
                                ) : availabilities.length === 0 ? (
                                    <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-12 text-center">
                                        <Calendar className="mx-auto mb-4 text-slate-350 dark:text-slate-500" size={56} />
                                        <p className="font-bold text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                                            Chưa có lịch bán nào được khởi tạo. Hãy điền form bên trái để tạo lịch bán tự động cho các ngày.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-slate-900 dark:bg-slate-950 text-white">
                                                    <th className="p-3.5 text-left font-black">Ngày sử dụng</th>
                                                    <th className="p-3.5 text-right font-black">Giá gốc (VNĐ)</th>
                                                    <th className="p-3.5 text-right font-black">Giá bán hiển thị</th>
                                                    <th className="p-3.5 text-right font-black">Tổng chỗ (Stock)</th>
                                                    <th className="p-3.5 text-right font-black">Đã đặt</th>
                                                    <th className="p-3.5 text-right font-black">Còn lại</th>
                                                    <th className="p-3.5 text-center font-black">Lưu</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {availabilities.map(item => {
                                                    const edit = editState[item.availId];
                                                    const hasPricingRule = item.price !== item.basePrice;

                                                    return (
                                                        <tr key={item.availId} className={`border-b border-slate-100 dark:border-slate-700/60 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 ${isWeekend(item.date) ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`}>
                                                            <td className="p-3.5 font-bold text-slate-700 dark:text-slate-300">
                                                                <div>{formatVietnameseDate(item.date)}</div>
                                                                {isWeekend(item.date) && (
                                                                    <span className="inline-flex mt-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider">
                                                                        Cuối tuần
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="p-3.5 text-right">
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
                                                                    className="w-32 p-2 text-right rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                                />
                                                            </td>
                                                            <td className="p-3.5 text-right">
                                                                <div className="font-black text-emerald-600 dark:text-emerald-400">
                                                                    {formatVietnameseCurrency(item.price)}₫
                                                                </div>
                                                                {hasPricingRule && (
                                                                    <div className="text-[10px] font-black text-purple-600 dark:text-purple-400 flex items-center justify-end gap-1 mt-0.5">
                                                                        <Info size={10} /> Đã áp quy tắc giá
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="p-3.5 text-right">
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
                                                                    className="w-20 p-2 text-right rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                                />
                                                            </td>
                                                            <td className="p-3.5 text-right font-bold text-blue-600 dark:text-blue-400">{item.bookedCount}</td>
                                                            <td className="p-3.5 text-right font-black text-slate-900 dark:text-white">{item.remaining}</td>
                                                            <td className="p-3.5 text-center">
                                                                <button
                                                                    onClick={() => handleUpdateDay(item.availId)}
                                                                    disabled={edit?.saving}
                                                                    className="inline-flex items-center justify-center size-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                                                                    title="Lưu thay đổi ngày này"
                                                                >
                                                                    {edit?.saving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={18} />}
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
                            <form onSubmit={handleCreatePricingRule} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6 h-fit">
                                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/60 pb-3">
                                    <TrendingUp className="text-emerald-600 dark:text-emerald-400" size={24} />
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Tạo quy tắc giá mới</h2>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <label className="block">
                                        <span className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Từ ngày</span>
                                        <input
                                            type="date"
                                            value={ruleForm.startDate}
                                            onChange={event => setRuleForm({ ...ruleForm, startDate: event.target.value })}
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                                            required
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Đến ngày</span>
                                        <input
                                            type="date"
                                            value={ruleForm.endDate}
                                            onChange={event => setRuleForm({ ...ruleForm, endDate: event.target.value })}
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                                            required
                                        />
                                    </label>
                                </div>

                                <label className="block">
                                    <span className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Hệ số giá điều chỉnh (Multiplier)</span>
                                    <div className="relative">
                                        <TrendingUp className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                        <input
                                            type="number"
                                            min="0.1"
                                            step="0.05"
                                            value={ruleForm.priceMultiplier}
                                            onChange={event => setRuleForm({ ...ruleForm, priceMultiplier: event.target.value })}
                                            className="w-full p-3 pl-11 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                                            required
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-450 mt-2 font-medium">
                                        Ví dụ: <span className="font-bold">1.2</span> = tăng 20% giá gốc, <span className="font-bold">0.8</span> = giảm 20% giá gốc
                                    </p>
                                </label>

                                <label className="block">
                                    <span className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Mô tả quy tắc (Tùy chọn)</span>
                                    <input
                                        type="text"
                                        value={ruleForm.description}
                                        onChange={event => setRuleForm({ ...ruleForm, description: event.target.value })}
                                        placeholder="Ví dụ: Phụ thu dịp Quốc khánh 2/9, kích cầu mùa đông..."
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                                    />
                                </label>

                                <button
                                    type="submit"
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black shadow-lg shadow-emerald-100 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <Plus size={20} />
                                    Tạo quy tắc giá
                                </button>
                            </form>

                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                                <div className="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-700/60 pb-4">
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 dark:text-white">Quy tắc điều chỉnh giá hiện tại</h2>
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Danh sách quy tắc giá đang được áp dụng theo thời điểm.</p>
                                    </div>
                                    <button
                                        onClick={() => fetchPricingRules()}
                                        disabled={loading}
                                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-emerald-600 dark:hover:bg-emerald-600 text-white font-black text-sm transition-all disabled:opacity-50 cursor-pointer"
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                                        Tải lại
                                    </button>
                                </div>

                                {pricingRules.length === 0 ? (
                                    <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-12 text-center">
                                        <TrendingUp className="mx-auto mb-4 text-slate-300" size={56} />
                                        <p className="font-bold text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                                            Chưa có quy tắc điều chỉnh giá nào. Hãy tạo quy tắc ở bảng bên để tự động tăng/giảm giá bán.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {pricingRules.map(rule => {
                                            const percentChange = ((rule.priceMultiplier - 1) * 100).toFixed(0);
                                            const isIncrease = rule.priceMultiplier > 1;

                                            return (
                                                <div
                                                    key={rule.ruleId}
                                                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all flex flex-col justify-between"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-black ${
                                                                    isIncrease 
                                                                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400' 
                                                                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                                                                }`}>
                                                                    {isIncrease ? '+' : ''}{percentChange}%
                                                                </span>
                                                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                                                                    Hệ số nhân: x{rule.priceMultiplier}
                                                                </span>
                                                            </div>
                                                            <div className="text-sm font-black text-slate-800 dark:text-slate-200 mb-1">
                                                                {formatVietnameseDate(rule.startDate)} - {formatVietnameseDate(rule.endDate)}
                                                            </div>
                                                            {rule.description && (
                                                                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 italic">
                                                                    &ldquo;{rule.description}&rdquo;
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeletePricingRuleClick(rule.ruleId)}
                                                            className="inline-flex items-center justify-center size-9 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white transition-all cursor-pointer active:scale-95 shrink-0"
                                                            title="Xóa quy tắc này"
                                                        >
                                                            <Trash2 size={16} />
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

            {/* Custom Delete Rule Modal */}
            {showDeleteModal && (
                <div 
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto"
                    onClick={() => setShowDeleteModal(false)}
                >
                    <div 
                        className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center mb-6">
                            <div className="mx-auto w-16 h-16 bg-rose-100 dark:bg-rose-950/40 rounded-full flex items-center justify-center mb-4">
                                <Trash2 className="text-rose-600 dark:text-rose-400" size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Xóa quy tắc giá</h2>
                            <p className="text-slate-600 dark:text-slate-400">
                                Bạn có chắc chắn muốn xóa quy tắc điều chỉnh giá này?
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                                Giá dịch vụ của các ngày nằm trong quy tắc này sẽ quay về giá gốc.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-black hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors duration-300 cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleDeletePricingRuleConfirm}
                                className="flex-1 px-6 py-3 rounded-2xl bg-rose-600 text-white font-black hover:bg-rose-700 transition-colors duration-300 cursor-pointer"
                            >
                                Xác nhận xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Success Modal */}
            {showSuccessModal && (
                <div 
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto"
                    onClick={() => setShowSuccessModal(false)}
                >
                    <div 
                        className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-700 animate-in zoom-in duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center font-bold">
                            <div className="mx-auto w-20 h-20 bg-emerald-100 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mb-4 animate-bounce">
                                <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Thành công!</h2>
                            <p className="text-slate-600 dark:text-slate-400 mb-6 font-medium">
                                {successMessage}
                            </p>
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full px-6 py-3 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-700 transition-colors duration-300 cursor-pointer active:scale-95"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Error Modal */}
            {showErrorModal && (
                <div 
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto"
                    onClick={() => setShowErrorModal(false)}
                >
                    <div 
                        className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-700"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center font-bold">
                            <div className="mx-auto w-20 h-20 bg-rose-100 dark:bg-rose-950/40 rounded-full flex items-center justify-center mb-4">
                                <XCircle className="text-rose-600 dark:text-rose-400" size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Lỗi xảy ra!</h2>
                            <p className="text-slate-600 dark:text-slate-400 mb-6 font-medium">
                                {errorMessage}
                            </p>
                            <button
                                onClick={() => setShowErrorModal(false)}
                                className="w-full px-6 py-3 rounded-2xl bg-rose-600 text-white font-black hover:bg-rose-700 transition-colors duration-300 cursor-pointer active:scale-95"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageAvailability;
