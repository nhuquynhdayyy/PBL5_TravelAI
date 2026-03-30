import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { Upload, Save, ArrowLeft, MapPin, Clock, Navigation } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const SpotForm = () => {
    // Lấy destinationId từ URL (ví dụ: /destinations/5/add-spot)
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const destinationId = queryParams.get('destinationId'); 

    if (!destinationId) {
        console.error("Không tìm thấy Destination ID");
    }

    // State cho các trường dựa trên bảng TouristSpots
    const [name, setName] = useState('');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [avgTimeSpent, setAvgTimeSpent] = useState('');
    const [openingHours, setOpeningHours] = useState('');
    const [description, setDescription] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState('');
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData();
        // Gán đúng các key tương ứng với Backend DTO/Model
        formData.append('DestinationId', destinationId || '');
        formData.append('Name', name);
        formData.append('Latitude', latitude || '0');
        formData.append('Longitude', longitude || '0');
        formData.append('AvgTimeSpent', avgTimeSpent || '0');
        formData.append('OpeningHours', openingHours);
        formData.append('Description', description);
        if (image) formData.append('Image', image);

        try {
            await axiosClient.post('/spots', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert("Thêm địa danh thành công!");
            navigate(`/destinations/${destinationId}/spots`);
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.message || "Lỗi khi lưu địa danh");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            {/* Nút quay lại */}
            <button 
                onClick={() => navigate(-1)} 
                className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 font-bold transition-colors"
            >
                <ArrowLeft size={20} /> Quay lại
            </button>

            <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-slate-100">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                        <MapPin size={24} />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Thêm địa danh mới</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Tên địa danh */}
                    <div>
                        <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wider">Tên địa danh</label>
                        <input 
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:bg-white transition-all outline-none font-medium" 
                            placeholder="Ví dụ: Bà Nà Hills..."
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            required 
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Vĩ độ */}
                        <div>
                            <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wider">Vĩ độ (Latitude)</label>
                            <input 
                                type="number" step="any"
                                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none" 
                                placeholder="16.0219"
                                value={latitude} onChange={e => setLatitude(e.target.value)} required 
                            />
                        </div>
                        {/* Kinh độ */}
                        <div>
                            <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wider">Kinh độ (Longitude)</label>
                            <input 
                                type="number" step="any"
                                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none" 
                                placeholder="108.0305"
                                value={longitude} onChange={e => setLongitude(e.target.value)} required 
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Giờ mở cửa */}
                        <div>
                            <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wider flex items-center gap-2">
                                <Clock size={16}/> Giờ mở cửa
                            </label>
                            <input 
                                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none" 
                                placeholder="07:00 - 18:00"
                                value={openingHours} onChange={e => setOpeningHours(e.target.value)} 
                            />
                        </div>
                        {/* Thời gian tham quan */}
                        <div>
                            <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wider">Thời gian tham quan dự kiến (giờ)</label>
                            <input 
                                type="number"
                                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none" 
                                placeholder="Ví dụ: 4"
                                value={avgTimeSpent} onChange={e => setAvgTimeSpent(e.target.value)} 
                            />
                        </div>
                    </div>

                    {/* Mô tả */}
                    <div>
                        <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wider">Mô tả chi tiết</label>
                        <textarea 
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl h-32 focus:border-blue-500 outline-none resize-none transition-all" 
                            placeholder="Nhập thông tin giới thiệu về địa danh..."
                            value={description} 
                            onChange={e => setDescription(e.target.value)} 
                            required 
                        />
                    </div>

                    {/* Upload ảnh */}
                    <div>
                        <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wider">Ảnh đại diện địa danh</label>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                            <label className="cursor-pointer bg-blue-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2 shrink-0">
                                <Upload size={20} /> Choose File
                                <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                            </label>
                            
                            {preview ? (
                                <div className="relative group">
                                    <img src={preview} className="h-28 w-48 rounded-2xl object-cover border-4 border-white shadow-md" alt="Preview" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity flex items-center justify-center">
                                        <p className="text-white text-[10px] font-bold">Thay đổi ảnh</p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-slate-400 text-sm italic font-medium">Chưa có ảnh nào được chọn</p>
                            )}
                        </div>
                    </div>

                    {/* Nút Save */}
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black text-lg shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:bg-slate-400"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        ) : (
                            <><Save size={24} /> Save Tourist Spot</>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SpotForm;