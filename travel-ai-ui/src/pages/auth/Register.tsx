import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import MainLayout from '../../layouts/MainLayout';
import { UserPlus, Mail, Lock, User } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '', 
    fullName: '' 
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Gọi API Register từ Backend
      const { data } = await axiosClient.post('/auth/register', formData);
      
      // Lưu thông tin vào LocalStorage sau khi đăng ký thành công (Backend trả về token luôn)
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data));
      
      // Chuyển hướng về trang chủ và làm mới để Header cập nhật
      navigate('/');
      window.location.reload();
    } catch (err: any) {
      alert(err.response?.data || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-3xl shadow-2xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-blue-50 rounded-2xl text-blue-600 mb-4">
            <UserPlus size={32} />
          </div>
          <h2 className="text-3xl font-black text-slate-900">Create Account</h2>
          <p className="text-slate-500 mt-2 text-sm">Join TravelAI and start your smart journey.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name Input */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase ml-1 tracking-wider">Full Name</label>
            <div className="relative mt-1">
              <User className="absolute left-4 top-4 size-5 text-slate-400" />
              <input 
                className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-300" 
                type="text" 
                placeholder="Enter your full name" 
                onChange={e => setFormData({...formData, fullName: e.target.value})} 
                required 
              />
            </div>
          </div>

          {/* Email Input */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase ml-1 tracking-wider">Email Address</label>
            <div className="relative mt-1">
              <Mail className="absolute left-4 top-4 size-5 text-slate-400" />
              <input 
                className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-300" 
                type="email" 
                placeholder="name@example.com" 
                onChange={e => setFormData({...formData, email: e.target.value})} 
                required 
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase ml-1 tracking-wider">Password</label>
            <div className="relative mt-1">
              <Lock className="absolute left-4 top-4 size-5 text-slate-400" />
              <input 
                className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-300" 
                type="password" 
                placeholder="••••••••" 
                onChange={e => setFormData({...formData, password: e.target.value})} 
                required 
              />
            </div>
          </div>

          <button 
            disabled={loading} 
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-[0.98] disabled:bg-slate-300 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-50 text-center">
          <p className="text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-bold hover:underline transition-all">
              Log in here
            </Link>
          </p>
        </div>
      </div>
    </MainLayout>
  );
};

export default Register;