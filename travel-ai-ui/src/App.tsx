import { Navigate, Route, Routes } from 'react-router-dom';
import Chatbox from './components/chat/Chatbox';
import HomeSearch from './components/HomeSearch';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import AdminManageServices from './pages/Admin/AdminManageServices';
import DestinationForm from './pages/Admin/DestinationForm';
import EditDestination from './pages/Admin/EditDestination';
import EditSpot from './pages/Admin/EditSpot';
import ServiceForm from './pages/Admin/ServiceForm';
import SpotForm from './pages/Admin/SpotForm';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import BookingSuccess from './pages/customer/BookingSuccess';
import Checkout from './pages/customer/Checkout';
import HotelsPage from './pages/customer/HotelsPage';
import MyBookings from './pages/customer/MyBookings';
import ToursPage from './pages/customer/ToursPage';
import DestinationDetail from './pages/DestinationDetail';
import Destinations from './pages/Destinations';
import SpotList from './pages/Destinations/SpotList';
import UserPreferences from './pages/Preferences/UserPreferences';
import Timeline from './pages/Planner/Timeline';
import Profile from './pages/Profile/Profile';
import ManageAvailability from './pages/partner/ManageAvailability';
import PartnerDashboard from './pages/partner/PartnerDashboard';
import ManagePartnerServices from './pages/partner/ManagePartnerServices';
import PartnerOrders from './pages/partner/PartnerOrders';
import PartnerReviews from './pages/partner/PartnerReviews';
import ServiceConsole from './pages/partner/ServiceConsole';
import ServiceDetail from './pages/ServiceDetail';
import Services from './pages/Services';
import SpotDetail from './pages/SpotDetail';

function App() {
  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <MainLayout>
              <div className="py-10 px-4">
                <div className="mx-auto mb-6 max-w-2xl text-center">
                  <h1 className="text-4xl font-black tracking-tight text-slate-900">
                    Chào mừng tới TravelAI
                  </h1>
                  <p className="mt-2 font-medium text-slate-500">
                    Khám phá các điểm đến tuyệt vời cùng sự hỗ trợ của AI
                  </p>
                </div>
                <HomeSearch />
              </div>
              <Destinations />
            </MainLayout>
          }
        />

        <Route path="/destinations" element={<MainLayout><Destinations /></MainLayout>} />
        <Route path="/destinations/:id" element={<MainLayout><DestinationDetail /></MainLayout>} />
        <Route path="/destinations/:id/spots" element={<MainLayout><SpotList /></MainLayout>} />
        <Route path="/spots" element={<MainLayout><SpotList /></MainLayout>} />
        <Route path="/spots/:id" element={<MainLayout><SpotDetail /></MainLayout>} />
        <Route path="/services" element={<MainLayout><Services /></MainLayout>} />
        <Route path="/hotels" element={<MainLayout><HotelsPage /></MainLayout>} />
        <Route path="/tours" element={<MainLayout><ToursPage /></MainLayout>} />
        <Route path="/services/:id" element={<MainLayout><ServiceDetail /></MainLayout>} />
        <Route path="/checkout/:bookingId" element={<MainLayout><Checkout /></MainLayout>} />
        <Route
          path="/booking-success/:bookingId"
          element={<MainLayout><BookingSuccess /></MainLayout>}
        />
        <Route
          path="/my-bookings"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <MainLayout><MyBookings /></MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/partner/dashboard"
          element={
            <ProtectedRoute allowedRoles={['partner']}>
              <MainLayout><PartnerDashboard /></MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/partner/services"
          element={
            <ProtectedRoute allowedRoles={['partner']}>
              <MainLayout><ManagePartnerServices /></MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/partner/services/add"
          element={
            <ProtectedRoute allowedRoles={['partner']}>
              <MainLayout><ServiceForm /></MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/partner/services/edit/:id"
          element={
            <ProtectedRoute allowedRoles={['partner']}>
              <MainLayout><ServiceForm /></MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/partner/services/:id/manage"
          element={
            <ProtectedRoute allowedRoles={['partner']}>
              <MainLayout><ServiceConsole /></MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/partner/availability"
          element={
            <ProtectedRoute allowedRoles={['partner']}>
              <MainLayout><ManageAvailability /></MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/partner/orders"
          element={
            <ProtectedRoute allowedRoles={['partner']}>
              <MainLayout><PartnerOrders /></MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/partner/reviews"
          element={
            <ProtectedRoute allowedRoles={['partner']}>
              <MainLayout><PartnerReviews /></MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/destinations/add"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <MainLayout><DestinationForm /></MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/destinations/edit/:id"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <MainLayout><EditDestination /></MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/spots/add"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <MainLayout><SpotForm /></MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/spots/edit/:id"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <MainLayout><EditSpot /></MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/services"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <MainLayout><AdminManageServices /></MainLayout>
            </ProtectedRoute>
          }
        />

        <Route path="/profile" element={<MainLayout><Profile /></MainLayout>} />
        <Route path="/preferences" element={<MainLayout><UserPreferences /></MainLayout>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/itinerary/latest" element={<MainLayout><Timeline /></MainLayout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Chatbox />
    </>
  );
}

export default App;
