// =======================================================
// XỬ LÝ LỊCH TRỰC VÀ TỰ ĐỘNG GỬI EMAIL
// =======================================================

function getCalendarData() {
  const ss = SpreadsheetApp.openById(ID_FILE_DATA);
  const sheet = ss.getSheetByName(SHEET_CALENDAR);
  if (!sheet) return responseJSON({ status: 'error', message: 'Không tìm thấy Sheet LỊCH TRỰC' });

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return responseJSON({ status: 'success', data: [] });

  const data = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  const result = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    let rowDate = row[0];
    let formattedDate = "";
    
    if (rowDate instanceof Date) {
      formattedDate = Utilities.formatDate(rowDate, "GMT+7", "yyyy-MM-dd");
    } else if (typeof rowDate === 'string' && rowDate.includes('/')) {
      const parts = rowDate.split('/');
      if (parts.length === 3) formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    if (!formattedDate) continue;

    result.push({
      id: i,
      date: formattedDate,
      content: String(row[1] || '').trim(),
      pkd: String(row[2] || '').trim()
    });
  }

  return responseJSON({ status: 'success', data: result });
}

function checkAndSendDailyScheduleEmail() {
  const ss = SpreadsheetApp.openById(ID_FILE_DATA);
  const sheet = ss.getSheetByName(SHEET_CALENDAR);
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  const data = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  const todayStr = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");

  for (let i = 0; i < data.length; i++) {
    let rowDate = data[i][0];
    let formattedRowDate = '';
    
    if (rowDate instanceof Date) {
      formattedRowDate = Utilities.formatDate(rowDate, "GMT+7", "dd/MM/yyyy");
    } else {
      formattedRowDate = String(rowDate).trim();
    }

    if (formattedRowDate === todayStr) {
      const noiDung = String(data[i][1]).trim();
      const pkd = String(data[i][2]).trim();

      let recipient = "";
      const checkVal = pkd.toUpperCase() + " " + noiDung.toUpperCase();
      
      if (checkVal.includes("PKD-1") || checkVal.includes("PDK-1") || checkVal.includes("PKD 1") || checkVal.includes("PDK 1")) {
        recipient = "phanchitambds1994@gmail.com";
      } else if (checkVal.includes("PKD-2") || checkVal.includes("PDK-2") || checkVal.includes("PKD 2") || checkVal.includes("PDK 2")) {
        recipient = "thach.dailyxevinfastvn@gmail.com";
      }

      if (recipient) {
        const subject = "🎯 Thông Báo Lịch Trực Hôm Nay";
        const body = 
`Chào buổi sáng !\n\n` +
`Hôm nay ngày trực của ${noiDung}\n\n` +
`Chúc các bạn ngày mới làm việc hiệu quả và tràn đầy năng lượng.\n\n` + 
`Trân trọng,\nHệ thống CRM Tự động.`;
        
        MailApp.sendEmail({
          to: recipient,
          subject: subject,
          body: body
        });
      }
    }
  }
}

function updateCalendarData(params) {
  const user = params.userInfo;
  if (!user) return responseJSON({ status: 'error', message: 'Không có quyền truy cập.' });
  
  const role = String(user.role).toLowerCase();
  if (!role.includes('tpkd') && !role.includes('admin') && !role.includes('giám đốc') && !role.includes('quản lý')) {
    return responseJSON({ status: 'error', message: 'Bạn không có quyền chỉnh sửa Lịch Trực!' });
  }

  const payload = params.data;
  if (!payload || !payload.date) return responseJSON({ status: 'error', message: 'Thiếu dữ liệu ngày.' });

  const ss = SpreadsheetApp.openById(ID_FILE_DATA);
  let sheet = ss.getSheetByName(SHEET_CALENDAR);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CALENDAR);
    sheet.appendRow(['NGÀY', 'NỘI DUNG', 'PKD']);
  }

  const targetDateStr = payload.date; // "yyyy-MM-dd"
  const parts = targetDateStr.split('-');
  const targetDdMmYyyy = `'${parts[2]}/${parts[1]}/${parts[0]}`;

  const lastRow = sheet.getLastRow();
  let foundRow = -1;

  if (lastRow > 1) {
    const dataDate = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < dataDate.length; i++) {
        let rowDate = dataDate[i][0];
        let dStr = "";
        if (rowDate instanceof Date) {
           dStr = Utilities.formatDate(rowDate, "GMT+7", "yyyy-MM-dd");
        } else if (typeof rowDate === 'string' && rowDate.includes('/')) {
           const p = rowDate.split('/');
           if (p.length === 3) dStr = `${p[2]}-${p[1]}-${p[0]}`;
        }
        
        if (dStr === targetDateStr) {
           foundRow = i + 2;
           break;
        }
    }
  }

  if (foundRow > -1) {
    sheet.getRange(foundRow, 1, 1, 3).setValues([[targetDdMmYyyy, payload.content || '', payload.pkd || '']]);
  } else {
    sheet.getRange(lastRow + 1, 1, 1, 3).setValues([[targetDdMmYyyy, payload.content || '', payload.pkd || '']]);
  }

  return responseJSON({ status: 'success', message: 'Cập nhật thành công!' });
}
