import React, { useState } from 'react';
import { authService } from '../../features/auth/authService';
import { Bell, User, Menu, LayoutDashboard, Users, FileText, Settings, BarChart3, UserPlus, Calendar, LogOut } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';

const Header = ({ onMenuClick }) => {
  const user = authService.getCurrentUser();
  const location = useLocation();
  const path = location.pathname;

  // Map path to Vietnamese page name
  const pageNames = {
    '/dashboard': 'Dashboard',
    '/customers': 'Khách hàng',
    '/assign-customers': 'Phân khách',
    '/calendar': 'Lịch Trực',
    '/reports': 'Báo cáo',
    '/orders': 'Đơn hàng',
    '/settings': 'Cài đặt',
  };
  const currentPageName = pageNames[path] || 'Dashboard';
  const displayName = user?.name || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  const roleStr = (user?.role || '').toLowerCase();
  const isAdmin = roleStr.includes('admin');

  let menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={15} />, path: '/dashboard' },
    { name: 'Khách hàng', icon: <Users size={15} />, path: '/customers' },
    { name: 'Phân khách', icon: <UserPlus size={15} />, path: '/assign-customers' },
    { name: 'Lịch Trực', icon: <Calendar size={15} />, path: '/calendar' },
    { name: 'Báo cáo', icon: <BarChart3 size={15} />, path: '/reports' },
    { name: 'Đơn hàng', icon: <FileText size={15} />, path: '/orders' },
  ];

  if (isAdmin) {
    menuItems.push({ name: 'Cài đặt', icon: <Settings size={15} />, path: '/settings' });
  }

  // Logout modal state
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
        className="h-16 bg-white/90 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 fixed top-0 left-0 right-0 z-40 border-b border-stone-200/50"
      >
        {/* LEFT SIDE: Logo & Hamburger */}
        <div className="flex items-center gap-3">
          {/* Menu button for Mobile / Tablet (< lg) */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-all duration-200"
          >
            <Menu size={20} />
          </button>

          {/* Logo capsule */}
          <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm shadow-amber-500/20 shrink-0">
              <span className="text-white font-black text-xs">MG</span>
            </div>
            <span className="font-bold text-stone-800 text-sm tracking-wide hidden sm:inline-block">CRM BÌNH DƯƠNG</span>
          </Link>

          <span className="text-stone-300 text-xs hidden lg:inline-block">•</span>

          {/* Mobile page title display */}
          <span className="lg:hidden font-bold text-stone-800 text-sm">{currentPageName}</span>
        </div>

        {/* CENTER SIDE: Desktop Horizontal Menu (>= lg) */}
        <div className="hidden lg:flex items-center gap-1 bg-stone-100/80 p-1 rounded-full border border-stone-200/40">
          {menuItems.map((item) => {
            const isActive = path === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-stone-900 shadow-sm border border-stone-200/30'
                    : 'text-stone-500 hover:text-stone-800 hover:bg-white/40'
                }`}
              >
                <span className={isActive ? 'text-amber-500' : 'text-stone-400'}>
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* RIGHT SIDE: Search, Notifications, User Profile & Logout */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* Date for desktop */}
          <div className="hidden xl:block text-right pr-2">
            <span className="text-stone-400 text-[11px] font-semibold uppercase tracking-wider">
              {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>

          {/* Notifications */}
          <button className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-all duration-200 relative">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-400 rounded-full ring-2 ring-white" />
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-stone-200 mx-1 hidden sm:block" />

          {/* User info */}
          <div className="flex items-center gap-2.5 pl-1">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-stone-800 leading-tight">{displayName}</p>
              <p className="text-[9px] text-amber-600 font-bold uppercase tracking-wider mt-0.5">{user?.role || 'Staff'}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-xs shadow-sm shadow-amber-500/10">
              {initial}
            </div>
          </div>

          {/* Logout directly in header */}
          <button
            onClick={handleLogoutClick}
            className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 ml-1"
            title="Đăng xuất"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-red-50 p-3.5 rounded-2xl text-red-500">
                <LogOut size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Xác nhận đăng xuất</h3>
                <p className="text-sm text-gray-500 mt-1">Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?</p>
              </div>
              <div className="flex gap-3 w-full">
                <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 font-semibold text-gray-600 hover:bg-gray-50 transition text-sm">Hủy</button>
                <button onClick={confirmLogout} className="flex-1 py-2.5 rounded-xl bg-red-500 font-semibold text-white hover:bg-red-600 shadow-lg shadow-red-500/25 transition text-sm">Đăng xuất</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;