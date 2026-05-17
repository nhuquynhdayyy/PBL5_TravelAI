import React from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

interface MainLayoutProps {
  children: React.ReactNode;
  hideFooter?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, hideFooter = false }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      
      {/* Main Content Area */}
      <main className="flex-grow pt-20 pb-12">
        {/* Container chuẩn cho tất cả trang */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500">
          {children}
        </div>
      </main>

      {!hideFooter && <Footer />}
    </div>
  );
};

export default MainLayout;
