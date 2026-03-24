import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Destinations from './pages/Destinations';
import Profile from './pages/Profile/Profile';
import DestinationDetail from './pages/DestinationDetail';
import UserPreferences from './pages/Preferences/UserPreferences';
import DestinationForm from './pages/Admin/DestinationForm'; 
import EditDestination from './pages/Admin/EditDestination';

function App() {
  return (
    <Routes>
      {/* Route Trang chủ */}
      <Route path="/" element={
        <MainLayout>
          <div className="py-5">
             <h1 className="text-4xl font-bold text-center">Chào mừng tới TravelAI</h1>
             <p className="text-center mt-2 text-slate-600">Khám phá các điểm đến tuyệt vời cùng AI</p>
          </div>
          <Destinations /> 
        </MainLayout>
      } />

      {/* THÊM ROUTE NÀY: Route dành riêng cho trang Destinations */}
      <Route path="/destinations" element={
        <MainLayout>
          <Destinations />
        </MainLayout>
      } />
      <Route path="/destinations/:id" element={<MainLayout><DestinationDetail /></MainLayout>} />
      <Route path="/admin/destinations/add" element={<MainLayout><DestinationForm /></MainLayout>} />
      <Route path="/admin/destinations/edit/:id" element={<MainLayout><EditDestination /></MainLayout>} />
      <Route path="/preferences" element={<UserPreferences />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  );
}

export default App;