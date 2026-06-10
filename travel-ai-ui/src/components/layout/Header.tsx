// src/components/layout/Header.tsx

import React, { useState, useEffect } from 'react';
import { Menu, X, Plane, LogOut, LayoutDashboard, Store, User, ChevronDown, Hotel, Compass, ClipboardList, MessageSquare, BarChart3, Building2, ShoppingCart, Landmark, Sparkles } from 'lucide-react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { NotificationBell } from '../notifications';
import { getUser } from '../../utils/userUtils';

const Header: React.FC = () => {
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [userState, setUserState] = useState(getUser());
  const navigate = useNavigate();
  const location = useLocation();
  const { items } = useCart();
  const location = useLocation();

  const role = userState?.roleName?.toLowerCase(); 

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
    window.location.reload();
  };

  const getAdminLinkClass = (path: string) => {
    const isActive = location.pathname.startsWith(path);
    return `flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition-all ${
      isActive
        ? 'bg-blue-50 text-blue-700'
        : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600'
    }`;
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleUserUpdated = () => {
      setUserState(getUser());
    };
    
    window.addEventListener('userUpdated', handleUserUpdated);
    return () => window.removeEventListener('userUpdated', handleUserUpdated);
  }, []);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <header className={`fixed w-full z-50 border-b transition-all duration-300 ${
      isScrolled
        ? 'border-slate-200 bg-white shadow-md py-3 dark:border-slate-800 dark:bg-slate-950'
        : 'border-transparent bg-white/90 backdrop-blur-md py-4 dark:bg-slate-950/90'
    }`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="flex items-center">
          
          {/* LOGO */}
          <Link
            to={role === 'partner' ? '/partner/services' : role === 'admin' ? '/admin/stats' : '/'}
            className="group mr-10 flex shrink-0 cursor-pointer items-center gap-2 lg:mr-12"
          >
            <div className="bg-blue-500 p-1.5 rounded-lg group-hover:rotate-12 transition-transform">
                <Plane className="text-white size-6" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Travel<span className="text-blue-500">AI</span>
            </span>
          </Link>

          {/* DESKTOP MENU */}
          <nav className="hidden flex-1 items-center gap-6 md:flex lg:gap-7">
            {role !== 'partner' && role !== 'admin' && (
              <>
                <Link to="/" className="text-slate-600 hover:text-blue-500 font-medium text-sm transition-all dark:text-slate-300 dark:hover:text-blue-400">Trang chá»§</Link>
                <Link to="/destinations" className="text-slate-600 hover:text-blue-500 font-medium text-sm transition-all dark:text-slate-300 dark:hover:text-blue-400">Äiá»ƒm Ä‘áº¿n</Link>
                
                {/* DROPDOWN SERVICES */}
                <div 
                    className="relative py-2"
                    onMouseEnter={() => setIsServicesOpen(true)}
                    onMouseLeave={() => setIsServicesOpen(false)}
                >
                    <button className="flex items-center gap-1 text-slate-600 hover:text-blue-500 font-medium text-sm transition-all outline-none dark:text-slate-300">
                        Dịch vụ <ChevronDown size={14} className={`transition-transform duration-300 ${isServicesOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isServicesOpen && (
                        <div className="absolute top-full left-0 w-60 bg-white rounded-3xl shadow-2xl border border-slate-100 p-3 animate-in fade-in slide-in-from-top-2 duration-300 dark:border-slate-800 dark:bg-slate-900">
                            <Link to="/hotels" className="flex items-center gap-3 p-3 hover:bg-blue-50 rounded-2xl transition-all group/item dark:hover:bg-slate-800">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl group-hover/item:bg-blue-600 group-hover/item:text-white transition-colors">
                                    <Hotel size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-black text-slate-800 dark:text-slate-100">Khách sạn</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Tìm chỗ ở ưng ý</p>
                                </div>
                            </Link>
                            <Link to="/tours" className="flex items-center gap-3 p-3 hover:bg-emerald-50 rounded-2xl transition-all group/item mt-1 dark:hover:bg-slate-800">
                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl group-hover/item:bg-emerald-600 group-hover/item:text-white transition-colors">
                                    <Compass size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-black text-slate-800 dark:text-slate-100">Tour du lịch</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Trải nghiệm thú vị</p>
                                </div>
                            </Link>
                            <Link to="/transportation" className="flex items-center gap-3 p-3 hover:bg-purple-50 rounded-2xl transition-all group/item mt-1 dark:hover:bg-slate-800">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-xl group-hover/item:bg-purple-600 group-hover/item:text-white transition-colors">
                                    <Plane size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-black text-slate-800 dark:text-slate-100">Di chuyển</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Tiện lợi, dễ dàng</p>
                                </div>
                            </Link>
                        </div>
                    )}
                </div>

                <Link to="/ai-suggestions" className="flex items-center gap-1.5 text-slate-600 hover:text-blue-500 font-medium text-sm transition-all group dark:text-slate-300">
                  <Sparkles size={16} className="text-blue-400 group-hover:text-blue-500 transition-colors" />
                  <span>Gá»£i Ã½ AI</span>
                </Link>

                <Link to="/planner" className="text-slate-600 hover:text-blue-500 font-medium text-sm transition-all dark:text-slate-300">Lịch trình</Link>
                <Link to="/cart" className="relative text-slate-600 hover:text-blue-500 font-medium text-sm transition-all dark:text-slate-300">
                  Giỏ hàng
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
                <Link to="/partner/dashboard" className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 ${isActive('/partner/dashboard') ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                  <BarChart3 size={16} /> <span>Báo cáo</span>
                </Link>
                <Link to="/partner/profile" className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 ${isActive('/partner/profile') ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                  <Building2 size={16} /> <span>Doanh nghiệp</span>
                </Link>
                <Link to="/partner/services" className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 ${isActive('/partner/services') ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                  <Store size={16} /> <span>Dịch vụ</span>
                </Link>
                <Link to="/partner/orders" className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 ${isActive('/partner/orders') ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                  <ClipboardList size={16} /> <span>Đơn hàng</span>
                </Link>
                <Link to="/partner/reviews" className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 ${isActive('/partner/reviews') ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                  <MessageSquare size={16} /> <span>Đánh giá</span>
                </Link>
              </>
            )}

            {/* ADMIN MENU */}
            {role === 'admin' && (
              <>
                <Link to="/admin/stats" className={getAdminLinkClass('/admin/stats')}>
                  <BarChart3 size={14} /> Thống kê
                </Link>
                <Link to="/admin/partners" className={getAdminLinkClass('/admin/partners')}>
                  <LayoutDashboard size={14} /> Quản lý Partner
                </Link>
                <Link to="/admin/services" className={getAdminLinkClass('/admin/services')}>
                  <Store size={14} /> Quản lý dịch vụ
                </Link>
                <Link to="/admin/vietqr-payments" className={getAdminLinkClass('/admin/vietqr-payments')}>
                  <Landmark size={14} /> VietQR
                </Link>
                <Link to="/admin/users" className={getAdminLinkClass('/admin/users')}>
                  <User size={14} /> Quản lý User
                </Link>
              </>
            )}
          </nav>

          {/* USER ACTIONS */}
          <div className="hidden shrink-0 items-center gap-3 md:flex">
            {userState ? (
                <div className="flex items-center gap-4">
                    <NotificationBell />
                    <Link to="/profile" className="text-sm font-black text-slate-900 hover:text-blue-600 transition-all flex items-center gap-1 dark:text-white dark:hover:text-blue-400">
                      {userState.fullName} <User size={14} className="text-blue-500" />
                    </Link>
                    <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors dark:hover:bg-red-950/40">
                      <LogOut size={20} />
                    </button>
                </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => navigate('/login')} className="px-5 py-2 text-slate-700 font-bold text-sm hover:text-blue-500 dark:text-slate-300">Đăng nhập</button>
                <button onClick={() => navigate('/register')} className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 transition-all active:scale-95">Đăng ký</button>
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2 md:hidden">
            {userState && <NotificationBell />}
            <button onClick={() => setIsOpen(!isOpen)} className="text-slate-600 p-2 dark:text-slate-200">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE MENU */}
      {isOpen && (
        <div className="border-t border-slate-100 bg-white px-4 py-4 shadow-lg md:hidden dark:border-slate-800 dark:bg-slate-950 overflow-y-auto max-h-[80vh]">
          <nav className="flex flex-col gap-2">
            {/* User thông thường */}
            {role !== 'partner' && role !== 'admin' && (
              <>
                <Link onClick={() => setIsOpen(false)} to="/" className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900">Trang chủ</Link>
                <Link onClick={() => setIsOpen(false)} to="/destinations" className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900">Điểm đến</Link>
                <Link onClick={() => setIsOpen(false)} to="/hotels" className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900">Khách sạn</Link>
                <Link onClick={() => setIsOpen(false)} to="/tours" className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900">Tour du lịch</Link>
                <Link onClick={() => setIsOpen(false)} to="/transportation" className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900">Di chuyển</Link>
                <Link onClick={() => setIsOpen(false)} to="/planner" className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900">Lịch trình</Link>
                <Link onClick={() => setIsOpen(false)} to="/cart" className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900">Giỏ hàng</Link>
              </>
            )}

            {/* Partner Mobile */}
            {role === 'partner' && (
              <>
                <Link onClick={() => setIsOpen(false)} to="/partner/dashboard" className="px-4 py-2.5 rounded-xl text-slate-700 font-bold text-sm hover:bg-slate-50 dark:text-slate-200">Báo cáo</Link>
                <Link onClick={() => setIsOpen(false)} to="/partner/profile" className="px-4 py-2.5 rounded-xl text-slate-700 font-bold text-sm hover:bg-slate-50 dark:text-slate-200">Doanh nghiệp</Link>
                <Link onClick={() => setIsOpen(false)} to="/partner/services" className="px-4 py-2.5 rounded-xl text-slate-700 font-bold text-sm hover:bg-slate-50 dark:text-slate-200">Dịch vụ</Link>
                <Link onClick={() => setIsOpen(false)} to="/partner/orders" className="px-4 py-2.5 rounded-xl text-slate-700 font-bold text-sm hover:bg-slate-50 dark:text-slate-200">Đơn hàng</Link>
                <Link onClick={() => setIsOpen(false)} to="/partner/reviews" className="px-4 py-2.5 rounded-xl text-slate-700 font-bold text-sm hover:bg-slate-50 dark:text-slate-200">Đánh giá</Link>
              </>
            )}

            {/* Admin Mobile */}
            {role === 'admin' && (
              <>
                <Link onClick={() => setIsOpen(false)} to="/admin/stats" className="px-4 py-2.5 rounded-xl text-slate-700 font-bold text-sm hover:bg-slate-50 dark:text-slate-200">Thống kê</Link>
                <Link onClick={() => setIsOpen(false)} to="/admin/partners" className="px-4 py-2.5 rounded-xl text-slate-700 font-bold text-sm hover:bg-slate-50 dark:text-slate-200">Quản lý Partner</Link>
                <Link onClick={() => setIsOpen(false)} to="/admin/services" className="px-4 py-2.5 rounded-xl text-slate-700 font-bold text-sm hover:bg-slate-50 dark:text-slate-200">Quản lý Dịch vụ</Link>
                <Link onClick={() => setIsOpen(false)} to="/admin/vietqr-payments" className="px-4 py-2.5 rounded-xl text-slate-700 font-bold text-sm hover:bg-slate-50 dark:text-slate-200">VietQR</Link>
                <Link onClick={() => setIsOpen(false)} to="/admin/users" className="px-4 py-2.5 rounded-xl text-slate-700 font-bold text-sm hover:bg-slate-50 dark:text-slate-200">Quản lý User</Link>
              </>
            )}

            {/* Auth Section Mobile */}
            <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
              {userState ? (
                <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-black text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40">
                  <LogOut size={18} /> Đăng xuất
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setIsOpen(false); navigate('/login'); }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 dark:border-slate-700 dark:text-slate-200">Đăng nhập</button>
                  <button onClick={() => { setIsOpen(false); navigate('/register'); }} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white">Đăng ký</button>
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
