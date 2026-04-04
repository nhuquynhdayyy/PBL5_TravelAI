import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import MainLayout from '../../layouts/MainLayout';
import { Save, ArrowLeft, Upload, Hotel, Compass, DollarSign, AlignLeft, Image as ImageIcon, Loader2, MapPin } from 'lucide-react';

const ServiceForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '', description: '', basePrice: '', serviceType: '0', spotId: '', latitude: '0', longitude: '0'
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
                        name: data.name,
                        description: data.description || '',
                        basePrice: data.basePrice.toString(),
                        serviceType: data.serviceType === "Hotel" ? "0" : "1",
                        spotId: data.spotId?.toString() || '',
                        latitude: '0',
                        longitude: '0'
                    });
                    if (data.imageUrls) {
                        setPreviews(data.imageUrls.map((u: string) => `http://localhost:5134${u}`));
                    }
                } catch (err) { alert("Lỗi tải dữ liệu"); }
                finally { setFetching(false); }
            };
            fetchService();
        }
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const data = new FormData();
        // PHẢI VIẾT HOA CHỮ ĐẦU ĐỂ KHỚP VỚI C# DTO
        data.append('Name', formData.name);
        data.append('Description', formData.description);
        data.append('BasePrice', formData.basePrice);
        data.append('ServiceType', formData.serviceType); // Gửi "0" hoặc "1"
        data.append('Latitude', formData.latitude);
        data.append('Longitude', formData.longitude);
        
        if (formData.spotId) data.append('SpotId', formData.spotId);

        if (images && images.length > 0) {
            Array.from(images).forEach(file => data.append('Images', file));
        }

        try {
            if (id) {
                // Sử dụng PUT để cập nhật
                await axiosClient.put(`/services/${id}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                alert("Cập nhật thành công!");
            } else {
                await axiosClient.post('/services', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                alert("Thêm mới thành công!");
            }
            navigate('/services');
        } catch (err: any) {
            console.error(err.response?.data);
            alert("Lỗi khi lưu: " + (err.response?.data?.message || "Kiểm tra lại dữ liệu nhập vào"));
        } finally { setLoading(false); }
    };

    if (fetching) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500" /></div>;

    return (
        <MainLayout>
            <div className="max-w-4xl mx-auto mb-20">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 mb-8 font-bold">
                    <ArrowLeft size={20} /> Quay lại
                </button>
                
                <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-50 overflow-hidden">
                    <div className="bg-slate-900 p-10 text-white">
                        <h2 className="text-3xl font-black">{id ? "Chỉnh sửa dịch vụ" : "Thêm dịch vụ mới"}</h2>
                    </div>

                    <form onSubmit={handleSubmit} className="p-10 space-y-8 text-left">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-black text-slate-400 uppercase mb-3">Tên dịch vụ</label>
                                <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" 
                                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-3">Loại hình</label>
                                <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-blue-600" 
                                    value={formData.serviceType} onChange={e => setFormData({...formData, serviceType: e.target.value})}>
                                    <option value="0">🏨 Khách sạn</option>
                                    <option value="1">🧭 Tour du lịch</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-3">Giá cơ bản (VNĐ)</label>
                                <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" 
                                    value={formData.basePrice} onChange={e => setFormData({...formData, basePrice: e.target.value})} required />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-3"><MapPin size={14} className="inline mr-1"/> ID Địa danh liên kết</label>
                                <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" 
                                    value={formData.spotId} placeholder="Ví dụ: 5"
                                    onChange={e => setFormData({...formData, spotId: e.target.value})} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase mb-3">Mô tả</label>
                            <textarea className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-3xl h-32 resize-none" 
                                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase mb-3">Hình ảnh</label>
                            <div className="p-6 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50">
                                <div className="flex flex-wrap gap-4 mb-4">
                                    {previews.map((url, i) => <img key={i} src={url} className="h-20 w-28 object-cover rounded-xl border-2 border-white shadow-sm" />)}
                                    <label className="h-20 w-28 flex items-center justify-center border-2 border-dashed border-slate-300 rounded-xl hover:bg-white cursor-pointer">
                                        <Upload size={20} className="text-slate-400" />
                                        <input type="file" multiple className="hidden" onChange={(e) => {
                                            if (e.target.files) {
                                                setImages(e.target.files);
                                                setPreviews(Array.from(e.target.files).map(f => URL.createObjectURL(f)));
                                            }
                                        }} accept="image/*" />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3">
                            {loading ? <Loader2 className="animate-spin" /> : <Save />}
                            {id ? "LƯU THAY ĐỔI" : "TẠO DỊCH VỤ"}
                        </button>
                    </form>
                </div>
            </div>
        </MainLayout>
    );
};

export default ServiceForm;