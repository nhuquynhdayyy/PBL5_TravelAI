import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import MainLayout from '../../layouts/MainLayout';

type VerifyState = 'loading' | 'success' | 'error';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<VerifyState>('loading');
  const [message, setMessage] = useState('');
  const hasCalled = useRef(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setState('error');
      setMessage('Link xác thực không hợp lệ.');
      return;
    }

    if (hasCalled.current) return;
    hasCalled.current = true;

    axiosClient.get(`/auth/verify-email?token=${token}`)
      .then((res) => {
        setState('success');
        setMessage(res.data.message || 'Xác thực thành công!');
      })
      .catch((err) => {
        setState('error');
        setMessage(err.response?.data?.message || 'Link xác thực không hợp lệ hoặc đã hết hạn.');
      });
  }, [searchParams]);


  return (
    <MainLayout>
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-100 p-10 text-center">

          {/* Loading */}
          {state === 'loading' && (
            <>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 mb-6">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Đang xác thực...</h2>
              <p className="text-slate-500">Vui lòng đợi trong giây lát.</p>
            </>
          )}

          {/* Success */}
          {state === 'success' && (
            <>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-50 mb-6 animate-bounce">
                <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Xác thực thành công! 🎉</h2>
              <p className="text-slate-500 mb-8">{message}</p>
              <Link
                to="/login"
                className="inline-block w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-[0.98]"
              >
                Đăng nhập ngay
              </Link>
            </>
          )}

          {/* Error */}
          {state === 'error' && (
            <>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-50 mb-6">
                <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Xác thực thất bại</h2>
              <p className="text-slate-500 mb-8">{message}</p>
              <p className="text-sm text-slate-400 mb-6">
                Link có thể đã hết hạn (24 giờ). Hãy đăng ký lại hoặc liên hệ hỗ trợ.
              </p>
              <Link
                to="/register"
                className="inline-block w-full py-4 bg-slate-700 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all active:scale-[0.98]"
              >
                Đăng ký lại
              </Link>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default VerifyEmail;
