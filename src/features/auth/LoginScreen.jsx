import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast'; // Bỏ import Toaster ở đây
import { authService } from './authService';
import { useData } from '../../context/DataProvider';
import { User, Lock, Loader2, Eye, EyeOff } from 'lucide-react';

const LoginScreen = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  // Context nạp dữ liệu
  const { fetchCustomers, fetchReports } = useData();

  // --- CẤU HÌNH HÌNH NỀN ---
  // State điều khiển việc hiện ảnh thứ 2
  const [showSecondImage, setShowSecondImage] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // --- QUAN TRỌNG: Thêm ?v=new để ép trình duyệt tải ảnh mới ---
  const IMAGES = {
    desktop: ['/BG-ngang1.jpeg?v=new', '/BG-ngang2.jpeg?v=new'],
    mobile: ['/BG-doc1.jpeg?v=new', '/BG-doc2.jpeg?v=new']
  };

  const currentPair = isMobile ? IMAGES.mobile : IMAGES.desktop;

  // 1. Lắng nghe resize màn hình
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 2. Vòng lặp hiệu ứng (Thay thế CSS Animation bằng JS Interval)
  useEffect(() => {
    const interval = setInterval(() => {
      // Đảo trạng thái hiển thị mỗi 3.5 giây
      setShowSecondImage(prev => !prev);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  // --- XỬ LÝ ĐĂNG NHẬP ---
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    // Xóa thông báo cũ nếu có (Tác động lên Toaster chung ở App.jsx)
    toast.dismiss();

    if (!formData.username || !formData.password) {
      toast.error("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    setLoading(true);
    try {
      const result = await authService.login(formData.username, formData.password);

      if (result.success || result.status === 'success') {
        // Lưu ID của thông báo để tắt nó sau này
        const toastId = toast.success(`Xin chào ${result.user?.name || 'Bạn'}!`, { duration: 2000 });

        // Nạp dữ liệu nền
        fetchCustomers(true);
        fetchReports(true);

        // Chờ 1 giây rồi tắt thông báo và chuyển trang
        setTimeout(() => {
          toast.remove(toastId); // Cưỡng chế tắt thông báo ngay lập tức
          navigate('/dashboard');
        }, 1000);
      } else {
        toast.error(result.message || 'Sai thông tin đăng nhập');
      }
    } catch (error) {
      // Hiển thị lỗi cụ thể nếu có (VD: Tài khoản không tồn tại, Mật khẩu sai)
      toast.error(error.message || 'Lỗi kết nối Server!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-900">
      {/* ĐÃ XÓA <Toaster /> Ở ĐÂY VÌ ĐÃ CÓ Ở APP.JSX RỒI */}

      {/* --- PHẦN HÌNH NỀN --- */}
      <div className="absolute inset-0 z-0">

        {/* ẢNH 1: Luôn nằm dưới (Lớp nền) */}
        <img
          src={currentPair[0]}
          alt="Background Base"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />

        {/* ẢNH 2: Nằm đè lên trên, thay đổi độ trong suốt (opacity) */}
        <img
          src={currentPair[1]}
          alt="Background Overlay"
          className={`absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-[1500ms] ease-in-out ${showSecondImage ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>

      {/* --- FORM ĐĂNG NHẬP --- */}
      <div className="bg-black/30 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/20 relative z-30 animate-in fade-in zoom-in duration-700 mx-4 mb-60 md:mb-0">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-widest drop-shadow-md">SKODA CRM</h1>
          <p className="text-[#4ade80] font-medium text-sm tracking-widest uppercase">Hệ Thống Quản Lý Khách Hàng</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative group">
            <User className="absolute left-3 top-3.5 text-gray-300 w-5 h-5 group-focus-within:text-[#4ade80] transition-colors" />
            <input
              type="text"
              name="username"
              placeholder="Tên đăng nhập / SĐT"
              value={formData.username}
              onChange={handleChange}
              className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4ade80] focus:border-transparent transition-all hover:bg-white/20"
              required
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-3 top-3.5 text-gray-300 w-5 h-5 group-focus-within:text-[#4ade80] transition-colors" />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Mật khẩu"
              value={formData.password}
              onChange={handleChange}
              className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-10 pr-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4ade80] focus:border-transparent transition-all hover:bg-white/20"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3.5 text-gray-400 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#166534] to-[#22c55e] hover:from-[#15803d] hover:to-[#4ade80] text-white font-bold py-3.5 rounded-xl shadow-lg transform transition hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center tracking-wide uppercase text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2" size={20} /> Đang xử lý...
              </>
            ) : (
              'Đăng Nhập'
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link to="/forgot-password" className="text-sm text-gray-300 hover:text-[#4ade80] transition underline decoration-transparent hover:decoration-[#4ade80]">
            Quên mật khẩu?
          </Link>
          {/* Cập nhật năm 2026 */}
          <div className="mt-4 text-[10px] text-gray-500 uppercase tracking-widest">© 2026 Skoda Dong Nai</div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;