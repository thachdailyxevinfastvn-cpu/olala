import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Settings, X, LogOut, BarChart3, UserPlus, Calendar } from 'lucide-react';
import { authService } from '../../features/auth/authService';

const Sidebar = ({ isMobileOpen, setIsMobileOpen }) => {
  const location = useLocation();
  const path = location.pathname;
  const [user, setUser] = useState({});

  useEffect(() => {
    try {
      const currentUser = authService.getCurrentUser();
      if (currentUser) setUser(currentUser);
    } catch (e) { console.error(e); }
  }, []);

  const roleStr = (user.role || '').toLowerCase();
  const isAdmin = roleStr.includes('admin');

  let menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
    { name: 'Khách hàng', icon: <Users size={20} />, path: '/customers' },
    { name: 'Phân khách', icon: <UserPlus size={20} />, path: '/assign-customers' },
    { name: 'Lịch Trực', icon: <Calendar size={20} />, path: '/calendar' },
    { name: 'Báo cáo', icon: <BarChart3 size={20} />, path: '/reports' },
    { name: 'Đơn hàng', icon: <FileText size={20} />, path: '/orders' },
  ];

  if (isAdmin) {
    menuItems.push({ name: 'Cài đặt', icon: <Settings size={20} />, path: '/settings' });
  }

  const displayName = user.name || user.username || 'User';
  const initial = displayName.charAt(0).toUpperCase();

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
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Drawer - Only shown on screen sizes < lg */}
      <div
        className={`
          fixed top-0 left-0 h-full z-50 w-64
          transition-transform duration-300 ease-in-out flex flex-col
          bg-white border-r border-stone-200/80 shadow-2xl
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:hidden
        `}
      >
        {/* HEADER: Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-stone-200/50 shrink-0">
          <Link to="/dashboard" onClick={() => setIsMobileOpen(false)} className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm shadow-amber-500/20 shrink-0">
              <span className="text-white font-black text-xs">MG</span>
            </div>
            <span className="font-bold text-stone-800 text-sm tracking-wide">CRM BÌNH DƯƠNG</span>
          </Link>

          <button onClick={() => setIsMobileOpen(false)} className="text-stone-400 hover:text-stone-700">
            <X size={20} />
          </button>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 py-3 px-3 overflow-y-auto space-y-1">
          <p className="px-3 text-[10px] font-bold text-stone-400 uppercase mb-2 tracking-widest">
            Menu
          </p>

          {menuItems.map((item) => {
            const isActive = path === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={`
                  group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 whitespace-nowrap relative
                  ${isActive 
                    ? 'bg-stone-100 text-stone-900 font-bold border-l-4 border-amber-500 pl-2.5' 
                    : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}
                `}
              >
                <div className={`shrink-0 transition-colors duration-200 ${isActive ? 'text-amber-500' : 'text-stone-400 group-hover:text-stone-700'}`}>
                  {item.icon}
                </div>

                <span className="text-[13px] font-semibold">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* FOOTER */}
        <div className="px-3 py-3 border-t border-stone-200/50 shrink-0">
          <button onClick={handleLogoutClick} className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-stone-500 hover:bg-red-50 hover:text-red-500 transition-all duration-200">
            <LogOut size={18} className="shrink-0" />
            <span className="text-[13px] font-semibold">
              Đăng xuất
            </span>
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

export default Sidebar;