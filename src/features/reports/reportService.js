// src/features/reports/reportService.js
import { db } from '../../api/firebase';
import { collection, getDocs, doc, setDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { authService } from '../auth/authService';
import { createGeminiOCRClient } from '../../lib/gemini-ocr-compressor';

const CLOUD_NAME = 'dda8qq92p';
const UPLOAD_PRESET = 'skoda_upload';

// Danh sách Gemini API Keys miễn phí xoay vòng (4 Keys Active)
const ENCODED_FREE_KEYS = [
  "QVEuQWI4Uk42SktMa3NiQzhUOGVUamsxVERkeGV0VklVd2ZWb2NMN1FTTDVPWjJoc1pBbEE=", // Key 1
  "QVEuQWI4Uk42STFkdlpBOUd6bUk0Q0lmNTFFOEhhOXNhU256N2NNSF8wSDd4aV9kVnNEM0E=", // Key 2
  "QVEuQWI4Uk42TEQyazYxdm1IZmpmYXNjVVgya0ZkOHdMdlh2cEZuQWJWSUFQb0oyTjZ4eHc=", // Key 3
  "QVEuQWI4Uk42TG40NGZQOUpNdFJNMTdELTRyT2tvSUlFOGRkR1VvUThXbFJQN1RUOTcwRWc="  // Key 4
];
const FREE_API_KEYS = ENCODED_FREE_KEYS.map(k => {
  try { return atob(k); } catch (e) { return k; }
});

// Key Trả Phí Dự Phòng (Chỉ gọi khi TẤT CẢ Free Keys đều hết hạn mức)
const ENCODED_PAID_KEY = "QVEuQWI4Uk42TFJCX1JTX2ctODN3STZuYlpuNThzRkdMY1JjVUp2Y0dQemY5UXhENXFleVE=";
const PAID_API_KEY = atob(ENCODED_PAID_KEY);

// Khởi tạo Gemini OCR Compressor Client (Cơ chế 2 Tầng: Free -> Paid Fallback)
const ocrClient = createGeminiOCRClient({
  apiKeys: FREE_API_KEYS,
  paidKey: PAID_API_KEY,
  models: ['gemini-3.1-flash-lite', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'],
  timeoutMs: 6000,
  compressOptions: {
    targetWidth: 1080,
    quality: 0.82,
    enhanceContrast: true
  }
});

// JSON Schema chuẩn cho báo cáo Livestream
const liveReportSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      date: { type: 'string', description: 'Ngày phát sóng dạng YYYY-MM-DD' },
      sessions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            minutes: { type: 'integer', description: 'Thời lượng phiên live tính bằng phút' },
            views: { type: 'integer', description: 'Tổng số lượt xem phiên live' },
            note: { type: 'string', description: 'Tên hoặc ghi chú phiên live' }
          },
          required: ['minutes', 'views']
        }
      }
    },
    required: ['date', 'sessions']
  }
};

export const reportService = {
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('cloud_name', CLOUD_NAME);
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      return data.secure_url;
    } catch (error) { throw error; }
  },

  addBatchReports: async (reportList, overwrite = false) => {
    try {
      const batch = writeBatch(db);
      reportList.forEach(report => {
        const docId = `${report.reportDate || 'nodate'}_${report.staffID || report.staffName || 'unknown'}_${report.type || 'unknown'}_${encodeURIComponent(report.note || 'session')}`;
        const docRef = doc(db, 'reports', docId);
        batch.set(docRef, {
          ...report,
          createdAt: new Date().toISOString()
        }, { merge: !overwrite });
      });
      await batch.commit();
      return { status: 'success' };
    } catch (error) { 
      console.error("Lỗi gửi báo cáo Firestore:", error);
      return { status: 'error', message: 'Lỗi lưu dữ liệu: ' + error.message }; 
    }
  },

  getReports: async () => {
    try {
      const snap = await getDocs(collection(db, 'reports'));
      const list = [];
      snap.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return { status: 'success', data: list };
    } catch (error) { 
      console.error("Lỗi lấy báo cáo Firestore:", error);
      return { status: 'error', data: [] }; 
    }
  },

  deleteReport: async (reportId) => {
    try {
      await deleteDoc(doc(db, 'reports', reportId));
      return { status: 'success' };
    } catch (error) { 
      console.error("Lỗi xóa báo cáo Firestore:", error);
      return { status: 'error', message: 'Lỗi xóa dữ liệu: ' + error.message }; 
    }
  },

  getStaffList: async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list = [];
      snap.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      if (list.length > 0) return { status: 'success', data: list };
    } catch (error) { 
      // Firestore permission restricted for non-admin accounts
    }
    const curUser = authService.getCurrentUser();
    const fallbackList = curUser ? [{ id: curUser.id || 'me', name: curUser.name || 'Bản thân', department: curUser.department || '' }] : [];
    return { status: 'success', data: fallbackList };
  },

  analyzeImageWithAI: async (imageFile, onProgress) => {
    console.log("🚀 START AI SCAN (Gemini Vision OCR Compressor)...");
    try {
      const prompt = `Bạn là kiểm soát viên số liệu nhập liệu. Phân tích ảnh chụp màn hình báo cáo TikTok Live / Facebook Live / Reels / Shorts.
Ảnh có thể chứa dữ liệu của một hoặc nhiều ngày.
Nhiệm vụ:
1. Tìm tất cả các ngày có trong ảnh (Format chuẩn: YYYY-MM-DD).
2. Với mỗi ngày, liệt kê tất cả các phiên live kèm thời lượng (số phút nguyên) và số lượt xem (views).
3. Đặt note tương ứng với phiên (ví dụ: "Phiên 12:30", "Phiên sáng").`;

      const result = await ocrClient.extractFromImage(
        imageFile,
        prompt,
        liveReportSchema,
        onProgress
      );

      if (Array.isArray(result)) return result;
      if (result && typeof result === 'object') {
        if (result.sessions && (result.date || result.reportDate)) {
          return [{ date: result.date || result.reportDate, sessions: result.sessions }];
        }
        return [result];
      }
      return null;
    } catch (error) {
      console.error("❌ Gemini OCR System Error:", error);
      throw error;
    }
  }
};