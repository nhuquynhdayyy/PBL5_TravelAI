import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import MainLayout from '../../layouts/MainLayout';
import { Lock, Eye, EyeOff } from 'lucide-react';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      await axiosClient.post('/auth/reset-password', { token, newPassword });
      setSuccess(true);
      // Tự động redirect sau 3 giây
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra. Link có thể đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <MainLayout>
        <div className="min-h-[70vh] flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-100 p-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-50 mb-6">
              <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Link không hợp lệ</h2>
            <p className="text-slate-500 mb-6">Hãy yêu cầu gửi lại link đặt lại mật khẩu.</p>
            <Link to="/forgot-password" className="inline-block w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all">
              Gửi lại link
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-100 p-10">

          {!success ? (
            <>
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="inline-flex p-4 bg-blue-50 rounded-2xl text-blue-600">
                  <Lock size={36} />
                </div>
              </div>

              <h2 className="text-2xl font-black text-slate-900 text-center mb-2">Đặt lại mật khẩu</h2>
              <p className="text-slate-500 text-sm text-center mb-8">
                Tạo mật khẩu mới mạnh và dễ nhớ cho tài khoản của bạn.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* New Password */}
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase ml-1 tracking-wider">
                    Mật khẩu mới
                  </label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-4 top-4 size-5 text-slate-400" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Ít nhất 6 ký tự"
                      className="w-full pl-12 pr-12 py-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase ml-1 tracking-wider">
                    Xác nhận mật khẩu
                  </label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-4 top-4 size-5 text-slate-400" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới"
                      className="w-full pl-12 pr-12 py-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Password strength indicator */}
                {newPassword.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(i => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            newPassword.length >= i * 3
                              ? i <= 1 ? 'bg-red-400'
                                : i <= 2 ? 'bg-amber-400'
                                : i <= 3 ? 'bg-blue-400'
                                : 'bg-green-500'
                              : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-slate-400">
                      {newPassword.length < 4 ? 'Quá yếu'
                        : newPassword.length < 7 ? 'Yếu'
                        : newPassword.length < 10 ? 'Trung bình'
                        : 'Mạnh ✓'}
                    </p>
                  </div>
                )}

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
                  ) : '🔑 Đặt lại mật khẩu'}
                </button>
              </form>
            </>
          ) : (
            /* Success */
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-50 mb-6">
                <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Đặt lại thành công! 🎉</h2>
              <p className="text-slate-500 mb-6">
                Mật khẩu của bạn đã được cập nhật. Đang chuyển hướng đến trang đăng nhập...
              </p>
              <Link
                to="/login"
                className="inline-block w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all"
              >
                Đăng nhập ngay
              </Link>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default ResetPassword;
