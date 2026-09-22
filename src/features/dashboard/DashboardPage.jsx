import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataProvider';
import { authService } from '../auth/authService';
import { customerService } from '../customers/customerService';
import { Link } from 'react-router-dom';
import { Users, FileText, BarChart3, UserPlus, Calendar, ArrowUpRight, TrendingUp, Clock, Sparkles, Filter, RefreshCw, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { customers, fetchCustomers, loadingCustomers, reports, fetchReports, staffList } = useData();
  const user = authService.getCurrentUser();
  const displayName = user?.name || user?.username || 'User';

  // --- BỘ LỌC THỜI GIAN ---
  const [timeFilter, setTimeFilter] = useState('month'); // 'today' | 'week' | 'month' | 'last_month' | 'all' | 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    fetchCustomers();
    fetchReports();
  }, []);

  // Tính toán mốc thời gian lọc
  const dateBounds = useMemo(() => {
    const now = new Date();
    let start = null;
    let end = null;

    if (timeFilter === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (timeFilter === 'week') {
      const day = now.getDay() || 7;
      start = new Date(now);
      start.setDate(now.getDate() - day + 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (timeFilter === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (timeFilter === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (timeFilter === 'custom') {
      if (customStart) {
        start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
      }
      if (customEnd) {
        end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
      }
    }

    return { start, end };
  }, [timeFilter, customStart, customEnd]);

  // Lọc Báo cáo theo thời gian
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const rawDate = r.date || r.reportDate || r.createdAt;
      if (!rawDate) return true;
      const d = rawDate?.toDate ? rawDate.toDate() : new Date(rawDate);
      if (isNaN(d.getTime())) return true;
      if (dateBounds.start && d < dateBounds.start) return false;
      if (dateBounds.end && d > dateBounds.end) return false;
      return true;
    });
  }, [reports, dateBounds]);

  // Lọc Khách hàng theo thời gian
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const rawDate = c.createdAt || c.date;
      if (!rawDate) return true;
      let d;
      if (rawDate?.toDate) {
        d = rawDate.toDate();
      } else if (typeof rawDate === 'string' && rawDate.includes('/')) {
        const parts = rawDate.split('/');
        if (parts.length === 3) d = new Date(parts[2], parts[1] - 1, parts[0]);
        else d = new Date(rawDate);
      } else {
        d = new Date(rawDate);
      }
      if (isNaN(d.getTime())) return true;
      if (dateBounds.start && d < dateBounds.start) return false;
      if (dateBounds.end && d > dateBounds.end) return false;
      return true;
    });
  }, [customers, dateBounds]);

  // Group reports by staff member with name normalization
  const normalizeName = (n) => {
    if (!n) return '';
    return String(n)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .trim();
  };

  const staffStats = {};

  // Pre-populate active staff
  staffList.forEach(s => {
    if (s.active !== false) {
      staffStats[normalizeName(s.name)] = {
        name: s.name,
        totalVideos: 0,
        totalLives: 0,
        totalMinutes: 0,
        totalViews: 0,
        avgViewMin: 0
      };
    }
  });

  // Accumulate metrics from filteredReports
  filteredReports.forEach(r => {
    const rawName = r.staffName;
    if (!rawName) return;
    const key = normalizeName(rawName);

    if (!staffStats[key]) {
      staffStats[key] = {
        name: rawName,
        totalVideos: 0,
        totalLives: 0,
        totalMinutes: 0,
        totalViews: 0,
        avgViewMin: 0
      };
    }

    const s = staffStats[key];
    if (String(r.type) === 'Video') {
      s.totalVideos += 1;
    } else {
      s.totalLives += 1;
      s.totalMinutes += Number(r.metric1 || 0);
      s.totalViews += Number(r.metric2 || 0);
    }
  });

  // Calculate views per minute average
  Object.values(staffStats).forEach(s => {
    s.avgViewMin = s.totalMinutes > 0 ? Math.round(s.totalViews / s.totalMinutes) : 0;
  });

  const staffStatsList = Object.values(staffStats);

  // Helper to find the top user
  const getTopUser = (key, formatFn) => {
    const sorted = [...staffStatsList].sort((a, b) => b[key] - a[key]);
    const top = sorted[0];
    if (!top || top[key] === 0) return { name: 'Chưa ghi nhận', value: formatFn ? formatFn(0) : '0' };
    return { name: top.name, value: formatFn ? formatFn(top[key]) : String(top[key]) };
  };

  // Stats calculations based on current filter
  const totalCustomers = customers.length;
  const filteredCustomersCount = filteredCustomers.length;
  const filteredReportsCount = filteredReports.length;
  const activeStaff = staffList.filter(s => s.active !== false).length;

  const topVideo = getTopUser('totalVideos', (v) => `${v} video`);
  const topLives = getTopUser('totalLives', (l) => `${l} phiên`);
  const topHours = getTopUser('totalMinutes', (m) => `${(m / 60).toFixed(1)} giờ (${m} phút)`);
  const topViewsPerMin = getTopUser('avgViewMin', (v) => `${v} views/phút`);

  const filterLabelMap = {
    today: 'Hôm nay',
    week: 'Tuần này',
    month: 'Tháng này',
    last_month: 'Tháng trước',
    all: 'Tất cả',
    custom: 'Tùy chọn'
  };

  const stats = [
    { label: `Khách trong kỳ (${filterLabelMap[timeFilter]})`, value: filteredCustomersCount, icon: <Users size={20} />, color: 'from-blue-500 to-blue-600', shadowColor: 'shadow-blue-500/20', trend: null },
    { label: 'Tổng Khách hệ thống', value: totalCustomers, icon: <UserPlus size={20} />, color: 'from-emerald-500 to-teal-600', shadowColor: 'shadow-emerald-500/20', trend: null },
    { label: `Báo cáo (${filterLabelMap[timeFilter]})`, value: filteredReportsCount, icon: <BarChart3 size={20} />, color: 'from-amber-400 to-orange-500', shadowColor: 'shadow-amber-500/20', trend: null },
    { label: 'Nhân viên hoạt động', value: activeStaff, icon: <Sparkles size={20} />, color: 'from-purple-500 to-violet-600', shadowColor: 'shadow-purple-500/20', trend: null },
  ];

  const quickLinks = [
    { label: 'Thêm khách', path: '/customers', icon: <UserPlus size={16} /> },
    { label: 'Xem báo cáo', path: '/reports', icon: <BarChart3 size={16} /> },
    { label: 'Phân khách', path: '/assign-customers', icon: <Users size={16} /> },
    { label: 'Lịch trực', path: '/calendar', icon: <Calendar size={16} /> },
  ];

  const now = new Date();

  // --- ĐỒNG BỘ LEAD REPORT ---
  const [syncing, setSyncing] = useState(false);

  const handleSyncLeadReport = async () => {
    if (syncing) return;
    setSyncing(true);
    const toastId = toast.loading('Đang đồng bộ Báo cáo Lead...');
    try {
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const result = await customerService.syncLeadReport(customers, currentMonth, currentYear);
      if (result.status === 'success') {
        toast.success(`✅ Đã đồng bộ ${result.totalCustomers || 0} khách hàng tháng ${currentMonth}/${currentYear}!`, { id: toastId, duration: 5000 });
      } else {
        toast.error(`❌ Lỗi: ${result.message || 'Không rõ'}`, { id: toastId, duration: 5000 });
      }
    } catch (err) {
      toast.error(`❌ Lỗi kết nối: ${err.message}`, { id: toastId, duration: 5000 });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* WELCOME BANNER */}
      <div className="aurora-bg rounded-2xl p-6 md:p-8 bg-gradient-to-br from-amber-50 via-orange-50 to-emerald-50 border border-amber-100/50">
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Chào mừng trở lại, <span className="text-amber-600">{displayName}</span>
              </h1>
              <p className="text-gray-500 mt-1 text-sm">
                Tổng quan hệ thống CRM MG Bình Dương • {now.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="inline-flex items-center gap-1.5 bg-white/80 hover:bg-white text-gray-700 hover:text-gray-900 px-3.5 py-2 rounded-full text-xs font-semibold shadow-sm border border-gray-200/60 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
              {/* NÚT ĐỒNG BỘ LEAD REPORT */}
              <button
                onClick={handleSyncLeadReport}
                disabled={syncing || loadingCustomers}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold shadow-sm border transition-all duration-200 hover:-translate-y-0.5 ${
                  syncing
                    ? 'bg-amber-100 text-amber-600 border-amber-200 cursor-wait'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-400 hover:shadow-md'
                }`}
              >
                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Đang đồng bộ...' : 'Đồng bộ BC Lead'}
              </button>
              <a
                href="https://docs.google.com/spreadsheets/d/1x-j-IZsDNevlApwRN4HECVxtA7TryFFUH-7glH1stRU/edit"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-white/80 hover:bg-white text-gray-700 hover:text-gray-900 px-3.5 py-2 rounded-full text-xs font-semibold shadow-sm border border-gray-200/60 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
              >
                <ExternalLink size={14} />
                Mở Sheet BC
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* TIME FILTER BAR */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-amber-500" />
          <span className="text-sm font-bold text-gray-800">Bộ lọc thời gian Dashboard:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: 'today', label: 'Hôm nay' },
            { key: 'week', label: 'Tuần này' },
            { key: 'month', label: 'Tháng này' },
            { key: 'last_month', label: 'Tháng trước' },
            { key: 'all', label: 'Tất cả' },
            { key: 'custom', label: 'Tùy chọn' },
          ].map(btn => (
            <button
              key={btn.key}
              onClick={() => setTimeFilter(btn.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                timeFilter === btn.key
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              {btn.label}
            </button>
          ))}

          {timeFilter === 'custom' && (
            <div className="flex items-center gap-2 mt-2 sm:mt-0 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="bg-white border rounded-lg text-xs px-2 py-1 outline-none text-gray-700 font-medium"
              />
              <span className="text-xs text-gray-400 font-bold">-</span>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="bg-white border rounded-lg text-xs px-2 py-1 outline-none text-gray-700 font-medium"
              />
            </div>
          )}
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} ${stat.shadowColor} shadow-lg flex items-center justify-center text-white`}>
                {stat.icon}
              </div>
              {stat.trend && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <TrendingUp size={10} />
                  {stat.trend}
                </span>
              )}
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 leading-none">
              {loadingCustomers ? <div className="h-8 w-16 bg-gray-100 rounded-lg animate-pulse" /> : stat.value.toLocaleString()}
            </div>
            <p className="text-xs text-gray-400 font-medium mt-1.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* BOTTOM SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEADERBOARD / HOẠT ĐỘNG THI ĐUA */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 bg-gradient-to-r from-amber-500/5 to-orange-500/5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <Sparkles size={16} className="text-amber-500 animate-spin" style={{ animationDuration: '3s' }} />
                Bảng Vàng Thi Đua Lập Kỷ Lục ({filterLabelMap[timeFilter]})
              </h3>
            </div>
            <Link to="/reports" className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-colors">
              Chi tiết thi đua <ArrowUpRight size={12} />
            </Link>
          </div>

          <div className="p-5 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50/30">
            {/* CARD 1: NHIỀU VIDEO NHẤT */}
            <div className="relative overflow-hidden bg-gradient-to-br from-white to-stone-50/50 p-4 rounded-xl border border-stone-200/50 shadow-sm hover:shadow-md transition-all duration-300 group hover:-translate-y-0.5">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-500" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center border border-red-100 shadow-sm shrink-0">
                  <span className="text-xl">🏆</span>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest block">CHIẾN THẦN VIDEO</span>
                  <h4 className="text-sm font-black text-stone-800 truncate mt-0.5">{topVideo.name}</h4>
                  <p className="text-xs text-stone-500 font-bold mt-0.5">{topVideo.value}</p>
                </div>
              </div>
            </div>

            {/* CARD 2: NHIỀU PHIÊN LIVE NHẤT */}
            <div className="relative overflow-hidden bg-gradient-to-br from-white to-stone-50/50 p-4 rounded-xl border border-stone-200/50 shadow-sm hover:shadow-md transition-all duration-300 group hover:-translate-y-0.5">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-500" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100 shadow-sm shrink-0">
                  <span className="text-xl">🔥</span>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest block">CHĂM CHỈ LIVESTREAM</span>
                  <h4 className="text-sm font-black text-stone-800 truncate mt-0.5">{topLives.name}</h4>
                  <p className="text-xs text-stone-500 font-bold mt-0.5">{topLives.value}</p>
                </div>
              </div>
            </div>

            {/* CARD 3: LIVE NHIỀU GIỜ NHẤT */}
            <div className="relative overflow-hidden bg-gradient-to-br from-white to-stone-50/50 p-4 rounded-xl border border-stone-200/50 shadow-sm hover:shadow-md transition-all duration-300 group hover:-translate-y-0.5">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-500" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center border border-purple-100 shadow-sm shrink-0">
                  <span className="text-xl">⏱️</span>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest block">CHIẾN BINH BỀN BỈ</span>
                  <h4 className="text-sm font-black text-stone-800 truncate mt-0.5">{topHours.name}</h4>
                  <p className="text-xs text-stone-500 font-bold mt-0.5">{topHours.value}</p>
                </div>
              </div>
            </div>

            {/* CARD 4: LƯỢT XEM / PHÚT NHIỀU NHẤT */}
            <div className="relative overflow-hidden bg-gradient-to-br from-white to-stone-50/50 p-4 rounded-xl border border-stone-200/50 shadow-sm hover:shadow-md transition-all duration-300 group hover:-translate-y-0.5">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-500" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm shrink-0">
                  <span className="text-xl">⚡</span>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest block">HẤP DẪN KHÁN GIẢ</span>
                  <h4 className="text-sm font-black text-stone-800 truncate mt-0.5">{topViewsPerMin.name}</h4>
                  <p className="text-xs text-stone-500 font-bold mt-0.5">{topViewsPerMin.value}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* QUICK ACCESS PANEL */}
        <div className="space-y-4">
          {/* Quick navigation cards */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Truy cập nhanh</h3>
            <div className="space-y-2">
              {[
                { label: 'Quản lý khách hàng', desc: 'Thêm, sửa, xem khách hàng', path: '/customers', icon: <Users size={18} />, color: 'text-blue-500 bg-blue-50' },
                { label: 'Báo cáo công việc', desc: 'Xem & nộp báo cáo hàng ngày', path: '/reports', icon: <FileText size={18} />, color: 'text-emerald-500 bg-emerald-50' },
                { label: 'Phân khách hàng', desc: 'Phân bổ khách cho nhân viên', path: '/assign-customers', icon: <UserPlus size={18} />, color: 'text-amber-500 bg-amber-50' },
                { label: 'Lịch trực showroom', desc: 'Xem & đăng ký lịch trực', path: '/calendar', icon: <Calendar size={18} />, color: 'text-purple-500 bg-purple-50' },
              ].map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 group"
                >
                  <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center shrink-0`}>
                    {item.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-gray-900">{item.label}</p>
                    <p className="text-[11px] text-gray-400">{item.desc}</p>
                  </div>
                  <ArrowUpRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </div>

          {/* System info */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white">
            <h3 className="text-sm font-bold mb-2 text-white/90">MG Bình Dương CRM</h3>
            <p className="text-xs text-white/40 leading-relaxed">
              Hệ thống quản lý khách hàng toàn diện. 
              Phiên bản 2026.
            </p>
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-white/50 font-medium">Hệ thống hoạt động bình thường</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
