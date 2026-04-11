// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Timeline from './pages/Planner/Timeline';

// --- TRANG AUTHENTICATION ---
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// --- TRANG CUSTOMER (PUBLIC AREA) ---
import Destinations from './pages/Destinations';
import DestinationDetail from './pages/DestinationDetail';
import SpotList from './pages/Destinations/SpotList';
import SpotDetail from './pages/SpotDetail';
import Profile from './pages/Profile/Profile';
import UserPreferences from './pages/Preferences/UserPreferences';
import HomeSearch from './components/HomeSearch';

// Import các trang Service theo phân loại
import Services from './pages/Services'; // Trang chung
import HotelsPage from './pages/customer/HotelsPage'; // Trang chuyên Khách sạn
import ToursPage from './pages/customer/ToursPage';   // Trang chuyên Tour
import ServiceDetail from './pages/ServiceDetail';   // Xem chi tiết để đặt chỗ
import Checkout from './pages/customer/Checkout';     
import BookingSuccess from './pages/customer/BookingSuccess';

// --- TRANG PARTNER (KÊNH NGƯỜI BÁN) ---
import ManagePartnerServices from './pages/partner/ManagePartnerServices';
import ServiceForm from './pages/Admin/ServiceForm'; 
import ManageAvailability from './pages/partner/ManageAvailability';
import ServiceConsole from './pages/partner/ServiceConsole'; // Trang quản trị chi tiết 1 dịch vụ

// --- TRANG ADMIN (QUẢN TRỊ VIÊN) ---
import AdminManageServices from './pages/Admin/AdminManageServices';
import DestinationForm from './pages/Admin/DestinationForm';
import EditDestination from './pages/Admin/EditDestination';
import SpotForm from './pages/Admin/SpotForm';
import EditSpot from './pages/Admin/EditSpot';

function App() {
  // Lấy thông tin người dùng từ LocalStorage
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const role = user?.roleName?.toLowerCase();

  return (
    <Routes>
      {/* ─── 1. TRANG CHỦ ─── */}
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

      {/* ─── 2. PUBLIC DÀNH CHO CUSTOMER ─── */}
      <Route path="/destinations" element={<MainLayout><Destinations /></MainLayout>} />
      <Route path="/destinations/:id" element={<MainLayout><DestinationDetail /></MainLayout>} />
      <Route path="/destinations/:id/spots" element={<MainLayout><SpotList /></MainLayout>} />
      <Route path="/spots" element={<MainLayout><SpotList /></MainLayout>} />
      <Route path="/spots/:id" element={<MainLayout><SpotDetail /></MainLayout>} />
      
      {/* Phân tách Khách sạn và Tour */}
      <Route path="/services" element={<MainLayout><Services /></MainLayout>} />
      <Route path="/hotels" element={<MainLayout><HotelsPage /></MainLayout>} />
      <Route path="/tours" element={<MainLayout><ToursPage /></MainLayout>} />
      <Route path="/services/:id" element={<MainLayout><ServiceDetail /></MainLayout>} />
      <Route path="/checkout/:bookingId" element={<MainLayout><Checkout /></MainLayout>} />
      <Route path="/booking-success/:bookingId" element={<MainLayout><BookingSuccess /></MainLayout>} />

      {/* ─── 3. PARTNER AREA (PROTECTED) ─── */}
      {role === 'partner' && (
        <>
          {/* Quản lý danh sách dịch vụ của tôi */}
          <Route path="/partner/services" element={<MainLayout><ManagePartnerServices /></MainLayout>} />
          
          {/* Thêm/Sửa thông tin cơ bản */}
          <Route path="/partner/services/add" element={<MainLayout><ServiceForm /></MainLayout>} />
          <Route path="/partner/services/edit/:id" element={<MainLayout><ServiceForm /></MainLayout>} />
          
          {/* Quản trị chi tiết từng dịch vụ (Console) */}
          <Route path="/partner/services/:id/manage" element={<MainLayout><ServiceConsole /></MainLayout>} />
          
          {/* Thiết lập lịch mở bán và giá */}
          <Route path="/partner/availability" element={<MainLayout><ManageAvailability /></MainLayout>} />
        </>
      )}

      {/* ─── 4. ADMIN AREA (PROTECTED) ─── */}
      {role === 'admin' && (
        <>
          <Route path="/admin/destinations/add" element={<MainLayout><DestinationForm /></MainLayout>} />
          <Route path="/admin/destinations/edit/:id" element={<MainLayout><EditDestination /></MainLayout>} />
          <Route path="/admin/spots/add" element={<MainLayout><SpotForm /></MainLayout>} />
          <Route path="/admin/spots/edit/:id" element={<MainLayout><EditSpot /></MainLayout>} />
          <Route path="/admin/services" element={<MainLayout><AdminManageServices /></MainLayout>} />
        </>
      )}

      {/* ─── 5. USER AREA & AUTH ─── */}
      <Route path="/profile" element={<MainLayout><Profile /></MainLayout>} />
      <Route path="/preferences" element={<MainLayout><UserPreferences /></MainLayout>} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* ─── 6. FALLBACK ─── */}
      {/* Nếu gõ đường dẫn không tồn tại hoặc không đủ quyền, tự động đá về trang chủ */}
      <Route path="*" element={<Navigate to="/" replace />} />
      <Route path="/itinerary/latest" element={<MainLayout><Timeline /></MainLayout>} />
    </Routes>
  );
}

export default App;