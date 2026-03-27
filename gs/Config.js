// =======================================================
// 1. CẤU HÌNH & HẰNG SỐ
// =======================================================
const ID_FILE_DATA = "1L3wio9UPmEBkWsx3HxowyVr8gkJGivR2eU3QE-orP9o";
const ID_FILE_NHAN_SU = "1VvFRZ83Q1fIgcWWr7J16kc1JKw_4wLnbwKiaNxEwbLo";

const SHEET_CRM = "KHTN";
const SHEET_CONFIG = "CAC NGUON";
const SHEET_STAFF = "NHÂN SỰ";
const SHEET_REPORTS = "BC SOCIAL";
const SHEET_ASSIGN = "PHÂN KHÁCH";

// =======================================================
// 2. CÁC HÀM HELPER DÙNG CHUNG
// =======================================================

// Trả về JSON cho Client
function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// Tìm index cột theo tên (Thông minh)
function getColIdx(headers, strictName, fallbackKeywords = []) {
  const upperHeaders = headers.map(h => String(h).trim().toUpperCase());
  const target = String(strictName).trim().toUpperCase();

  // 1. Tìm chính xác
  let idx = upperHeaders.indexOf(target);
  if (idx !== -1) return idx;

  // 2. Tìm theo từ khóa
  if (fallbackKeywords.length > 0) {
    return upperHeaders.findIndex(h => fallbackKeywords.some(k => h.includes(k)));
  }
  return -1;
}

// Format ngày để trả về Client (Read: dd/MM/yyyy)
function formatDateForClient(d) {
  if (!d) return '';
  if (d instanceof Date) {
    return Utilities.formatDate(d, "GMT+7", "dd/MM/yyyy");
  }
  return String(d);
}

// Parse chuỗi ngày từ Client (dd/MM/yyyy hoặc yyyy-MM-dd) thành Date Object để ghi vào Sheet
function parseDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;

  try {
    // Nếu là dạng dd/MM/yyyy
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    // Nếu là dạng yyyy-MM-dd
    if (dateStr.includes('-')) {
      return new Date(dateStr);
    }
  } catch (e) {
    return new Date();
  }
  return new Date();
}