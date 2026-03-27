import { API_URL, STORAGE_KEYS } from '../../api/constants';

export const authService = {
  login: async (username, password) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'login',
          data: { username, password }
        }),
      });

      const result = await response.json();

      if (result.status === 'success') {
        localStorage.setItem('user', JSON.stringify(result.data));
        if (STORAGE_KEYS && STORAGE_KEYS.USER) {
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(result.data));
        }

        window.dispatchEvent(new Event('storage'));
        return result;
      } else {
        throw new Error(result.message);
      }
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
      const response = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'forgotPassword',
          data: { email }
        })
      });
      return await response.json();
    } catch (error) {
      return { status: 'error', message: 'Lỗi kết nối server' };
    }
  },

  resetPassword: async (token, newPassword) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'resetPassword',
          data: { token, newPassword }
        })
      });
      return await response.json();
    } catch (error) {
      return { status: 'error', message: 'Lỗi kết nối server' };
    }
  }
};