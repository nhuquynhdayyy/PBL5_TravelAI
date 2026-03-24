import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import MainLayout from '../../layouts/MainLayout';
import { Upload, Save, Edit } from 'lucide-react';

const EditDestination = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState('');
    const [loading, setLoading] = useState(false); 

    useEffect(() => {
        // Load dữ liệu cũ
        axiosClient.get(`/destinations/${id}`).then(res => {
            const data = res.data.data;
            setName(data.name);
            setDescription(data.description);
            setPreview(data.imageUrl.startsWith('http') ? data.imageUrl : `http://localhost:5134${data.imageUrl}`);
        });
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData();
        formData.append('Name', name);
        formData.append('Description', description);
        if (image) formData.append('Image', image);

        try {
            const response = await axiosClient.put(`/destinations/${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                alert("Cập nhật thành công!");
                navigate('/destinations');
            }
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.message || "Lỗi cập nhật. Hãy kiểm tra Backend log.");
        } finally {
            setLoading(false);
        }
    };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImage(file); // Lưu file để gửi API
            
            // CẬP NHẬT PREVIEW: Tạo đường dẫn ảo để hiển thị ngay lập tức
            const previewUrl = URL.createObjectURL(file);
            setPreview(previewUrl);
        }
    };
    return (
            <div className="max-w-3xl mx-auto bg-white p-8 rounded-3xl shadow-xl mt-10">
                <h1 className="text-2xl font-bold mb-6">Chỉnh sửa điểm đến</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input className="w-full p-4 border rounded-xl" value={name} onChange={e => setName(e.target.value)} />
                    <textarea className="w-full p-4 border rounded-xl h-32" value={description} onChange={e => setDescription(e.target.value)} />
                    <div className="flex items-center gap-4">
                        <input type="file" onChange={(e) => e.target.files && setImage(e.target.files[0])} />
                        {preview && <img src={preview} className="size-20 object-cover rounded-lg" />}
                    </div>
                    <button className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold">Lưu thay đổi</button>
                </form>
            </div>
    );
};

export default EditDestination;