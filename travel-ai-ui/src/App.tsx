import { Navigate, Route, Routes } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import { useEffect } from 'react';
import Chatbox from './components/chat/Chatbox';
import ProtectedRoute from './components/ProtectedRoute';
import RealtimeNotifications from './components/RealtimeNotifications';
import MainLayout from './layouts/MainLayout';
import { useCart } from './contexts/CartContext';
import AdminManageServices from './pages/Admin/AdminManageServices';
import AdminManagePartners from './pages/Admin/AdminManagePartners';
import AdminStats from './pages/Admin/AdminStats';
import AdminUsers from './pages/Admin/AdminUsers';
import AdminVietQrPayments from './pages/Admin/AdminVietQrPayments';
import DestinationForm from './pages/Admin/DestinationForm';
import EditDestination from './pages/Admin/EditDestination';
import EditSpot from './pages/Admin/EditSpot';
import ServiceForm from './pages/Admin/ServiceForm';
import SpotForm from './pages/Admin/SpotForm';
import AiSuggestionPage from './pages/AiSuggestionPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import BookingSuccess from './pages/customer/BookingSuccess';
import Cart from './pages/customer/Cart';
import Checkout from './pages/customer/Checkout';
import CheckoutFailed from './pages/customer/CheckoutFailed';
import HotelsPage from './pages/customer/HotelsPage';
import MyBookings from './pages/customer/MyBookings';
import PaymentResult from './pages/customer/PaymentResult';
import ToursPage from './pages/customer/ToursPage';
import DestinationDetail from './pages/DestinationDetail';
import Destinations from './pages/Destinations';
import SpotList from './pages/Destinations/SpotList';
import Home from './pages/Home';
import Notifications from './pages/Notifications';
import UserPreferences from './pages/Preferences/UserPreferences';
import Timeline from './pages/Planner/Timeline';
import CreateItinerary from './pages/Planner/CreateItinerary';
import Profile from './pages/Profile/Profile';
import PublicBookingQr from './pages/PublicBookingQr';
import PublicETicket from './pages/PublicETicket';
import ManageAvailability from './pages/partner/ManageAvailability';
import PartnerDashboard from './pages/partner/PartnerDashboard';
import PartnerProfile from './pages/partner/PartnerProfile';
import ManagePartnerServices from './pages/partner/ManagePartnerServices';
import PartnerOrders from './pages/partner/PartnerOrders';
import PartnerOrderDetail from './pages/partner/PartnerOrderDetail';
import PartnerReviews from './pages/partner/PartnerReviews';
import ServiceConsole from './pages/partner/ServiceConsole';
import TicketScanner from './pages/partner/TicketScanner';
import ServiceDetail from './pages/ServiceDetail';
import TransportDetail from './pages/TransportDetail';
import Services from './pages/Services';
import SpotDetail from './pages/SpotDetail';
import Transportation from './pages/Transportation';

function App() {
  const { syncCart } = useCart();

  // Sync cart từ database khi app khởi động (nếu đã đăng nhập)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      syncCart();
    }
  }, [syncCart]);

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<MainLayout hideFooter><Home /></MainLayout>} />
        <Route path="/destinations" element={<MainLayout><Destinations /></MainLayout>} />
        <Route path="/destinations/:id" element={<MainLayout><DestinationDetail /></MainLayout>} />
        <Route path="/destinations/:id/spots" element={<MainLayout><SpotList /></MainLayout>} />
        <Route path="/spots" element={<MainLayout><SpotList /></MainLayout>} />
        <Route path="/spots/:id" element={<MainLayout><SpotDetail /></MainLayout>} />
        <Route path="/ai-suggestions" element={<MainLayout><AiSuggestionPage /></MainLayout>} />
        <Route path="/services" element={<MainLayout><Services /></MainLayout>} />
        <Route path="/hotels" element={<MainLayout><HotelsPage /></MainLayout>} />
        <Route path="/tours" element={<MainLayout><ToursPage /></MainLayout>} />
        <Route path="/transportation" element={<MainLayout><Transportation /></MainLayout>} />
        <Route path="/services/:id" element={<MainLayout><ServiceDetail /></MainLayout>} />
        <Route path="/transport/:id" element={<MainLayout><TransportDetail /></MainLayout>} />
        <Route path="/cart" element={<MainLayout><Cart /></MainLayout>} />
        <Route path="/checkout/:bookingId" element={<MainLayout><Checkout /></MainLayout>} />
        <Route path="/checkout/failed/:bookingId" element={<MainLayout><CheckoutFailed /></MainLayout>} />
        <Route path="/checkout/success/:bookingId" element={<MainLayout><BookingSuccess /></MainLayout>} />
        <Route path="/payment/result" element={<MainLayout><PaymentResult /></MainLayout>} />
        <Route path="/payment-result/:method" element={<MainLayout><PaymentResult /></MainLayout>} />
        <Route path="/booking-success/:bookingId" element={<MainLayout><BookingSuccess /></MainLayout>} />
        <Route path="/e-ticket/:ticketCode" element={<MainLayout><PublicETicket /></MainLayout>} />
        <Route path="/booking-qr/:bookingCode" element={<MainLayout><PublicBookingQr /></MainLayout>} />

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
          path="/partner/profile"
          element={
            <ProtectedRoute allowedRoles={['partner']}>
              <MainLayout><PartnerProfile /></MainLayout>
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
          path="/partner/orders/:bookingId"
          element={
            <ProtectedRoute allowedRoles={['partner']}>
              <MainLayout><PartnerOrderDetail /></MainLayout>
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
          path="/partner/tickets/verify"
          element={
            <ProtectedRoute allowedRoles={['partner']}>
              <MainLayout><TicketScanner /></MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/stats"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <MainLayout><AdminStats /></MainLayout>
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
          path="/admin/partners"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <MainLayout><AdminManagePartners /></MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <MainLayout><AdminUsers /></MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/vietqr-payments"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <MainLayout><AdminVietQrPayments /></MainLayout>
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
        <Route
          path="/admin/tickets/verify"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <MainLayout><TicketScanner /></MainLayout>
            </ProtectedRoute>
          }
        />

        <Route path="/profile" element={<MainLayout><Profile /></MainLayout>} />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute allowedRoles={['customer', 'partner', 'admin']}>
              <MainLayout><Notifications /></MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/preferences"
          element={
            <ProtectedRoute allowedRoles={['customer', 'partner', 'admin']}>
              <MainLayout><UserPreferences /></MainLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/planner/create" element={<MainLayout><CreateItinerary /></MainLayout>} />
        <Route path="/planner/:id" element={<MainLayout><Timeline key="planner-detail" /></MainLayout>} />
        <Route path="/planner" element={<MainLayout><Timeline key="planner-list" /></MainLayout>} />
        <Route path="/itinerary/latest" element={<MainLayout><Timeline /></MainLayout>} />
        <Route path="/itinerary/:id" element={<MainLayout><Timeline /></MainLayout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <RealtimeNotifications />
      <Chatbox />
    </>
  );
}

export default App;
