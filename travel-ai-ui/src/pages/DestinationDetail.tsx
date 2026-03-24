// src/pages/DestinationDetail.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient'; // Dùng axiosClient cho đồng bộ port

const DestinationDetail: React.FC = () => {
    const { id } = useParams(); // Lấy ID từ URL
    const [dest, setDest] = useState<any>(null);

    const getFullImageUrl = (url: string) => {
        if (!url) return 'https://via.placeholder.com/800x400';
        // Nếu là link web (unsplash) thì giữ nguyên, nếu là path local thì thêm localhost:5134
        return url.startsWith('http') ? url : `http://localhost:5134${url}`;
    };

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                // Gọi API lấy chi tiết: /api/destinations/1
                const response = await axiosClient.get(`/destinations/${id}`);
                setDest(response.data.data);
            } catch (error) {
                console.error("Lỗi lấy chi tiết:", error);
            }
        };
        fetchDetail();
    }, [id]);

    if (!dest) return <div className="text-center p-10">Đang tải chi tiết điểm đến...</div>;

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-3xl shadow-2xl mt-10 mb-20 border border-slate-50">
            {/* ✅ CẬP NHẬT: Sử dụng hàm getFullImageUrl ở đây */}
            <img 
                src={getFullImageUrl(dest.imageUrl)} 
                className="w-full h-[450px] object-cover rounded-2xl shadow-lg" 
                alt={dest.name} 
            />
            
            <div className="mt-8">
                <h1 className="text-5xl font-black text-slate-900 tracking-tight">
                    {dest.name}
                </h1>
                <div className="w-20 h-1.5 bg-blue-500 mt-4 rounded-full"></div>
                
                <p className="mt-8 text-xl text-slate-600 leading-relaxed font-medium">
                    {dest.description}
                </p>
            </div>
        </div>
    );
};

export default DestinationDetail;