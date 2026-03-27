import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useData } from '../../context/DataProvider';
import { reportService } from './reportService';
import { authService } from '../auth/authService';
import { Plus, Loader2, Image as ImageIcon, CheckCircle, Video, Eye, Calendar, X, Sparkles, AlertCircle, Trophy, ChevronDown, ChevronUp, User, LayoutList, Crown, ArrowLeft, AlertTriangle, Link as LinkIcon, Save, Zap, Gift, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const ReportList = () => {
    const { reports, staffList, loadingReports, fetchReports, saveReportOptimistic } = useData();

    // --- LOGIC NGÀY THÁNG ---
    const getMonthRange = () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        return { start: formatDate(start), end: formatDate(end) };
    };

    const monthRange = getMonthRange();

    const [startDate, setStartDate] = useState(monthRange.start);
    const [endDate, setEndDate] = useState(monthRange.end);
    const [sortConfig, setSortConfig] = useState({ key: 'totalViews', direction: 'desc' });
    const [expandedStaff, setExpandedStaff] = useState(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalTab, setModalTab] = useState('scan');
    const [viewImage, setViewImage] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [uploading, setUploading] = useState(false);

    // FIX LỖI NHẢY 3 DÒNG: Dùng Ref để khóa submit
    const isSubmittingRef = useRef(false);

    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [scannedGroups, setScannedGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);

    const [videoLink, setVideoLink] = useState('');
    const [linkDate, setLinkDate] = useState(new Date().toISOString().split('T')[0]);

    const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);
    const [platform, setPlatform] = useState('TikTok');

    // State lưu hành động chờ xác nhận ghi đè
    const [pendingAction, setPendingAction] = useState(null);

    useEffect(() => { fetchReports(false); }, []);

    const handleRefresh = async () => {
        const toastId = toast.loading("Đang đồng bộ báo cáo...");
        await fetchReports(true);
        toast.success("Đã tải xong!", { id: toastId });
    };

    const normalizeName = (name) => {
        if (!name) return "";
        return String(name).toLowerCase().trim().replace(/\s+/g, ' ');
    };

    // --- HÀM CHUẨN HÓA LINK ĐỂ CHECK TRÙNG NÂNG CAO ---
    const normalizeLink = (url) => {
        if (!url) return '';
        try {
            let cleanUrl = url.trim().toLowerCase();
            // 1. Loại bỏ protocol (http://, https://) và www.
            cleanUrl = cleanUrl.replace(/^(https?:\/\/)?(www\.)?/, '');
            // 2. Loại bỏ dấu / ở cuối cùng (để tiktok.com/video/1 và tiktok.com/video/1/ là một)
            if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);
            // 3. Loại bỏ query params (?...) nếu có (thường chứa tracking id rác)
            if (cleanUrl.includes('?')) {
                cleanUrl = cleanUrl.split('?')[0];
            }
            return cleanUrl;
        } catch (e) {
            return url.trim().toLowerCase();
        }
    };

    // --- TỰ ĐỘNG NHẬN DIỆN PLATFORM DỰA TRÊN TÊN MIỀN ---
    const detectPlatform = (link) => {
        if (!link) return 'TikTok';
        const l = link.toLowerCase();
        if (l.includes('youtube') || l.includes('youtu.be')) return 'YouTube Shorts';
        if (l.includes('facebook') || l.includes('fb.watch')) return 'Facebook Reels';
        if (l.includes('zalo')) return 'Zalo Video';
        return 'TikTok';
    };

    // --- XỬ LÝ KHI DÁN LINK: Tự động điền Platform ---
    const handleLinkChange = (e) => {
        const val = e.target.value;
        setVideoLink(val);
        if (val) {
            const detected = detectPlatform(val);
            setPlatform(detected); // Tự động cập nhật dropdown Platform
        }
    };

    // Dashboard calculations
    const dashboardData = useMemo(() => {
        const start = new Date(startDate); start.setHours(0, 0, 0, 0);
        const end = new Date(endDate); end.setHours(23, 59, 59, 999);

        const filteredReports = reports.filter(r => {
            const rDate = r.reportDate ? new Date(r.reportDate) : new Date(r.timestamp);
            return rDate >= start && rDate <= end;
        });

        const statsMap = {};

        staffList.forEach(s => {
            const key = normalizeName(s.name);
            statsMap[key] = {
                name: s.name,
                department: s.department || '',
                totalVideos: 0, totalLives: 0, totalMinutes: 0, totalViews: 0, reports: []
            };
        });

        filteredReports.forEach(r => {
            const rawName = r.staffName;
            if (!rawName) return;
            const key = normalizeName(rawName);
            if (!statsMap[key]) statsMap[key] = { name: rawName, department: 'Khác', totalVideos: 0, totalLives: 0, totalMinutes: 0, totalViews: 0, reports: [] };

            const metrics = statsMap[key];
            metrics.reports.push(r);

            if (String(r.type) === 'Video') {
                metrics.totalVideos += 1;
            } else {
                metrics.totalLives += 1;
                metrics.totalMinutes += Number(r.metric1 || 0);
                metrics.totalViews += Number(r.metric2 || 0);
            }
        });

        const finalData = Object.values(statsMap).map(s => ({
            ...s,
            avgViewMin: s.totalMinutes > 0 ? Math.round(s.totalViews / s.totalMinutes) : 0
        }));

        finalData.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return finalData;
    }, [reports, staffList, startDate, endDate, sortConfig]);

    const handleSort = (key) => {
        setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc' }));
    };

    const checkKPI = (min, view) => {
        const m = Number(min); const v = Number(view);
        if (m >= 30 && v >= 100) return { pass: true, msg: 'Đạt' };
        return { pass: false, msg: 'Không đạt' };
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file));
            setScannedGroups([]); setSelectedGroup(null);
            setAnalyzing(true);
            toast("AI đang phân tích...", { icon: '🤖' });
            try {
                const aiData = await reportService.analyzeImageWithAI(file);
                if (Array.isArray(aiData) && aiData.length > 0) {
                    const groups = aiData.map(grp => ({
                        date: grp.date,
                        sessions: (grp.sessions || []).map((s, idx) => {
                            const kpi = checkKPI(s.minutes, s.views);
                            return { id: idx, metric1: s.minutes, metric2: s.views, note: s.note || `Phiên ${idx + 1}`, selected: kpi.pass, kpi: kpi };
                        })
                    }));
                    setScannedGroups(groups);
                    if (groups.length === 1) setSelectedGroup(groups[0]);
                    toast.success(`Đã đọc xong: ${groups.length} ngày`);
                } else if (aiData && aiData.sessions) {
                    const group = {
                        date: aiData.reportDate || aiData.date,
                        sessions: aiData.sessions.map((s, idx) => {
                            const kpi = checkKPI(s.minutes, s.views);
                            return { id: idx, metric1: s.minutes, metric2: s.views, note: s.note || `Phiên ${idx + 1}`, selected: kpi.pass, kpi: kpi };
                        })
                    };
                    setScannedGroups([group]);
                    setSelectedGroup(group);
                    toast.success("Đã đọc xong dữ liệu!");
                } else {
                    toast.error("Không đọc được số liệu. Vui lòng thử lại!");
                }
            } catch (err) { console.error("UI Error:", err); toast.error("Lỗi xử lý ảnh."); } finally { setAnalyzing(false); }
        }
    };

    const handleSaveScan = () => {
        if (isSubmittingRef.current) return;
        if (!selectedGroup) return;
        const valid = selectedGroup.sessions.filter(s => s.selected);
        if (valid.length === 0) { toast.error("Chưa chọn phiên nào!"); return; }
        checkOverwrite(selectedGroup.date, submitScan);
    };

    // --- HÀM XỬ LÝ LƯU LINK VIDEO (ĐÃ CẢI TIẾN CHECK TRÙNG) ---
    const handleSaveLink = () => {
        if (isSubmittingRef.current) return;
        if (!videoLink) { toast.error("Vui lòng nhập link video!"); return; }

        // 1. Chuẩn hóa link nhập vào
        const inputLinkNorm = normalizeLink(videoLink);

        // 2. So sánh với các link đã có trong database
        const duplicate = reports.find(r =>
            String(r.type) === 'Video' &&
            r.note &&
            normalizeLink(r.note) === inputLinkNorm // So sánh chuỗi đã chuẩn hóa
        );

        if (duplicate) {
            const dateStr = duplicate.reportDate ? String(duplicate.reportDate).substring(0, 10) : '???';
            toast.error(
                <div>
                    <b>Link này đã tồn tại!</b><br />
                    Người nhập: {duplicate.staffName}<br />
                    Ngày: {dateStr}
                </div>,
                { duration: 5000, icon: '⚠️' }
            );
            return;
        }

        submitLink(false);
    };

    const checkOverwrite = (dateToCheck, submitFn) => {
        const user = authService.getCurrentUser() || { name: 'User' };
        const exists = reports.some(r => {
            const rDate = r.reportDate ? String(r.reportDate).substring(0, 10) : '';
            const rName = normalizeName(r.staffName);
            const uName = normalizeName(user.name);

            const isScanTab = modalTab === 'scan';
            const rType = String(r.type);

            return rDate === dateToCheck && rName === uName && r.platform === platform &&
                ((isScanTab && rType === 'Livestream') || (!isScanTab && rType === 'Video'));
        });

        if (exists) {
            setShowOverwriteWarning(true);
            setPendingAction(() => submitFn);
        } else {
            submitFn(false);
        }
    };

    // --- MỚI: HÀM XỬ LÝ NÚT BẤM GHI ĐÈ ---
    const handleConfirmOverwrite = () => {
        if (pendingAction) {
            setUploading(true); // 1. Khóa giao diện ngay (nút mờ đi)
            toast.loading("Đang xử lý ghi đè...", { id: 'overwrite-toast' }); // 2. Hiện thông báo loading
            pendingAction(true); // 3. Thực thi hành động
        }
    };

    const submitScan = async (overwrite) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setUploading(true);

        try {
            const img = await reportService.uploadImage(selectedFile);
            const user = authService.getCurrentUser() || { id: 'unknown', name: 'Nhân viên' };
            const list = selectedGroup.sessions.filter(s => s.selected).map(s => ({
                staffID: user.id || 'S001', staffName: user.name || user.username, reportDate: selectedGroup.date, type: 'Livestream', platform, metric1: s.metric1, metric2: s.metric2, status: 'Đã duyệt', imageUrl: img, note: s.note
            }));
            await finishSubmit(list, overwrite);
        } catch (e) {
            toast.error("Lỗi upload ảnh");
            setUploading(false);
            isSubmittingRef.current = false;
        }
    };

    const submitLink = async (overwrite) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setUploading(true);

        try {
            const user = authService.getCurrentUser() || { id: 'unknown', name: 'Nhân viên' };
            const list = [{
                staffID: user.id || 'S001', staffName: user.name || user.username, reportDate: linkDate, type: 'Video', platform, metric1: 0, metric2: 0, status: 'Đã duyệt', imageUrl: '', note: videoLink
            }];
            await finishSubmit(list, overwrite);
        } catch (e) {
            toast.error("Lỗi xử lý");
            setUploading(false);
            isSubmittingRef.current = false;
        }
    };

    const finishSubmit = async (list, overwrite) => {
        await saveReportOptimistic(list, overwrite);

        setUploading(false);
        setShowOverwriteWarning(false);
        setPendingAction(null);
        isSubmittingRef.current = false;

        // Xóa toast loading nếu có và báo thành công
        toast.dismiss('overwrite-toast');
        toast.success(overwrite ? "Đã ghi đè thành công!" : "Đã lưu thành công!");
        setIsModalOpen(false);

        setSelectedFile(null); setPreviewUrl(null); setScannedGroups([]); setSelectedGroup(null);
        setVideoLink(''); setLinkDate(new Date().toISOString().split('T')[0]);
    };

    const getRankStyle = (idx, hasData) => {
        if (!hasData) return 'bg-gray-50 opacity-80';
        if (idx === 0) return 'bg-gradient-to-r from-yellow-50 via-white to-yellow-50 border-yellow-400 shadow-lg shadow-yellow-200/50 scale-[1.02] z-10 ring-1 ring-yellow-200 animate-pulse-slow';
        if (idx === 1) return 'bg-gradient-to-r from-gray-50 via-white to-gray-50 border-gray-300 shadow-md scale-[1.005] z-0';
        if (idx === 2) return 'bg-gradient-to-r from-orange-50 via-white to-orange-50 border-orange-200 shadow-sm';
        return 'bg-white border-gray-200 shadow-sm hover:shadow-md';
    };
    const getRankIconStyle = (idx, hasData) => {
        if (!hasData) return 'bg-gray-300';
        if (idx === 0) return 'bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-yellow-300 ring-2 ring-yellow-100';
        if (idx === 1) return 'bg-gradient-to-br from-gray-300 to-gray-500 shadow-gray-300 ring-2 ring-gray-100';
        if (idx === 2) return 'bg-gradient-to-br from-orange-300 to-orange-500 shadow-orange-200 ring-2 ring-orange-100';
        return 'bg-gray-100 text-gray-500 font-bold';
    };

    return (
        <div className="h-[calc(100vh-80px)] flex flex-col bg-gray-50 relative overflow-hidden">

            {/* FLOATING BANNER */}
            <div className="fixed top-[85px] left-1/2 -translate-x-1/2 z-40 pointer-events-none w-full max-w-sm md:max-w-md">
                <div className="bg-red-600/90 text-white backdrop-blur-sm rounded-full py-1 px-4 shadow-lg border border-red-400/50 flex items-center justify-center gap-2 animate-in slide-in-from-top-2 duration-700">
                    <Gift className="text-yellow-300 fill-yellow-300 animate-bounce shrink-0" size={14} />
                    <div className="overflow-hidden w-full">
                        <div className="whitespace-nowrap animate-marquee-text text-xs font-bold uppercase tracking-wider">
                            <span>Thi đua lụm 2 củ của Sếp Phúc ăn Tết nào mọi người !! &nbsp;&nbsp;&nbsp;&nbsp;</span>
                            <span>Thi đua lụm 2 củ của Sếp Phúc ăn Tết nào mọi người !! &nbsp;&nbsp;&nbsp;&nbsp;</span>
                        </div>
                    </div>
                    <Zap className="text-yellow-200 fill-yellow-200 animate-pulse shrink-0" size={14} />
                </div>
                <style>{`
              .animate-marquee-text {
                  display: inline-block;
                  animation: marquee-text 15s linear infinite;
              }
              @keyframes marquee-text {
                  0% { transform: translateX(0); }
                  100% { transform: translateX(-50%); }
              }
          `}</style>
            </div>

            {/* HEADER */}
            <div className="p-4 bg-white shadow-sm border-b shrink-0 space-y-3 z-10 pt-8 md:pt-4">
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                    <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-lg border">
                        <div className="flex flex-col"><span className="text-[10px] text-gray-500 font-bold px-1">TỪ NGÀY</span><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-sm font-bold text-gray-800 outline-none px-1" /></div>
                        <div className="h-8 w-[1px] bg-gray-300"></div>
                        <div className="flex flex-col"><span className="text-[10px] text-gray-500 font-bold px-1">ĐẾN NGÀY</span><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-sm font-bold text-gray-800 outline-none px-1" /></div>
                        <button onClick={handleRefresh} className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 shadow-sm ml-1"><Calendar size={18} /></button>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 font-bold active:scale-95 transition"><Plus size={20} /> TẠO BÁO CÁO</button>
                </div>

                {/* TOOLBAR SORT MOBILE */}
                <div className="md:hidden flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {[
                        { key: 'totalVideos', label: 'Video' },
                        { key: 'totalLives', label: 'Live' },
                        { key: 'totalMinutes', label: 'Phút' },
                        { key: 'totalViews', label: 'View' },
                        { key: 'avgViewMin', label: 'V/P' }
                    ].map(item => (
                        <button
                            key={item.key}
                            onClick={() => handleSort(item.key)}
                            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${sortConfig.key === item.key ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                        >
                            {item.label} {sortConfig.key === item.key && <ChevronDown size={10} className="inline ml-1" />}
                        </button>
                    ))}
                </div>

                {/* HEADER PC */}
                <div className="hidden md:grid grid-cols-12 gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider px-6 mt-1">
                    <div className="col-span-4">Nhân sự / Phòng ban</div>
                    <div className="col-span-1 text-right cursor-pointer hover:text-blue-600" onClick={() => handleSort('totalVideos')}>Video {sortConfig.key === 'totalVideos' && <ChevronDown size={12} className="inline" />}</div>
                    <div className="col-span-1 text-right cursor-pointer hover:text-blue-600" onClick={() => handleSort('totalLives')}>Live {sortConfig.key === 'totalLives' && <ChevronDown size={12} className="inline" />}</div>
                    <div className="col-span-2 text-right cursor-pointer hover:text-blue-600" onClick={() => handleSort('totalMinutes')}>Tổng Phút {sortConfig.key === 'totalMinutes' && <ChevronDown size={12} className="inline" />}</div>
                    <div className="col-span-2 text-right cursor-pointer hover:text-blue-600" onClick={() => handleSort('totalViews')}>Tổng View {sortConfig.key === 'totalViews' && <ChevronDown size={12} className="inline" />}</div>
                    <div className="col-span-2 text-right cursor-pointer hover:text-blue-600" onClick={() => handleSort('avgViewMin')}>V/Phút {sortConfig.key === 'avgViewMin' && <ChevronDown size={12} className="inline" />}</div>
                </div>
            </div>

            {/* LIST */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
                {loadingReports ? (
                    <div className="text-center py-10"><Loader2 className="animate-spin inline text-green-600" /></div>
                ) : (
                    dashboardData.map((staff, idx) => {
                        const hasData = (staff.totalMinutes > 0 || staff.totalVideos > 0);
                        const rankStyle = getRankStyle(idx, hasData);
                        const iconStyle = getRankIconStyle(idx, hasData);
                        const isTop1 = idx === 0 && hasData;

                        return (
                            <div key={idx} className={`rounded-xl border transition-all duration-300 overflow-hidden group ${rankStyle} relative`}>

                                {/* --- [ĐÃ SỬA] TRUYỀN KEY SORT VÀO ĐỂ LÂN NHẢY ĐÚNG CHỖ --- */}
                                {isTop1 && <RandomLion sortKey={sortConfig.key} />}
                                {/* ------------------------------------------------------- */}

                                {/* Thêm relative và z-10 để nội dung (chữ viết) nằm ĐÈ LÊN hình ảnh múa lân */}
                                <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center cursor-pointer relative z-10" onClick={() => setExpandedStaff(expandedStaff === staff.name ? null : staff.name)}>
                                    {/* INFO */}
                                    <div className="col-span-1 md:col-span-4 flex items-center gap-3 border-b md:border-b-0 md:border-r border-gray-100 pb-3 md:pb-0">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-sm shrink-0 relative ${iconStyle}`}>{idx === 0 && hasData ? <Crown size={22} className="text-white drop-shadow-md" /> : (idx < 3 && hasData ? <Trophy size={18} className="text-white" /> : idx + 1)}{isTop1 && <span className="absolute inset-0 rounded-full bg-yellow-400 opacity-20 animate-ping"></span>}</div>
                                        <div className="min-w-0"><p className={`font-bold truncate text-base ${isTop1 ? 'text-yellow-800' : 'text-gray-800'}`}>{staff.name} {isTop1 && <span className="hidden md:inline-block text-[10px] bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded-full ml-1 font-bold">TOP 1</span>}</p><p className="text-xs text-gray-400 font-medium uppercase truncate">{staff.department || 'SKODA ĐỒNG NAI'}</p>{!hasData && <span className="md:hidden text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold mt-1 inline-block">CHƯA BÁO CÁO</span>}</div>
                                    </div>
                                    {/* METRICS */}
                                    <div className="col-span-1 md:col-span-8 grid grid-cols-3 md:grid-cols-8 gap-y-2 gap-x-1">
                                        <div className="text-right md:col-span-1"><span className="md:hidden text-[10px] text-gray-400 font-bold block">VIDEO</span><span className={`font-bold text-lg ${staff.totalVideos > 0 ? 'text-purple-600' : 'text-gray-300'}`}>{staff.totalVideos}</span></div>
                                        <div className="text-right md:col-span-1"><span className="md:hidden text-[10px] text-gray-400 font-bold block">LIVE</span><span className={`font-bold text-lg ${hasData ? 'text-gray-700' : 'text-gray-300'}`}>{staff.totalLives}</span></div>
                                        <div className="text-right md:col-span-2"><span className="md:hidden text-[10px] text-gray-400 font-bold block">PHÚT</span><span className={`font-bold text-lg ${isTop1 ? 'text-green-700 text-xl' : (hasData ? 'text-green-600' : 'text-gray-300')}`}>{staff.totalMinutes.toLocaleString()}</span></div>
                                        <div className="text-right md:col-span-2"><span className="md:hidden text-[10px] text-gray-400 font-bold block">VIEW</span><span className={`font-bold text-lg ${hasData ? 'text-blue-600' : 'text-gray-300'}`}>{staff.totalViews.toLocaleString()}</span></div>
                                        <div className="text-right md:col-span-2"><span className="md:hidden text-[10px] text-gray-400 font-bold block">V/P</span><span className={`font-mono font-bold px-2 py-0.5 rounded text-sm ${staff.avgViewMin > 0 ? 'bg-orange-50 text-orange-600' : 'text-gray-300'}`}>{staff.avgViewMin}</span></div>
                                    </div>
                                    <div className="absolute right-2 top-2 md:top-1/2 md:-translate-y-1/2 text-gray-300 md:right-4">{expandedStaff === staff.name ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
                                </div>
                                {/* CHI TIẾT */}
                                {expandedStaff === staff.name && (
                                    <div className="border-t bg-slate-50 p-3 space-y-2 animate-in slide-in-from-top-2 duration-200 pl-4 md:pl-20 relative z-20">
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><LayoutList size={12} /> Chi tiết hoạt động</h4>
                                        {staff.reports.length === 0 ? <p className="text-sm text-gray-400 italic">Chưa có dữ liệu báo cáo nào.</p> :
                                            staff.reports.map((rpt, rIdx) => (
                                                <div key={rIdx} className="bg-white p-3 rounded-lg border border-gray-200 flex justify-between items-start hover:border-blue-300 transition cursor-pointer"
                                                    onClick={() => {
                                                        if (rpt.type === 'Video' && rpt.note && rpt.note.startsWith('http')) {
                                                            window.open(rpt.note, '_blank');
                                                        } else if (rpt.imageUrl) {
                                                            setViewImage(rpt.imageUrl);
                                                        }
                                                    }}>
                                                    <div className="flex-1 min-w-0 pr-2">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${rpt.type === 'Video' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-600'}`}>{rpt.type}</span>
                                                            <span className="text-xs text-gray-400 font-medium">{rpt.reportDate ? String(rpt.reportDate).substring(0, 10) : ''}</span>
                                                        </div>
                                                        {rpt.type === 'Video' ? (
                                                            <div className="flex items-center gap-2 text-sm mt-1"><LinkIcon size={14} className="text-blue-500 shrink-0" /><span className="text-blue-600 truncate hover:underline">{rpt.note}</span></div>
                                                        ) : (
                                                            <>
                                                                <div className="flex gap-4 text-sm mt-1"><span className="font-bold text-green-700">{rpt.metric1} phút</span><span className="font-bold text-blue-700">{Number(rpt.metric2).toLocaleString()} views</span></div>
                                                                {rpt.note && <p className="text-xs text-gray-500 italic mt-1 pl-2 border-l-2 border-gray-200">"{rpt.note}"</p>}
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="p-1 bg-gray-100 rounded hover:bg-blue-50 shrink-0">
                                                        {rpt.type === 'Video' ? <Video size={16} className="text-purple-500" /> : (rpt.imageUrl ? <ImageIcon size={16} className="text-gray-400 hover:text-blue-500" /> : null)}
                                                    </div>
                                                </div>
                                            ))
                                        }
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>

            {/* MODAL & VIEW IMAGE GIỮ NGUYÊN (Code cũ) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
                            <h3 className="font-bold text-lg text-gray-800">Tạo Báo Cáo</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-red-100 hover:text-red-500 rounded-full transition"><X size={20} /></button>
                        </div>
                        <div className="flex border-b border-gray-200">
                            <button onClick={() => setModalTab('scan')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${modalTab === 'scan' ? 'text-green-600 border-b-2 border-green-600 bg-green-50' : 'text-gray-500 hover:bg-gray-50'}`}><Sparkles size={16} /> Quét Ảnh AI</button>
                            <button onClick={() => setModalTab('link')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${modalTab === 'link' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}><LinkIcon size={16} /> Nhập Link Video</button>
                        </div>
                        <div className="p-5 space-y-4 overflow-y-auto">
                            <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Nền tảng</label><select value={platform} onChange={e => setPlatform(e.target.value)} className="w-full border p-2 rounded text-sm outline-none"><option>TikTok</option><option>Facebook Reels</option><option>YouTube Shorts</option><option>Zalo Video</option></select></div>
                            {modalTab === 'scan' && (
                                <>
                                    <div className="border-2 border-dashed border-gray-300 rounded-xl h-32 flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden cursor-pointer hover:border-blue-400 transition" onClick={() => document.getElementById('fileInput').click()}>
                                        {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> : <div className="text-center p-2"><ImageIcon className="mx-auto text-gray-400 mb-1" /><span className="text-[10px] text-gray-500 font-bold">Chọn ảnh Live/Analytics</span></div>}
                                        {analyzing && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>}
                                    </div>
                                    <input id="fileInput" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                    {!selectedGroup && scannedGroups.length > 0 && (
                                        <div className="border-t pt-4">
                                            <h4 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2"><Calendar size={16} className="text-blue-600" /> Chọn ngày nhập liệu</h4>
                                            <div className="space-y-2">{scannedGroups.map((grp, idx) => (<div key={idx} onClick={() => setSelectedGroup(grp)} className="p-3 border rounded-lg hover:border-green-500 hover:bg-green-50 cursor-pointer flex justify-between items-center transition"><span className="font-bold text-gray-800">{grp.date}</span><span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">{grp.sessions.length} phiên</span></div>))}</div>
                                        </div>
                                    )}
                                    {selectedGroup && (
                                        <div className="border-t pt-4 animate-in slide-in-from-right-4 duration-300">
                                            <div className="flex justify-between items-center mb-3">
                                                <button onClick={() => { if (scannedGroups.length > 1) setSelectedGroup(null) }} className={`text-xs flex items-center gap-1 text-gray-500 hover:text-black ${scannedGroups.length <= 1 ? 'hidden' : ''}`}><ArrowLeft size={12} /> Quay lại</button>
                                                <h4 className="font-bold text-sm text-gray-700 flex items-center gap-2"><Sparkles size={16} className="text-purple-600" /> {selectedGroup.date}</h4>
                                            </div>
                                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                                {selectedGroup.sessions.map((s) => (
                                                    <div key={s.id} className={`p-3 rounded-lg border flex items-center gap-3 ${!s.kpi.pass ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-blue-300'} ${s.selected ? 'border-green-500 bg-green-50' : ''}`} onClick={() => { if (s.kpi.pass) { const updated = selectedGroup.sessions.map(ss => ss.id === s.id ? { ...ss, selected: !ss.selected } : ss); setSelectedGroup({ ...selectedGroup, sessions: updated }); } }}>
                                                        <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${s.selected ? 'bg-green-500 border-green-500 text-white' : 'bg-white'} ${!s.kpi.pass ? 'bg-gray-200 border-gray-300' : ''}`}>{s.selected && <CheckCircle size={14} />}</div>
                                                        <div className="flex-1"><div className="flex justify-between"><span className="font-bold text-gray-800 text-sm">{s.note}</span>{!s.kpi.pass ? <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded">Thấp</span> : <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded">OK</span>}</div><div className="flex gap-4 text-xs mt-1 text-gray-600"><span className={`font-mono ${s.metric1 < 30 ? 'text-red-500 font-bold' : ''}`}>{s.metric1}p</span><span className={`font-mono ${s.metric2 < 100 ? 'text-red-500 font-bold' : ''}`}>{s.metric2}v</span></div></div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                            {modalTab === 'link' && (
                                <div className="space-y-3 animate-in fade-in zoom-in-95">
                                    <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Đường dẫn video</label><input type="text" placeholder="Dán link video vào đây..." value={videoLink} onChange={handleLinkChange} className="w-full border p-2 rounded text-sm outline-none focus:border-blue-500" /></div>
                                    <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Ngày đăng</label><input type="date" value={linkDate} onChange={e => setLinkDate(e.target.value)} className="w-full border p-2 rounded text-sm" /></div>
                                </div>
                            )}
                            {showOverwriteWarning && (
                                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-sm text-yellow-800 animate-in zoom-in-95">
                                    <div className="flex items-start gap-2"><AlertTriangle size={18} className="shrink-0 mt-0.5" /><div><p className="font-bold">Cảnh báo!</p><p className="mt-1">Ngày này đã có dữ liệu. Bạn có muốn ghi đè không?</p></div></div>
                                    <div className="flex gap-2 mt-3 justify-end">
                                        <button
                                            onClick={() => setShowOverwriteWarning(false)}
                                            className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-xs font-bold"
                                            disabled={uploading}
                                        >
                                            Hủy
                                        </button>
                                        {/* NÚT GHI ĐÈ ĐÃ SỬA: KHÓA + HIỆN LOADING */}
                                        <button
                                            onClick={handleConfirmOverwrite}
                                            disabled={uploading}
                                            className={`px-3 py-1 text-white rounded text-xs font-bold flex items-center gap-1 ${uploading ? 'bg-gray-400 cursor-not-allowed opacity-70' : 'bg-yellow-500 hover:bg-yellow-600'}`}
                                        >
                                            {uploading && <Loader2 className="animate-spin" size={12} />}
                                            {uploading ? 'Đang lưu...' : 'Ghi đè'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        {!showOverwriteWarning && (
                            <div className="p-4 border-t bg-white shrink-0 flex gap-3">
                                {modalTab === 'scan' && selectedGroup && (
                                    <>
                                        <div className="flex-1 text-xs text-gray-500">* KPI: Min 30p & View 100</div>
                                        <button onClick={handleSaveScan} disabled={uploading || selectedGroup.sessions.filter(s => s.selected).length === 0} className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg disabled:opacity-70">{uploading ? <Loader2 className="animate-spin" /> : <CheckCircle size={20} />} {uploading ? 'Đang lưu...' : `LƯU (${selectedGroup.sessions.filter(s => s.selected).length})`}</button>
                                    </>
                                )}
                                {modalTab === 'link' && (
                                    <button onClick={handleSaveLink} disabled={uploading || !videoLink} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-70">{uploading ? <Loader2 className="animate-spin" /> : <Save size={20} />} Lưu Báo Cáo Video</button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {viewImage && <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={() => setViewImage(null)}><img src={viewImage} className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain" /></div>}
        </div>
    );
};

// --- COMPONENT CON: CON LÂN THÔNG MINH (Đã chỉnh lại vị trí sát hơn) ---
const RandomLion = ({ sortKey }) => {
    // Tính toán vị trí: Chỉ nhích nhẹ 1% so với cột số liệu để tạo khoảng cách ~10px
    const getPositionClass = () => {
        switch (sortKey) {
            case 'totalVideos':
                // Cột Video: 59% (Vừa đủ hở ra 1 chút xíu)
                return "right-12 md:right-[59%]";
            case 'totalLives':
                // Cột Live: 51%
                return "right-12 md:right-[51%]";
            case 'totalMinutes':
                // Cột Phút: 35%
                return "right-12 md:right-[35%]";
            case 'totalViews':
                // Cột View: 19%
                return "right-12 md:right-[19%]";
            case 'avgViewMin':
                // Cột V/P: 3%
                return "right-12 md:right-[3%]";
            default:
                // Mặc định (View): 19%
                return "right-12 md:right-[19%]";
        }
    };

    return (
        <img
            src="/mua-lan2.gif"
            alt="Múa Lân"
            // Bỏ -translate-x-2 đi để nó không bị đẩy xa nữa
            className={`absolute bottom-0 w-14 h-auto md:w-20 z-0 opacity-90 pointer-events-none select-none mix-blend-multiply animate-bounce transition-all duration-700 ease-in-out ${getPositionClass()}`}
        />
    );
};

export default ReportList;