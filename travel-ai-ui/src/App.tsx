import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Destinations from './pages/Destinations';
import Profile from './pages/Profile/Profile';
import UserPreferences from './pages/Preferences/UserPreferences';
import DestinationForm from './pages/Admin/DestinationForm'; 
import EditDestination from './pages/Admin/EditDestination';
import SpotList from './pages/Destinations/SpotList';
import SpotForm from './pages/Admin/SpotForm';

function App() {
  return (
    <Routes>
      {/* 1. Trang chủ: Hiển thị danh sách các tỉnh thành */}
      <Route path="/" element={
        <MainLayout>
          <div className="py-5">
             <h1 className="text-4xl font-bold text-center text-slate-900">Chào mừng tới TravelAI</h1>
             <p className="text-center mt-2 text-slate-600">Khám phá các điểm đến tuyệt vời cùng AI</p>
          </div>
          <Destinations /> 
        </MainLayout>
      } />

      {/* 2. Trang danh sách tỉnh thành (dùng chung component Destinations) */}
      <Route path="/destinations" element={
        <MainLayout>
          <Destinations />
        </MainLayout>
      } />

      {/* 3. Trang danh sách ĐỊA DANH khi bấm vào 1 tỉnh (Đà Nẵng -> Cầu Rồng...) */}
      {/* Mình ưu tiên dùng SpotList ở đây theo yêu cầu mới của bạn */}
      <Route path="/destinations/:id" element={
        <MainLayout>
          <SpotList />
        </MainLayout>
      } />

      {/* 4. Các route Admin */}
      <Route path="/admin/destinations/add" element={<MainLayout><DestinationForm /></MainLayout>} />
      <Route path="/admin/destinations/edit/:id" element={<MainLayout><EditDestination /></MainLayout>} />

      {/* 5. Các route chức năng khác */}
      <Route path="/preferences" element={<UserPreferences />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin/spots/add" element={<SpotForm />} />
    </Routes>
  );
}

export default App;