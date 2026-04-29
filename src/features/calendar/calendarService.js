import axios from 'axios';
import { authService } from '../auth/authService';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzk88b6oX8V5GH92tewnw_BpBDwI-p51oiNTaCpCy0E16OfdYKg6Mpx8BYmvU-yC2SW/exec';

export const calendarService = {
  getCalendarData: async () => {
    try {
      const response = await axios.post(SCRIPT_URL, JSON.stringify({
        action: 'getCalendarData',
        userInfo: authService.getCurrentUser()
      }), {
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      });
      return response.data;
    } catch (error) {
      console.error("Lỗi lấy dữ liệu lịch trực:", error);
      throw error;
    }
  },
  updateCalendarData: async (data) => {
    try {
      const response = await axios.post(SCRIPT_URL, JSON.stringify({
        action: 'updateCalendarData',
        userInfo: authService.getCurrentUser(),
        data: data
      }), {
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      });
      return response.data;
    } catch (error) {
      console.error("Lỗi cập nhật lịch trực:", error);
      throw error;
    }
  }
};
