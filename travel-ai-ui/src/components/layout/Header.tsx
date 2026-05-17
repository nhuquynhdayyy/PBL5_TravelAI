// src/components/layout/Header.tsx

import React, { useState, useEffect } from 'react';
import { Menu, X, Plane, LogOut, LayoutDashboard, Store, User, ChevronDown, Hotel, Compass, ClipboardList, MessageSquare, BarChart3, Building2, ShoppingCart, Landmark, Package } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { getUser } from '../../utils/userUtils';

const Header: React.FC = () => {
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [userState, setUserState] = useState(getUser());
  const navigate = useNavigate();
  const { items } = useCart();

  const role = userState?.roleName?.toLowerCase(); 

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
    window.location.reload();
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Lắng nghe event userUpdated để cập nhật state
    const handleUserUpdated = () => {
      setUserState(getUser());
    };
    
    window.addEventListener('userUpdated', handleUserUpdated);
    return () => window.removeEventListener('userUpdated', handleUserUpdated);
  }, []);

  return (
    <header className={`fixed w-full z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white shadow-md py-3' : 'bg-white/90 backdrop-blur-md py-4'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          
          {/* LOGO */}
          <Link
            to={role === 'partner' ? '/partner/services' : role === 'admin' ? '/admin/stats' : '/'}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="bg-blue-500 p-1.5 rounded-lg group-hover:rotate-12 transition-transform">
                <Plane className="text-white size-6" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
                Travel<span className="text-blue-500">AI</span>
            </span>
          </Link>

          {/* DESKTOP MENU */}
          <nav className="hidden md:flex space-x-8 items-center">
            {role !== 'partner' && role !== 'admin' && (
              <>
                <Link to="/" className="text-slate-600 hover:text-blue-500 font-medium text-sm transition-all">Home</Link>
                <Link to="/destinations" className="text-slate-600 hover:text-blue-500 font-medium text-sm transition-all">Destinations</Link>
                
                {/* DROPDOWN SERVICES */}
                <div 
                    className="relative py-2"
                    onMouseEnter={() => setIsServicesOpen(true)}
                    onMouseLeave={() => setIsServicesOpen(false)}
                >
                    <button className="flex items-center gap-1 text-slate-600 hover:text-blue-500 font-medium text-sm transition-all outline-none">
                        Services <ChevronDown size={14} className={`transition-transform duration-300 ${isServicesOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isServicesOpen && (
<div className="absolute top-full left-0 w-60 bg-white rounded-3xl shadow-2xl border border-slate-50 p-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <Link to="/hotels" className="flex items-center gap-3 p-3 hover:bg-blue-50 rounded-2xl transition-all group/item">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl group-hover/item:bg-blue-600 group-hover/item:text-white transition-colors">
                                    <Hotel size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-black text-slate-800">Khách sạn</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Tìm chỗ ở ưng ý</p>
                                </div>
                            </Link>
                            <Link to="/tours" className="flex items-center gap-3 p-3 hover:bg-emerald-50 rounded-2xl transition-all group/item mt-1">
                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl group-hover/item:bg-emerald-600 group-hover/item:text-white transition-colors">
                                    <Compass size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-black text-slate-800">Tour du lịch</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Trải nghiệm thú vị</p>
                                </div>
                            </Link>
                            <Link to="/transportation" className="flex items-center gap-3 p-3 hover:bg-purple-50 rounded-2xl transition-all group/item mt-1">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-xl group-hover/item:bg-purple-600 group-hover/item:text-white transition-colors">
                                    <Plane size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-black text-slate-800">Vé xe & Máy bay</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Di chuyển tiện lợi</p>
                                </div>
                            </Link>
                        </div>
                    )}
                </div>

                <Link to="/planner" className="text-slate-600 hover:text-blue-500 font-medium text-sm transition-all">Itinerary</Link>
                <Link to="/cart" className="relative text-slate-600 hover:text-blue-500 font-medium text-sm transition-all">
                  <ShoppingCart size={20} />
                  {items.length > 0 && (
                    <span className="absolute -right-3 -top-3 flex size-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white">
                      {items.length}
                    </span>
                  )}
                </Link>
              </>
            )}

            {/* PARTNER MENU */}
            {role === 'partner' && (
              <>
                <Link to="/partner/dashboard" className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-full font-black text-xs hover:bg-slate-700 transition-all shadow-lg shadow-slate-100 uppercase tracking-widest">
                  <BarChart3 size={14} /> DASHBOARD
                </Link>
                <Link to="/partner/profile" className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-full font-black text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 uppercase tracking-widest">
                  <Building2 size={14} /> BUSINESS
                </Link>
                <Link to="/partner/services" className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-full font-black text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 uppercase tracking-widest">
                  <Store size={14} /> MY SERVICES
                </Link>
                <Link to="/partner/inventory-pricing" className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-full font-black text-xs hover:bg-purple-700 transition-all shadow-lg shadow-purple-100 uppercase tracking-widest">
                  <Package size={14} /> INVENTORY
                </Link>
<Link to="/partner/orders" className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-full font-black text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 uppercase tracking-widest">
                  <ClipboardList size={14} /> MY ORDERS
                </Link>
                <Link to="/partner/reviews" className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-full font-black text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 uppercase tracking-widest">
                  <MessageSquare size={14} /> MY REVIEWS
                </Link>
              </>
            )}

            {/* ADMIN MENU */}
            {role === 'admin' && (
              <>
                <Link to="/admin/stats" className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-xs hover:bg-emerald-700 transition-all uppercase">
                  <BarChart3 size={14} /> THỐNG KÊ
                </Link>
                <Link to="/admin/partners" className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-black text-xs hover:bg-red-700 transition-all uppercase">
                  <LayoutDashboard size={14} /> QUẢN LÝ PARTNER
                </Link>
                <Link to="/admin/services" className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-slate-700 transition-all uppercase">
                  <Store size={14} /> QUẢN LÝ DỊCH VỤ
                </Link>
                <Link to="/admin/vietqr-payments" className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-xl font-black text-xs hover:bg-emerald-800 transition-all uppercase">
                  <Landmark size={14} /> VIETQR
                </Link>
                <Link to="/admin/users" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-black text-xs hover:bg-indigo-700 transition-all uppercase">
                  <User size={14} /> QUẢN LÝ USER
                </Link>
              </>
            )}
          </nav>

          {/* USER ACTIONS */}
          <div className="hidden md:flex items-center gap-3">
            {userState ? (
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <Link to="/profile" className="text-sm font-black text-slate-900 hover:text-blue-600 transition-all flex items-center gap-1">
                        {userState.fullName} <User size={14} className="text-blue-500" />
                      </Link>
                    </div>
                    <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                      <LogOut size={20} />
                    </button>
                </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => navigate('/login')} className="px-5 py-2 text-slate-700 font-bold text-sm hover:text-blue-500">Login</button>
<button onClick={() => navigate('/register')} className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 transition-all active:scale-95">Register</button>
              </div>
            )}
          </div>

          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-slate-600 p-2">
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
