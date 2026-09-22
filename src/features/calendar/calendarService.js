// src/features/calendar/calendarService.js
import { db } from '../../api/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { authService } from '../auth/authService';

let cachedWebhookUrl = null;
const FALLBACK_WEBHOOK = "https://script.google.com/macros/s/AKfycbxHiYvE47lfRfUUB69esVJm9UUnICecFJsVzOMsRcsD7jr-FBm8ZC0ObnEh8b58Jl9axg/exec";

const getWebhookUrl = async () => {
  if (cachedWebhookUrl) return cachedWebhookUrl;
  try {
    const configSnap = await getDoc(doc(db, 'configs', 'metadata'));
    if (configSnap.exists()) {
      cachedWebhookUrl = configSnap.data().emailWebhook;
    }
  } catch (err) {
    console.warn("Không có quyền đọc Firestore configs, sử dụng webhook mặc định.");
    cachedWebhookUrl = FALLBACK_WEBHOOK;
  }
  if (!cachedWebhookUrl) cachedWebhookUrl = FALLBACK_WEBHOOK;
  return cachedWebhookUrl;
};

export const calendarService = {
  getCalendarData: async () => {
    try {
      const webhookUrl = await getWebhookUrl();
      if (!webhookUrl) {
        throw new Error("Chưa cấu hình Webhook Google Sheets!");
      }

      const res = await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'getCalendarData' })
      });
      const resData = await res.json();
      return resData; // Trả về { status: 'success', data: [...] }
    } catch (error) {
      console.error("Lỗi lấy dữ liệu lịch trực từ Sheets:", error);
      throw error;
    }
  },

  updateCalendarData: async (data) => {
    try {
      const webhookUrl = await getWebhookUrl();
      if (!webhookUrl) {
        throw new Error("Chưa cấu hình Webhook Google Sheets!");
      }

      const currentUser = authService.getCurrentUser();

      const res = await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'updateCalendarData',
          userInfo: currentUser,
          data: data
        })
      });
      const resData = await res.json();
      return resData; // Trả về { status: 'success', message: '...' }
    } catch (error) {
      console.error("Lỗi cập nhật lịch trực lên Sheets:", error);
      throw error;
    }
  }
};
