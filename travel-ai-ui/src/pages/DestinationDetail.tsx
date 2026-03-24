// src/pages/DestinationDetail.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient'; // Dùng axiosClient cho đồng bộ port

const DestinationDetail: React.FC = () => {
    const { id } = useParams(); // Lấy ID từ URL
    const [dest, setDest] = useState<any>(null);

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
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-lg mt-10">
            <img src={dest.imageUrl} className="w-full h-96 object-cover rounded-xl" alt={dest.name} />
            <h1 className="text-4xl font-black mt-6 text-slate-900">{dest.name}</h1>
            <p className="mt-4 text-lg text-gray-700 leading-relaxed">{dest.description}</p>
        </div>
  );
};

export default DestinationDetail;