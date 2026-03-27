// =======================================================
// XÁC THỰC
// =======================================================

function login(credentials) {
  const ss = SpreadsheetApp.openById(ID_FILE_NHAN_SU);
  let sheet = ss.getSheetByName(SHEET_STAFF);
  if (!sheet) {
    const sheets = ss.getSheets();
    sheet = sheets.find(s => s.getName().toUpperCase().includes("NHÂN")) || sheets[0];
  }
  if (!sheet) return errorResponse('Lỗi: Không tìm thấy sheet NHÂN SỰ');

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const C = {
    PHONE: getColIdx(headers, 'SỐ ĐIỆN THOẠI', ['SDT', 'PHONE', 'MOBILE', 'TEL']),
    PASS: getColIdx(headers, 'MẬT KHẨU', ['PASS', 'PASSWORD', 'MK']),
    NAME: getColIdx(headers, 'HỌ VÀ TÊN', ['TÊN', 'NAME', 'HỌ TÊN']),
    ROLE: getColIdx(headers, 'CHỨC VỤ', ['CHỨC', 'ROLE', 'POSITION']),
    DEPT: getColIdx(headers, 'PHÒNG BAN', ['PHÒNG', 'TEAM', 'BỘ PHẬN', 'PKD', 'DEPT']),
    EMAIL: getColIdx(headers, 'EMAIL', ['MAIL', 'GMAIL'])
  };

  if (C.PHONE === -1 || C.PASS === -1) return errorResponse("Lỗi cấu hình: Thiếu cột SĐT hoặc Mật khẩu trong Sheet Nhân sự");

  const data = sheet.getDataRange().getDisplayValues();
  const normalize = (p) => String(p).trim().replace(/\D/g, '').replace(/^0+/, '');
  const inputUser = normalize(credentials.username);
  const inputPass = String(credentials.password).trim();

  let userFound = null;

  // Start from 1 to skip header
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // Simple validation for row length
    if (row.length <= Math.max(C.PHONE, C.PASS)) continue;

    const rowPhone = normalize(row[C.PHONE]);
    if (rowPhone === inputUser && rowPhone.length > 0) {
      userFound = { row: row, index: i };
      break;
    }
  }

  if (!userFound) return errorResponse("Tài khoản không tồn tại");

  const row = userFound.row;
  const storedPass = String(row[C.PASS]).trim();

  if (storedPass !== inputPass) return errorResponse("Mật khẩu không đúng");

  // Success
  return responseJSON({
    status: 'success',
    data: {
      name: C.NAME > -1 ? row[C.NAME] : 'N/A',
      role: C.ROLE > -1 ? (row[C.ROLE] || 'SALE') : 'SALE',
      department: C.DEPT > -1 ? row[C.DEPT] : '',
      phone: '0' + inputUser,
      email: C.EMAIL > -1 ? row[C.EMAIL] : '',
      id: 'S' + (userFound.index + 1)
    }
  });
}

function handleForgotPasswordRequest(params) {
  const email = String(params.email || '').trim().toLowerCase();
  if (!email) return errorResponse("Vui lòng nhập Email");

  const ss = SpreadsheetApp.openById(ID_FILE_NHAN_SU);
  let sheet = ss.getSheetByName(SHEET_STAFF);
  if (!sheet) {
    const sheets = ss.getSheets();
    sheet = sheets.find(s => s.getName().toUpperCase().includes("NHÂN")) || sheets[0];
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colEmail = getColIdx(headers, 'EMAIL', ['MAIL', 'GMAIL']);
  const colToken = getColIdx(headers, 'RESET_TOKEN', ['TOKEN', 'MÃ RESET']);
  const colExp = getColIdx(headers, 'TOKEN_EXPIRATION', ['EXP', 'HẾT HẠN']);
  const colName = getColIdx(headers, 'HỌ VÀ TÊN', ['TÊN', 'NAME', 'HỌ TÊN']);

  if (colEmail === -1 || colToken === -1 || colExp === -1) {
    return errorResponse("Lỗi hệ thống: Thiếu cột Email hoặc Token/Exp trong Sheet Nhân sự");
  }

  const data = sheet.getDataRange().getDisplayValues();
  let foundIndex = -1;
  let userName = "Bạn";

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rEmail = String(row[colEmail]).trim().toLowerCase();
    if (rEmail === email) {
      foundIndex = i + 1; // 1-based row index
      userName = colName > -1 ? row[colName] : "Bạn";
      break;
    }
  }

  if (foundIndex === -1) return errorResponse("Email không tồn tại trong hệ thống");

  // Generate Token
  const token = Utilities.getUuid();
  const expiration = new Date().getTime() + 3600 * 1000; // 1 hour from now

  // Write to Sheet
  sheet.getRange(foundIndex, colToken + 1).setValue(token);
  sheet.getRange(foundIndex, colExp + 1).setValue(expiration);

  // Send Email
  const resetLink = `https://app.skodadongnai.com/reset-password?token=${token}`;

  try {
    MailApp.sendEmail({
      to: email,
      subject: "[SKODA CRM] YÊU CẦU ĐẶT LẠI MẬT KHẨU",
      body: `Chào ${userName},\n\nBạn vừa yêu cầu đặt lại mật khẩu.\nVui lòng nhấn vào link sau để tạo mật khẩu mới (Link hết hạn sau 60 phút):\n\n${resetLink}\n\nNếu bạn không yêu cầu, vui lòng bỏ qua email này.\n\nTrân trọng,\nSkoda CRM`,
      name: 'Hệ thống SKODA Đồng Nai'
    });
    return successResponse("Link đặt lại mật khẩu đã được gửi vào Email của bạn.");
  } catch (e) {
    return errorResponse("Lỗi gửi mail: " + e.message);
  }
}

function handleResetPassword(params) {
  const token = params.data ? params.data.token : params.token;
  const newPass = params.data ? params.data.newPassword : params.newPassword;

  if (!token || !newPass) return errorResponse("Thiếu thông tin Token hoặc Mật khẩu mới");

  const ss = SpreadsheetApp.openById(ID_FILE_NHAN_SU);
  let sheet = ss.getSheetByName(SHEET_STAFF);
  if (!sheet) {
    const sheets = ss.getSheets();
    sheet = sheets.find(s => s.getName().toUpperCase().includes("NHÂN")) || sheets[0];
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colToken = getColIdx(headers, 'RESET_TOKEN', ['TOKEN', 'MÃ RESET']);
  const colExp = getColIdx(headers, 'TOKEN_EXPIRATION', ['EXP', 'HẾT HẠN']);
  const colPass = getColIdx(headers, 'MẬT KHẨU', ['PASS', 'PASSWORD', 'MK']);

  if (colToken === -1 || colExp === -1 || colPass === -1) return errorResponse("Lỗi cấu hình Sheet");

  const rawData = sheet.getDataRange().getValues();
  let foundIndex = -1;

  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (String(row[colToken]) === token) {
      foundIndex = i + 1;

      // Check Expiration
      const expTime = Number(row[colExp]);
      const now = new Date().getTime();
      if (now > expTime) {
        return errorResponse("Link đã hết hạn. Vui lòng yêu cầu lại.");
      }
      break;
    }
  }

  if (foundIndex === -1) return errorResponse("Token không hợp lệ hoặc không tìm thấy.");

  // Update Password and Clear Token
  sheet.getRange(foundIndex, colPass + 1).setValue("'" + newPass); // Force string
  sheet.getRange(foundIndex, colToken + 1).setValue("");
  sheet.getRange(foundIndex, colExp + 1).setValue("");

  return successResponse("Mật khẩu đã được cập nhật thành công!");
}