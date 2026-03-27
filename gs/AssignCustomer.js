// =======================================================
// XỬ LÝ PHÂN KHÁCH (SHEET PHÂN KHÁCH)
// =======================================================

function errorResponse(msg) { return responseJSON({ status: 'error', message: msg }); }
function successResponse(msg) { return responseJSON({ status: 'success', message: msg }); }

/**
 * Helper: Map headers of "PHÂN KHÁCH" sheet
 */
function ensureAssignColumns(sheet) {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const upper = headers.map(h => String(h).toUpperCase().trim());
    if (!upper.includes('NGƯỜI TẠO')) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue('NGƯỜI TẠO');
    }
    if (!upper.includes('PKD') && !upper.includes('TEAM') && !upper.includes('PHÒNG')) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue('PKD');
    }
}

function getAssignMap(sheet) {
    ensureAssignColumns(sheet); // Auto add missing columns
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    return {
        DATE_CREATE: getColIdx(headers, 'NGÀY TẠO', ['NGÀY', 'CREATED']),
        CREATOR: getColIdx(headers, 'NGƯỜI TẠO', ['CREATOR', 'ADMIN']),
        DATE_ASSIGN: getColIdx(headers, 'NGÀY PHÂN', ['ASSIGN DATE']),
        SALE: getColIdx(headers, 'TÊN NHÂN VIÊN', ['SALE', 'TVBH', 'NHÂN VIÊN']),
        DEPT: getColIdx(headers, 'PKD', ['TEAM', 'PHÒNG']),

        // Customer Info
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
        UPDATED: getColIdx(headers, 'CẬP NHẬT CUỐI', ['CẬP NHẬT', 'LAST'])
    };
}

/**
 * API: Tạo khách hàng được phân (Ghi vào sheet "PHÂN KHÁCH")
 * params: { customers: [Object], assignee: { name, email, department } }
 */
function createAssignedCustomer(params) {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return responseJSON({ status: 'error', message: "System busy. Please try again." });

    try {
        const ss = SpreadsheetApp.openById(ID_FILE_DATA);
        let sheet = ss.getSheetByName(SHEET_ASSIGN);

        if (!sheet) {
            sheet = ss.insertSheet(SHEET_ASSIGN);
            sheet.appendRow(["NGÀY TẠO", "NGƯỜI TẠO", "NGÀY PHÂN", "TÊN NHÂN VIÊN", "PKD", "TÊN KHÁCH HÀNG", "SDT", "PHƯỜNG / XÃ", "TỈNH/TP", "DÒNG XE", "PHIÊN BẢN", "MÀU XE", "KÊNH", "NGUỒN", "TRẠNG THÁI", "LEAD RATING", "LÁI THỬ", "TVBH GHI CHÚ", "TPKD NOTE", "M - NOTE", "CẬP NHẬT CUỐI"]);
        }

        const user = params.userInfo;
        const customers = params.customers || []; // Array of { ...customerData, assigneeEmail: '...' }

        if (customers.length === 0) return responseJSON({ status: 'error', message: "Không có dữ liệu khách hàng" });

        // Group customers by assigneeEmail
        const customersByAssignee = {};
        customers.forEach(c => {
            const email = c.assigneeEmail;
            if (!email) return;
            if (!customersByAssignee[email]) customersByAssignee[email] = [];
            customersByAssignee[email].push(c);
        });

        // Get staff list
        const staffList = getStaffData();
        const staffMap = {};
        staffList.forEach(s => staffMap[s.email] = s); // Store full object

        const IDX = getAssignMap(sheet);
        const numCols = sheet.getLastColumn();
        const newRowsToAppend = [];

        // Process each group
        for (const email in customersByAssignee) {
            const group = customersByAssignee[email];
            const assignee = staffMap[email] || {};
            const assigneeName = assignee.name || email;
            // Use dept from first customer payload or storage
            const payloadDept = (group.length > 0) ? group[0].assigneeDept : '';
            const assigneeDept = payloadDept || assignee.department || assignee.pkd || assignee.dept || '';

            const groupRows = group.map(c => {
                let row = new Array(numCols).fill('');
                const nowStr = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");

                if (IDX.DATE_CREATE > -1) row[IDX.DATE_CREATE] = nowStr;
                if (IDX.SALE > -1) row[IDX.SALE] = assigneeName;
                if (IDX.DEPT > -1) row[IDX.DEPT] = assigneeDept; // Ghi nhận PKD
                if (IDX.CREATOR > -1) row[IDX.CREATOR] = user.name || user.email;

                if (IDX.NAME > -1) row[IDX.NAME] = c.customerName;
                if (IDX.PHONE > -1) row[IDX.PHONE] = "'" + c.phone;
                if (IDX.CAR > -1) row[IDX.CAR] = c.carModel;
                if (IDX.VERSION > -1) row[IDX.VERSION] = c.version;
                if (IDX.SOURCE > -1) row[IDX.SOURCE] = c.source;
                if (IDX.CHANNEL > -1) row[IDX.CHANNEL] = c.channel;

                // Logging Note logic
                if (IDX.NOTE_SALE > -1 && c.saleNote) {
                    const timeLog = Utilities.formatDate(new Date(), "GMT+7", "HH:mm dd/MM");
                    row[IDX.NOTE_SALE] = `[${user.name} - ${timeLog}]: ${c.saleNote}`;
                }

                if (IDX.RATING > -1) row[IDX.RATING] = c['LEAD RATING'] || c.leadRating;
                if (IDX.WARD > -1) row[IDX.WARD] = c.ward;
                if (IDX.PROVINCE > -1) row[IDX.PROVINCE] = c.province;

                if (IDX.STATUS > -1) row[IDX.STATUS] = 'Chờ nhận';

                return row;
            });

            newRowsToAppend.push(...groupRows);

            // Send Email
            try {
                const subject = `[SKODA CRM] BẠN CÓ ${group.length} KHÁCH HÀNG MỚI ĐƯỢC PHÂN CÔNG`;
                const body = `Chào ${assigneeName},\n\nBạn vừa được phân công ${group.length} khách hàng mới từ quản lý ${user.name || user.email}.\n\nDanh sách khách hàng:\n${group.map((c, i) => {
                    const maskedPhone = String(c.phone).length > 5 ? String(c.phone).substring(0, 4) + '******' : '******';
                    return `${i + 1}. ${c.customerName} - ${maskedPhone} - ${c.carModel}`;
                }).join('\n')}\n\nLưu ý:\n- Truy cập App để lấy SĐT và liên hệ khách hàng ngay.\n- 30 phút nữa không cập nhật đủ thông tin thì bạn sẽ bị giảm số lượng khách hàng trong những lần phân kế tiếp.\n\nTrân trọng,\nSkoda CRM System`;

                MailApp.sendEmail({
                    to: email,
                    subject: subject,
                    body: body,
                    name: 'Hệ thống SKODA Đồng Nai'
                });
            } catch (e) {
                console.error("Error sending email to " + email + ": " + e.message);
            }
        }

        if (newRowsToAppend.length > 0) {
            sheet.getRange(sheet.getLastRow() + 1, 1, newRowsToAppend.length, numCols).setValues(newRowsToAppend);
        }

        return responseJSON({ status: 'success', message: "Đã phân khách thành công!" });

    } catch (e) {
        return responseJSON({ status: 'error', message: e.message });
    } finally {
        lock.releaseLock();
    }
}

/**
 * API: Lấy danh sách khách hàng ĐƯỢC PHÂN CHI CHO MÌNH (của User đang login)
 * params: { userRequesting: {...} }
 */
function getAssignedCustomers(params) {
    const ss = SpreadsheetApp.openById(ID_FILE_DATA);
    const sheet = ss.getSheetByName(SHEET_ASSIGN);
    if (!sheet) return responseJSON({ status: 'success', data: [] });

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return responseJSON({ status: 'success', data: [] });

    const IDX = getAssignMap(sheet);
    const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    const user = params.userRequesting;

    // Logic lọc:
    // - Nếu là Manager/Admin: Xem hết
    // - Nếu là TPKD: Xem của phòng mình (hoặc hết nếu muốn, ở đây tạm để phòng mình)
    // - Nếu là TVBH: Chỉ xem khách được phân cho mình

    const role = String(user.role || "").toLowerCase();
    const userDept = String(user.department || user.pkd || "").trim();
    const isManager = role.includes('manager') || role.includes('admin') || role.includes('giám đốc');
    const isTPKD = role.includes('tpkd') || role.includes('trưởng phòng');

    const result = [];

    for (let i = 0; i < data.length; i++) {
        const r = data[i];
        const rowSale = IDX.SALE > -1 ? String(r[IDX.SALE]).trim() : "";
        const rowDept = IDX.DEPT > -1 ? String(r[IDX.DEPT]).trim() : "";
        const rowCreator = IDX.CREATOR > -1 ? String(r[IDX.CREATOR]).trim() : "";

        // Filter Logic
        if (isManager) {
            // Pass
        } else if (isTPKD) {
            if (rowDept !== userDept) continue;
        } else {
            const myName = String(user.name).trim().toLowerCase();
            const myEmail = String(user.email).trim().toLowerCase();

            const isMyAssigned = rowSale.toLowerCase() === myName;
            const isMyCreated = rowCreator.toLowerCase() === myName || rowCreator.toLowerCase() === myEmail;

            // Chỉ cho phép nếu là Người được phân HOẶC Người tạo
            if (!isMyAssigned && !isMyCreated) continue;
        }

        result.push({
            key: i, // Dùng index làm key tạm (lưu ý khi xóa dòng sẽ đổi key)
            date: IDX.DATE_CREATE > -1 ? formatDateForClient(r[IDX.DATE_CREATE]) : '',
            dateAssign: IDX.DATE_ASSIGN > -1 ? formatDateForClient(r[IDX.DATE_ASSIGN]) : '',
            creatorName: rowCreator,
            saleName: rowSale,
            department: rowDept,
            customerName: IDX.NAME > -1 ? r[IDX.NAME] : '',
            phone: IDX.PHONE > -1 ? r[IDX.PHONE] : '', // Vẫn trả về SĐT để hiển thị trong Popup
            ward: IDX.WARD > -1 ? r[IDX.WARD] : '',
            province: IDX.PROVINCE > -1 ? r[IDX.PROVINCE] : '',
            carModel: IDX.CAR > -1 ? r[IDX.CAR] : '',
            version: IDX.VERSION > -1 ? r[IDX.VERSION] : '',
            carColor: IDX.COLOR > -1 ? r[IDX.COLOR] : '',
            channel: IDX.CHANNEL > -1 ? r[IDX.CHANNEL] : '',
            source: IDX.SOURCE > -1 ? r[IDX.SOURCE] : '',
            status: IDX.STATUS > -1 ? r[IDX.STATUS] : '',
            leadRating: IDX.RATING > -1 ? r[IDX.RATING] : '-',
            "LEAD RATING": IDX.RATING > -1 ? r[IDX.RATING] : '-',
            saleNote: IDX.NOTE_SALE > -1 ? r[IDX.NOTE_SALE] : '',
        });
    }

    return responseJSON({ status: 'success', data: result });
}

/**
 * API: Nhận khách (Chuyển từ PHÂN KHÁCH -> KHTN)
 * params: { customerPhone, userEmail }
 */
function acceptCustomer(params) {
    const ss = SpreadsheetApp.openById(ID_FILE_DATA);
    const sheetAssign = ss.getSheetByName(SHEET_ASSIGN);
    const sheetCRM = ss.getSheetByName(SHEET_CRM);

    if (!sheetAssign || !sheetCRM) return responseJSON({ status: 'error', message: "Lỗi cấu trúc Sheet" });

    const targetPhone = String(params.customerPhone).replace(/\D/g, '');
    if (!targetPhone) return responseJSON({ status: 'error', message: "Thiếu SĐT khách hàng" });

    // 1. Tìm trong sheet Assign
    const idxAssign = getAssignMap(sheetAssign);
    if (idxAssign.PHONE === -1) return responseJSON({ status: 'error', message: "Lỗi cột SĐT Assign" });

    const lastRow = sheetAssign.getLastRow();
    const phoneData = sheetAssign.getRange(2, idxAssign.PHONE + 1, lastRow - 1, 1).getValues().flat();

    let rowIndexArg = -1;
    for (let i = 0; i < phoneData.length; i++) {
        if (String(phoneData[i]).replace(/\D/g, '') === targetPhone) {
            rowIndexArg = i + 2;
            break;
        }
    }

    if (rowIndexArg === -1) return responseJSON({ status: 'error', message: "Khách hàng không còn tồn tại hoặc đã được nhận." });

    // 2. Lấy dữ liệu dòng đó
    const rowData = sheetAssign.getRange(rowIndexArg, 1, 1, sheetAssign.getLastColumn()).getValues()[0];

    // 3. Map sang KHTN
    // Ensure Headers exist in CRM Sheet (defined in CustomerController.js)
    try { ensureCRMColumns(sheetCRM); } catch (e) { console.error("Error ensuring headers: " + e.message); }

    const idxCRM = getCustomerMap(sheetCRM); // Hàm từ CustomerController.js
    const numColsCRM = sheetCRM.getLastColumn();
    const newRowCRM = new Array(numColsCRM).fill('');

    // Helper copy value: Assign Col -> CRM Col
    const copyVal = (keyAssign, keyCRM) => {
        if (idxAssign[keyAssign] > -1 && idxCRM[keyCRM] > -1) {
            const val = rowData[idxAssign[keyAssign]];
            newRowCRM[idxCRM[keyCRM]] = val;
        }
    };

    // Mapping Fields
    copyVal('DATE_CREATE', 'DATE');
    copyVal('SALE', 'SALE');
    copyVal('DEPT', 'DEPT');
    copyVal('NAME', 'NAME');

    // Fix: Force Phone to be String to keep leading Zero
    if (idxCRM.PHONE > -1 && idxAssign.PHONE > -1) {
        let p = rowData[idxAssign.PHONE];
        p = String(p).trim();
        if (!p.startsWith("'")) p = "'" + p; // Force string format
        newRowCRM[idxCRM.PHONE] = p;
    }

    copyVal('WARD', 'WARD');
    copyVal('PROVINCE', 'PROVINCE');
    copyVal('CAR', 'CAR');
    copyVal('VERSION', 'VERSION');
    copyVal('COLOR', 'COLOR');
    copyVal('CHANNEL', 'CHANNEL');
    copyVal('SOURCE', 'SOURCE');
    // copyVal('STATUS', 'STATUS'); -> Status sẽ set thành Mới hoặc Đã nhận
    copyVal('RATING', 'RATING');
    copyVal('TESTDRIVE', 'TESTDRIVE');
    copyVal('NOTE_SALE', 'NOTE_SALE');
    copyVal('NOTE_TPKD', 'NOTE_TPKD');
    copyVal('NOTE_M', 'NOTE_M');
    copyVal('UPDATED', 'UPDATED');
    copyVal('CREATOR', 'CREATOR');

    // Override một số trường
    if (idxCRM.STATUS > -1) newRowCRM[idxCRM.STATUS] = "Mới (Đã nhận)";
    if (idxCRM.DATE_RECEIVED > -1) newRowCRM[idxCRM.DATE_RECEIVED] = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
    if (idxCRM.UPDATED > -1) newRowCRM[idxCRM.UPDATED] = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy"); // Cập nhật giờ nhận

    // 4. Ghi vào KHTN
    sheetCRM.appendRow(newRowCRM);

    // 5. Xóa khỏi Assign
    sheetAssign.deleteRow(rowIndexArg);

    return responseJSON({ status: 'success', message: "Đã nhận khách thành công!" });
}

/**
 * API: Xóa khách hàng được phân (Chỉ Người tạo hoặc Admin/Manager mới xóa được)
 * params: { customerPhone, userRequesting }
 */
function deleteAssignedCustomer(params) {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) return responseJSON({ status: 'error', message: "System busy." });

    try {
        const ss = SpreadsheetApp.openById(ID_FILE_DATA);
        const sheet = ss.getSheetByName(SHEET_ASSIGN);
        if (!sheet) return responseJSON({ status: 'error', message: "Sheet not found" });

        const targetPhone = String(params.customerPhone).replace(/\D/g, '');
        const user = params.userRequesting;

        // Permission Check Helpers
        const role = String(user.role || '').toLowerCase();
        const isManager = role.includes('manager') || role.includes('admin') || role.includes('giám đốc') || role.includes('tpkd');
        const userName = String(user.name).trim();
        const userEmail = String(user.email).trim();

        // Find Row
        const idxMap = getAssignMap(sheet);
        if (idxMap.PHONE === -1) return responseJSON({ status: 'error', message: "Lỗi cột SĐT" });

        const lastRow = sheet.getLastRow();
        const phoneData = sheet.getRange(2, idxMap.PHONE + 1, lastRow - 1, 1).getValues().flat();

        let rowIndex = -1;
        for (let i = 0; i < phoneData.length; i++) {
            if (String(phoneData[i]).replace(/\D/g, '') === targetPhone) {
                rowIndex = i + 2;
                break;
            }
        }

        if (rowIndex === -1) return responseJSON({ status: 'error', message: "Khách hàng không tồn tại." });

        // Verify Creator
        let creatorVal = "";
        if (idxMap.CREATOR > -1) {
            creatorVal = String(sheet.getRange(rowIndex, idxMap.CREATOR + 1).getValue()).trim();
        }

        // Check: Là Creator HOẶC là Manager
        // Note: Creator save could be name or email. Check both.
        const isCreator = (creatorVal && (creatorVal === userName || creatorVal === userEmail));

        if (!isCreator && !isManager) {
            return responseJSON({ status: 'error', message: "Bạn không có quyền xóa khách hàng này (chỉ Người phân mới được xóa)." });
        }

        sheet.deleteRow(rowIndex);
        return responseJSON({ status: 'success', message: "Đã xóa khách hàng thành công!" });

    } catch (e) {
        return responseJSON({ status: 'error', message: e.message });
    } finally {
        lock.releaseLock();
    }
}
