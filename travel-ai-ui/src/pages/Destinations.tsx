import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import DestinationCard from '../components/DestinationCard';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';

const Destinations: React.FC = () => {
  const [destinations, setDestinations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  // Lấy thông tin user và check quyền Admin
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.roleName?.toLowerCase() === 'admin';

  const fetchDestinations = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get('/destinations');
      if (response.data && response.data.data) {
        setDestinations(response.data.data);
      }
    } catch (err) {
      console.error("Lỗi:", err);
      setError("Không thể tải danh sách điểm đến.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDestinations();
  }, []);

  // Hàm xử lý xóa điểm đến
  const handleDelete = async (id: number) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa điểm đến này? Thao tác này không thể hoàn tác.")) {
      try {
        await axiosClient.delete(`/destinations/${id}`);
        // Cập nhật lại danh sách tại chỗ để giao diện mượt mà
        setDestinations(prev => prev.filter(d => d.id !== id));
        alert("Đã xóa điểm đến thành công!");
      } catch (err: any) {
        alert(err.response?.data?.message || "Lỗi khi xóa dữ liệu");
      }
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );

  if (error) return (
    <div className="text-center py-20">
        <p className="text-red-500 font-bold text-xl">{error}</p>
        <button onClick={fetchDestinations} className="mt-4 text-blue-500 underline">Thử lại</button>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                ĐIỂM ĐẾN NỔI BẬT
            </h1>
            <p className="text-slate-500 mt-2">Khám phá những vẻ đẹp tiềm ẩn khắp Việt Nam</p>
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => navigate('/admin/destinations/add')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
          >
            <Plus size={20} /> Thêm điểm đến
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {destinations.map((item) => (
          <DestinationCard 
            key={item.id} 
            destination={item} 
            isAdmin={isAdmin}
            onDelete={() => handleDelete(item.id)}
          />
        ))}
      </div>

      {destinations.length === 0 && !loading && (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <p className="text-slate-500 font-medium">Chưa có điểm đến nào trong hệ thống.</p>
        </div>
      )}
    </div>
  );
};

export default Destinations;