import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Edit, Trash2, Clock } from 'lucide-react';

interface SpotCardProps {
    spot: any;
    isAdmin: boolean;
    onDelete: (id: number) => void;
}

const SpotCard: React.FC<SpotCardProps> = ({ spot, isAdmin, onDelete }) => {
    const navigate = useNavigate();

    const getImageUrl = (url: string) => {
        if (!url) return 'https://via.placeholder.com/400x250';
        return url.startsWith('http') ? url : `http://localhost:5134${url}`;
    };

    return (
        <div className="group relative bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full">
            {/* Nút Admin hiện khi rê chuột (Hover) */}
            {isAdmin && (
                <div className="absolute top-3 right-3 flex gap-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button 
                        onClick={() => navigate(`/admin/spots/edit/${spot.id || spot.spotId}`)}
                        className="p-2 bg-white/90 backdrop-blur text-blue-600 rounded-xl shadow-md hover:bg-blue-600 hover:text-white transition-all"
                    >
                        <Edit size={16} />
                    </button>
                    <button 
                        onClick={() => onDelete(spot.id || spot.spotId)}
                        className="p-2 bg-white/90 backdrop-blur text-red-600 rounded-xl shadow-md hover:bg-red-600 hover:text-white transition-all"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )}

            <div className="h-44 overflow-hidden relative">
                <img src={getImageUrl(spot.imageUrl)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={spot.name} />
            </div>
            <div className="p-5 flex-grow">
                <h3 className="font-bold text-lg text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">{spot.name}</h3>
                <p className="text-slate-500 text-xs line-clamp-2 mb-4">{spot.description}</p>
                <div className="mt-auto flex items-center text-[10px] font-bold text-slate-400 uppercase">
                     <Clock size={12} className="mr-1"/> {spot.avgTimeSpent || 60} phút
                </div>
                <div className="mt-auto">
                    <Link 
                        to={`/spots/${spot.id || spot.spotId}`} 
                        className="block w-full py-2 bg-slate-900 text-white text-center rounded-2xl font-bold text-sm hover:bg-blue-600 transition-all shadow-md active:scale-[0.98]"
                    >
                        Khám phá ngay
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default SpotCard; 