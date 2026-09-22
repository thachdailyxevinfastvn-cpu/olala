import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { authService } from './features/auth/authService';
import { DataProvider } from './context/DataProvider';

import MainLayout from './components/layout/MainLayout';
import LoginScreen from './features/auth/LoginScreen';
import ForgotPasswordScreen from './features/auth/ForgotPasswordScreen';
import ResetPasswordScreen from './features/auth/ResetPasswordScreen';
import DashboardPage from './features/dashboard/DashboardPage';
import CustomerList from './features/customers/CustomerList';
import AssignCustomerPage from './features/customers/AssignCustomerPage';
import ReportList from './features/reports/ReportList';
import CalendarPage from './features/calendar/CalendarPage';
import StaffManagementPage from './features/staff/StaffManagementPage';

const ProtectedRoute = ({ children }) => {
  const user = authService.getCurrentUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const AdminRoute = ({ children }) => {
  const user = authService.getCurrentUser();
  const roleStr = (user?.role || '').toLowerCase();
  if (!user || !roleStr.includes('admin')) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const NonAdminOnly = ({ children }) => {
  return children;
};

const IndexRedirect = () => {
  return <Navigate to="/dashboard" replace />;
};

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
    <DataProvider>
      <Router>
        <Toaster position="top-center" />
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
          <Route path="/reset-password" element={<ResetPasswordScreen />} />

          <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<IndexRedirect />} />
            <Route path="dashboard" element={<NonAdminOnly><DashboardPage /></NonAdminOnly>} />

            <Route path="customers" element={<NonAdminOnly><CustomerList /></NonAdminOnly>} />
            <Route path="assign-customers" element={<NonAdminOnly><AssignCustomerPage /></NonAdminOnly>} />
            <Route path="calendar" element={<NonAdminOnly><CalendarPage /></NonAdminOnly>} />
            <Route path="reports" element={<ReportList />} />

            <Route path="orders" element={<NonAdminOnly><div className="p-10 text-gray-400 text-center">Đơn hàng (Đang phát triển)</div></NonAdminOnly>} />
            <Route path="settings" element={<AdminRoute><StaffManagementPage /></AdminRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </DataProvider>
  );
}

export default App;