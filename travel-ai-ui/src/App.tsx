// import { Routes, Route } from 'react-router-dom';
// import MainLayout from './layouts/MainLayout';
// import Login from './pages/auth/Login';
// import Register from './pages/auth/Register';
// import Destinations from './pages/Destinations';
// import Profile from './pages/Profile/Profile';
// import DestinationDetail from './pages/DestinationDetail';
// import UserPreferences from './pages/Preferences/UserPreferences';
// import DestinationForm from './pages/Admin/DestinationForm'; 
// import EditDestination from './pages/Admin/EditDestination';
// import SpotList from './pages/Destinations/SpotList';
// import SpotForm from './pages/Admin/SpotForm'; 
// import EditSpot from './pages/Admin/EditSpot';
// import SpotDetail from './pages/SpotDetail';

// function App() {
//   return (
//     <Routes>
//       {/* Route Trang chủ */}
//       <Route path="/" element={
//         <MainLayout>
//           <div className="py-5">
//              <h1 className="text-4xl font-bold text-center">Chào mừng tới TravelAI</h1>
//              <p className="text-center mt-2 text-slate-600">Khám phá các điểm đến tuyệt vời cùng AI</p>
//           </div>
//           <Destinations /> 
//         </MainLayout>
//       } />

//       {/* THÊM ROUTE NÀY: Route dành riêng cho trang Destinations */}
//       <Route path="/destinations" element={
//         <MainLayout>
//           <Destinations />
//         </MainLayout>
//       } />
//       <Route path="/destinations/:id" element={<MainLayout><DestinationDetail /></MainLayout>} />
//       <Route path="/admin/destinations/add" element={<MainLayout><DestinationForm /></MainLayout>} />
//       <Route path="/admin/destinations/edit/:id" element={<MainLayout><EditDestination /></MainLayout>} />
//       <Route path="/preferences" element={<UserPreferences />} />
//       <Route path="/profile" element={<Profile />} />
//       <Route path="/login" element={<Login />} />
//       <Route path="/register" element={<Register />} />
//       <Route path="/destinations/:id/spots" element={<MainLayout><SpotList /></MainLayout>} />
//       <Route path="/admin/spots/add" element={<MainLayout><SpotForm /></MainLayout>} />
//       <Route path="/admin/spots/edit/:id" element={<MainLayout><EditSpot /></MainLayout>} />
//       <Route path="/spots/:id" element={<MainLayout><SpotDetail /></MainLayout>} />
//     </Routes>
//   );
// }

// export default App;

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
import EditSpot from './pages/Admin/EditSpot';
import SpotDetail from './pages/SpotDetail';
import HomeSearch from './components/HomeSearch'; // ← component mới
import ServiceList from './pages/Services/ServiceList';


function App() {
  return (
    <Routes>
      {/* ── TRANG CHỦ ── */}
      <Route path="/" element={
        <MainLayout>
          {/* Hero section */}
          <div className="py-10 px-4">
            <div className="max-w-2xl mx-auto text-center mb-6">
              <h1 className="text-4xl font-bold text-center">Chào mừng tới TravelAI</h1>
              <p className="text-center mt-2 text-slate-600">Khám phá các điểm đến tuyệt vời cùng AI</p>
            </div>

            {/* ── THANH TÌM KIẾM ── */}
            <HomeSearch />
          </div>

          {/* Danh sách tỉnh thành */}
          <Destinations />
        </MainLayout>
      } />

      {/* ── DESTINATIONS ── */}
      <Route path="/destinations" element={
        <MainLayout>
          <Destinations />
        </MainLayout>
      } />
      <Route path="/destinations/:id" element={<MainLayout><SpotList  /></MainLayout>} />
      <Route path="/admin/destinations/add" element={<MainLayout><DestinationForm /></MainLayout>} />
      <Route path="/admin/destinations/edit/:id" element={<MainLayout><EditDestination /></MainLayout>} />

      {/* ── SPOTS ── */}
      <Route path="/destinations/:id/spots" element={<MainLayout><SpotList /></MainLayout>} />
      <Route path="/spots" element={<MainLayout><SpotList /></MainLayout>} />
      <Route path="/spots/:id" element={<MainLayout><SpotDetail /></MainLayout>} />
      <Route path="/admin/spots/add" element={<MainLayout><SpotForm /></MainLayout>} />
      <Route path="/admin/spots/edit/:id" element={<MainLayout><EditSpot /></MainLayout>} />

      {/* ── SERVICES (Dịch vụ: Khách sạn, Tour) ── */}
      <Route path="/services" element={
        <MainLayout>
          <ServiceList />
        </MainLayout>
      } />
     

      {/* ── AUTH & PROFILE ── */}
      <Route path="/preferences" element={<UserPreferences />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  );
}

export default App;