import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Edit, Trash2, MapPin } from 'lucide-react';

interface DestinationCardProps {
    destination: any;
    isAdmin?: boolean;
    onDelete?: () => void;
}

const DestinationCard: React.FC<DestinationCardProps> = ({ destination, isAdmin, onDelete }) => {
  const navigate = useNavigate();

  // Hàm xử lý đường dẫn ảnh
  const getImageUrl = (url: string) => {
    if (!url) return 'https://via.placeholder.com/400x250';
    return url.startsWith('http') ? url : `http://localhost:5134${url}`;
  };

  return (
    <div className="group relative bg-white rounded-3xl shadow-md overflow-hidden hover:shadow-2xl transition-all duration-300 border border-slate-100 flex flex-col h-full">
      
      {/* Nút Admin - Chỉ hiện khi là Admin và đang hover vào thẻ */}
      {isAdmin && (
        <div className="absolute top-3 right-3 flex gap-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button 
            onClick={(e) => {
                e.preventDefault(); // Ngăn chặn sự kiện click lan xuống Card
                navigate(`/admin/destinations/edit/${destination.id}`);
            }}
            className="p-2.5 bg-white/90 backdrop-blur text-blue-600 rounded-xl shadow-lg hover:bg-blue-600 hover:text-white transition-all"
            title="Chỉnh sửa"
          >
            <Edit size={18} />
          </button>
          <button 
            onClick={(e) => {
                e.preventDefault();
                onDelete && onDelete();
            }}
            className="p-2.5 bg-white/90 backdrop-blur text-red-600 rounded-xl shadow-lg hover:bg-red-600 hover:text-white transition-all"
            title="Xóa"
          >
            <Trash2 size={18} />
          </button>
        </div>
      )}

      {/* Hình ảnh */}
      <div className="relative overflow-hidden h-52">
        <img 
          src={getImageUrl(destination.imageUrl)} 
          alt={destination.name} 
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
      </div>

      {/* Nội dung */}
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex items-center gap-1 text-blue-500 text-xs font-bold uppercase tracking-widest mb-2">
            <MapPin size={14} /> Vietnam
        </div>
        <h3 className="text-xl font-black text-slate-800 line-clamp-1 mb-2 group-hover:text-blue-600 transition-colors">
            {destination.name}
        </h3>
        <p className="text-slate-500 text-sm line-clamp-3 leading-relaxed mb-6">
            {destination.description}
        </p>
        
        <div className="mt-auto">
            <Link 
                to={`/destinations/${destination.id}`} 
                className="block w-full py-3 bg-slate-900 text-white text-center rounded-2xl font-bold text-sm hover:bg-blue-600 transition-all shadow-md active:scale-[0.98]"
            >
                Khám phá ngay
            </Link>
        </div>
      </div>
    </div>
  );
};

export default DestinationCard;