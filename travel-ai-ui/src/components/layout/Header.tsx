// src/components/layout/Header.tsx

import React, { useState, useEffect } from 'react';
import { Menu, X, Plane, Search, LogOut, LayoutDashboard, Store, User } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const role = user?.roleName?.toLowerCase(); 

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

  return (
    <header className={`fixed w-full z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white shadow-md py-3' : 'bg-white/90 backdrop-blur-md py-4'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          
          {/* Logo - Đối với Partner nhấn vào logo sẽ về trang quản lý của họ */}
          <Link to={role === 'partner' ? "/partner/services" : "/"} className="flex items-center gap-2 cursor-pointer group">
            <div className="bg-blue-500 p-1.5 rounded-lg group-hover:rotate-12 transition-transform">
              <Plane className="text-white size-6" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              Travel<span className="text-blue-500">AI</span>
            </span>
          </Link>

          {/* Navigation Menu */}
          <nav className="hidden md:flex space-x-8 items-center">
            
            {/* CHỈ HIỆN CÁC LINK NÀY NẾU KHÔNG PHẢI LÀ PARTNER */}
            {role !== 'partner' && (
              <>
                <Link to="/" className="text-slate-600 hover:text-blue-500 font-medium text-sm transition-colors">Home</Link>
                <Link to="/destinations" className="text-slate-600 hover:text-blue-500 font-medium text-sm transition-colors">Destinations</Link>
                <Link to="/services" className="text-slate-600 hover:text-blue-500 font-medium text-sm transition-colors">Services</Link>
                <Link to="/planner" className="text-slate-600 hover:text-blue-500 font-medium text-sm transition-colors">Itinerary</Link>
              </>
            )}

            {/* PARTNER CHỈ THẤY MY SERVICES */}
            {role === 'partner' && (
              <Link 
                to="/partner/services" 
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-full font-black text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 uppercase tracking-widest"
              >
                <Store size={14} /> MY SERVICES
              </Link>
            )}

            {/* ADMIN CHỈ THẤY QUẢN TRỊ VIÊN */}
            {role === 'admin' && (
              <Link 
                to="/admin/services" 
                className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-full font-black text-xs hover:bg-black transition-all shadow-lg shadow-slate-200 uppercase tracking-widest"
              >
                <LayoutDashboard size={14} /> QUẢN TRỊ VIÊN
              </Link>
            )}
          </nav>

          {/* User Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Search className="size-5 text-slate-500 cursor-pointer hover:text-blue-500 transition-colors" />
            <div className="h-6 w-px bg-slate-200 mx-1"></div>
           
            {user ? (
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <Link to="/profile" className="text-sm font-black text-slate-900 hover:text-blue-600 transition-all">
                        {user.fullName}
                      </Link>
                      {role === 'customer' && (
                        <Link to="/preferences" className="text-[10px] text-blue-500 hover:underline font-bold uppercase tracking-tighter">
                          AI Preferences
                        </Link>
                      )}
                    </div>
                    
                    <button
                      onClick={handleLogout}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      title="Logout"
                    >
                      <LogOut size={20} />
                    </button>
                </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => navigate('/login')} className="px-5 py-2 text-slate-700 font-bold text-sm hover:text-blue-500">Login</button>
                <button onClick={() => navigate('/register')} className="flex items-center px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 transition-all active:scale-95">
                  Register
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-slate-600">
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 py-6 px-4 space-y-4 shadow-2xl animate-in slide-in-from-top duration-300">
           {role !== 'partner' && (
             <>
                <Link to="/" className="block text-slate-600 font-bold py-2">Home</Link>
                <Link to="/destinations" className="block text-slate-600 font-bold py-2">Destinations</Link>
                <Link to="/services" className="block text-slate-600 font-bold py-2">Services</Link>
             </>
           )}
           
           {role === 'partner' && (
             <Link to="/partner/services" className="block text-blue-600 font-black py-2">My Services</Link>
           )}

           {role === 'admin' && (
             <Link to="/admin/services" className="block text-red-600 font-black py-2">Quản Trị Hệ Thống</Link>
           )}

           <Link to="/profile" className="block text-slate-900 font-black py-2 border-t pt-4">Trang cá nhân</Link>
           
           {user && (
             <button onClick={handleLogout} className="w-full mt-4 py-4 bg-red-50 text-red-600 font-bold rounded-2xl flex items-center justify-center gap-2">
               <LogOut size={18} /> Đăng xuất
             </button>
           )}
        </div>
      )}
    </header>
  );
};

export default Header;