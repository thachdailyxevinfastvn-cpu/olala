import React, { useState } from 'react';
import { authService } from '../../features/auth/authService';
import { LogOut, Bell, User, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Header = ({ onMenuClick, onDesktopToggle, isDesktopCollapsed }) => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  // State cho Modal xác nhận đăng xuất
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogoutClick = (e) => {
    e.preventDefault();
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    authService.logout();
  };

  return (
    <>
      <div
        className={`h-16 bg-white shadow-sm flex items-center justify-between px-4 md:px-6 fixed top-0 right-0 z-10 transition-all duration-300 ease-in-out
          left-0 
          ${isDesktopCollapsed ? 'md:left-20' : 'md:left-64'}
          `}
      >

        <div className="flex items-center gap-3">
          {/* Nút Menu đa năng */}
          <button
            onClick={() => {
              if (window.innerWidth >= 768) {
                onDesktopToggle(); // Desktop: Thu/Phóng
              } else {
                onMenuClick(); // Mobile: Mở Sidebar
              }
            }}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>

          <div className="text-gray-500 text-sm hidden sm:block font-medium">
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>

          {/* Logo Text cho Mobile */}
          <span className="md:hidden font-bold text-green-800 uppercase">SKODA CRM</span>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          <button className="p-2 text-gray-400 hover:text-green-600 transition relative">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          <div className="flex items-center space-x-3 border-l pl-4 border-gray-200">
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-gray-700">{user?.name || 'User'}</p>
              <p className="text-xs text-green-600 font-medium uppercase">{user?.role || 'Staff'}</p>
            </div>
            <div className="w-8 h-8 md:w-9 md:h-9 bg-green-100 rounded-full flex items-center justify-center text-green-700 border border-green-200">
              <User size={18} />
            </div>
          </div>

          <button onClick={handleLogoutClick} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition ml-1" title="Đăng xuất">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* --- CUSTOM LOGOUT MODAL --- */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-red-100 p-3 rounded-full text-red-600">
                <LogOut size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Xác nhận đăng xuất</h3>
                <p className="text-sm text-gray-500 mt-1">Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?</p>
              </div>
              <div className="flex gap-3 w-full">
                <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-2.5 rounded-lg border border-gray-300 font-bold text-gray-700 hover:bg-gray-50 transition">Hủy</button>
                <button onClick={confirmLogout} className="flex-1 py-2.5 rounded-lg bg-red-600 font-bold text-white hover:bg-red-700 shadow transition">Đăng xuất</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default Header;