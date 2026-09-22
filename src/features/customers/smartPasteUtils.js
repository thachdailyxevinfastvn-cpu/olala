export const processSmartPasteText = (rawText, config, staffList, isAssignMode) => {
    if (!rawText || !rawText.trim()) return null;

    // 1. Loại bỏ các URL links và chuẩn hóa chuỗi
    let processedText = rawText.replace(/https?:\/\/[^\s]+/g, ' ');
    processedText = processedText.replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

    const extractedData = {};

    // 2. Tìm SĐT để làm mốc chia đôi chuỗi (Trước SĐT là Tên+Địa chỉ, Sau là Ghi chú)
    const phoneRegex = /(?:0|\+84)\s*[1-9](?:\s*\d){8}/g;
    const phoneMatches = processedText.match(phoneRegex);

    let namePart = "";
    let notePart = "";

    if (phoneMatches && phoneMatches.length > 0) {
        const phoneStr = phoneMatches[0];
        let phoneNoSpace = phoneStr.replace(/\D/g, '');
        if (phoneNoSpace.length === 9) phoneNoSpace = "0" + phoneNoSpace;
        extractedData.phone = phoneNoSpace;

        const phoneIndex = processedText.indexOf(phoneStr);
        namePart = processedText.substring(0, phoneIndex);
        notePart = processedText.substring(phoneIndex + phoneStr.length);
    } else {
        namePart = processedText;
        notePart = "";
    }

    // 3. Tìm tên nhân viên (Assignee) nếu đang ở Mode Phân Khách
    if (isAssignMode && staffList && staffList.length > 0) {
        const sortedStaffs = [...staffList].sort((a, b) => (b.name || '').length - (a.name || '').length);
        for (const staff of sortedStaffs) {
            if (!staff.name) continue;
            const rgx = new RegExp(staff.name, 'i');
            if (rgx.test(namePart)) {
                extractedData.assigneeEmail = staff.email;
                extractedData.assigneeRole = staff.role || 'TVBH';
                extractedData.assigneeDept = staff.department || staff.pkd || staff.dept || '';
                namePart = namePart.replace(rgx, ' ');
                break;
            } else if (rgx.test(notePart)) {
                extractedData.assigneeEmail = staff.email;
                extractedData.assigneeRole = staff.role || 'TVBH';
                extractedData.assigneeDept = staff.department || staff.pkd || staff.dept || '';
                notePart = notePart.replace(rgx, ' ');
                break;
            }
        }
    }

    // 4. Tìm dòng xe
    if (config?.carModels && config.carModels.length > 0) {
        const sortedCars = [...config.carModels].sort((a, b) => b.length - a.length);
        for (const car of sortedCars) {
            const rgx = new RegExp(car, 'i');
            if (rgx.test(namePart)) {
                extractedData.carModel = car;
                namePart = namePart.replace(rgx, ' ');
                break;
            } else if (rgx.test(notePart)) {
                extractedData.carModel = car;
                notePart = notePart.replace(rgx, ' ');
                break;
            }
        }
    }

    // Cắt bỏ chữ "Skoda" dư thừa (vì nó chỉ là tên prefix hãng, gây nhiễu tên KH)
    namePart = namePart.replace(/skoda/ig, ' ');
    notePart = notePart.replace(/skoda/ig, ' ');

    // 5. Cập nhật Tên và Note dựa trên mốc SĐT
    let finalName = namePart.replace(/\s+/g, ' ').trim();
    let finalNote = notePart.replace(/\s+/g, ' ').trim();

    // Edge case: Nếu đặt số điện thoại ngay đầu, thì namePart bị trống
    if (!finalName && finalNote) {
        const words = finalNote.split(' ');
        const nameLen = Math.min(words.length, 4);
        const hasNumber = /\d/.test(words.slice(0, nameLen).join(' '));
        if (!hasNumber) {
            finalName = words.slice(0, nameLen).join(' ');
            finalNote = words.slice(nameLen).join(' ');
        }
    }

    extractedData.customerName = finalName;
    extractedData.saleNote = finalNote;

    return extractedData;
};
