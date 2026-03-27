import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { authService } from './authService';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import Lantern from '../../components/ui/Lantern.jsx';

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authService.forgotPassword(email);
      if (res.status === 'success') {
        toast.success(res.message);
        setEmail(''); // Xóa ô nhập cho sạch
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
          <h2 className="text-2xl font-bold text-white">Quên Mật Khẩu?</h2>
          <p className="text-green-200 text-sm mt-2">Nhập email của bạn để nhận link đặt lại mật khẩu.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-green-300 w-5 h-5" />
            <input
              type="email"
              placeholder="Gmail mà bạn đăng ký"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg shadow-lg transform transition hover:scale-105 disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? <><Loader2 className="animate-spin mr-2" /> Đang gửi...</> : 'GỬI LINK RESET'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-gray-300 hover:text-white flex items-center justify-center gap-2 transition">
            <ArrowLeft size={16} /> Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordScreen;