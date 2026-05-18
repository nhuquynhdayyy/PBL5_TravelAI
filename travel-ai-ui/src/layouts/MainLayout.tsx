import React from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import DarkModeToggle from '../components/DarkModeToggle';
import { useDarkMode } from '../hooks/useDarkMode';

interface MainLayoutProps {
  children: React.ReactNode;
  hideFooter?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, hideFooter = false }) => {
  // Khởi tạo dark mode ở layout level để đảm bảo class được apply sớm
  useDarkMode();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <Header />

      {/* Main Content Area */}
      <main className="flex-grow pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500">
          {children}
        </div>
      </main>

      {!hideFooter && <Footer />}

      {/* Dark Mode Toggle — fixed bottom-left */}
      <div className="fixed bottom-6 left-6 z-50">
        <DarkModeToggle className="shadow-lg shadow-slate-900/10 ring-1 ring-slate-200 dark:ring-slate-700" />
      </div>
    </div>
  );
};

export default MainLayout;
