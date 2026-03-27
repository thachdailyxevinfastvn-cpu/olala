import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { authService } from '../../features/auth/authService';
// 1. Import Component Mascot
import Mascot from '../ui/Mascot';
// 2. Import FallingFlowers
import FallingFlowers from '../ui/FallingFlowers';

const MainLayout = () => {
  const navigate = useNavigate();
  
  // State cho Mobile: Mặc định ĐÓNG (False)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // State cho Desktop: Mặc định THU GỌN (True)
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(true);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) navigate('/login');
  }, [navigate]);

  return (
    <div className="flex min-h-screen bg-gray-50 relative">
      {/* Sidebar nhận cả 2 state để xử lý riêng biệt */}
      <Sidebar 
        isMobileOpen={isMobileSidebarOpen} 
        setIsMobileOpen={setIsMobileSidebarOpen}
        isDesktopCollapsed={isDesktopCollapsed}
        toggleDesktop={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
      />
      
      {/* Logic Margin cho Content:
         - Mobile: ml-0 (Full width)
         - Desktop (md): ml-20 (nếu thu gọn) hoặc ml-64 (nếu mở rộng)
      */}
      <div 
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out w-full
          ${isDesktopCollapsed ? 'md:ml-20' : 'md:ml-64'}
        `}
      >
        <Header 
          onMenuClick={() => setIsMobileSidebarOpen(true)} 
          onDesktopToggle={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
          isDesktopCollapsed={isDesktopCollapsed}
        />
        
        <main className="flex-1 p-4 md:p-6 mt-16 overflow-y-auto relative z-10">
             <Outlet /> 
        </main>

        {/* 3. Thêm hiệu ứng hoa rơi vào đây (nằm dưới Mascot) */}
        <FallingFlowers />

        {/* 4. Đặt Mascot ở đây. 
            Nó sẽ nằm đè lên nội dung nhờ thuộc tính fixed z-[9999] bên trong component Mascot 
        */}
        <Mascot />
        
        
      </div>
    </div>
  );
};
export default MainLayout;