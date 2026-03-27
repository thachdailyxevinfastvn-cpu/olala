// =======================================================
// HỆ THỐNG & CẤU HÌNH
// =======================================================

function getConfig() {
  const ss = SpreadsheetApp.openById(ID_FILE_DATA);
  const sheet = ss.getSheetByName(SHEET_CONFIG);
  if (!sheet) return responseJSON({ status: 'success', data: {} });

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 11).getValues();
  const getCol = (idx) => [...new Set(data.map(r => r[idx]).filter(String))];

  return responseJSON({
    status: 'success',
    data: {
      sources: getCol(0), channels: getCol(1), carModels: getCol(2), versions: getCol(3),
      locations: data.map(r => ({ ward: r[8], province: r[10] })).filter(x => x.ward && x.province)
    }
  });
}

function getStaffData() {
  const ss = SpreadsheetApp.openById(ID_FILE_NHAN_SU);
  let sheet = ss.getSheetByName(SHEET_STAFF);
  if (!sheet) { const sheets = ss.getSheets(); sheet = sheets.find(s => s.getName().toUpperCase().includes("NHÂN")) || sheets[0]; }
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  // Map header dynamnically
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const H = {
    NAME: getColIdx(headers, 'HỌ VÀ TÊN', ['TÊN', 'NAME', 'HỌ TÊN']),
    EMAIL: getColIdx(headers, 'EMAIL', ['MAIL', 'GMAIL']),
    DEPT: getColIdx(headers, 'PHÒNG BAN', ['PHÒNG', 'TEAM', 'BỘ PHẬN', 'PKD', 'DEPARTMENT', 'DEPT', 'PB']),
    ROLE: getColIdx(headers, 'CHỨC VỤ', ['CHỨC', 'ROLE', 'POSITION']) > -1 ? getColIdx(headers, 'CHỨC VỤ', ['CHỨC', 'ROLE', 'POSITION']) : 1
  };

  const staffList = [];
  const seen = new Set();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const name = H.NAME > -1 ? String(row[H.NAME] || "").trim() : "";
    if (name !== "" && !name.toUpperCase().includes("TÊN") && !seen.has(name)) {
      staffList.push({
        name: name,
        department: H.DEPT > -1 ? String(row[H.DEPT] || "").trim() : "",
        email: H.EMAIL > -1 ? String(row[H.EMAIL] || "").trim() : "",
        role: H.ROLE > -1 ? String(row[H.ROLE] || "").trim() : ""
      });
      seen.add(name);
    }
  }
  return staffList;
}

function getStaffList() {
  const data = getStaffData();
  return responseJSON({ status: 'success', data: data });
}