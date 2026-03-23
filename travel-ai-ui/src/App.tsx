import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

function App() {
  return (
    <Routes>
      {/* Trang chủ sử dụng Layout chung */}
      <Route path="/" element={
        <MainLayout>
          <div className="py-10">
            <h1 className="text-4xl font-bold text-center">Chào mừng tới TravelAI</h1>
            <p className="text-center mt-4 text-slate-600">Hệ thống lập kế hoạch du lịch thông minh.</p>
          </div>
        </MainLayout>
      } />

      {/* Các trang Auth không dùng Layout chung (hoặc dùng layout riêng) */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  );
}

export default App;