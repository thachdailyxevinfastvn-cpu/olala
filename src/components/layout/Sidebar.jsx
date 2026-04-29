import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Settings, X, LogOut, Briefcase, BarChart3, ChevronLeft, ChevronRight, UserPlus, Calendar } from 'lucide-react';
import { authService } from '../../features/auth/authService';

const Sidebar = ({ isMobileOpen, setIsMobileOpen, isDesktopCollapsed, toggleDesktop }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const [user, setUser] = useState({});

  // State hover chỉ dùng cho Desktop
  const [isHovered, setIsHovered] = useState(false);

  // Logic mở rộng trên Desktop: Mở khi (User bấm mở) HOẶC (User rê chuột vào)
  const isDesktopExpanded = !isDesktopCollapsed || isHovered;

  useEffect(() => {
    try {
      const currentUser = authService.getCurrentUser();
      if (currentUser) setUser(currentUser);
    } catch (e) { console.error(e); }
  }, []);

  const handleLogout = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log("Logout clicked");

    // Sử dụng setTimeout để tránh xung đột sự kiện UI (ví dụ onMouseLeave) làm đóng dialog ngay lập tức
    setTimeout(() => {
      if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?')) {
        console.log("Logout confirmed");
        authService.logout();
      } else {
        console.log("Logout cancelled");
      }
    }, 100);
  };

  const roleStr = (user.role || '').toLowerCase();
  const isAdmin = roleStr.includes('admin');

  let menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
    { name: 'Khách hàng', icon: <Users size={20} />, path: '/customers' },
    { name: 'Phân khách', icon: <UserPlus size={20} className="text-yellow-300" />, path: '/assign-customers' }, // Changed Icon
    { name: 'Lịch Trực', icon: <Calendar size={20} />, path: '/calendar' },
    { name: 'Báo cáo', icon: <BarChart3 size={20} />, path: '/reports' },
    { name: 'Đơn hàng', icon: <FileText size={20} />, path: '/orders' },
    { name: 'Cài đặt', icon: <Settings size={20} />, path: '/settings' },
  ];

  if (isAdmin) {
    menuItems = menuItems.filter(item => item.path === '/reports');
  }

  const displayName = user.name || user.username || 'User';
  const initial = displayName.charAt(0).toUpperCase();

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
      {/* Overlay đen chỉ hiện trên Mobile khi menu mở */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        ></div>
      )}

      <div
        // Sự kiện Hover chỉ tác dụng trên Desktop
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          fixed top-0 left-0 h-full bg-green-900 text-white shadow-xl z-50 
          transition-all duration-300 ease-in-out flex flex-col
          
          /* --- MOBILE STYLES (< 768px) --- */
          w-64 
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          
          /* --- DESKTOP STYLES (>= 768px) --- */
          md:translate-x-0 
          ${isDesktopExpanded ? 'md:w-64' : 'md:w-20'}
        `}
      >
        {/* HEADER: Logo & Close Button */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-green-800 bg-green-950 shrink-0 whitespace-nowrap overflow-hidden">
          {/* Logo hiển thị khác nhau tùy trạng thái Desktop */}
          <div className={`flex items-center transition-all duration-300 ${!isDesktopExpanded ? 'md:justify-center md:w-full' : ''}`}>
            {/* Mobile & Desktop Expanded: Hiện tên đầy đủ */}
            <h1 className={`text-xl font-bold tracking-wider uppercase ${!isDesktopExpanded ? 'md:hidden' : 'block'}`}>
              SKODA CRM
            </h1>
            {/* Desktop Collapsed: Chỉ hiện chữ cái đầu */}
            <h1 className={`text-xl font-bold tracking-wider uppercase hidden ${!isDesktopExpanded ? 'md:block' : ''}`}>
              SC
            </h1>
          </div>

          {/* Nút đóng chỉ hiện trên Mobile */}
          <button onClick={() => setIsMobileOpen(false)} className="md:hidden text-green-300 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* USER INFO */}
        <div className={`p-4 border-b border-green-800 bg-green-800/30 shrink-0 transition-all duration-300 overflow-hidden 
            ${!isDesktopExpanded ? 'md:px-2 md:py-4' : ''}`}>
          <div className={`flex items-center gap-3 ${!isDesktopExpanded ? 'md:justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-green-100 text-green-800 flex items-center justify-center font-bold border-2 border-green-600 shadow-sm shrink-0">
              {initial}
            </div>
            {/* Ẩn text khi thu gọn trên Desktop */}
            <div className={`overflow-hidden transition-opacity duration-200 
                    ${isDesktopExpanded ? 'opacity-100 w-auto' : 'md:opacity-0 md:w-0 md:hidden'}`}>
              <p className="font-bold text-sm truncate text-white">{displayName}</p>
              <div className="flex items-center gap-1 text-xs text-green-300 mt-0.5">
                <Briefcase size={12} />
                <span className="truncate uppercase">{user.role || 'Nhân viên'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* MENU LIST */}
        <nav className="flex-1 py-4 space-y-2 px-3 overflow-y-auto overflow-x-hidden">
          <p className={`px-4 text-[10px] font-bold text-green-400 uppercase mb-2 tracking-wider whitespace-nowrap transition-opacity duration-300
             ${!isDesktopExpanded ? 'md:hidden' : 'block'}`}>
            Chức năng
          </p>

          {menuItems.map((item) => {
            const isActive = path === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                title={!isDesktopExpanded ? item.name : ''}
                className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 whitespace-nowrap
                  ${isActive ? 'bg-green-600 text-white shadow-md' : 'text-green-100 hover:bg-green-800 hover:text-white'}
                  ${!isDesktopExpanded ? 'md:justify-center' : ''}
                `}
              >
                {/* THAY ĐỔI Ở ĐÂY:
                    Thêm class 'animate-bounce' vào div chứa icon nếu isActive = true.
                    animate-bounce là hiệu ứng nhảy có sẵn của Tailwind.
                */}
                <div className={`shrink-0 ${isActive ? 'animate-bounce' : ''}`}>
                  {item.icon}
                </div>

                <span className={`font-medium transition-all duration-300 
                    ${isDesktopExpanded ? 'opacity-100 translate-x-0' : 'md:opacity-0 md:-translate-x-4 md:w-0 md:hidden'}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* FOOTER: Logout & Pin Button */}
        <div className="p-4 border-t border-green-800 bg-green-950/50 shrink-0 overflow-hidden">
          <button onClick={handleLogoutClick} className={`flex items-center space-x-3 w-full px-4 py-2 rounded-lg text-red-300 hover:bg-red-900/30 hover:text-red-200 transition-colors mb-2 whitespace-nowrap 
                ${!isDesktopExpanded ? 'md:justify-center md:px-0' : ''}`}>
            <LogOut size={20} className="shrink-0" />
            <span className={`font-medium text-sm transition-all duration-300 
                    ${isDesktopExpanded ? 'opacity-100' : 'md:opacity-0 md:w-0 md:hidden'}`}>
              Đăng xuất
            </span>
          </button>

          {/* Nút Ghim (Chỉ hiện trên Desktop) */}
          <div className="hidden md:flex justify-center mt-2 pt-2 border-t border-green-800/50">
            <button onClick={toggleDesktop} className="p-1 text-green-400 hover:text-white transition-colors">
              {isDesktopCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>
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
export default Sidebar;