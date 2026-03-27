import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { customerService } from '../features/customers/customerService';
import { reportService } from '../features/reports/reportService';
import toast from 'react-hot-toast';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const [customers, setCustomers] = useState([]);
  const [reports, setReports] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [config, setConfig] = useState({ sources: [], carModels: [], locations: [] });

  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);

  const [isCustomersLoaded, setIsCustomersLoaded] = useState(false);
  const [isReportsLoaded, setIsReportsLoaded] = useState(false);

  // --- FETCH KHÁCH HÀNG ---
  const fetchCustomers = useCallback(async (force = false, startDate, endDate) => {
    if (isCustomersLoaded && !force) return;

    if (!isCustomersLoaded) setLoadingCustomers(true);

    try {
      const [resConfig, resCust] = await Promise.all([
        customerService.getConfig(),
        customerService.getCustomers(startDate, endDate)
      ]);

      if (resConfig?.status === 'success') setConfig(resConfig.data);
      if (resCust?.status === 'success') {
        const validCustomers = Array.isArray(resCust.data) ? resCust.data : [];
        console.log(`🚀 [Data] Loaded ${validCustomers.length} customers`);
        setCustomers(validCustomers);
        setIsCustomersLoaded(true);
      }
    } catch (error) {
      console.error("Lỗi tải khách hàng:", error);
    } finally {
      setLoadingCustomers(false);
    }
  }, [isCustomersLoaded]);

  // --- FETCH BÁO CÁO ---
  const fetchReports = useCallback(async (force = false) => {
    if (isReportsLoaded && !force) return;

    if (!isReportsLoaded) setLoadingReports(true);
    try {
      const [resStaff, resRep] = await Promise.all([
        reportService.getStaffList(),
        reportService.getReports()
      ]);

      if (resStaff?.status === 'success') setStaffList(resStaff.data || []);
      if (resRep?.status === 'success') {
        setReports(resRep.data || []);
        setIsReportsLoaded(true);
      }
    } catch (error) {
      console.error("Lỗi tải báo cáo:", error);
    } finally {
      setLoadingReports(false);
    }
  }, [isReportsLoaded]);

  // --- FETCH ASSIGNED CUSTOMERS ---
  const [assignedCustomers, setAssignedCustomers] = useState([]);
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [isAssignedLoaded, setIsAssignedLoaded] = useState(false);

  const fetchAssignedCustomers = useCallback(async (force = false) => {
    if (isAssignedLoaded && !force) return;

    setLoadingAssigned(true); // Luôn set loading để UI biết đang làm gì
    try {
      const res = await customerService.getAssignedCustomers();
      if (res?.status === 'success') {
        setAssignedCustomers(res.data || []);
        setIsAssignedLoaded(true);
      }
    } catch (error) {
      console.error("Lỗi tải khách phân:", error);
    } finally {
      setLoadingAssigned(false);
    }
  }, [isAssignedLoaded]);

  // --- THÊM KHÁCH HÀNG (CHIẾN THUẬT: IM LẶNG & LÀM MỚI) ---
  const addCustomerSilent = async (newCustomerData, startDate, endDate) => {
    try {
      // 1. Gửi API trước
      const res = await customerService.addCustomers([newCustomerData]);

      if (res.status === 'success') {
        // 2. Thành công -> Gọi fetchCustomers(true) ngay lập tức
        // Việc này sẽ load lại dữ liệu từ Server (bao gồm Key, Ngày tạo chuẩn)
        await fetchCustomers(true, startDate, endDate);
        return { success: true };
      } else {
        throw new Error(res.message || "Lỗi Server");
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  // --- CẬP NHẬT KHÁCH HÀNG (OPTIMISTIC UI - SO SÁNH CHUỖI) ---
  const updateCustomerOptimistic = async (updatedData) => {
    // 1. Backup state cũ
    const previousCustomers = [...customers];

    // 2. Cập nhật UI ngay lập tức
    // CHÚ Ý: So sánh dưới dạng String để "abc" == "abc"
    setCustomers(prev => prev.map(c =>
      String(c.phone) === String(updatedData.originalPhone || updatedData.phone)
        ? { ...c, ...updatedData, newNote: '' }
        : c
    ));

    try {
      // 3. Gọi API thật
      const res = await customerService.updateCustomer(updatedData);
      if (res.status !== 'success') {
        throw new Error(res.message);
      }
    } catch (error) {
      // 4. Nếu lỗi -> Revert lại UI cũ
      setCustomers(previousCustomers);
      toast.error("Cập nhật thất bại: " + error.message);
    }
  };

  // --- LƯU BÁO CÁO ---
  const saveReportOptimistic = async (newReports, overwrite = false) => {
    const previousReports = [...reports];
    setReports(prev => [...newReports, ...prev]);

    try {
      const res = await reportService.addBatchReports(newReports, overwrite);
      if (res.status !== 'success') throw new Error(res.message);
    } catch (error) {
      setReports(previousReports);
      toast.error("Lỗi lưu báo cáo!");
    }
  };

  const value = {
    customers, loadingCustomers, fetchCustomers,
    addCustomerSilent, updateCustomerOptimistic,
    config,
    reports, staffList, loadingReports, fetchReports, saveReportOptimistic,
    assignedCustomers, loadingAssigned, fetchAssignedCustomers
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};