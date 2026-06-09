// src/components/layout/Header.tsx

import React, { useState, useEffect } from 'react';
import { Menu, X, Plane, LogOut, LayoutDashboard, Store, User, ChevronDown, Hotel, Compass, ClipboardList, MessageSquare, BarChart3, Building2, ShoppingCart, Landmark, Package } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { NotificationBell } from '../notifications';
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
    <header className={`fixed w-full z-50 border-b transition-all duration-300 ${
      isScrolled
        ? 'border-slate-200 bg-white shadow-md py-3 dark:border-slate-800 dark:bg-slate-950'
        : 'border-transparent bg-white/90 backdrop-blur-md py-4 dark:bg-slate-950/90'
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
            <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Travel<span className="text-blue-500">AI</span>
            </span>
          </Link>

          {/* DESKTOP MENU */}
          <nav className="hidden md:flex space-x-8 items-center">
            {role !== 'partner' && role !== 'admin' && (
              <>
                <Link to="/" className="text-slate-600 hover:text-blue-500 font-medium text-sm transition-all dark:text-slate-300 dark:hover:text-blue-400">Home</Link>
                <Link to="/destinations" className="text-slate-600 hover:text-blue-500 font-medium text-sm transition-all dark:text-slate-300 dark:hover:text-blue-400">Destinations</Link>
                
                {/* DROPDOWN SERVICES */}
                <div 
                    className="relative py-2"
                    onMouseEnter={() => setIsServicesOpen(true)}
                    onMouseLeave={() => setIsServicesOpen(false)}
                >
                    <button className="flex items-center gap-1 text-slate-600 hover:text-blue-500 font-medium text-sm transition-all outline-none dark:text-slate-300 dark:hover:text-blue-400">
                        Services <ChevronDown size={14} className={`transition-transform duration-300 ${isServicesOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isServicesOpen && (
<div className="absolute top-full left-0 w-60 bg-white rounded-3xl shadow-2xl border border-slate-100 p-3 animate-in fade-in slide-in-from-top-2 duration-300 dark:border-slate-800 dark:bg-slate-900">
                            <Link to="/hotels" className="flex items-center gap-3 p-3 hover:bg-blue-50 rounded-2xl transition-all group/item dark:hover:bg-slate-800">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl group-hover/item:bg-blue-600 group-hover/item:text-white transition-colors">
                                    <Hotel size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-black text-slate-800">Khách sạn</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Tìm chỗ ở ưng ý</p>
                                </div>
                            </Link>
                            <Link to="/tours" className="flex items-center gap-3 p-3 hover:bg-emerald-50 rounded-2xl transition-all group/item mt-1 dark:hover:bg-slate-800">
                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl group-hover/item:bg-emerald-600 group-hover/item:text-white transition-colors">
                                    <Compass size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-black text-slate-800">Tour du lịch</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Trải nghiệm thú vị</p>
                                </div>
                            </Link>
                            <Link to="/transportation" className="flex items-center gap-3 p-3 hover:bg-purple-50 rounded-2xl transition-all group/item mt-1 dark:hover:bg-slate-800">
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

                <Link to="/planner" className="text-slate-600 hover:text-blue-500 font-medium text-sm transition-all dark:text-slate-300 dark:hover:text-blue-400">Itinerary</Link>
                <Link to="/cart" className="relative text-slate-600 hover:text-blue-500 font-medium text-sm transition-all dark:text-slate-300 dark:hover:text-blue-400">
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
                    <NotificationBell />
                    <div className="flex flex-col items-end">
                      <Link to="/profile" className="text-sm font-black text-slate-900 hover:text-blue-600 transition-all flex items-center gap-1 dark:text-white dark:hover:text-blue-400">
                        {userState.fullName} <User size={14} className="text-blue-500" />
                      </Link>
                    </div>
                    <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors dark:hover:bg-red-950/40">
                      <LogOut size={20} />
                    </button>
                </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => navigate('/login')} className="px-5 py-2 text-slate-700 font-bold text-sm hover:text-blue-500 dark:text-slate-200 dark:hover:text-blue-400">Login</button>
<button onClick={() => navigate('/register')} className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 transition-all active:scale-95">Register</button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {userState && <NotificationBell />}
            <button onClick={() => setIsOpen(!isOpen)} className="text-slate-600 p-2 dark:text-slate-200">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-slate-100 bg-white px-4 py-4 shadow-lg md:hidden dark:border-slate-800 dark:bg-slate-950">
          <nav className="mx-auto flex max-w-7xl flex-col gap-2">
            {role !== 'partner' && role !== 'admin' && (
              <>
                <Link onClick={() => setIsOpen(false)} to="/" className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">Home</Link>
                <Link onClick={() => setIsOpen(false)} to="/destinations" className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">Destinations</Link>
                <Link onClick={() => setIsOpen(false)} to="/hotels" className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">Hotels</Link>
                <Link onClick={() => setIsOpen(false)} to="/tours" className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">Tours</Link>
                <Link onClick={() => setIsOpen(false)} to="/transportation" className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">Transportation</Link>
                <Link onClick={() => setIsOpen(false)} to="/planner" className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">Itinerary</Link>
                <Link onClick={() => setIsOpen(false)} to="/cart" className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">Cart</Link>
              </>
            )}

            {role === 'partner' && (
              <>
                <Link onClick={() => setIsOpen(false)} to="/partner/dashboard" className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">Dashboard</Link>
                <Link onClick={() => setIsOpen(false)} to="/partner/profile" className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">Business</Link>
                <Link onClick={() => setIsOpen(false)} to="/partner/services" className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">My Services</Link>
                <Link onClick={() => setIsOpen(false)} to="/partner/orders" className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">My Orders</Link>
                <Link onClick={() => setIsOpen(false)} to="/partner/reviews" className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">My Reviews</Link>
              </>
            )}

            {role === 'admin' && (
              <>
                <Link onClick={() => setIsOpen(false)} to="/admin/stats" className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">Stats</Link>
                <Link onClick={() => setIsOpen(false)} to="/admin/partners" className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">Partners</Link>
                <Link onClick={() => setIsOpen(false)} to="/admin/services" className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">Services</Link>
                <Link onClick={() => setIsOpen(false)} to="/admin/vietqr-payments" className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">VietQR</Link>
                <Link onClick={() => setIsOpen(false)} to="/admin/users" className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">Users</Link>
              </>
            )}

            <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
              {userState ? (
                <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-black text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40">
                  <LogOut size={18} /> Logout
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setIsOpen(false); navigate('/login'); }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 dark:border-slate-800 dark:text-slate-200">Login</button>
                  <button onClick={() => { setIsOpen(false); navigate('/register'); }} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white">Register</button>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
