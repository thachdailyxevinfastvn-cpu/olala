// src/features/auth/authService.js
import { db } from '../../api/firebase';
import { collection, query, where, getDocs, updateDoc, doc, limit } from 'firebase/firestore';
import { STORAGE_KEYS } from '../../api/constants';

const normalizePhone = (p) => String(p).trim().replace(/\D/g, '').replace(/^0+/, '');

export const authService = {
  login: async (username, password) => {
    try {
      const normalized = normalizePhone(username);
      const usersRef = collection(db, 'users');
      // Query by phone (normalized without leading zero) or email or username
      const q = query(usersRef, where('phone', 'in', [normalized, '0' + normalized, username]));
      const querySnapshot = await getDocs(q);
      
      let userFound = null;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (String(data.password).trim() === String(password).trim()) {
          userFound = { id: doc.id, ...data };
        }
      });

      if (!userFound) {
        // Fallback check if user is admin/dev or any default user if collection is empty
        // In a real app we throw:
        throw new Error("Số điện thoại hoặc mật khẩu không chính xác");
      }

      const userData = {
        id: userFound.id,
        name: userFound.name || 'N/A',
        role: userFound.role || 'SALE',
        department: userFound.department || '',
        phone: userFound.phone || username,
        email: userFound.email || ''
      };

      localStorage.setItem('user', JSON.stringify(userData));
      if (STORAGE_KEYS && STORAGE_KEYS.USER) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
      }

      window.dispatchEvent(new Event('storage'));
      return { status: 'success', data: userData };
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    if (STORAGE_KEYS && STORAGE_KEYS.USER) localStorage.removeItem(STORAGE_KEYS.USER);
    if (STORAGE_KEYS && STORAGE_KEYS.TOKEN) localStorage.removeItem(STORAGE_KEYS.TOKEN);
    window.location.href = '/login';
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (userStr) return JSON.parse(userStr);

    if (STORAGE_KEYS && STORAGE_KEYS.USER) {
      const kUser = localStorage.getItem(STORAGE_KEYS.USER);
      if (kUser) return JSON.parse(kUser);
    }
    return null;
  },

  forgotPassword: async (email) => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', String(email).trim().toLowerCase()), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return { status: 'error', message: 'Email không tồn tại trong hệ thống' };
      }

      const userDoc = querySnapshot.docs[0];
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiration = new Date().getTime() + 3600 * 1000; // 1 hour

      await updateDoc(doc(db, 'users', userDoc.id), {
        resetToken: token,
        tokenExpiration: expiration
      });

      // Since we don't have a backend to send mail directly in static vercel,
      // we log it or return success. Let's return success and instruct mock link.
      console.log(`Reset link generated: http://localhost:5173/reset-password?token=${token}`);
      
      return { 
        status: 'success', 
        message: 'Link đặt lại mật khẩu đã được tạo hệ thống. Vui lòng liên hệ Admin để cập nhật mật khẩu mới.' 
      };
    } catch (error) {
      return { status: 'error', message: 'Lỗi kết nối database: ' + error.message };
    }
  },

  resetPassword: async (token, newPassword) => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('resetToken', '==', token), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return { status: 'error', message: 'Token không hợp lệ hoặc đã hết hạn.' };
      }

      const userDoc = querySnapshot.docs[0];
      const data = userDoc.data();
      const now = new Date().getTime();
      
      if (now > data.tokenExpiration) {
        return { status: 'error', message: 'Link đã hết hạn. Vui lòng yêu cầu lại.' };
      }

      await updateDoc(doc(db, 'users', userDoc.id), {
        password: newPassword,
        resetToken: '',
        tokenExpiration: ''
      });

      return { status: 'success', message: 'Mật khẩu đã được cập nhật thành công!' };
    } catch (error) {
      return { status: 'error', message: 'Lỗi kết nối database: ' + error.message };
    }
  }
};