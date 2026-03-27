import { authService } from '../auth/authService';
import { API_URL } from '../../api/constants';

// Hàm gửi request cơ bản
const sendRequest = async (action, data = {}) => {
  try {
    const bodyPayload = { action, ...data };
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(bodyPayload),
    });
    return await response.json();
  } catch (error) {
    console.error(`Lỗi kết nối ${action}:`, error);
    return { status: 'error', message: 'Lỗi kết nối Server' };
  }
};

export const customerService = {
  // Lấy Config
  getConfig: async () => sendRequest('getConfig'),

  // Lấy danh sách khách hàng
  getCustomers: async (startDate, endDate, search = '') => {
    const rawUser = authService.getCurrentUser();

    // --- SỬA LỖI 0 DATA CHO MANAGER ---
    const userToSend = { ...rawUser };
    const role = String(userToSend.role || '').toLowerCase();

    // Nếu là Manager/Admin, ta XÓA department đi để server không lọc sai
    if (role.includes('manager') || role.includes('admin') || role.includes('giám đốc') || role.includes('quản lý')) {
      delete userToSend.department;
      delete userToSend.pkd;
    }

    return await sendRequest('getCustomers', {
      userRequesting: userToSend, // Gửi user đã xử lý
      search,
      startDate,
      endDate
    });
  },

  // Thêm khách hàng
  addCustomers: async (customersList) => {
    const user = authService.getCurrentUser();
    // Logic gửi dữ liệu ...
    return await sendRequest('addCustomers', { userInfo: user, customers: customersList });
  },

  // --- API PHÂN KHÁCH ---
  getStaffList: async () => {
    // Gọi API lấy list nhân sự (để fill dropdown người nhận)
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'getStaffList' })
    });
    return await res.json();
  },

  createAssignedCustomer: async (customersList) => {
    const user = authService.getCurrentUser();
    const cleanList = customersList.map(c => {
      const { isNew, isSyncing, tempId, key, ...rest } = c;
      return rest;
    });
    // Gọi API createAssignedCustomer
    return await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'createAssignedCustomer',
        userInfo: user,
        customers: cleanList
      })
    }).then(r => r.json());
  },

  getAssignedCustomers: async () => {
    const user = authService.getCurrentUser();
    return await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'getAssignedCustomers', userRequesting: user })
    }).then(r => r.json());
  },

  acceptCustomer: async (phone) => {
    const user = authService.getCurrentUser();
    return await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'acceptCustomer', customerPhone: phone, userEmail: user.email })
    }).then(r => r.json());
  },

  deleteAssignedCustomer: async (phone) => {
    const user = authService.getCurrentUser();
    return await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteAssignedCustomer', customerPhone: phone, userRequesting: user })
    }).then(r => r.json());
  },

  // Cập nhật khách hàng
  updateCustomer: async (customerData) => {
    const user = authService.getCurrentUser();
    const payload = { ...customerData };

    delete payload.isNew;
    delete payload.isSyncing;
    delete payload.tempId;
    delete payload.isLoading;

    if (!payload.key || payload.key == 0) {
      delete payload.key;
    }

    if (payload.originalPhone !== undefined && payload.originalPhone !== null) {
      payload.originalPhone = String(payload.originalPhone);
    }

    return await sendRequest('updateCustomer', {
      userInfo: user,
      customerData: payload
    });
  }
};