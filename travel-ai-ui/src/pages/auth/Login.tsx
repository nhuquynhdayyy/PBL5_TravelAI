import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import MainLayout from '../../layouts/MainLayout';
import { useCart } from '../../contexts/CartContext';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { items: localCartItems, syncCart } = useCart();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axiosClient.post('/auth/login', formData);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data));

      // Bước 1: Nếu có items trong localStorage, sync lên database
      if (localCartItems.length > 0) {
        try {
          await axiosClient.post('/cart/sync', {
            items: localCartItems.map((item) => ({
              serviceId: item.serviceId,
              quantity: item.quantity,
              priceAtBooking: item.price,
              checkInDate: item.checkInDate.toISOString().split('T')[0],
              checkOutDate: item.checkOutDate ? item.checkOutDate.toISOString().split('T')[0] : null
            }))
          });
        } catch (syncError) {
          console.error('Error syncing local cart to database:', syncError);
        }
      }

      // Bước 2: Sync cart từ database về client
      await syncCart();

      const nextPath = data.roleName?.toLowerCase() === 'partner'
        ? '/partner/profile'
        : data.roleName?.toLowerCase() === 'admin'
          ? '/admin/stats'
          : '/';
      navigate(nextPath);
      window.location.reload();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data || "Đăng nhập thất bại");
    } finally { setLoading(false); }
  };

  return (
    <MainLayout>
      <div className="max-w-md mx-auto mt-12 p-8 bg-white rounded-3xl shadow-2xl border border-slate-100">
        <h2 className="text-3xl font-black mb-2 text-slate-900">Chào mừng quay lại</h2>
        <p className="text-slate-500 mb-8 text-sm">Vui lòng nhập thông tin để đăng nhập.</p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase ml-1">Địa chỉ Email</label>
            <input className="w-full p-4 mt-1 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" type="email" placeholder="name@company.com"
              onChange={e => setFormData({ ...formData, email: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase ml-1">Mật khẩu</label>
            <input className="w-full p-4 mt-1 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" type="password" placeholder="••••••••"
              onChange={e => setFormData({ ...formData, password: e.target.value })} required />
          </div>
          <button disabled={loading} className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all disabled:bg-slate-300">
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
        <p className="mt-8 text-center text-sm text-slate-500">
          Chưa có tài khoản? <Link to="/register" className="text-blue-600 font-bold hover:underline">Đăng ký miễn phí</Link>
        </p>
      </div>
    </MainLayout>
  );
};
export default Login;
