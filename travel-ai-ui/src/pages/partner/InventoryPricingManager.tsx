import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { Calendar, DollarSign, Package, Save, ArrowLeft, Loader2, Plus, Trash2, TrendingUp, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Service {
    serviceId: number;
    name: string;
    serviceType: string;
}

interface Availability {
    availId: number;
    date: string;
    price: number;
    basePrice: number;
    totalStock: number;
    bookedCount: number;
    heldCount: number;
    remaining: number;
}

interface PricingRule {
    ruleId: number;
    startDate: string;
    endDate: string;
    priceMultiplier: number;
    description: string;
}

const InventoryPricingManager = () => {
    const navigate = useNavigate();
    const [services, setServices] = useState<Service[]>([]);
    const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
    const [availabilities, setAvailabilities] = useState<Availability[]>([]);
    const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'bulk' | 'calendar' | 'rules'>('bulk');

    // Bulk Set Form
    const [bulkForm, setBulkForm] = useState({
        startDate: '',
        endDate: '',
        price: '',
        stock: ''
    });

    // Pricing Rule Form
    const [ruleForm, setRuleForm] = useState({
        startDate: '',
        endDate: '',
        priceMultiplier: '',
        description: ''
    });

    useEffect(() => {
        fetchServices();
    }, []);

    useEffect(() => {
        if (selectedServiceId) {
            fetchAvailabilities();
            fetchPricingRules();
        }
    }, [selectedServiceId]);

    const fetchServices = async () => {
        try {
            const res = await axiosClient.get('/services/my-services');
            setServices(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchAvailabilities = async () => {
        if (!selectedServiceId) return;
        try {
            const today = new Date().toISOString().split('T')[0];
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 2);
            const res = await axiosClient.get(`/availability/my-services?startDate=${today}&endDate=${endDate.toISOString().split('T')[0]}`);
            const serviceData = res.data.find((s: any) => s.serviceId === selectedServiceId);
            setAvailabilities(serviceData?.availabilities || []);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchPricingRules = async () => {
        if (!selectedServiceId) return;
        try {
            const res = await axiosClient.get(`/pricing/rules/${selectedServiceId}`);
            setPricingRules(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleBulkSet = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedServiceId) {
            alert('Vui lòng chọn dịch vụ!');
            return;
        }

        try {
            setLoading(true);
            await axiosClient.post('/availability/bulk-set', {
                serviceId: selectedServiceId,
                startDate: bulkForm.startDate,
                endDate: bulkForm.endDate,
                price: parseFloat(bulkForm.price),
                stock: parseInt(bulkForm.stock)
            });
            alert('✅ Đã cập nhật thành công! Giá cuối tuần tự động tăng 20%');
            fetchAvailabilities();
            setBulkForm({ startDate: '', endDate: '', price: '', stock: '' });
        } catch (err: any) {
            alert('❌ Lỗi: ' + (err.response?.data?.message || 'Không thể cập nhật'));
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedServiceId) return;

        try {
            setLoading(true);
            await axiosClient.post('/pricing/seasonal-rule', {
                serviceId: selectedServiceId,
                startDate: ruleForm.startDate,
                endDate: ruleForm.endDate,
                priceMultiplier: parseFloat(ruleForm.priceMultiplier),
                description: ruleForm.description
            });
            alert('✅ Đã tạo pricing rule thành công!');
            fetchPricingRules();
            setRuleForm({ startDate: '', endDate: '', priceMultiplier: '', description: '' });
        } catch (err: any) {
            alert('❌ Lỗi: ' + (err.response?.data?.message || 'Không thể tạo rule'));
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRule = async (ruleId: number) => {
        if (!confirm('Xóa pricing rule này?')) return;
        try {
            await axiosClient.delete(`/pricing/rule/${ruleId}`);
            alert('✅ Đã xóa rule');
            fetchPricingRules();
        } catch (err) {
            alert('❌ Không thể xóa rule');
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('vi-VN');
    };

    const isWeekend = (dateStr: string) => {
        const day = new Date(dateStr).getDay();
        return day === 0 || day === 6;
    };

    return (
        <div className="max-w-7xl mx-auto py-10 px-4">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 font-bold mb-6">
                <ArrowLeft size={20} /> Quay lại
            </button>

            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 text-white mb-8">
                <h1 className="text-4xl font-black mb-2">📦 Quản Lý Tồn Kho & Giá</h1>
                <p className="text-blue-100">Thiết lập giá, tồn kho và pricing rules cho dịch vụ của bạn</p>
            </div>

            {/* Service Selector */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-3">Chọn dịch vụ:</label>
                <select 
                    className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-semibold outline-none focus:border-blue-500"
                    value={selectedServiceId || ''}
                    onChange={e => setSelectedServiceId(parseInt(e.target.value))}
                >
                    <option value="">-- Chọn khách sạn / tour --</option>
                    {services.map(s => (
                        <option key={s.serviceId} value={s.serviceId}>
                            {s.name} ({s.serviceType})
                        </option>
                    ))}
                </select>
            </div>

            {selectedServiceId && (
                <>
                    {/* Tabs */}
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setActiveTab('bulk')}
                            className={`px-6 py-3 rounded-xl font-bold transition-all ${
                                activeTab === 'bulk' 
                                    ? 'bg-blue-600 text-white shadow-lg' 
                                    : 'bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            📅 Bulk Set
                        </button>
                        <button
                            onClick={() => setActiveTab('calendar')}
                            className={`px-6 py-3 rounded-xl font-bold transition-all ${
                                activeTab === 'calendar' 
                                    ? 'bg-blue-600 text-white shadow-lg' 
                                    : 'bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            📊 Lịch Tồn Kho
                        </button>
                        <button
                            onClick={() => setActiveTab('rules')}
                            className={`px-6 py-3 rounded-xl font-bold transition-all ${
                                activeTab === 'rules' 
                                    ? 'bg-blue-600 text-white shadow-lg' 
                                    : 'bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            💰 Pricing Rules
                        </button>
                    </div>

                    {/* Bulk Set Tab */}
                    {activeTab === 'bulk' && (
                        <div className="bg-white rounded-2xl shadow-lg p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <Sparkles className="text-blue-600" size={28} />
                                <h2 className="text-2xl font-black">Set Giá Cho Nhiều Ngày</h2>
                            </div>
                            <p className="text-slate-600 mb-6">Tự động tăng giá 20% cho cuối tuần (Thứ 7 & Chủ nhật)</p>

                            <form onSubmit={handleBulkSet} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Từ ngày:</label>
                                        <input 
                                            type="date" 
                                            className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500"
                                            value={bulkForm.startDate}
                                            onChange={e => setBulkForm({...bulkForm, startDate: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Đến ngày:</label>
                                        <input 
                                            type="date" 
                                            className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500"
                                            value={bulkForm.endDate}
                                            onChange={e => setBulkForm({...bulkForm, endDate: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Giá (VNĐ):</label>
                                        <input 
                                            type="number" 
                                            placeholder="500000"
                                            className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500"
                                            value={bulkForm.price}
                                            onChange={e => setBulkForm({...bulkForm, price: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Số lượng:</label>
                                        <input 
                                            type="number" 
                                            placeholder="10"
                                            className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500"
                                            value={bulkForm.stock}
                                            onChange={e => setBulkForm({...bulkForm, stock: e.target.value})}
                                            required
                                        />
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : <Save size={24} />}
                                    CẬP NHẬT HÀNG LOẠT
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Calendar Tab */}
                    {activeTab === 'calendar' && (
                        <div className="bg-white rounded-2xl shadow-lg p-8">
                            <h2 className="text-2xl font-black mb-6">📊 Lịch Tồn Kho 2 Tháng Tới</h2>
                            
                            {availabilities.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <Calendar size={64} className="mx-auto mb-4 opacity-30" />
                                    <p className="font-semibold">Chưa có dữ liệu. Hãy dùng Bulk Set để tạo!</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-slate-50">
                                                <th className="p-3 text-left font-bold">Ngày</th>
                                                <th className="p-3 text-right font-bold">Giá Base</th>
                                                <th className="p-3 text-right font-bold">Giá Cuối Cùng</th>
                                                <th className="p-3 text-right font-bold">Tổng</th>
                                                <th className="p-3 text-right font-bold">Đã đặt</th>
                                                <th className="p-3 text-right font-bold">Đang giữ</th>
                                                <th className="p-3 text-right font-bold">Còn lại</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {availabilities.map(avail => {
                                                const hasPricingRule = avail.price !== avail.basePrice;
                                                return (
                                                <tr 
                                                    key={avail.availId} 
                                                    className={`border-b hover:bg-slate-50 ${isWeekend(avail.date) ? 'bg-blue-50' : ''}`}
                                                >
                                                    <td className="p-3 font-semibold">
                                                        {formatDate(avail.date)}
                                                        {isWeekend(avail.date) && <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded">Cuối tuần</span>}
                                                    </td>
                                                    <td className="p-3 text-right text-slate-600">{formatCurrency(avail.basePrice)}</td>
                                                    <td className="p-3 text-right">
                                                        <div className="font-bold text-blue-600">{formatCurrency(avail.price)}</div>
                                                        {hasPricingRule && (
                                                            <div className="text-xs text-purple-600 font-semibold">
                                                                +{(((avail.price - avail.basePrice) / avail.basePrice) * 100).toFixed(0)}%
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-right">{avail.totalStock}</td>
                                                    <td className="p-3 text-right text-green-600 font-semibold">{avail.bookedCount}</td>
                                                    <td className="p-3 text-right text-orange-600">{avail.heldCount}</td>
                                                    <td className="p-3 text-right font-bold">{avail.remaining}</td>
                                                </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pricing Rules Tab */}
                    {activeTab === 'rules' && (
                        <div className="space-y-6">
                            {/* Create Rule Form */}
                            <div className="bg-white rounded-2xl shadow-lg p-8">
                                <div className="flex items-center gap-3 mb-6">
                                    <TrendingUp className="text-purple-600" size={28} />
                                    <h2 className="text-2xl font-black">Tạo Pricing Rule Mới</h2>
                                </div>

                                <form onSubmit={handleCreateRule} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Từ ngày:</label>
                                            <input 
                                                type="date" 
                                                className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-purple-500"
                                                value={ruleForm.startDate}
                                                onChange={e => setRuleForm({...ruleForm, startDate: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Đến ngày:</label>
                                            <input 
                                                type="date" 
                                                className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-purple-500"
                                                value={ruleForm.endDate}
                                                onChange={e => setRuleForm({...ruleForm, endDate: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Hệ số nhân (VD: 1.3 = +30%):</label>
                                            <input 
                                                type="number" 
                                                step="0.1"
                                                placeholder="1.3"
                                                className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-purple-500"
                                                value={ruleForm.priceMultiplier}
                                                onChange={e => setRuleForm({...ruleForm, priceMultiplier: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Mô tả:</label>
                                            <input 
                                                type="text" 
                                                placeholder="Giá mùa hè"
                                                className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-purple-500"
                                                value={ruleForm.description}
                                                onChange={e => setRuleForm({...ruleForm, description: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={loading}
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : <Plus size={24} />}
                                        TẠO PRICING RULE
                                    </button>
                                </form>
                            </div>

                            {/* Rules List */}
                            <div className="bg-white rounded-2xl shadow-lg p-8">
                                <h3 className="text-xl font-black mb-4">📋 Danh Sách Rules Hiện Tại</h3>
                                
                                {pricingRules.length === 0 ? (
                                    <p className="text-slate-400 text-center py-8">Chưa có pricing rule nào</p>
                                ) : (
                                    <div className="space-y-4">
                                        {pricingRules.map(rule => (
                                            <div key={rule.ruleId} className="border-2 border-slate-200 rounded-xl p-4 flex items-center justify-between hover:border-purple-300 transition-all">
                                                <div>
                                                    <h4 className="font-bold text-lg">{rule.description || 'Pricing Rule'}</h4>
                                                    <p className="text-sm text-slate-600">
                                                        {formatDate(rule.startDate)} → {formatDate(rule.endDate)}
                                                    </p>
                                                    <p className="text-sm font-semibold text-purple-600 mt-1">
                                                        Hệ số: ×{rule.priceMultiplier} ({((rule.priceMultiplier - 1) * 100).toFixed(0)}%)
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteRule(rule.ruleId)}
                                                    className="p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            </div>
                                        ))}
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

export default InventoryPricingManager;
