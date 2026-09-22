import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { authService } from '../../features/auth/authService';

const MainLayout = () => {
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) navigate('/login');
  }, [navigate]);

  return (
    <div className="flex min-h-screen bg-[#fafaf9] relative">
      {/* Mobile-only drawer sidebar */}
      <Sidebar 
        isMobileOpen={isMobileSidebarOpen} 
        setIsMobileOpen={setIsMobileSidebarOpen}
      />
      
      {/* Main content container - no left margins for sidebar on desktop */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <Header 
          onMenuClick={() => setIsMobileSidebarOpen(true)} 
        />
        
        <main className="flex-1 p-4 md:p-6 mt-16 overflow-y-auto relative z-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;