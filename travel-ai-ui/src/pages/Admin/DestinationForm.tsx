import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import MainLayout from '../../layouts/MainLayout';
import { Upload, Save, X } from 'lucide-react';

const DestinationForm = () => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
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
            <div className="max-w-3xl mx-auto bg-white p-8 rounded-3xl shadow-2xl mt-10">
                <h1 className="text-3xl font-black text-slate-900 mb-8">Add New Destination</h1>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold mb-2">Tên tỉnh/thành phố</label>
                        <input className="w-full p-4 border rounded-2xl" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2">Mô tả</label>
                        <textarea className="w-full p-4 border rounded-2xl h-32" value={description} onChange={e => setDescription(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2">Ảnh đại diện</label>
                        <div className="flex items-center gap-4">
                            <label className="cursor-pointer bg-blue-50 text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-100 flex items-center gap-2">
                                <Upload size={20} /> Choose File
                                <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                            </label>
                            {preview && <img src={preview} className="size-20 rounded-xl object-cover border" />}
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                        <Save size={20} /> Save Destination
                    </button>
                </form>
            </div>
    );
};

export default DestinationForm;