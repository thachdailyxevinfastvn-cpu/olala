// =======================================================
// XỬ LÝ KHÁCH HÀNG (KHTN)
// =======================================================

function ensureCRMColumns(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const upper = headers.map(h => String(h).toUpperCase().trim());
  const needed = ['NGƯỜI TẠO', 'NGÀY NHẬN'];
  const toAdd = [];

  needed.forEach(n => {
    if (!upper.includes(n)) toAdd.push(n);
  });

  if (toAdd.length > 0) {
    sheet.getRange(1, sheet.getLastColumn() + 1, 1, toAdd.length).setValues([toAdd]);
    SpreadsheetApp.flush(); // Force update
    return true;
  }
  return false;
}

function getCustomerMap(sheet) {
  // Ensure basic columns
  // ensureCRMColumns(sheet); // WARNING: Side effect in getter? 
  // Better to call explicitely where needed. But for robustness let's just read.

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return {
    DATE: getColIdx(headers, 'NGÀY TẠO', ['NGÀY', 'DATE']),
    SALE: getColIdx(headers, 'TÊN NHÂN VIÊN', ['SALE', 'NHÂN VIÊN']),
    DEPT: getColIdx(headers, 'PKD', ['TEAM', 'PHÒNG']),
    NAME: getColIdx(headers, 'TÊN KHÁCH HÀNG', ['TÊN KH', 'NAME']),
    PHONE: getColIdx(headers, 'SDT', ['SĐT', 'PHONE', 'SỐ']),
    WARD: getColIdx(headers, 'PHƯỜNG / XÃ', ['PHƯỜNG', 'WARD']),
    PROVINCE: getColIdx(headers, 'TỈNH/TP', ['TỈNH', 'PROVINCE']),
    CAR: getColIdx(headers, 'DÒNG XE', ['CAR', 'MODEL']),
    VERSION: getColIdx(headers, 'PHIÊN BẢN', ['VERSION']),
    COLOR: getColIdx(headers, 'MÀU XE', ['MÀU', 'COLOR']),
    CHANNEL: getColIdx(headers, 'KÊNH', ['CHANNEL']),
    SOURCE: getColIdx(headers, 'NGUỒN', ['SOURCE']),
    STATUS: getColIdx(headers, 'TRẠNG THÁI', ['STATUS']),
    RATING: getColIdx(headers, 'LEAD RATING', ['RATING', 'PHÂN LOẠI']),
    TESTDRIVE: getColIdx(headers, 'LÁI THỬ', ['TEST']),
    NOTE_SALE: getColIdx(headers, 'TVBH GHI CHÚ', ['GHI CHÚ', 'SALE NOTE']),
    NOTE_TPKD: getColIdx(headers, 'TPKD NOTE', ['TPKD']),
    NOTE_M: getColIdx(headers, 'M - NOTE', ['GIÁM ĐỐC', 'MNOTE']),
    UPDATED: getColIdx(headers, 'CẬP NHẬT CUỐI', ['CẬP NHẬT', 'LAST']),
    CREATOR: getColIdx(headers, 'NGƯỜI TẠO', ['CREATOR', 'ADMIN']),
    DATE_RECEIVED: getColIdx(headers, 'NGÀY NHẬN', ['RECEIVED', 'NGÀY NHẬN'])
  };
}

function getCustomers(params) {
  const ss = SpreadsheetApp.openById(ID_FILE_DATA);
  const sheet = ss.getSheetByName(SHEET_CRM);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return responseJSON({ status: 'success', data: [] });

  // Helper ensures column exist for READING if user manually added data but forgot header?
  // Or just rely on map. If map fails, we don't read.
  // But user complained "Not reading creator". So we should ensure columns exist to be safe?
  // But getCustomers shouldn't mutate usually.
  // Let's rely on add/update to fix headers. 

  const IDX = getCustomerMap(sheet);
  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  let filtered = [];

  // 1. Xử lý ngày tháng
  let start = new Date(params.startDate || new Date());
  let end = new Date(params.endDate || new Date());
  start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999);

  // 2. Xử lý Phân quyền
  const user = params.userRequesting;
  let isManager = false, isTPKD = false;
  let userDept = "";

  if (user) {
    const role = String(user.role || "").toLowerCase();
    userDept = String(user.department || user.pkd || "").trim(); // Lấy PKD của user

    isManager = role.includes('manager') || role.includes('admin') || role.includes('giám đốc') || role.includes('quản lý');
    isTPKD = role.includes('trưởng phòng') || role.includes('tpkd');
  }

  for (let i = 0; i < data.length; i++) {
    const r = data[i];

    // Check Ngày
    let dateVal = r[IDX.DATE];
    let rowDate = new Date(0);
    if (dateVal instanceof Date) {
      rowDate = dateVal;
    } else if (typeof dateVal === 'string' && dateVal.includes('/')) {
      const parts = dateVal.split('/');
      if (parts.length === 3) rowDate = new Date(parts[2], parts[1] - 1, parts[0]);
    }
    if (rowDate < start || rowDate > end) continue;

    // --- LOGIC PHÂN QUYỀN CỐT LÕI ---
    if (isManager) {
      // Cấp 1: Manager -> Xem hết (Không continue)
    }
    else if (isTPKD) {
      // Cấp 2: TPKD -> Check Phòng ban
      const rowDept = IDX.DEPT > -1 ? String(r[IDX.DEPT]).trim() : "";
      // Nếu userDept rỗng (lỗi data nhân sự) hoặc khác với phòng của khách -> Bỏ qua
      if (!userDept || userDept !== rowDept) continue;
    }
    else {
      // Cấp 3: TVBH -> Check Tên
      const saleName = IDX.SALE > -1 ? String(r[IDX.SALE]).trim() : "";
      if (saleName.toLowerCase() !== String(user.name).trim().toLowerCase()) continue;
    }
    // --------------------------------

    filtered.push(r);
  }

  // 3. Tìm kiếm & Sort (Giữ nguyên)
  if (params.search) {
    const term = String(params.search).toLowerCase();
    filtered = filtered.filter(r =>
      (IDX.NAME > -1 && String(r[IDX.NAME]).toLowerCase().includes(term)) ||
      (IDX.PHONE > -1 && String(r[IDX.PHONE]).includes(term)) ||
      (IDX.RATING > -1 && String(r[IDX.RATING]).toLowerCase().includes(term)) ||
      (IDX.SALE > -1 && String(r[IDX.SALE]).toLowerCase().includes(term)) // Tìm thêm tên sale
    );
  }

  if (IDX.DATE > -1) {
    filtered.sort((a, b) => {
      let dA = a[IDX.DATE] instanceof Date ? a[IDX.DATE] : new Date(0);
      let dB = b[IDX.DATE] instanceof Date ? b[IDX.DATE] : new Date(0);
      return dB - dA;
    });
  }

  const result = filtered.map((r, i) => {
    let td = IDX.TESTDRIVE > -1 ? r[IDX.TESTDRIVE] : '';
    if (typeof td === 'string' && td.startsWith("'")) td = td.substring(1);
    
    return {
      key: i,
      date: IDX.DATE > -1 ? formatDateForClient(r[IDX.DATE]) : '',
      creatorName: IDX.CREATOR > -1 ? r[IDX.CREATOR] : '', // Người tạo
      dateReceived: IDX.DATE_RECEIVED > -1 ? formatDateForClient(r[IDX.DATE_RECEIVED]) : '', // Ngày nhận
      lastUpdated: IDX.UPDATED > -1 ? formatDateForClient(r[IDX.UPDATED]) : '',
      saleName: IDX.SALE > -1 ? r[IDX.SALE] : '',
      department: IDX.DEPT > -1 ? r[IDX.DEPT] : '',
      customerName: IDX.NAME > -1 ? r[IDX.NAME] : '',
      phone: IDX.PHONE > -1 ? r[IDX.PHONE] : '',
      ward: IDX.WARD > -1 ? r[IDX.WARD] : '',
      province: IDX.PROVINCE > -1 ? r[IDX.PROVINCE] : '',
      carModel: IDX.CAR > -1 ? r[IDX.CAR] : '',
      version: IDX.VERSION > -1 ? r[IDX.VERSION] : '',
      carColor: IDX.COLOR > -1 ? r[IDX.COLOR] : '',
      channel: IDX.CHANNEL > -1 ? r[IDX.CHANNEL] : '',
      source: IDX.SOURCE > -1 ? r[IDX.SOURCE] : '',
      status: IDX.STATUS > -1 ? r[IDX.STATUS] : '',
      leadRating: IDX.RATING > -1 ? r[IDX.RATING] : '-',
      rating: IDX.RATING > -1 ? r[IDX.RATING] : '-',
      "LEAD RATING": IDX.RATING > -1 ? r[IDX.RATING] : '-',
      testDrive: td,
      saleNote: IDX.NOTE_SALE > -1 ? r[IDX.NOTE_SALE] : '',
      tpkdNote: IDX.NOTE_TPKD > -1 ? r[IDX.NOTE_TPKD] : '',
      mNote: IDX.NOTE_M > -1 ? r[IDX.NOTE_M] : ''
    };
  });

  return responseJSON({ status: 'success', data: result });
}

function addCustomers(params) {
  const ss = SpreadsheetApp.openById(ID_FILE_DATA);
  const sheet = ss.getSheetByName(SHEET_CRM);

  ensureCRMColumns(sheet); // Fix columns if missing
  const IDX = getCustomerMap(sheet);

  const customers = params.customers || [];
  const user = params.userInfo;

  if (customers.length === 0) return responseJSON({ status: 'success' });

  const numCols = sheet.getLastColumn();
  const now = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");

  const newRows = customers.map(c => {
    let row = new Array(numCols).fill('');

    if (IDX.DATE > -1) row[IDX.DATE] = now;
    if (IDX.SALE > -1) row[IDX.SALE] = user.name;
    if (IDX.CREATOR > -1) row[IDX.CREATOR] = user.name;
    if (IDX.DEPT > -1) row[IDX.DEPT] = user.department;
    if (IDX.UPDATED > -1) row[IDX.UPDATED] = now;

    if (IDX.NAME > -1) row[IDX.NAME] = c.customerName;
    if (IDX.PHONE > -1) row[IDX.PHONE] = "'" + c.phone;
    if (IDX.WARD > -1) row[IDX.WARD] = c.ward;
    if (IDX.PROVINCE > -1) row[IDX.PROVINCE] = c.province;
    if (IDX.CAR > -1) row[IDX.CAR] = c.carModel;
    if (IDX.VERSION > -1) row[IDX.VERSION] = c.version;
    if (IDX.COLOR > -1) row[IDX.COLOR] = c.carColor;
    if (IDX.SOURCE > -1) row[IDX.SOURCE] = c.source;
    if (IDX.CHANNEL > -1) row[IDX.CHANNEL] = c.channel;

    const rVal = c.leadRating || c['LEAD RATING'] || c['PHÂN LOẠI KH'] || '-';
    if (IDX.RATING > -1) row[IDX.RATING] = rVal;

    if (IDX.STATUS > -1) row[IDX.STATUS] = 'Mới';
    
    let tdVal = c.testDrive || 'Chưa';
    if (tdVal !== 'Chưa' && typeof tdVal === 'string') {
        if (tdVal.includes('-') && tdVal.length === 10) {
            const p = tdVal.split('-');
            tdVal = `'${p[2]}/${p[1]}/${p[0]}`;
        } else if (tdVal.includes('T') && tdVal.includes('Z')) {
            tdVal = "'" + Utilities.formatDate(new Date(tdVal), "GMT+7", "dd/MM/yyyy");
        }
    }
    if (IDX.TESTDRIVE > -1) row[IDX.TESTDRIVE] = tdVal;
    if (IDX.NOTE_SALE > -1) row[IDX.NOTE_SALE] = c.saleNote ? `[${user.name}]: ${c.saleNote}` : '';

    return row;
  });

  sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, numCols).setValues(newRows);
  return responseJSON({ status: 'success' });
}

function updateCustomer(params) {
  const ss = SpreadsheetApp.openById(ID_FILE_DATA);
  const sheet = ss.getSheetByName(SHEET_CRM);

  ensureCRMColumns(sheet); // Fix columns here too? Optional but safer
  const IDX = getCustomerMap(sheet);

  const d = params.customerData;
  const user = params.userInfo;

  const targetPhone = String(d.originalPhone || d.phone).replace(/\D/g, '');
  if (!targetPhone || IDX.PHONE === -1) return responseJSON({ status: 'error', message: 'Lỗi tìm cột SDT' });

  const lastRow = sheet.getLastRow();
  const phoneData = sheet.getRange(2, IDX.PHONE + 1, lastRow - 1, 1).getValues().flat();
  const saleData = IDX.SALE > -1 ? sheet.getRange(2, IDX.SALE + 1, lastRow - 1, 1).getValues().flat() : [];
  const nameData = IDX.NAME > -1 ? sheet.getRange(2, IDX.NAME + 1, lastRow - 1, 1).getValues().flat() : [];

  const targetSaleName = d.saleName ? String(d.saleName).trim().toLowerCase() : '';
  const targetCustomerName = (d.originalCustomerName || d.customerName) ? String(d.originalCustomerName || d.customerName).trim().toLowerCase() : '';

  let rowIndex = -1;
  for (let i = 0; i < phoneData.length; i++) {
    if (String(phoneData[i]).replace(/\D/g, '') === targetPhone) {
      let isMatch = true;

      // Kiểm tra trùng Tên Nhân Viên nếu có
      if (IDX.SALE > -1 && targetSaleName) {
        if (String(saleData[i]).trim().toLowerCase() !== targetSaleName) {
          isMatch = false;
        }
      }

      // Kiểm tra trùng Tên Khách Hàng nếu có
      if (isMatch && IDX.NAME > -1 && targetCustomerName) {
        if (String(nameData[i]).trim().toLowerCase() !== targetCustomerName) {
          isMatch = false;
        }
      }

      if (isMatch) {
        rowIndex = i + 2;
        break;
      }
    }
  }

  if (rowIndex === -1) return responseJSON({ status: 'error', message: 'Không tìm thấy khách hàng' });

  const setCell = (colIdx, val) => {
    if (colIdx > -1 && val !== undefined) {
      sheet.getRange(rowIndex, colIdx + 1).setValue(val);
    }
  };

  setCell(IDX.NAME, d.customerName);
  setCell(IDX.PHONE, "'" + d.phone);
  setCell(IDX.WARD, d.ward);
  setCell(IDX.PROVINCE, d.province);
  setCell(IDX.CAR, d.carModel);
  setCell(IDX.VERSION, d.version);
  setCell(IDX.COLOR, d.carColor);
  setCell(IDX.CHANNEL, d.channel);
  setCell(IDX.SOURCE, d.source);
  setCell(IDX.STATUS, d.status);
  
  let tdVal = d.testDrive || 'Chưa';
  if (tdVal !== 'Chưa' && typeof tdVal === 'string') {
      if (tdVal.includes('-') && tdVal.length === 10) {
          const p = tdVal.split('-');
          tdVal = `'${p[2]}/${p[1]}/${p[0]}`;
      } else if (tdVal.includes('T') && tdVal.includes('Z')) {
          tdVal = "'" + Utilities.formatDate(new Date(tdVal), "GMT+7", "dd/MM/yyyy");
      }
  }
  setCell(IDX.TESTDRIVE, tdVal);

  const ratingVal = d.leadRating || d['LEAD RATING'];
  if (ratingVal) setCell(IDX.RATING, ratingVal);

  if (d.newNote && String(d.newNote).trim()) {
    const timeLog = Utilities.formatDate(new Date(), "GMT+7", "HH:mm dd/MM");
    const role = String(user.role).toLowerCase();
    const entry = `[${user.name} - ${timeLog}]: ${d.newNote}`;

    let noteCol = -1;
    if (role.includes('admin') || role.includes('giám đốc')) noteCol = IDX.NOTE_M;
    else if (role.includes('tpkd')) noteCol = IDX.NOTE_TPKD;
    else noteCol = IDX.NOTE_SALE;

    if (noteCol > -1) {
      const oldVal = sheet.getRange(rowIndex, noteCol + 1).getValue();
      sheet.getRange(rowIndex, noteCol + 1).setValue(entry + "\n" + oldVal);
    }
  }

  setCell(IDX.UPDATED, Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy"));
  return responseJSON({ status: 'success', message: 'Cập nhật thành công!' });
}