// src/pages/Admin/ServiceForm.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { 
    Save, 
    ArrowLeft, 
    Upload, 
    Loader2, 
    Hotel, 
    Compass, 
    MapPin, 
    DollarSign, 
    AlignLeft 
} from 'lucide-react';

const ServiceForm = () => {
    const { id } = useParams(); // Nếu có ID là đang ở chế độ Sửa
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

    // 1. Nếu là chế độ Sửa, load dữ liệu cũ lên form
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
            Array.from(images).forEach(file => data.append('Images', file));
        }

        try {
            let targetId = id;
            if (id) {
                // CẬP NHẬT
                await axiosClient.put(`/services/${id}`, data);
            } else {
                // THÊM MỚI
                const res = await axiosClient.post('/services', data);
                targetId = res.data.serviceId; // Lấy ID mới tạo từ Backend
            }
            alert("Lưu thông tin thành công!");
            
            // SAU KHI LƯU: Dẫn Partner vào trang Quản trị chi tiết ngay lập tức
            navigate(`/partner/services/${targetId}/manage`);
            
        } catch (err) {
            alert("Lỗi khi lưu dữ liệu. Vui lòng kiểm tra lại!");
        } finally { setLoading(false); }
    };

    if (fetching) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="animate-spin text-blue-500" size={48} />
            <p className="text-slate-400 font-bold">Đang tải dữ liệu...</p>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto py-10 px-4">
            <div className="mb-8">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold transition-all">
                    <ArrowLeft size={20} /> Quay lại
                </button>
            </div>

            <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
                <div className="bg-slate-900 p-10 text-white text-left">
                    <h2 className="text-4xl font-black tracking-tighter mb-2">
                        {id ? "Chỉnh sửa dịch vụ" : "Đăng dịch vụ mới"}
                    </h2>
                    <p className="text-slate-400 font-medium italic">Vui lòng điền đầy đủ để AI có thể gợi ý lịch trình chính xác hơn.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-8 text-left">
                    <div>
                        <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Tên khách sạn / Tour du lịch</label>
                        <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-bold text-slate-700" 
                            value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase mb-3">Giá cơ bản (VNĐ)</label>
                            <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" 
                                value={formData.basePrice} onChange={e => setFormData({...formData, basePrice: e.target.value})} required />
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase mb-3">Loại hình</label>
                            <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-blue-600" 
                                value={formData.serviceType} onChange={e => setFormData({...formData, serviceType: e.target.value})}>
                                <option value="0">🏨 KHÁCH SẠN</option>
                                <option value="1">🧭 TOUR DU LỊCH</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase mb-3">Mô tả chi tiết</label>
                        <textarea className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[2rem] h-40 outline-none font-medium text-slate-600" 
                            value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                    </div>

                    <div>
                        <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase mb-3">Hình ảnh</label>
                        <div className="p-8 border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-slate-50/50">
                            <div className="flex flex-wrap gap-4 mb-4">
                                {previews.map((p, i) => <img key={i} src={p} className="h-24 w-32 object-cover rounded-2xl border-4 border-white shadow-md" />)}
                                <label className="h-24 w-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl hover:border-blue-500 cursor-pointer">
                                    <Upload size={24} className="text-slate-400" />
                                    <input type="file" multiple className="hidden" onChange={(e) => {
                                        if(e.target.files) {
                                            setImages(e.target.files);
                                            setPreviews(Array.from(e.target.files).map(f => URL.createObjectURL(f)));
                                        }
                                    }} />
                                </label>
                            </div>
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-xl shadow-xl flex items-center justify-center gap-3">
                        {loading ? <Loader2 className="animate-spin" /> : <Save />} {id ? "CẬP NHẬT DỊCH VỤ" : "LƯU VÀ TIẾP TỤC"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ServiceForm;