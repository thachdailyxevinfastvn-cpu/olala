// BẠN KIỂM TRA LẠI LINK WEB APP MỚI NHẤT CỦA BẠN (Đuôi /exec)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwNyekxSmuXZO6Vz_WJadWJsOjTBIrRzBRH5nSO3pFrQEIaduoVEakk3SE5Vpy2PohC/exec"; 

const sendRequest = async (action, data = {}) => {
  // Đóng gói dữ liệu để gửi sang Google Apps Script
  const payload = JSON.stringify({ 
    action: action, 
    ...data 
  });

  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      // Dùng text/plain để tránh lỗi CORS (Quan trọng)
      headers: { "Content-Type": "text/plain;charset=utf-8" }, 
      body: payload,
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Lỗi API:", error);
    return { status: "error", message: "Lỗi kết nối Server" };
  }
};

export const api = {
  // 1. Đăng nhập
  login: async (username, password) => {
    return await sendRequest("login", { 
      data: { username: username, password: password } 
    });
  },

  // 2. Lấy cấu hình (Dropdown)
  getConfig: async () => {
    const res = await sendRequest("getConfig");
    if (res && res.status === 'success') {
      const d = res.data;
      return {
        status: 'success',
        data: {
          // --- THÊM DÒNG NÀY ĐỂ LẤY KÊNH QC ---
          channels: d.channels || [], 
          
          carModels: d.carModels || [],
          carColors: d.carColors || [],
          sources: d.sources || [],
          statuses: d.statuses || [],
          ratings: d.ratings || [],
          // Lọc danh sách Tỉnh/Thành duy nhất
          provinces: d.locations ? [...new Set(d.locations.map(l => l.province).filter(Boolean))] : []
        }
      };
    }
    return res || { status: 'error', message: 'Không lấy được cấu hình' };
  },

  // 3. Lấy danh sách khách hàng
  getCustomers: async (page, search, user) => {
    return await sendRequest("getCustomers", {
      userRequesting: user,
      search: search
    });
  },

  // 4. Thêm khách hàng (Mảng)
  addCustomers: async (customersList, user) => {
    return await sendRequest("addCustomers", {
      data: {
        userInfo: user,
        customers: customersList
      }
    });
  },

  // 5. Cập nhật khách hàng (QUAN TRỌNG: Gửi kèm user để ghi Log)
  updateCustomer: (customer, user) => sendRequest("updateCustomer", { 
    data: {
      customerData: customer,
      userInfo: user // Gửi thông tin người đang sửa để Server ghi vào Log
    }
  })
};