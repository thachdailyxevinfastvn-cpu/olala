import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { authService } from './authService';
import Lantern from '../../components/ui/Lantern.jsx';
import { Lock, Loader2, KeyRound } from 'lucide-react';

const ResetPasswordScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token'); // Lấy token từ URL

  const [loading, setLoading] = useState(false);
  const [passwords, setPasswords] = useState({ newPass: '', confirmPass: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
        toast.error('Token không hợp lệ!');
        return;
    }
    if (passwords.newPass !== passwords.confirmPass) {
        toast.error('Mật khẩu xác nhận không khớp!');
        return;
    }
    
    setLoading(true);
    try {
      const res = await authService.resetPassword(token, passwords.newPass);
      if (res.status === 'success') {
        toast.success(res.message);
        setTimeout(() => navigate('/login'), 2000); // Chuyển về login sau 2s
      } else {
        toast.error(res.message);
      }
    } catch (error) {
      toast.error('Lỗi kết nối Server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-gray-900 flex items-center justify-center overflow-hidden">
      <Toaster position="top-right" />
      <Lantern />

      <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/20 relative z-10">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white">Đặt Lại Mật Khẩu</h2>
          <p className="text-green-200 text-sm mt-2">Nhập mật khẩu mới cho tài khoản của bạn.</p>
        </div>

        {/* Nếu không có token trên URL thì báo lỗi luôn */}
        {!token ? (
            <div className="text-red-400 text-center bg-red-900/20 p-4 rounded-lg border border-red-500/30">
                Lỗi: Đường dẫn không hợp lệ hoặc thiếu Token.
            </div>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
                <Lock className="absolute left-3 top-3 text-green-300 w-5 h-5" />
                <input
                type="password"
                placeholder="Mật khẩu mới"
                value={passwords.newPass}
                onChange={(e) => setPasswords({...passwords, newPass: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
                required
                minLength={6}
                />
            </div>

            <div className="relative">
                <KeyRound className="absolute left-3 top-3 text-green-300 w-5 h-5" />
                <input
                type="password"
                placeholder="Xác nhận mật khẩu mới"
                value={passwords.confirmPass}
                onChange={(e) => setPasswords({...passwords, confirmPass: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
                required
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg shadow-lg transform transition hover:scale-105 disabled:opacity-50 flex items-center justify-center"
            >
                {loading ? <><Loader2 className="animate-spin mr-2"/> Đang lưu...</> : 'LƯU MẬT KHẨU MỚI'}
            </button>
            </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordScreen;