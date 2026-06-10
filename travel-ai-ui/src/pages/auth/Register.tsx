import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import MainLayout from '../../layouts/MainLayout';
import { UserPlus, Mail, Lock, User } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '', 
    fullName: '' 
  });
  const [isPartner, setIsPartner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axiosClient.post('/auth/register', {
        ...formData,
        isPartner
      });
      setRegisteredEmail(formData.email);
      setRegistered(true);
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      {registered ? (
        /* === Success: Thông báo sau khi đăng ký thành công === */
        <div className="min-h-[70vh] flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-100 p-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-50 mb-6">
              <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Đăng ký thành công! 🎉</h2>
            <p className="text-slate-500 mb-2">Chúng tôi đã gửi email xác thực đến:</p>
            <p className="font-bold text-blue-600 mb-6">{registeredEmail}</p>
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-xl px-4 py-3 mb-8 text-left">
              📧 Vui lòng kiểm tra hộp thư (kể cả thư mục <strong>Spam</strong>) và nhấn link xác thực để kích hoạt tài khoản.
            </div>
            <Link
              to="/login"
              className="inline-block w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all text-center"
            >
              Về trang đăng nhập
            </Link>
          </div>
        </div>
      ) : (
        /* === Form đăng ký === */
        <div className="max-w-md mx-auto mt-10 mb-20 p-8 bg-white rounded-3xl shadow-2xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 bg-blue-50 rounded-2xl text-blue-600 mb-4">
              <UserPlus size={32} />
            </div>
            <h2 className="text-3xl font-black text-slate-900">Tạo tài khoản</h2>
            <p className="text-slate-500 mt-2 text-sm">Tham gia TravelAI và bắt đầu hành trình thông minh của bạn.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name Input */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase ml-1 tracking-wider">Họ và tên</label>
              <div className="relative mt-1">
                <User className="absolute left-4 top-4 size-5 text-slate-400" />
                <input 
                  className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-300" 
                  type="text" 
                  placeholder="Nhập họ và tên của bạn" 
                  onChange={e => setFormData({...formData, fullName: e.target.value})} 
                  required 
                />
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase ml-1 tracking-wider">Địa chỉ Email</label>
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
              <label className="text-xs font-bold text-slate-700 uppercase ml-1 tracking-wider">Mật khẩu</label>
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

            {/* Partner Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer py-2">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                checked={isPartner}
                onChange={e => setIsPartner(e.target.checked)}
              />
              <span className="text-sm font-medium text-slate-600">
                Đăng ký với tư cách Đối tác cung cấp dịch vụ
              </span>
            </label>

            {/* Submit Button */}
            <button 
              disabled={loading} 
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-[0.98] disabled:bg-slate-300 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Tạo tài khoản'
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="mt-8 pt-6 border-t border-slate-50 text-center">
            <p className="text-sm text-slate-500">
              Đã có tài khoản?{' '}
              <Link to="/login" className="text-blue-600 font-bold hover:underline transition-all">
                Đăng nhập tại đây
              </Link>
            </p>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default Register;