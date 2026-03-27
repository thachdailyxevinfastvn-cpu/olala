
function successResponse(msg) { return responseJSON({ status: 'success', message: msg }); }
function errorResponse(msg) { return responseJSON({ status: 'error', message: msg }); }
