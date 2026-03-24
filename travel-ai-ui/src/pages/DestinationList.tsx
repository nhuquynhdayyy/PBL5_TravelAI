import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

interface Destination {
    destinationId: number;
    name: string;
    imageUrl: string;
    description: string;
}

const DestinationList: React.FC = () => {
    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axiosInstance.get('/destinations')
            .then(res => setDestinations(res.data.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="text-center mt-10">Đang tải dữ liệu...</div>;

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-8 text-slate-800">Khám phá điểm đến</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {destinations.map(dest => (
                    <div key={dest.destinationId} className="bg-white rounded-xl shadow-lg overflow-hidden hover:scale-105 transition-transform">
                        <img src={dest.imageUrl} alt={dest.name} className="h-48 w-full object-cover"/>
                        <div className="p-4">
                            <h2 className="text-xl font-bold">{dest.name}</h2>
                            <p className="text-gray-600 line-clamp-2 mt-2">{dest.description}</p>
                            <Link to={`/destinations/${dest.destinationId}`} className="inline-block mt-4 text-blue-600 font-semibold">
                                Xem chi tiết →
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DestinationList;