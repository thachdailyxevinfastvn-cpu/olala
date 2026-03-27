// Đi từ features/customers -> features -> src -> api -> axiosClient
import { sendRequest } from '../../api/axiosClient';
// Đi từ features/customers -> features -> auth -> authService
import { authService } from '../auth/authService';

export const customerService = {
  getConfig: async () => sendRequest('getConfig'),
  
  getCustomers: async (startDate, endDate, search = '') => {
    const user = authService.getCurrentUser();
    return await sendRequest('getCustomers', { 
        userRequesting: user, 
        search,
        startDate: startDate, 
        endDate: endDate      
    });
  },

  addCustomers: async (customersList) => {
    const user = authService.getCurrentUser();
    return await sendRequest('addCustomers', { userInfo: user, customers: customersList });
  },

  updateCustomer: async (customerData) => {
    const user = authService.getCurrentUser();
    return await sendRequest('updateCustomer', { 
        userInfo: user, 
        customerData: customerData 
    });
  }
};