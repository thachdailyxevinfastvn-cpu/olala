// src/features/reports/reportService.js

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzk88b6oX8V5GH92tewnw_BpBDwI-p51oiNTaCpCy0E16OfdYKg6Mpx8BYmvU-yC2SW/exec'; 

const CLOUD_NAME = 'dda8qq92p';
const UPLOAD_PRESET = 'skoda_upload';
const GEMINI_API_KEY = 'AIzaSyDBpyBx2UoNImCcFu0I95TshJqhW0BsCyo'; 

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
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'addBatchReports', reports: reportList, overwrite: overwrite })
      });
      return await response.json();
    } catch (error) { return { status: 'error', message: 'Lỗi kết nối server' }; }
  },

  getReports: async () => {
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getReports' })
      });
      return await response.json();
    } catch (error) { return { status: 'error', data: [] }; }
  },

  getStaffList: async () => {
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getStaffList' })
      });
      return await response.json();
    } catch (error) { return { status: 'error', data: [] }; }
  },

  analyzeImageWithAI: async (imageFile) => {
    console.log("🚀 START AI SCAN (Gemini 2.0 Flash)...");
    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      const prompt = `
        Bạn là kiểm soát viên nhập liệu. Xem ảnh báo cáo TikTok Live.
        Ảnh có thể chứa dữ liệu của NHIỀU NGÀY. Hãy phân tích và gom nhóm.
        Nhiệm vụ:
        1. Tìm tất cả các ngày có trong ảnh (Format chuẩn: YYYY-MM-DD).
        2. Với mỗi ngày, liệt kê tất cả các phiên live.
        3. Với mỗi phiên, lấy: Thời lượng (số phút), Lượt xem (số).
        QUAN TRỌNG: Chỉ trả về JSON thuần túy, KHÔNG markdown.
        Mẫu JSON mong muốn (Luôn trả về Mảng):
        [
          { "date": "2024-03-20", "sessions": [{ "minutes": 41, "views": 105, "note": "Phiên 12:30" }] }
        ]
      `;

      const payload = { contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: imageFile.type || 'image/jpeg', data: base64Data } }] }] };
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      
      if(data.candidates && data.candidates[0].content) {
          let textResponse = data.candidates[0].content.parts[0].text;
          
          textResponse = textResponse.replace(/```json|```/g, '').trim();
          
          const firstBracket = textResponse.indexOf('[');
          const firstCurly = textResponse.indexOf('{');
          const lastBracket = textResponse.lastIndexOf(']');
          const lastCurly = textResponse.lastIndexOf('}');

          let cleanJson = textResponse;
          if (firstBracket !== -1 && lastBracket !== -1) {
              cleanJson = textResponse.substring(firstBracket, lastBracket + 1);
          } else if (firstCurly !== -1 && lastCurly !== -1) {
              cleanJson = textResponse.substring(firstCurly, lastCurly + 1);
          }

          try {
              const result = JSON.parse(cleanJson);
              if (Array.isArray(result)) return result;
              else if (typeof result === 'object') {
                  if (!result.date && result.reportDate) result.date = result.reportDate;
                  return [result];
              }
              return null;
          } catch (parseError) {
              console.error("❌ JSON Parse Error:", parseError);
              return null;
          }
      }
      return null;
    } catch (error) { console.error("❌ System Error:", error); return null; }
  }
};