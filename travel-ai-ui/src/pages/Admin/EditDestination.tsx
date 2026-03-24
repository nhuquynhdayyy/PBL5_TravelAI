import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, Save, ArrowLeft, Loader2 } from 'lucide-react';
import axiosClient from '../../api/axiosClient';

const EditDestination: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // States cho form
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    // 1. Load dữ liệu cũ khi vừa vào trang
    useEffect(() => {
        const fetchOldData = async () => {
            try {
                const res = await axiosClient.get(`/destinations/${id}`);
                const data = res.data.data;
                setName(data.name);
                setDescription(data.description);
                // Xử lý hiển thị ảnh cũ
                const oldImageUrl = data.imageUrl.startsWith('http') 
                    ? data.imageUrl 
                    : `http://localhost:5134${data.imageUrl}`;
                setPreview(oldImageUrl);
            } catch (err) {
                console.error("Lỗi lấy dữ liệu cũ:", err);
                alert("Không tìm thấy thông tin địa điểm này!");
                navigate('/destinations');
            } finally {
                setFetching(false);
            }
        };
        fetchOldData();
    }, [id, navigate]);

    // 2. Xử lý thay đổi file ảnh (Cập nhật preview tức thì)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImage(file);
            
            // Tạo URL ảo để xem trước ảnh
            const previewUrl = URL.createObjectURL(file);
            setPreview(previewUrl);
        }
    };

    // 3. Gửi dữ liệu cập nhật
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData();
        // Ghi chú: Key phải khớp chính xác với UpdateDestinationRequest trong C#
        formData.append('Name', name);
        formData.append('Description', description);
        
        // Chỉ gửi file nếu người dùng có chọn ảnh mới
        if (image) {
            formData.append('Image', image);
        }

        try {
            const response = await axiosClient.put(`/destinations/${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                alert("Cập nhật điểm đến thành công!");
                navigate('/destinations');
            }
        } catch (err: any) {
            console.error("Lỗi cập nhật:", err);
            alert(err.response?.data?.message || "Lỗi cập nhật. Hãy kiểm tra kết nối Server.");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return (
        <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-3xl shadow-2xl mt-10 mb-20 border border-slate-50 animate-in fade-in duration-500">
            {/* Header Form */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <button 
                        onClick={() => navigate(-1)} 
                        className="flex items-center gap-1 text-slate-500 hover:text-blue-600 mb-2 transition-colors font-medium text-sm"
                    >
                        <ArrowLeft size={16} /> Quay lại
                    </button>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Chỉnh sửa điểm đến</h1>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Tên tỉnh thành */}
                <div>
                    <label className="block text-sm font-bold mb-2 text-slate-700 uppercase tracking-wider ml-1">
                        Tên tỉnh/thành phố
                    </label>
                    <input 
                        className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-700 bg-slate-50 focus:bg-white" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        placeholder="Nhập tên địa danh..."
                        required 
                    />
                </div>

                {/* Mô tả */}
                <div>
                    <label className="block text-sm font-bold mb-2 text-slate-700 uppercase tracking-wider ml-1">
                        Mô tả chi tiết
                    </label>
                    <textarea 
                        className="w-full p-4 border border-slate-200 rounded-2xl h-40 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-700 bg-slate-50 focus:bg-white resize-none" 
                        value={description} 
                        onChange={e => setDescription(e.target.value)} 
                        placeholder="Nhập thông tin giới thiệu..."
                        required 
                    />
                </div>

                {/* Phần Upload ảnh & Preview */}
                <div>
                    <label className="block text-sm font-bold mb-3 text-slate-700 uppercase tracking-wider ml-1">
                        Ảnh đại diện
                    </label>
                    <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        {/* Ảnh Preview */}
                        <div className="shrink-0">
                            {preview ? (
                                <img 
                                    src={preview} 
                                    className="size-36 rounded-xl object-cover shadow-lg border-4 border-white" 
                                    alt="Preview" 
                                />
                            ) : (
                                <div className="size-36 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400 font-bold uppercase text-xs">
                                    No Image
                                </div>
                            )}
                        </div>

                        {/* Nút chọn tệp tùy chỉnh */}
                        <div className="flex-1 text-center sm:text-left">
                            <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 border border-blue-100 rounded-xl font-bold hover:bg-blue-600 hover:text-white transition-all shadow-md active:scale-95 group">
                                <Upload size={20} className="group-hover:animate-bounce" />
                                {image ? "Thay đổi ảnh khác" : "Chọn ảnh mới từ máy"}
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    onChange={handleFileChange} 
                                    accept="image/*" 
                                />
                            </label>
                            <p className="mt-3 text-xs text-slate-500 font-medium">
                                {image ? `Tệp đã chọn: ${image.name}` : "Giữ nguyên nếu không muốn đổi ảnh cũ"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Nút Save */}
                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:shadow-none active:scale-[0.98]"
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" size={24} />
                            Đang lưu thay đổi...
                        </>
                    ) : (
                        <>
                            <Save size={24} />
                            Lưu thay đổi
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

export default EditDestination;