// =======================================================
// ĐỒNG BỘ DỮ LIỆU CRM → GOOGLE SHEETS BÁO CÁO LEAD
// File: LeadReportSync.gs
// =======================================================

var LEAD_REPORT_SHEET_ID = '1x-j-IZsDNevlApwRN4HECVxtA7TryFFUH-7glH1stRU';

// Mapping tên xe CRM → tên cột trên Sheet (case-insensitive)
var CAR_MODEL_MAP = {
  'mg5': 'MG5',
  'new mg5': 'MG5',
  'zs': 'ZS',
  'hs': 'HS',
  'mg7': 'MG7',
  'mg4': 'MG4',
  'g50': 'G50',
  'cyberster': 'Cyberster',
  'mg urban': 'MG Urban'
};

// Thứ tự cột xe trên Sheet (H=col 8, I=col 9, ...)
var SHEET_CAR_COLUMNS = ['MG5', 'ZS', 'HS', 'MG7', 'MG4', 'G50', 'Cyberster', 'MG Urban'];

// Header chuẩn cho Sheet Báo cáo (Row 1)
var SHEET_HEADERS_ROW1 = ['STT', 'Họ tên', 'Số điện thoại', 'Xe quan tâm', 'Ngày', '', 'Ngày', 'MG5', 'ZS', 'HS', 'MG7', 'MG4', 'G50', 'Cyberster', 'MG Urban', 'Tổng'];

/**
 * Map tên xe từ CRM sang tên chuẩn trên Sheet
 */
function mapCarModel(crmName) {
  if (!crmName) return null;
  var key = String(crmName).toLowerCase().trim();
  return CAR_MODEL_MAP[key] || null;
}

/**
 * Kiểm tra số điện thoại hợp lệ (không phải dummy 0, 00000, 0000000, hoặc < 8 chữ số)
 */
function isValidPhone(phoneStr) {
  if (!phoneStr) return false;
  var clean = String(phoneStr).replace(/\D/g, '').trim();
  if (!clean) return false;
  if (/^0+$/.test(clean)) return false; // Toàn số 0 (0, 000, 00000, 0000000...)
  if (clean.length < 8) return false;   // Quá ngắn (< 8 số)
  return true;
}

/**
 * Kiểm tra dòng xe hợp lệ (không để trống hoặc -)
 */
function isValidCarModel(carModelStr) {
  if (!carModelStr) return false;
  var trimmed = String(carModelStr).trim();
  if (!trimmed || trimmed === '-' || trimmed === 'null' || trimmed === 'undefined') return false;
  return true;
}

/**
 * Parse ngày từ nhiều định dạng khác nhau → object {day, month, year}
 */
function parseDateRobust(dateVal) {
  if (!dateVal) return null;
  
  if (dateVal instanceof Date) {
    return { day: dateVal.getDate(), month: dateVal.getMonth() + 1, year: dateVal.getFullYear() };
  }

  var dateStr = String(dateVal).trim();

  // DD/MM/YYYY
  var slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    return { day: parseInt(slashMatch[1], 10), month: parseInt(slashMatch[2], 10), year: parseInt(slashMatch[3], 10) };
  }

  // YYYY-MM-DD or ISO 8601 (e.g. 2026-08-14T06:16:35.276Z)
  var isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return { day: parseInt(isoMatch[3], 10), month: parseInt(isoMatch[2], 10), year: parseInt(isoMatch[1], 10) };
  }

  // Fallback: Date constructor
  try {
    var d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() };
    }
  } catch (e) {}

  return null;
}

/**
 * Đọc toàn bộ khách hàng từ Firestore qua REST API
 */
function readCustomersFromFirestore() {
  try {
    var allCustomers = [];
    var pageToken = '';
    var baseUrl = 'https://firestore.googleapis.com/v1/projects/mg-crm-26/databases/(default)/documents/customers?pageSize=300';
    
    do {
      var url = baseUrl + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
      var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      var json = JSON.parse(resp.getContentText());
      
      if (json.documents && json.documents.length > 0) {
        for (var i = 0; i < json.documents.length; i++) {
          var f = json.documents[i].fields || {};
          allCustomers.push({
            customerName: f.customerName ? f.customerName.stringValue : '',
            phone: f.phone ? f.phone.stringValue : '',
            carModel: f.carModel ? f.carModel.stringValue : '',
            date: f.date ? f.date.stringValue : '',
            createdAt: f.createdAt ? f.createdAt.stringValue : ''
          });
        }
      }
      pageToken = json.nextPageToken || '';
    } while (pageToken);
    
    Logger.log('Đã nạp từ Firestore: ' + allCustomers.length + ' khách hàng.');
    return allCustomers;
  } catch (e) {
    Logger.log('Lỗi đọc Firestore: ' + e.toString());
    return [];
  }
}

/**
 * Khởi tạo hoặc lấy Sheet cho tháng cụ thể (ví dụ: '08/2026', '09/2026')
 * Tự động tạo mới nếu chưa tồn tại.
 */
function getOrCreateMonthSheet(ss, monthStr) {
  var sheet = ss.getSheetByName(monthStr);
  if (!sheet) {
    if (monthStr === '08/2026') {
      var oldSheet = ss.getSheetByName('Báo cáo');
      if (oldSheet) {
        oldSheet.setName(monthStr);
        return oldSheet;
      }
    }
    sheet = ss.insertSheet(monthStr, 0);
  }
  return sheet;
}

/**
 * Trang trí nhẹ nhàng: Nền tiêu đề và hàng tổng màu xanh đậm chữ trắng, đường kẻ bảng màu xám nhẹ tinh tế
 */
function applyElegantStyles(sheet, numCustomerRows) {
  var NAVY_BLUE = '#1b365d';  // Màu xanh đậm sang trọng
  var WHITE_TEXT = '#ffffff';
  var SOFT_BORDER = '#d0d7de'; // Đường kẻ bảng nhẹ nhàng, tinh tế

  var maxRows = Math.max(numCustomerRows + 10, 50);

  // 1. Reset toàn bộ vùng dữ liệu về nền trắng sạch, không xen kẽ màu
  var rangeAll = sheet.getRange(1, 1, maxRows, 16);
  rangeAll.setBackground('#ffffff');
  rangeAll.setFontColor('#000000');
  rangeAll.setFontWeight('normal');
  rangeAll.setBorder(false, false, false, false, false, false);

  // 2. Định dạng Header Row 1: Nền xanh đậm chữ trắng in đậm
  sheet.setRowHeight(1, 30);
  sheet.setFrozenRows(1);

  // Tiêu đề bảng KH (A1:E1)
  var custHeader = sheet.getRange(1, 1, 1, 5);
  custHeader.setBackground(NAVY_BLUE)
            .setFontColor(WHITE_TEXT)
            .setFontWeight('bold')
            .setHorizontalAlignment('center')
            .setVerticalAlignment('middle')
            .setBorder(true, true, true, true, true, true, NAVY_BLUE, SpreadsheetApp.BorderStyle.SOLID);

  // Cột F1 (Khoảng cách giữa 2 bảng)
  sheet.getRange(1, 6).setBackground('#ffffff').setBorder(false, false, false, false, false, false);

  // Tiêu đề bảng Thống kê xe (G1:P1)
  var carHeader = sheet.getRange(1, 7, 1, 10);
  carHeader.setBackground(NAVY_BLUE)
           .setFontColor(WHITE_TEXT)
           .setFontWeight('bold')
           .setHorizontalAlignment('center')
           .setVerticalAlignment('middle')
           .setBorder(true, true, true, true, true, true, NAVY_BLUE, SpreadsheetApp.BorderStyle.SOLID);

  // 3. Kẻ viền nhẹ nhàng & căn lề cho Dữ liệu bảng Khách hàng (A2:E...)
  if (numCustomerRows > 0) {
    var custDataRange = sheet.getRange(2, 1, numCustomerRows, 5);
    custDataRange.setBorder(true, true, true, true, true, true, SOFT_BORDER, SpreadsheetApp.BorderStyle.SOLID);

    // Cột STT: Nền xám/xanh nhạt nhẹ nhàng (#f3f4f6), chữ đậm nhẹ, căn giữa
    sheet.getRange(2, 1, numCustomerRows, 1)
         .setBackground('#f3f4f6')
         .setFontWeight('bold')
         .setFontColor('#4b5563')
         .setHorizontalAlignment('center');
    
    sheet.getRange(2, 2, numCustomerRows, 1).setHorizontalAlignment('left');   // Họ tên
    sheet.getRange(2, 3, numCustomerRows, 1).setHorizontalAlignment('left').setNumberFormat('@'); // SĐT
    sheet.getRange(2, 4, numCustomerRows, 1).setHorizontalAlignment('left');   // Xe
    sheet.getRange(2, 5, numCustomerRows, 1).setHorizontalAlignment('center'); // Ngày
  }

  // 4. Kẻ viền nhẹ nhàng & căn giữa cho Bảng đếm (G2:P32 - 31 ngày)
  var dailyRange = sheet.getRange(2, 7, 31, 10);
  dailyRange.setHorizontalAlignment('center')
            .setBackground('#ffffff')
            .setBorder(true, true, true, true, true, true, SOFT_BORDER, SpreadsheetApp.BorderStyle.SOLID);

  // Cột Ngày trong bảng đếm (G2:G32): Nền xám nhạt đồng bộ (#f3f4f6)
  sheet.getRange(2, 7, 31, 1)
       .setBackground('#f3f4f6')
       .setFontWeight('bold')
       .setFontColor('#4b5563');

  // 5. Hàng Tổng (Row 33 - G33:P33): Nền xanh đậm chữ trắng in đậm
  sheet.setRowHeight(33, 26);
  var totalRow = sheet.getRange(33, 7, 1, 10);
  totalRow.setBackground(NAVY_BLUE)
          .setFontColor(WHITE_TEXT)
          .setFontWeight('bold')
          .setHorizontalAlignment('center')
          .setVerticalAlignment('middle')
          .setBorder(true, true, true, true, true, true, NAVY_BLUE, SpreadsheetApp.BorderStyle.SOLID);
}

/**
 * Hàm chính: Đồng bộ dữ liệu khách hàng từ CRM sang Google Sheet Báo cáo Lead theo từng Sheet Tháng (08/2026, 09/2026, ...)
 * @param {Object} params - { customers?: Array, sheetId?: string, targetMonth?: number, targetYear?: number }
 */
function syncLeadReport(params) {
  try {
    params = params || {};
    var customers = params.customers;
    
    // Nếu không truyền mảng customers, đọc trực tiếp từ Firestore qua REST API
    if (!customers || customers.length === 0) {
      customers = readCustomersFromFirestore();
    }

    var sheetId = params.sheetId || LEAD_REPORT_SHEET_ID;
    
    // Xác định tháng/năm mục tiêu (mặc định tháng hiện tại)
    var now = new Date();
    var targetMonth = params.targetMonth || (now.getMonth() + 1); // 1-12
    var targetYear = params.targetYear || now.getFullYear();

    // Tên Sheet theo tháng: ví dụ "08/2026", "09/2026"
    var monthSheetName = String(targetMonth).padStart(2, '0') + '/' + targetYear;

    // Mở Google Sheet đích
    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = getOrCreateMonthSheet(ss, monthSheetName);

    // Ghi Header Row 1
    sheet.getRange(1, 1, 1, SHEET_HEADERS_ROW1.length).setValues([SHEET_HEADERS_ROW1]);

    // --- BƯỚC 1: Lọc khách hàng đúng tháng/năm và hợp lệ ---
    var filteredCustomers = [];
    for (var i = 0; i < customers.length; i++) {
      var c = customers[i];

      // 1. Bỏ qua nếu thiếu tên xe hoặc xe không hợp lệ
      if (!isValidCarModel(c.carModel)) continue;

      // 2. Bỏ qua nếu số điện thoại rác/dummy (0, 00000, 0000000...)
      if (!isValidPhone(c.phone)) continue;

      var dateVal = c.date || c.createdAt || '';
      var parsed = parseDateRobust(dateVal);
      if (parsed && parsed.month === targetMonth && parsed.year === targetYear) {
        filteredCustomers.push({
          customerName: c.customerName || '',
          phone: c.phone || '',
          carModel: c.carModel || '',
          carModelMapped: mapCarModel(c.carModel),
          day: parsed.day,
          dateStr: String(parsed.day).padStart(2, '0') + '/' + String(parsed.month).padStart(2, '0') + '/' + parsed.year
        });
      }
    }

    // Sắp xếp theo ngày tăng dần, rồi theo tên
    filteredCustomers.sort(function(a, b) {
      if (a.day !== b.day) return a.day - b.day;
      return String(a.customerName || '').localeCompare(String(b.customerName || ''));
    });

    // --- BƯỚC 2: Ghi cột A:E (xóa dữ liệu cũ trước) ---
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var clearRows = Math.max(lastRow - 1, 500);
      sheet.getRange(2, 1, clearRows, 5).clearContent();
    }

    // Ghi dữ liệu khách hàng mới
    if (filteredCustomers.length > 0) {
      var customerData = [];
      for (var j = 0; j < filteredCustomers.length; j++) {
        var fc = filteredCustomers[j];
        customerData.push([
          j + 1,                  // A: STT
          fc.customerName,        // B: Họ tên
          "'" + String(fc.phone), // C: Số điện thoại (dạng text để giữ số 0 đầu)
          fc.carModelMapped || fc.carModel, // D: Xe quan tâm (đã mapping)
          fc.dateStr              // E: Ngày
        ]);
      }
      sheet.getRange(2, 1, customerData.length, 5).setValues(customerData);
    }

    // --- BƯỚC 3: Ghi cột G (ngày 1→31) và H:O (đếm xe) và P (tổng) ---
    sheet.getRange(2, 7, 31, 10).clearContent();

    // Tính toán đếm xe theo ngày
    var dayCarCounts = {};
    for (var d = 1; d <= 31; d++) {
      dayCarCounts[d] = {};
      for (var ci = 0; ci < SHEET_CAR_COLUMNS.length; ci++) {
        dayCarCounts[d][SHEET_CAR_COLUMNS[ci]] = 0;
      }
    }

    for (var k = 0; k < filteredCustomers.length; k++) {
      var cust = filteredCustomers[k];
      if (cust.carModelMapped && cust.day >= 1 && cust.day <= 31) {
        dayCarCounts[cust.day][cust.carModelMapped] = (dayCarCounts[cust.day][cust.carModelMapped] || 0) + 1;
      }
    }

    // Tạo mảng dữ liệu G:P cho 31 dòng
    var dailyData = [];
    for (var day = 1; day <= 31; day++) {
      var row = [day]; // G: Ngày
      var rowTotal = 0;
      for (var colIdx = 0; colIdx < SHEET_CAR_COLUMNS.length; colIdx++) {
        var count = dayCarCounts[day][SHEET_CAR_COLUMNS[colIdx]] || 0;
        row.push(count); // H-O: Số lượng từng xe
        rowTotal += count;
      }
      row.push(rowTotal); // P: Tổng
      dailyData.push(row);
    }

    // Ghi G2:P32 (31 dòng x 10 cột)
    sheet.getRange(2, 7, 31, 10).setValues(dailyData);

    // --- BƯỚC 4: Dòng tổng cộng (row 33) ---
    var totalRow = ['Tổng'];
    var grandTotal = 0;
    for (var ti = 0; ti < SHEET_CAR_COLUMNS.length; ti++) {
      var colTotal = 0;
      for (var td = 1; td <= 31; td++) {
        colTotal += dayCarCounts[td][SHEET_CAR_COLUMNS[ti]] || 0;
      }
      totalRow.push(colTotal);
      grandTotal += colTotal;
    }
    totalRow.push(grandTotal);
    sheet.getRange(33, 7, 1, 10).setValues([totalRow]);

    // --- BƯỚC 5: Trang trí nhẹ nhàng có đường kẻ bảng tinh tế ---
    applyElegantStyles(sheet, filteredCustomers.length);

    Logger.log('Đồng bộ hoàn tất: Đã ghi ' + filteredCustomers.length + ' khách hàng vào Sheet "' + monthSheetName + '"!');

    return responseJSON({
      status: 'success',
      message: 'Đồng bộ thành công vào sheet ' + monthSheetName + '!',
      sheetName: monthSheetName,
      totalCustomers: filteredCustomers.length,
      month: targetMonth,
      year: targetYear,
      grandTotal: grandTotal
    });

  } catch (error) {
    Logger.log('Lỗi đồng bộ: ' + error.toString());
    return responseJSON({
      status: 'error',
      message: 'Lỗi đồng bộ: ' + error.toString()
    });
  }
}

/**
 * Hàm dành cho Time Trigger tự động (16h00 hàng ngày)
 */
function autoSyncLeadReport() {
  return syncLeadReport({});
}

/**
 * Cài đặt Time Trigger tự động chạy lúc 16h00 mỗi ngày
 */
function setupDailyTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'autoSyncLeadReport') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  ScriptApp.newTrigger('autoSyncLeadReport')
    .timeBased()
    .atHour(16)
    .everyDays(1)
    .inTimezone('Asia/Ho_Chi_Minh')
    .create();
  
  Logger.log('Daily trigger set up at 16:00 ICT');
  return { status: 'success', message: 'Đã cài đặt lịch tự động đồng bộ lúc 16:00 mỗi ngày!' };
}
