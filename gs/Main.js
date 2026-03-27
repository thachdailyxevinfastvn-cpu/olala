// =======================================================
// BỘ ĐIỀU PHỐI REQUEST (ROUTER)
// =======================================================

function doGet(e) { return ContentService.createTextOutput("✅ Server hoạt động tốt!"); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    if (!e.postData) return responseJSON({ status: 'error', message: 'No data' });
    const params = JSON.parse(e.postData.contents);
    const action = params.action;

    // --- AUTH (File: Auth.gs) ---
    if (action === 'login') return login(params.data || params);
    if (action === 'forgotPassword') return handleForgotPasswordRequest(params.data);
    if (action === 'resetPassword') return handleResetPassword(params.data);

    // --- CRM KHÁCH HÀNG (File: CustomerController.gs) ---
    if (action === 'getConfig') return getConfig();
    if (action === 'getCustomers') return getCustomers(params);
    if (action === 'addCustomers') return addCustomers(params);
    if (action === 'updateCustomer') return updateCustomer(params);

    // --- REPORT BÁO CÁO (File: ReportController.gs) ---
    if (action === 'addReport') return addReport(params);
    if (action === 'addBatchReports') return addBatchReports(params);
    if (action === 'getReports') return getReports(params);

    // --- SYSTEM (File: SystemController.gs) ---
    if (action === 'getStaffList') return getStaffList();

    // --- ASSIGN CUSTOMER (File: AssignCustomer.gs) ---
    if (action === 'createAssignedCustomer') return createAssignedCustomer(params);
    if (action === 'getAssignedCustomers') return getAssignedCustomers(params);
    if (action === 'acceptCustomer') return acceptCustomer(params);
    if (action === 'deleteAssignedCustomer') return deleteAssignedCustomer(params);

    return responseJSON({ status: 'error', message: 'Unknown action: ' + action });
  } catch (error) {
    return responseJSON({ status: 'error', message: error.toString() });
  } finally {
    lock.releaseLock();
  }
}