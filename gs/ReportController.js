// =======================================================
// XỬ LÝ BÁO CÁO (SHEET: BC SOCIAL)
// =======================================================

// Map cột chính xác theo yêu cầu
function getReportMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  // Thứ tự ưu tiên tìm kiếm
  return {
    REPORT_LABEL: getColIdx(headers, 'report', ['REPORT', 'TIÊU ĐỀ']),
    ID: getColIdx(headers, 'ID', ['REPORTID', 'MÃ BC']),
    TIMESTAMP: getColIdx(headers, 'timestamp', ['TIME', 'THỜI GIAN']),
    STAFF: getColIdx(headers, 'staff', ['PKD', 'TEAM', 'PHÒNG']), // staff = Phòng ban
    ID_STAFF: getColIdx(headers, 'IDstaff', ['STAFFID', 'MÃ NV']),
    NAME: getColIdx(headers, 'Name', ['STAFFNAME', 'TÊN']),
    R_DATE: getColIdx(headers, 'reportDate', ['REPORTDATE', 'NGÀY']),
    TYPE: getColIdx(headers, 'type', ['LOẠI', 'TYPE']),
    M1: getColIdx(headers, 'metric1', ['M1']),
    M2: getColIdx(headers, 'metric2', ['M2']),
    PLATFORM: getColIdx(headers, 'platform', ['KÊNH', 'PLATFORM']),
    STATUS: getColIdx(headers, 'status', ['TRẠNG THÁI']),
    IMG: getColIdx(headers, 'imageUrl', ['ẢNH', 'LINK', 'IMAGE']),
    NOTE: getColIdx(headers, 'note', ['GHI CHÚ'])
  };
}

function addBatchReports(params) {
  const ss = SpreadsheetApp.openById(ID_FILE_DATA);
  let sheet = ss.getSheetByName(SHEET_REPORTS);

  // Tạo sheet nếu chưa có
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_REPORTS);
    sheet.appendRow(["report", "ID", "timestamp", "staff", "IDstaff", "Name", "reportDate", "type", "metric1", "metric2", "platform", "status", "imageUrl", "note"]);
  }

  const reports = params.reports;
  const overwrite = params.overwrite === true;

  if (!reports || !Array.isArray(reports) || reports.length === 0) return responseJSON({ status: 'error', message: 'No data' });

  const IDX = getReportMap(sheet);
  const numCols = sheet.getLastColumn();

  // 1. Xử lý ghi đè (Xóa dữ liệu cũ nếu trùng ngày/nv/kênh)
  if (overwrite) {
    const targetDateStr = String(reports[0].reportDate).substring(0, 10); // yyyy-mm-dd
    const targetStaff = String(reports[0].staffName);
    const targetPlatform = String(reports[0].platform);
    const targetType = String(reports[0].type);

    const data = sheet.getDataRange().getValues();
    const rowsKeep = [];
    let deletedCount = 0;

    if (data.length > 0) rowsKeep.push(data[0]); // Giữ Header

    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // Lấy ngày từ sheet và format về yyyy-MM-dd để so sánh
      let rDateRaw = IDX.R_DATE > -1 ? row[IDX.R_DATE] : '';
      let rDateStr = '';

      if (rDateRaw instanceof Date) {
        rDateStr = Utilities.formatDate(rDateRaw, "GMT+7", "yyyy-MM-dd");
      } else {
        // Nếu là text, cố gắng cắt chuỗi
        rDateStr = String(rDateRaw).substring(0, 10);
      }

      const rName = IDX.NAME > -1 ? String(row[IDX.NAME]) : '';
      const rPlatform = IDX.PLATFORM > -1 ? String(row[IDX.PLATFORM]) : '';
      const rType = IDX.TYPE > -1 ? String(row[IDX.TYPE]) : '';

      if (rName === targetStaff && rDateStr === targetDateStr && rPlatform === targetPlatform && rType === targetType) {
        deletedCount++;
      } else {
        rowsKeep.push(row);
      }
    }

    if (deletedCount > 0) {
      sheet.clearContents();
      if (rowsKeep.length > 0) sheet.getRange(1, 1, rowsKeep.length, rowsKeep[0].length).setValues(rowsKeep);
    }
  }

  // 2. Thêm dữ liệu mới
  const now = new Date();
  const newRows = reports.map(d => {
    let row = new Array(numCols).fill('');
    const uniqueID = "RPT-" + Utilities.getUuid();

    // Parse ngày báo cáo thành Date Object để sheet hiểu
    const reportDateObj = parseDate(d.reportDate);

    if (IDX.REPORT_LABEL > -1) row[IDX.REPORT_LABEL] = d.type || 'Report';
    if (IDX.ID > -1) row[IDX.ID] = uniqueID;
    if (IDX.TIMESTAMP > -1) row[IDX.TIMESTAMP] = now;
    if (IDX.STAFF > -1) row[IDX.STAFF] = d.department || '';
    if (IDX.ID_STAFF > -1) row[IDX.ID_STAFF] = d.staffID || '';
    if (IDX.NAME > -1) row[IDX.NAME] = d.staffName || '';
    if (IDX.R_DATE > -1) row[IDX.R_DATE] = reportDateObj; // Ghi Date Object
    if (IDX.TYPE > -1) row[IDX.TYPE] = d.type || '';
    if (IDX.M1 > -1) row[IDX.M1] = d.metric1 || 0;
    if (IDX.M2 > -1) row[IDX.M2] = d.metric2 || 0;
    if (IDX.PLATFORM > -1) row[IDX.PLATFORM] = d.platform || '';
    if (IDX.STATUS > -1) row[IDX.STATUS] = d.status || 'Đã duyệt';
    if (IDX.IMG > -1) row[IDX.IMG] = d.imageUrl || '';
    if (IDX.NOTE > -1) row[IDX.NOTE] = d.note || '';

    return row;
  });

  if (newRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, numCols).setValues(newRows);
  }

  return responseJSON({ status: 'success', message: 'Đã lưu báo cáo' });
}

function getReports(params) {
  const ss = SpreadsheetApp.openById(ID_FILE_DATA);
  let sheet = ss.getSheetByName(SHEET_REPORTS);
  if (!sheet) return responseJSON({ status: 'success', data: [] });

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return responseJSON({ status: 'success', data: [] });

  const IDX = getReportMap(sheet);
  const result = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    result.push({
      reportID: IDX.ID > -1 ? row[IDX.ID] : '',
      timestamp: IDX.TIMESTAMP > -1 ? row[IDX.TIMESTAMP] : '',
      staffID: IDX.ID_STAFF > -1 ? row[IDX.ID_STAFF] : '',
      staffName: IDX.NAME > -1 ? row[IDX.NAME] : '',
      department: IDX.STAFF > -1 ? row[IDX.STAFF] : '',
      // Trả về format yyyy-mm-dd cho input type="date" ở frontend
      reportDate: IDX.R_DATE > -1 ? (row[IDX.R_DATE] instanceof Date ? Utilities.formatDate(row[IDX.R_DATE], "GMT+7", "yyyy-MM-dd") : row[IDX.R_DATE]) : '',
      type: IDX.TYPE > -1 ? row[IDX.TYPE] : '',
      metric1: IDX.M1 > -1 ? row[IDX.M1] : 0,
      metric2: IDX.M2 > -1 ? row[IDX.M2] : 0,
      platform: IDX.PLATFORM > -1 ? row[IDX.PLATFORM] : '',
      status: IDX.STATUS > -1 ? row[IDX.STATUS] : '',
      imageUrl: IDX.IMG > -1 ? row[IDX.IMG] : '',
      note: IDX.NOTE > -1 ? row[IDX.NOTE] : ''
    });
  }
  return responseJSON({ status: 'success', data: result });
}

// Hàm wrapper cho 1 report
function addReport(params) {
  return addBatchReports({ reports: [params], overwrite: false });
}