
function successResponse(msg) { return responseJSON({ status: 'success', message: msg }); }
function errorResponse(msg) { return responseJSON({ status: 'error', message: msg }); }

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('⚙️ Skoda CRM Cài Đặt')
    .addItem('Bật báo cáo tự động (Lịch Trực)', 'setupDailyEmailTrigger')
    .addToUi();
}

function setupDailyEmailTrigger() {
  const funcName = 'checkAndSendDailyScheduleEmail';
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === funcName) {
      console.log('Tính năng này đã được bật từ trước rồi nhé!');
      return;
    }
  }

  ScriptApp.newTrigger(funcName)
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .create();

  console.log('Thành công! Hệ thống CRM sẽ tự động gửi Email báo lịch trực mỗi ngày vào khung giờ 7:00 - 8:00 sáng.');
}
