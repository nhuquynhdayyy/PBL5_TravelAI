import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { Calendar, DollarSign, Package, Save, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ManageAvailability = () => {
    const navigate = useNavigate();
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    // Form State
    const [formData, setFormData] = useState({
        serviceId: '',
        date: '',
        price: '',
        stock: ''
    });

    useEffect(() => {
        // Lấy danh sách dịch vụ của Partner để chọn
        axiosClient.get('/services/my-services')
            .then(res => {
                setServices(res.data);
                setFetching(false);
            })
            .catch(err => console.error(err));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.serviceId) { alert("Vui lòng chọn dịch vụ!"); return; }
    
        try {
            setLoading(true);
            await axiosClient.post('/availability/set', {
                serviceId: parseInt(formData.serviceId),
                date: formData.date,
                price: parseFloat(formData.price),
                stock: parseInt(formData.stock)
            });
            
            alert("Thiết lập thành công!");
            
            // CHUYỂN HƯỚNG VỀ TRANG CONSOLE CỦA DỊCH VỤ ĐÓ
            navigate(`/partner/services/${formData.serviceId}/manage`);
            
        } catch (err) {
            alert("Lỗi khi thiết lập dữ liệu!");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-3xl mx-auto py-10 px-4 text-left">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 font-bold mb-8">
                <ArrowLeft size={20} /> Quay lại
            </button>

            <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
                <div className="bg-emerald-600 p-10 text-white">
                    <h2 className="text-3xl font-black tracking-tight">THIẾT LẬP LỊCH BÁN</h2>
                    <p className="opacity-80 mt-2 font-medium">Thiết lập ngày mở bán và số lượng chỗ cho khách hàng</p>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-8">
                    {/* Chọn dịch vụ */}
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">1. Chọn dịch vụ muốn mở bán</label>
                        <select 
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-emerald-500"
                            onChange={e => setFormData({...formData, serviceId: e.target.value})}
                        >
                            <option value="">-- Danh sách khách sạn / tour của bạn --</option>
                            {services.map(s => <option key={s.serviceId} value={s.serviceId}>{s.name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Chọn ngày */}
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">2. Ngày mở bán</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-4 text-slate-400" size={20} />
                                <input 
                                    type="date" 
                                    className="w-full p-4 pl-12 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-emerald-500"
                                    onChange={e => setFormData({...formData, date: e.target.value})}
                                    required
                                />
                            </div>
                        </div>

                        {/* Số lượng */}
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">3. Số lượng chỗ (Stock)</label>
                            <div className="relative">
                                <Package className="absolute left-4 top-4 text-slate-400" size={20} />
                                <input 
                                    type="number" 
                                    placeholder="Ví dụ: 10"
                                    className="w-full p-4 pl-12 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-emerald-500"
                                    onChange={e => setFormData({...formData, stock: e.target.value})}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Giá tiền cho ngày này */}
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">4. Giá bán cho ngày này (VNĐ)</label>
                        <div className="relative">
                            <DollarSign className="absolute left-4 top-4 text-slate-400" size={20} />
                            <input 
                                type="number" 
                                placeholder="Ví dụ: 1200000"
                                className="w-full p-4 pl-12 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-emerald-500"
                                onChange={e => setFormData({...formData, price: e.target.value})}
                                required
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 italic">* Bạn có thể thiết lập giá khác nhau cho các ngày lễ hoặc cuối tuần</p>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-emerald-100 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Save size={24} />}
                        LƯU THIẾT LẬP LỊCH
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ManageAvailability;