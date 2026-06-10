import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import MainLayout from '../../layouts/MainLayout';
import { Mail, ArrowLeft } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axiosClient.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-100 p-10">

          {!sent ? (
            <>
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="inline-flex p-4 bg-blue-50 rounded-2xl text-blue-600">
                  <Mail size={36} />
                </div>
              </div>

              <h2 className="text-2xl font-black text-slate-900 text-center mb-2">Quên mật khẩu?</h2>
              <p className="text-slate-500 text-sm text-center mb-8">
                Nhập địa chỉ email đăng ký của bạn. Chúng tôi sẽ gửi link đặt lại mật khẩu ngay lập tức.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase ml-1 tracking-wider">
                    Địa chỉ Email
                  </label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-4 top-4 size-5 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-300"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-[0.98] disabled:bg-slate-300 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Gửi link đặt lại mật khẩu'}
                </button>
              </form>

              <div className="mt-8 text-center">
                <Link to="/login" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors font-medium">
                  <ArrowLeft size={16} />
                  Quay lại đăng nhập
                </Link>
              </div>
            </>
          ) : (
            /* Sent State */
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-50 mb-6">
                <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Kiểm tra hộp thư! 📧</h2>
              <p className="text-slate-500 mb-2">
                Chúng tôi đã gửi link đặt lại mật khẩu đến:
              </p>
              <p className="font-bold text-blue-600 mb-6">{email}</p>
              <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-xl px-4 py-3 mb-8 text-left">
                ⏱️ Link sẽ hết hạn sau <strong>15 phút</strong>. Nếu không thấy email, hãy kiểm tra thư mục Spam.
              </div>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors font-medium"
              >
                <ArrowLeft size={16} />
                Quay lại đăng nhập
              </Link>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default ForgotPassword;
