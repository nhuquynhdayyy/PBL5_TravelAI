// src/App.tsx

import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';

// --- TRANG AUTH ---
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// --- TRANG CUSTOMER (PUBLIC) ---
import Destinations from './pages/Destinations';
import DestinationDetail from './pages/DestinationDetail';
import SpotList from './pages/Destinations/SpotList';
import SpotDetail from './pages/SpotDetail';
import Services from './pages/Services'; 
import ServiceDetail from './pages/ServiceDetail'; 
import Profile from './pages/Profile/Profile';
import UserPreferences from './pages/Preferences/UserPreferences';
import HomeSearch from './components/HomeSearch';

// --- TRANG PARTNER (KÊNH NGƯỜI BÁN) ---
import ManagePartnerServices from './pages/partner/ManagePartnerServices'; 
import ServiceForm from './pages/Admin/ServiceForm'; 

// --- TRANG ADMIN (QUẢN TRỊ HỆ THỐNG) ---
import AdminManageServices from './pages/Admin/AdminManageServices'; 
import DestinationForm from './pages/Admin/DestinationForm';
import EditDestination from './pages/Admin/EditDestination';
import SpotForm from './pages/Admin/SpotForm';
import EditSpot from './pages/Admin/EditSpot';

function App() {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const role = user?.roleName?.toLowerCase();

  return (
    <Routes>
      {/* ── TRANG CHỦ ── */}
      <Route path="/" element={
        <MainLayout>
          <div className="py-10 px-4">
            <div className="max-w-2xl mx-auto text-center mb-6">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Chào mừng tới TravelAI</h1>
              <p className="mt-2 text-slate-500 font-medium">Khám phá các điểm đến tuyệt vời cùng sự hỗ trợ của AI</p>
            </div>
            <HomeSearch />
          </div>
          <Destinations />
        </MainLayout>
      } />

      {/* ── PUBLIC AREA (Bọc MainLayout cho tất cả) ── */}
      <Route path="/destinations" element={<MainLayout><Destinations /></MainLayout>} />
      <Route path="/destinations/:id" element={<MainLayout><DestinationDetail /></MainLayout>} />
      <Route path="/destinations/:id/spots" element={<MainLayout><SpotList /></MainLayout>} />
      <Route path="/spots" element={<MainLayout><SpotList /></MainLayout>} />
      <Route path="/spots/:id" element={<MainLayout><SpotDetail /></MainLayout>} />
      <Route path="/services" element={<MainLayout><Services /></MainLayout>} />
      <Route path="/services/:id" element={<MainLayout><ServiceDetail /></MainLayout>} />

      {/* ── PARTNER AREA (Đã bọc MainLayout) ── */}
      {role === 'partner' && (
        <>
          <Route path="/partner/services" element={<MainLayout><ManagePartnerServices /></MainLayout>} />
          <Route path="/partner/services/add" element={<MainLayout><ServiceForm /></MainLayout>} />
          <Route path="/partner/services/edit/:id" element={<MainLayout><ServiceForm /></MainLayout>} />
        </>
      )}

      {/* ── ADMIN AREA (Đã bọc MainLayout) ── */}
      {role === 'admin' && (
        <>
          <Route path="/admin/destinations/add" element={<MainLayout><DestinationForm /></MainLayout>} />
          <Route path="/admin/destinations/edit/:id" element={<MainLayout><EditDestination /></MainLayout>} />
          <Route path="/admin/spots/add" element={<MainLayout><SpotForm /></MainLayout>} />
          <Route path="/admin/spots/edit/:id" element={<MainLayout><EditSpot /></MainLayout>} />
          <Route path="/admin/services" element={<MainLayout><AdminManageServices /></MainLayout>} />
        </>
      )}

      {/* ── USER & AUTH ── */}
      <Route path="/profile" element={<MainLayout><Profile /></MainLayout>} />
      <Route path="/preferences" element={<MainLayout><UserPreferences /></MainLayout>} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;