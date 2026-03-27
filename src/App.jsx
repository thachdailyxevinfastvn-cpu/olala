import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { authService } from './features/auth/authService';
import { DataProvider } from './context/DataProvider'; // Import Provider mới

import MainLayout from './components/layout/MainLayout';
import LoginScreen from './features/auth/LoginScreen';
import ForgotPasswordScreen from './features/auth/ForgotPasswordScreen';
import ResetPasswordScreen from './features/auth/ResetPasswordScreen';
import CustomerList from './features/customers/CustomerList';
import AssignCustomerPage from './features/customers/AssignCustomerPage';
import ReportList from './features/reports/ReportList';

const ProtectedRoute = ({ children }) => {
  const user = authService.getCurrentUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const NonAdminOnly = ({ children }) => {
  const user = authService.getCurrentUser();
  const roleStr = (user?.role || '').toLowerCase();
  const isAdmin = roleStr.includes('admin');

  if (isAdmin) {
    return <Navigate to="/reports" replace />;
  }
  return children;
};

const IndexRedirect = () => {
  const user = authService.getCurrentUser();
  const roleStr = (user?.role || '').toLowerCase();
  const isAdmin = roleStr.includes('admin');
  return isAdmin ? <Navigate to="/reports" replace /> : <Navigate to="/dashboard" replace />;
};

// Dashboard tạm thời
const Dashboard = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
    <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
      <h3 className="text-gray-500">Tổng Khách hàng</h3>
      <p className="text-3xl font-bold mt-2">--</p>
    </div>
    <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
      <h3 className="text-gray-500">Doanh số tháng</h3>
      <p className="text-3xl font-bold mt-2">--</p>
    </div>
    <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
      <h3 className="text-gray-500">Báo cáo chờ duyệt</h3>
      <p className="text-3xl font-bold mt-2">--</p>
    </div>
  </div>
);

function App() {
  const [user, setUser] = useState(authService.getCurrentUser());

  useEffect(() => {
    const handleStorageChange = () => {
      setUser(authService.getCurrentUser());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <DataProvider> {/* BỌC PROVIDER Ở ĐÂY */}
      <Router>
        <Toaster position="top-center" />
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
          <Route path="/reset-password" element={<ResetPasswordScreen />} />

          <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<IndexRedirect />} />
            <Route path="dashboard" element={<NonAdminOnly><Dashboard /></NonAdminOnly>} />

            <Route path="customers" element={<NonAdminOnly><CustomerList /></NonAdminOnly>} />
            <Route path="assign-customers" element={<NonAdminOnly><AssignCustomerPage /></NonAdminOnly>} />
            <Route path="reports" element={<ReportList />} />

            <Route path="orders" element={<NonAdminOnly><div className="p-10 text-gray-500">Đơn hàng (Đang phát triển)</div></NonAdminOnly>} />
            <Route path="settings" element={<NonAdminOnly><div className="p-10 text-gray-500">Cài đặt (Đang phát triển)</div></NonAdminOnly>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </DataProvider>
  );
}

export default App;