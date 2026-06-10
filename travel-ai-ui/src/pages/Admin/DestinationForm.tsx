import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { Upload, Save } from 'lucide-react';

const DestinationForm = () => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [categories, setCategories] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState('');
    const navigate = useNavigate();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImage(file);
            setPreview(URL.createObjectURL(file)); // Hiện ảnh demo trước khi upload
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(); // Bắt buộc dùng FormData để upload file
        formData.append('name', name);
        formData.append('description', description);
        formData.append('categories', categories);
        if (image) formData.append('image', image);

        try {
            await axiosClient.post('/destinations', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert("Thêm điểm đến thành công!");
            navigate('/destinations');
        } catch (err: any) {
            alert(err.response?.data?.message || "Lỗi khi thêm dữ liệu");
        }
    };

    return (
            <div className="admin-card mx-auto mt-10 max-w-3xl p-8">
                <div className="admin-eyebrow mb-4">Destination</div>
                <h1 className="admin-section-title mb-8">Add New Destination</h1>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold mb-2">Tên tỉnh/thành phố</label>
                        <input className="admin-input" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2">Mô tả</label>
                        <textarea className="admin-input h-32" value={description} onChange={e => setDescription(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2">Loại hình / Tag (Phân tách bằng dấu phẩy)</label>
                        <input className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" value={categories} onChange={e => setCategories(e.target.value)} placeholder="Ví dụ: Lịch sử,Ẩm thực" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2">Ảnh đại diện</label>
                        <div className="flex items-center gap-4">
                            <label className="admin-button-secondary cursor-pointer">
                                <Upload size={20} /> Choose File
                                <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                            </label>
                            {preview && <img src={preview} className="size-20 rounded-xl object-cover border" />}
                        </div>
                    </div>
                    <button type="submit" className="admin-button-primary w-full py-4">
                        <Save size={20} /> Save Destination
                    </button>
                </form>
            </div>
    );
};

export default DestinationForm;
