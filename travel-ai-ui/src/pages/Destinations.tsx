import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import DestinationCard from '../components/DestinationCard';
import { useNavigate } from 'react-router-dom'; // 1. Thêm import này

const Destinations: React.FC = () => {
  const [destinations, setDestinations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate(); // 2. Khởi tạo navigate
  
  // 3. Lấy thông tin user và check quyền Admin
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.roleName === 'Admin'; 

  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        setLoading(true);
        const response = await axiosClient.get('/destinations');
        // Lấy mảng từ response.data.data
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
    fetchDestinations();
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );

  if (error) return <div className="text-center text-red-500 p-10 font-bold">{error}</div>;

  return (
    <div className="container mx-auto px-4 py-10">
      {/* --- PHẦN SỬA ĐỔI Ở ĐÂY --- */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <h1 className="text-3xl font-extrabold text-gray-900 uppercase tracking-wider">
          Điểm đến nổi bật
        </h1>
        
        {isAdmin && (
          <button 
            onClick={() => navigate('/admin/destinations/add')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
          >
            <span className="text-xl">+</span> Thêm điểm đến
          </button>
        )}
      </div>
      {/* --- HẾT PHẦN SỬA ĐỔI --- */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {destinations.map((item) => (
          <DestinationCard key={item.id} destination={item} />
        ))}
      </div>

      {destinations.length === 0 && !loading && (
        <p className="text-center text-gray-500 mt-10">Chưa có điểm đến nào trong Database.</p>
      )}
    </div>
  );
};

export default Destinations;