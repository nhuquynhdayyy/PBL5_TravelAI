// src/pages/Admin/ServiceForm.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { Save, ArrowLeft, Upload, Loader2, Hotel, Compass, MapPin, DollarSign, AlignLeft } from 'lucide-react';

const ServiceForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '', 
        description: '', 
        basePrice: '', 
        serviceType: '0', 
        spotId: ''
    });
    const [images, setImages] = useState<FileList | null>(null);
    const [previews, setPreviews] = useState<string[]>([]);

    useEffect(() => {
        if (id) {
            const fetchService = async () => {
                setFetching(true);
                try {
                    const res = await axiosClient.get(`/services/${id}`);
                    const data = res.data;
                    setFormData({
                        name: data.name || '',
                        description: data.description || '',
                        basePrice: data.basePrice?.toString() || '',
                        serviceType: data.serviceType === "Hotel" ? "0" : "1",
                        spotId: data.spotId?.toString() || ''
                    });
                    if (data.imageUrls) {
                        setPreviews(data.imageUrls.map((u: string) => `http://localhost:5134${u}`));
                    }
                } catch (err) { console.error(err); }
                finally { setFetching(false); }
            };
            fetchService();
        }
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const data = new FormData();
        data.append('Name', formData.name);
        data.append('Description', formData.description || '');
        data.append('BasePrice', formData.basePrice);
        data.append('ServiceType', formData.serviceType); 
        data.append('Latitude', '0');
        data.append('Longitude', '0');
        
        if (formData.spotId) data.append('SpotId', formData.spotId);

        if (images && images.length > 0) {
            Array.from(images).forEach(file => {
                data.append('Images', file);
            });
        }

        try {
            if (id) {
                await axiosClient.put(`/services/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
            } else {
                await axiosClient.post('/services', data, { headers: { 'Content-Type': 'multipart/form-data' } });
            }
            alert("Lưu dữ liệu thành công!");
            navigate('/partner/services');
        } catch (err) {
            alert("Lỗi khi lưu dữ liệu. Vui lòng kiểm tra lại!");
        } finally { setLoading(false); }
    };

    if (fetching) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="animate-spin text-blue-500" size={48} />
            <p className="text-slate-400 font-bold">Đang tải dữ liệu dịch vụ...</p>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto py-10 px-4">
            {/* Nút quay lại */}
            <div className="mb-8">
                <button 
                    onClick={() => navigate(-1)} 
                    className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold transition-all group"
                >
                    <div className="p-2 bg-white rounded-xl shadow-sm group-hover:bg-blue-50 transition-colors">
                        <ArrowLeft size={20} />
                    </div>
                    Quay lại
                </button>
            </div>

            <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
                {/* Header Card */}
                <div className="bg-slate-900 p-10 text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-4xl font-black tracking-tighter mb-2">
                            {id ? "Chỉnh sửa dịch vụ" : "Đăng dịch vụ mới"}
                        </h2>
                        <p className="text-slate-400 font-medium italic">"Thông tin chính xác giúp dịch vụ của bạn dễ dàng được duyệt hơn"</p>
                    </div>
                    <div className="absolute top-0 right-0 p-10 opacity-10">
                        {formData.serviceType === '0' ? <Hotel size={120}/> : <Compass size={120}/>}
                    </div>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-10 space-y-8 text-left">
                    {/* Tên dịch vụ */}
                    <div>
                        <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                            <AlignLeft size={14}/> Tên khách sạn / Tour du lịch
                        </label>
                        <input 
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:bg-white transition-all outline-none font-bold text-slate-700" 
                            value={formData.name} 
                            placeholder="Ví dụ: Vinpearl Resort & Spa..."
                            onChange={e => setFormData({...formData, name: e.target.value})} 
                            required 
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Giá tiền */}
                        <div>
                            <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                                <DollarSign size={14}/> Giá cơ bản (VNĐ)
                            </label>
                            <input 
                                type="number" 
                                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:bg-white transition-all outline-none font-bold text-slate-700" 
                                value={formData.basePrice} 
                                placeholder="0"
                                onChange={e => setFormData({...formData, basePrice: e.target.value})} 
                                required 
                            />
                        </div>

                        {/* Loại hình */}
                        <div>
                            <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                                Phân loại dịch vụ
                            </label>
                            <select 
                                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:bg-white transition-all outline-none font-black text-blue-600 appearance-none cursor-pointer" 
                                value={formData.serviceType} 
                                onChange={e => setFormData({...formData, serviceType: e.target.value})}
                            >
                                <option value="0">🏨 KHÁCH SẠN (HOTEL)</option>
                                <option value="1">🧭 TOUR DU LỊCH</option>
                            </select>
                        </div>
                    </div>

                    {/* ID Địa danh liên kết */}
                    <div>
                        <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                            <MapPin size={14}/> Liên kết địa danh (Spot ID)
                        </label>
                        <input 
                            type="number" 
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:bg-white transition-all outline-none font-bold text-slate-700" 
                            value={formData.spotId} 
                            placeholder="Nhập ID địa danh (nếu có)..."
                            onChange={e => setFormData({...formData, spotId: e.target.value})} 
                        />
                    </div>

                    {/* Mô tả */}
                    <div>
                        <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                            Mô tả chi tiết dịch vụ
                        </label>
                        <textarea 
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[2rem] h-40 focus:border-blue-500 focus:bg-white transition-all outline-none font-medium text-slate-600 resize-none" 
                            value={formData.description} 
                            placeholder="Giới thiệu về dịch vụ, tiện ích, chính sách..."
                            onChange={e => setFormData({...formData, description: e.target.value})} 
                        />
                    </div>

                    {/* Hình ảnh */}
                    <div>
                        <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                            Hình ảnh thực tế
                        </label>
                        <div className="p-8 border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-slate-50/50">
                            <div className="flex flex-wrap gap-4 mb-6">
                                {previews.map((p, i) => (
                                    <img key={i} src={p} className="h-24 w-32 object-cover rounded-2xl border-4 border-white shadow-md animate-in zoom-in duration-300" />
                                ))}
                                <label className="h-24 w-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl hover:border-blue-500 hover:bg-white cursor-pointer transition-all text-slate-400 hover:text-blue-500">
                                    <Upload size={24} />
                                    <span className="text-[10px] font-black uppercase mt-1">Thêm ảnh</span>
                                    <input type="file" multiple className="hidden" onChange={(e) => {
                                        if(e.target.files) {
                                            setImages(e.target.files);
                                            setPreviews(Array.from(e.target.files).map(f => URL.createObjectURL(f)));
                                        }
                                    }} />
                                </label>
                            </div>
                            <p className="text-center text-xs text-slate-400 font-medium italic">Cho phép chọn nhiều ảnh cùng lúc. Ảnh đầu tiên sẽ là ảnh đại diện.</p>
                        </div>
                    </div>

                    {/* Nút Submit */}
                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-[2rem] font-black text-xl shadow-2xl shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Save />}
                        {id ? "CẬP NHẬT THAY ĐỔI" : "LƯU VÀ ĐĂNG BÀI"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ServiceForm;