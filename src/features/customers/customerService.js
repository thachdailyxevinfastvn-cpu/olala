// src/features/customers/customerService.js
import { authService } from '../auth/authService';
import { db } from '../../api/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  orderBy, 
  limit, 
  writeBatch 
} from 'firebase/firestore';

// Helper to format date
const getNowString = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

export const customerService = {
  // Lấy Config (Giả lập config ban đầu cho MG hoặc đọc từ collection 'configs')
  getConfig: async () => {
    const DEFAULT_CONFIG = {
      carModels: ['CYBERSTER', 'G50', 'HS', 'MG4', 'MG5', 'MG7', 'NEW MG5', 'RX5', 'ZS'],
      channels: ['Showroom', 'Facebook', 'Zalo', 'Hotline', 'Website', 'Giới thiệu'],
      sources: ['MKT', 'Tự kiếm', 'Phân bổ', 'Trực showroom'],
      statusList: ['Mới', 'Đang liên hệ', 'Đang chăm sóc', 'Lái thử', 'Ký hợp đồng', 'Đã giao xe', 'Tạm ngưng']
    };
    try {
      const q = collection(db, 'configs');
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { status: 'success', data: { ...DEFAULT_CONFIG, ...snap.docs[0].data() } };
      }
    } catch (e) {
      console.warn("Không có quyền đọc Firestore configs, sử dụng cấu hình mặc định.");
    }
    return { status: 'success', data: DEFAULT_CONFIG };
  },

  // Lấy danh sách khách hàng
  getCustomers: async (startDate, endDate, search = '') => {
    try {
      const rawUser = authService.getCurrentUser();
      if (!rawUser) return { status: 'success', data: [] };

      const role = String(rawUser.role || '').toLowerCase();
      const userDept = String(rawUser.department || '').trim();

      const isManager = role.includes('manager') || role.includes('admin') || role.includes('giám đốc') || role.includes('quản lý');
      const isTPKD = role.includes('trưởng phòng') || role.includes('tpkd');

      // Do Firestore truy vấn khoảng ngày phức tạp khi lưu chuỗi dd/mm/yyyy,
      // ta tải dữ liệu trong khoảng thời gian hoặc lọc ở client-side để trơn tru và chính xác nhất
      const customersRef = collection(db, 'customers');
      let q = query(customersRef, orderBy('createdAt', 'desc'));
      
      const snap = await getDocs(q);
      let list = [];
      
      const start = new Date(startDate || new Date());
      start.setHours(0,0,0,0);
      const end = new Date(endDate || new Date());
      end.setHours(23,59,59,999);

      snap.forEach((docSnap) => {
        const data = docSnap.data();
        
        // Parse date
        let rowDate = new Date(0);
        if (data.createdAt) {
          rowDate = new Date(data.createdAt);
        } else if (data.date && typeof data.date === 'string' && data.date.includes('/')) {
          const parts = data.date.split('/');
          if (parts.length === 3) rowDate = new Date(parts[2], parts[1] - 1, parts[0]);
        }
        
        if (rowDate < start || rowDate > end) return;

        // Phân quyền
        if (isManager) {
          // Xem hết
        } else if (isTPKD) {
          if (!userDept || userDept !== String(data.department || '').trim()) return;
        } else {
          if (String(data.saleName || '').trim().toLowerCase() !== String(rawUser.name || '').trim().toLowerCase()) return;
        }

        list.push({
          id: docSnap.id,
          key: docSnap.id,
          ...data
        });
      });

      // Tìm kiếm ở client-side
      if (search) {
        const term = String(search).toLowerCase();
        list = list.filter(r =>
          String(r.customerName || '').toLowerCase().includes(term) ||
          String(r.phone || '').includes(term) ||
          String(r.leadRating || '').toLowerCase().includes(term) ||
          String(r.saleName || '').toLowerCase().includes(term)
        );
      }

      return { status: 'success', data: list };
    } catch (error) {
      console.error("Lỗi lấy danh sách khách hàng:", error);
      return { status: 'error', message: 'Lỗi truy vấn cơ sở dữ liệu' };
    }
  },

  // Thêm khách hàng
  addCustomers: async (customersList) => {
    try {
      const user = authService.getCurrentUser();
      const batch = writeBatch(db);
      
      customersList.forEach(c => {
        const docRef = doc(collection(db, 'customers'));
        const nowStr = getNowString();
        
        let tdVal = c.testDrive || 'Chưa';
        
        const customerData = {
          date: nowStr,
          createdAt: new Date().toISOString(),
          saleName: user.name,
          creatorName: user.name,
          department: user.department || '',
          lastUpdated: nowStr,
          customerName: c.customerName || '',
          phone: String(c.phone || ''),
          ward: c.ward || '',
          province: c.province || '',
          carModel: c.carModel || '',
          version: c.version || '',
          carColor: c.carColor || '',
          source: c.source || '',
          channel: c.channel || '',
          status: 'Mới',
          leadRating: c.leadRating || c['LEAD RATING'] || '-',
          testDrive: tdVal,
          saleNote: c.saleNote ? `[${user.name}]: ${c.saleNote}` : '',
          tpkdNote: '',
          mNote: ''
        };
        batch.set(docRef, customerData);
      });

      await batch.commit();
      return { status: 'success' };
    } catch (e) {
      console.error("Lỗi thêm khách hàng:", e);
      return { status: 'error', message: e.message };
    }
  },

  // API Phân khách
  getStaffList: async () => {
    try {
      const usersRef = collection(db, 'users');
      const snap = await getDocs(usersRef);
      const list = [];
      snap.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      if (list.length > 0) return { status: 'success', data: list };
    } catch (e) {
      console.warn("Không có quyền đọc danh sách users từ Firestore.");
    }
    const curUser = authService.getCurrentUser();
    const fallbackList = curUser ? [{ id: curUser.id || 'me', name: curUser.name || 'Bản thân', department: curUser.department || '' }] : [];
    return { status: 'success', data: fallbackList };
  },

  createAssignedCustomer: async (customersList) => {
    try {
      const user = authService.getCurrentUser();
      const batch = writeBatch(db);
      
      customersList.forEach(c => {
        const { isNew, isSyncing, tempId, key, ...rest } = c;
        const docRef = doc(collection(db, 'assigned_customers'));
        batch.set(docRef, {
          ...rest,
          assignedBy: user.name,
          assignedAt: new Date().toISOString(),
          status: 'Chờ duyệt'
        });
      });

      await batch.commit();
      return { status: 'success' };
    } catch (e) {
      return { status: 'error', message: e.message };
    }
  },

  getAssignedCustomers: async () => {
    try {
      const user = authService.getCurrentUser();
      const q = collection(db, 'assigned_customers');
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(docSnap => {
        list.push({ id: docSnap.id, key: docSnap.id, ...docSnap.data() });
      });
      return { status: 'success', data: list };
    } catch (e) {
      return { status: 'error', data: [] };
    }
  },

  acceptCustomer: async (phone) => {
    try {
      const user = authService.getCurrentUser();
      const q = query(collection(db, 'assigned_customers'), where('phone', '==', String(phone)));
      const snap = await getDocs(q);
      
      if (snap.empty) return { status: 'error', message: 'Không tìm thấy thông tin phân khách' };
      
      const batch = writeBatch(db);
      snap.forEach(docSnap => {
        // Cập nhật trạng thái duyệt phân khách
        batch.update(docSnap.ref, { status: 'Đã nhận', acceptedAt: new Date().toISOString() });
        
        // Tạo một khách hàng chính thức trong Firestore 'customers'
        const cData = docSnap.data();
        const nowStr = getNowString();
        const newCustRef = doc(collection(db, 'customers'));
        batch.set(newCustRef, {
          date: nowStr,
          createdAt: new Date().toISOString(),
          saleName: user.name,
          creatorName: cData.assignedBy || 'Admin',
          department: user.department || '',
          lastUpdated: nowStr,
          customerName: cData.customerName || '',
          phone: String(cData.phone || ''),
          ward: cData.ward || '',
          province: cData.province || '',
          carModel: cData.carModel || '',
          version: cData.version || '',
          carColor: cData.carColor || '',
          source: cData.source || 'Phân bổ',
          channel: cData.channel || 'Showroom',
          status: 'Mới',
          leadRating: cData.leadRating || '-',
          testDrive: cData.testDrive || 'Chưa',
          saleNote: cData.saleNote ? `[Phân bổ]: ${cData.saleNote}` : '',
          tpkdNote: '',
          mNote: ''
        });
      });

      await batch.commit();
      return { status: 'success' };
    } catch (e) {
      return { status: 'error', message: e.message };
    }
  },

  deleteAssignedCustomer: async (phone) => {
    try {
      const q = query(collection(db, 'assigned_customers'), where('phone', '==', String(phone)));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
      return { status: 'success' };
    } catch (e) {
      return { status: 'error', message: e.message };
    }
  },

  deleteCustomer: async (phone) => {
    try {
      const batch = writeBatch(db);
      
      // 1. Delete from customers
      const qCust = query(collection(db, 'customers'), where('phone', '==', String(phone)));
      const snapCust = await getDocs(qCust);
      snapCust.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });
      
      // 2. Delete from assigned_customers
      const qAssigned = query(collection(db, 'assigned_customers'), where('phone', '==', String(phone)));
      const snapAssigned = await getDocs(qAssigned);
      snapAssigned.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });
      
      await batch.commit();
      return { status: 'success' };
    } catch (e) {
      return { status: 'error', message: e.message };
    }
  },

  // Cập nhật khách hàng
  updateCustomer: async (customerData) => {
    try {
      const user = authService.getCurrentUser();
      const payload = { ...customerData };
      const customerId = payload.id || payload.key;

      delete payload.id;
      delete payload.key;
      delete payload.isNew;
      delete payload.isSyncing;
      delete payload.tempId;
      delete payload.isLoading;
      delete payload.originalPhone;
      delete payload.originalCustomerName;

      const nowStr = getNowString();
      payload.lastUpdated = nowStr;

      if (payload.newNote && String(payload.newNote).trim()) {
        const timeLog = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + nowStr.substring(0, 5);
        const role = String(user.role).toLowerCase();
        const entry = `[${user.name} - ${timeLog}]: ${payload.newNote}`;

        if (role.includes('admin') || role.includes('giám đốc')) {
          payload.mNote = payload.mNote ? `${entry}\n${payload.mNote}` : entry;
        } else if (role.includes('tpkd')) {
          payload.tpkdNote = payload.tpkdNote ? `${entry}\n${payload.tpkdNote}` : entry;
        } else {
          payload.saleNote = payload.saleNote ? `${entry}\n${payload.saleNote}` : entry;
        }
        delete payload.newNote;
      }

      if (customerId) {
        const docRef = doc(db, 'customers', customerId);
        await updateDoc(docRef, payload);
        return { status: 'success', message: 'Cập nhật thành công!' };
      } else {
        // Fallback matching by phone
        const q = query(collection(db, 'customers'), where('phone', '==', String(customerData.phone)));
        const snap = await getDocs(q);
        if (snap.empty) return { status: 'error', message: 'Không tìm thấy khách hàng' };
        
        await updateDoc(snap.docs[0].ref, payload);
        return { status: 'success', message: 'Cập nhật thành công!' };
      }
    } catch (e) {
      console.error("Lỗi cập nhật khách hàng:", e);
      return { status: 'error', message: e.message };
    }
  },

  // Đồng bộ dữ liệu khách hàng sang Google Sheet Báo cáo Lead
  syncLeadReport: async (customers, targetMonth, targetYear) => {
    try {
      const API_URL = (await import('../../api/constants.js')).API_URL;
      
      // Lọc bỏ số điện thoại rác (0, 00000...) và khách hàng không có tên xe
      const validCustomers = customers.filter(c => {
        const car = String(c.carModel || '').trim();
        if (!car || car === '-' || car === 'null' || car === 'undefined') return false;
        
        const phone = String(c.phone || '').replace(/\D/g, '').trim();
        if (!phone || /^0+$/.test(phone) || phone.length < 8) return false;
        
        return true;
      });

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'syncLeadReport',
          customers: validCustomers.map(c => ({
            customerName: c.customerName || '',
            phone: c.phone || '',
            carModel: c.carModel || '',
            date: c.date || '',
            createdAt: c.createdAt || ''
          })),
          targetMonth,
          targetYear,
          sheetId: '1x-j-IZsDNevlApwRN4HECVxtA7TryFFUH-7glH1stRU'
        })
      });
      const result = await response.json();
      return result;
    } catch (e) {
      console.error("Lỗi đồng bộ Lead Report:", e);
      return { status: 'error', message: e.message };
    }
  }
};