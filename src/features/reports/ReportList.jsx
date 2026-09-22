import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useData } from '../../context/DataProvider';
import { reportService } from './reportService';
import { authService } from '../auth/authService';
import { Plus, Loader2, Image as ImageIcon, CheckCircle, Video, Eye, Calendar, X, Sparkles, AlertCircle, Trophy, ChevronDown, ChevronUp, User, LayoutList, Crown, ArrowLeft, AlertTriangle, Link as LinkIcon, Save, Zap, Gift, RefreshCw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ReportList = () => {
    const { reports, staffList, loadingReports, fetchReports, saveReportOptimistic } = useData();
    const currentUser = authService.getCurrentUser();
    const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin';

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
    const [showInactiveStaff, setShowInactiveStaff] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalTab, setModalTab] = useState('scan');
    const [viewImage, setViewImage] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [scanProgress, setScanProgress] = useState(null);
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
            if (rDate < start || rDate > end) return false;

            if (!showInactiveStaff) {
                const key = normalizeName(r.staffName);
                const staffUser = staffList.find(s => normalizeName(s.name) === key);
                if (staffUser && staffUser.active === false) {
                    return false;
                }
            }
            return true;
        });

        const statsMap = {};

        const activeStaffList = showInactiveStaff ? staffList : staffList.filter(s => s.active !== false);
        activeStaffList.forEach(s => {
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
            if (!statsMap[key]) {
                const staffUser = staffList.find(s => normalizeName(s.name) === key);
                if (staffUser && staffUser.active === false && !showInactiveStaff) {
                    return; // Skip reports for inactive staff if toggle is off
                }
                statsMap[key] = { name: rawName, department: 'Khác', totalVideos: 0, totalLives: 0, totalMinutes: 0, totalViews: 0, reports: [] };
            }

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

    const handleDeleteReport = async (reportId, e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        if (!isAdmin) {
            toast.error("Chỉ có tài khoản Admin mới có quyền xóa báo cáo!");
            return;
        }
        if (!window.confirm("Bạn có chắc chắn muốn xóa vĩnh viễn báo cáo này không?")) return;

        const toastId = toast.loading("Đang xóa báo cáo...");
        try {
            const res = await reportService.deleteReport(reportId);
            if (res.status === 'success') {
                toast.success("Đã xóa báo cáo thành công!", { id: toastId });
                fetchReports(true);
            } else {
                throw new Error(res.message);
            }
        } catch (error) {
            console.error("Lỗi xóa báo cáo:", error);
            toast.error("Xóa báo cáo thất bại: " + error.message, { id: toastId });
        }
    };

    const checkKPI = (min, view) => {
        const m = Number(min); const v = Number(view);
        if (m >= 30 && v >= 100) return { pass: true, msg: 'Đạt' };
        return { pass: false, msg: 'Không đạt' };
    };

    const [scanElapsedSec, setScanElapsedSec] = useState(0);

    // Xử lý nén & quét ảnh AI
    const processImageFile = async (file) => {
        if (!file) return;
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setScannedGroups([]);
        setSelectedGroup(null);
        setAnalyzing(true);
        setScanProgress({ step: 'compressing', message: '🗜️ Đang nén tối ưu ảnh chụp màn hình...' });

        const startTime = Date.now();
        setScanElapsedSec(0);
        const timer = setInterval(() => {
            setScanElapsedSec(Number(((Date.now() - startTime) / 1000).toFixed(1)));
        }, 100);

        try {
            const aiData = await reportService.analyzeImageWithAI(file, (p) => {
                setScanProgress(p);
            });

            let rawGroups = [];
            if (Array.isArray(aiData) && aiData.length > 0) {
                rawGroups = aiData;
            } else if (aiData && aiData.sessions) {
                rawGroups = [{ date: aiData.reportDate || aiData.date, sessions: aiData.sessions }];
            }

            if (rawGroups.length > 0) {
                // Sắp xếp các ngày giảm dần (ngày gần nhất / mới nhất lên đầu)
                const sortedDays = [...rawGroups].sort((a, b) => {
                    const dateA = String(a.date || '');
                    const dateB = String(b.date || '');
                    return dateB.localeCompare(dateA);
                });

                const latestDate = sortedDays[0]?.date;

                const groups = sortedDays.map((grp) => {
                    const isLatest = grp.date === latestDate;
                    return {
                        date: grp.date || new Date().toISOString().slice(0, 10),
                        sessions: (grp.sessions || []).map((s, idx) => {
                            const kpi = checkKPI(s.minutes, s.views);
                            // YÊU CẦU: Tự động chọn phiên đạt KPI của NGÀY GẦN NHẤT, các ngày khác mặc định bỏ tick
                            const isSelected = isLatest ? kpi.pass : false;
                            return {
                                id: idx,
                                metric1: Number(s.minutes) || 0,
                                metric2: Number(s.views) || 0,
                                note: s.note || `Phiên ${idx + 1}`,
                                selected: isSelected,
                                kpi
                            };
                        })
                    };
                });

                setScannedGroups(groups);
                toast.success(`Đã quét xong: ${groups.length} ngày! (Mặc định chọn ngày gần nhất: ${latestDate})`);
            } else {
                toast.error("Không tìm thấy số liệu phiên live từ ảnh. Vui lòng chụp rõ nét hơn.");
            }
        } catch (err) {
            console.error("UI Error:", err);
            toast.error("Lỗi xử lý ảnh: " + (err.message || 'Thử lại'));
        } finally {
            clearInterval(timer);
            setAnalyzing(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            processImageFile(file);
        }
    };

    // Hỗ trợ Paste ảnh từ Clipboard (Ctrl + V) khi mở modal tab scan
    useEffect(() => {
        if (!isModalOpen || modalTab !== 'scan') return;
        const handlePaste = (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.startsWith('image/')) {
                    const file = items[i].getAsFile();
                    if (file) {
                        processImageFile(file);
                        break;
                    }
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [isModalOpen, modalTab, platform]);

    // Toggle chọn 1 phiên live
    const toggleSessionSelect = (grpIdx, sIdx) => {
        setScannedGroups((prev) =>
            prev.map((grp, gI) => {
                if (gI !== grpIdx) return grp;
                return {
                    ...grp,
                    sessions: grp.sessions.map((s, sI) =>
                        sI === sIdx ? { ...s, selected: !s.selected } : s
                    )
                };
            })
        );
    };

    // Chọn hoặc bỏ chọn tất cả phiên đạt KPI trên toàn bộ các ngày
    const toggleSelectAllKPIAllGroups = (select) => {
        setScannedGroups((prev) =>
            prev.map((grp) => ({
                ...grp,
                sessions: grp.sessions.map((s) =>
                    s.kpi.pass ? { ...s, selected: select } : s
                )
            }))
        );
    };

    // Tổng hợp các phiên đang được tick chọn trên TẤT CẢ các ngày
    const allSelectedScanSessions = useMemo(() => {
        return scannedGroups.flatMap((grp) =>
            grp.sessions
                .filter((s) => s.selected)
                .map((s) => ({
                    date: grp.date,
                    metric1: s.metric1,
                    metric2: s.metric2,
                    note: s.note,
                    kpi: s.kpi
                }))
        );
    }, [scannedGroups]);

    const handleSaveScan = () => {
        if (isSubmittingRef.current) return;
        if (allSelectedScanSessions.length === 0) {
            toast.error("Vui lòng chọn ít nhất 1 phiên livestream đạt chuẩn.");
            return;
        }

        // Lấy danh sách các ngày có phiên được chọn
        const selectedDates = [...new Set(allSelectedScanSessions.map(s => s.date))];
        const primaryDate = selectedDates[0] || new Date().toISOString().slice(0, 10);
        checkOverwrite(primaryDate, submitScan);
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
            const list = allSelectedScanSessions.map(s => ({
                staffID: user.id || 'S001',
                staffName: user.name || user.username,
                reportDate: s.date,
                type: 'Livestream',
                platform,
                metric1: s.metric1,
                metric2: s.metric2,
                status: 'Đã duyệt',
                imageUrl: img,
                note: s.note
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

            {/* HEADER */}
            <div className="p-4 bg-white shadow-sm border-b shrink-0 space-y-3 z-10 pt-8 md:pt-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-lg border">
                            <div className="flex flex-col"><span className="text-[10px] text-gray-500 font-bold px-1">TỪ NGÀY</span><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-sm font-bold text-gray-800 outline-none px-1" /></div>
                            <div className="h-8 w-[1px] bg-gray-300"></div>
                            <div className="flex flex-col"><span className="text-[10px] text-gray-500 font-bold px-1">ĐẾN NGÀY</span><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-sm font-bold text-gray-800 outline-none px-1" /></div>
                            <button onClick={handleRefresh} className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 shadow-sm ml-1"><Calendar size={18} /></button>
                        </div>
                        {isAdmin && (
                            <div className="flex items-center gap-2 bg-stone-100 p-2.5 rounded-lg border text-xs font-bold text-stone-700 shadow-sm">
                                <input
                                    type="checkbox"
                                    id="showInactiveToggle"
                                    checked={showInactiveStaff}
                                    onChange={(e) => setShowInactiveStaff(e.target.checked)}
                                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer"
                                />
                                <label htmlFor="showInactiveToggle" className="cursor-pointer select-none">
                                    Hiện nhân sự đã nghỉ
                                </label>
                            </div>
                        )}
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 font-bold active:scale-95 transition"><Plus size={20} /> TẠO BÁO CÁO</button>
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
                                        <div className="min-w-0"><p className={`font-bold truncate text-base ${isTop1 ? 'text-yellow-800' : 'text-gray-800'}`}>{staff.name} {isTop1 && <span className="hidden md:inline-block text-[10px] bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded-full ml-1 font-bold">TOP 1</span>}</p><p className="text-xs text-gray-400 font-medium uppercase truncate">{staff.department || 'MG BÌNH DƯƠNG'}</p>{!hasData && <span className="md:hidden text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold mt-1 inline-block">CHƯA BÁO CÁO</span>}</div>
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
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <div className="p-1 bg-gray-100 rounded hover:bg-blue-50">
                                                            {rpt.type === 'Video' ? <Video size={16} className="text-purple-500" /> : (rpt.imageUrl ? <ImageIcon size={16} className="text-gray-400 hover:text-blue-500" /> : null)}
                                                        </div>
                                                        {isAdmin && (
                                                            <button
                                                                onClick={(e) => handleDeleteReport(rpt.id, e)}
                                                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                                                                title="Xóa báo cáo"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
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

            {/* MODAL BÁO CÁO MỚI (LIVE STREAM OCR SCANNER STYLE) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
                    <div
                        className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-stone-200 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
                        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                    >
                        {/* Header Dark Gradient */}
                        <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">📡</span>
                                    <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                                        Báo Cáo Hoạt Động Livestream (Quét Ảnh AI)
                                    </h3>
                                </div>
                                <p className="text-[11px] text-stone-400 mt-0.5">
                                    Dành cho đội ngũ kinh doanh & truyền thông • MG Motor Bình Dương
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="text-stone-400 hover:text-white text-lg font-bold p-1 cursor-pointer transition"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Tabs chuyển đổi giữa Quét Ảnh AI và Nhập Link Video */}
                        <div className="flex border-b border-stone-200 bg-stone-50 shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    setModalTab('scan');
                                    setPlatform('TikTok');
                                }}
                                className={`flex-1 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                                    modalTab === 'scan'
                                        ? 'text-emerald-700 border-b-2 border-emerald-600 bg-white shadow-xs'
                                        : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100/60'
                                }`}
                            >
                                <Sparkles size={15} /> Quét Ảnh AI (TikTok Live)
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setModalTab('link');
                                    if (videoLink) setPlatform(detectPlatform(videoLink));
                                }}
                                className={`flex-1 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                                    modalTab === 'link'
                                        ? 'text-blue-600 border-b-2 border-blue-600 bg-white shadow-xs'
                                        : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100/60'
                                }`}
                            >
                                <LinkIcon size={15} /> Nhập Link Video (Reels/Shorts)
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
                            {/* TAB QUÉT ẢNH AI */}
                            {modalTab === 'scan' && (
                                <>
                                    {/* Khung Upload Ảnh & Kéo Thả */}
                                    <div
                                        onClick={() => document.getElementById('fileInputLiveScan')?.click()}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            const file = e.dataTransfer.files?.[0];
                                            if (file) processImageFile(file);
                                        }}
                                        className={`border-2 border-dashed rounded-xl p-4 sm:p-5 text-center cursor-pointer transition relative ${
                                            analyzing
                                                ? 'border-blue-400 bg-blue-50/40'
                                                : 'border-stone-300 hover:border-emerald-600 hover:bg-emerald-50/20'
                                        }`}
                                    >
                                        <input
                                            id="fileInputLiveScan"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleFileChange}
                                        />

                                        {previewUrl ? (
                                            <div className="flex items-center justify-center gap-4">
                                                <img
                                                    src={previewUrl}
                                                    alt="Preview"
                                                    className="h-18 sm:h-20 w-auto object-cover rounded-lg border shadow-xs"
                                                />
                                                <div className="text-left">
                                                    <div className="text-xs font-bold text-stone-800">
                                                        {selectedFile?.name || 'Ảnh chụp màn hình'}
                                                    </div>
                                                    <div className="text-[11px] text-stone-500 mt-0.5">
                                                        Dung lượng gốc: {((selectedFile?.size || 0) / 1024).toFixed(0)} KB • Bấm để đổi ảnh khác
                                                    </div>
                                                    <div className="text-[11px] text-emerald-700 font-medium mt-1">
                                                        💡 Bạn cũng có thể nhấn Ctrl+V để dán ảnh chụp trực tiếp
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                <div className="text-2xl">📸</div>
                                                <div className="text-xs font-bold text-stone-800">
                                                    Tải lên hoặc dán (Ctrl+V) ảnh chụp màn hình phân tích TikTok/FB Live
                                                </div>
                                                <div className="text-[11px] text-stone-500">
                                                    AI sẽ tự động nén tối ưu và đọc số phút, số view của từng phiên
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Thanh Tiến Trình 3 Bước Khi Đang Phân Tích */}
                                    {analyzing && (
                                        <div className="bg-stone-900 text-white p-3.5 rounded-xl space-y-2.5 shadow-sm animate-in fade-in duration-200">
                                            <div className="flex items-center justify-between text-xs font-semibold">
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                                                    <span>{scanProgress?.message || 'Đang quét ảnh...'}</span>
                                                </div>
                                                <span className="font-mono text-emerald-400 font-bold">{scanElapsedSec}s</span>
                                            </div>

                                            {/* 3 Step Indicators */}
                                            <div className="grid grid-cols-3 gap-1.5 text-center">
                                                <div
                                                    className={`py-1.5 px-1 rounded-lg border text-[11px] font-medium transition ${
                                                        scanProgress?.step === 'compressing'
                                                            ? 'bg-emerald-950 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                                                            : scanProgress?.originalSize
                                                            ? 'bg-emerald-900/50 border-emerald-700/60 text-emerald-300'
                                                            : 'bg-stone-800 border-stone-700 text-stone-400'
                                                    }`}
                                                >
                                                    <div>1. Nén ảnh</div>
                                                    <div className="text-[9px] opacity-75">
                                                        {scanProgress?.originalSize
                                                            ? `${scanProgress.originalSize} ➔ ${scanProgress.compressedSize}`
                                                            : 'Thuật toán OCR'}
                                                    </div>
                                                </div>

                                                <div
                                                    className={`py-1.5 px-1 rounded-lg border text-[11px] font-medium transition ${
                                                        scanProgress?.step === 'ai_analyzing'
                                                            ? 'bg-blue-950 border-blue-500 text-blue-300 ring-1 ring-blue-500'
                                                            : scanProgress?.step === 'parsing' || scanProgress?.step === 'done'
                                                            ? 'bg-emerald-900/50 border-emerald-700/60 text-emerald-300'
                                                            : 'bg-stone-800 border-stone-700 text-stone-400'
                                                    }`}
                                                >
                                                    <div>2. AI Vision</div>
                                                    <div className="text-[9px] opacity-75">Trích xuất số liệu</div>
                                                </div>

                                                <div
                                                    className={`py-1.5 px-1 rounded-lg border text-[11px] font-medium transition ${
                                                        scanProgress?.step === 'done'
                                                            ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                                                            : 'bg-stone-800 border-stone-700 text-stone-400'
                                                    }`}
                                                >
                                                    <div>3. Chuẩn KPI</div>
                                                    <div className="text-[9px] opacity-75">≥30p hoặc ≥100v</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* KẾT QUẢ QUÉT ĐƯỢC - DẠNG DỌC THEO TỪNG NGÀY */}
                                    {scannedGroups.length > 0 && (
                                        <div className="space-y-3 pt-1 border-t border-stone-200">
                                            {/* Thanh tổng quan & Thao tác nhanh */}
                                            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <div className="text-xs font-bold text-stone-900">
                                                        Kết Quả Quét:{' '}
                                                        <span className="text-emerald-700 font-bold">
                                                            {allSelectedScanSessions.length} phiên đã chọn
                                                        </span>{' '}
                                                        / {scannedGroups.reduce((acc, g) => acc + g.sessions.length, 0)} phiên ({scannedGroups.length} ngày)
                                                    </div>
                                                    <div className="text-[10px] text-stone-500 mt-0.5">
                                                        * Mặc định tự động chọn các phiên đạt chuẩn của <strong className="text-emerald-700">ngày gần nhất</strong>.
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5 text-xs">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleSelectAllKPIAllGroups(true)}
                                                        className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-[11px] rounded-lg transition cursor-pointer flex items-center gap-1"
                                                    >
                                                        ✓ Chọn tất cả đạt chuẩn
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleSelectAllKPIAllGroups(false)}
                                                        className="px-2.5 py-1 bg-stone-200 hover:bg-stone-300 text-stone-700 font-medium text-[11px] rounded-lg transition cursor-pointer"
                                                    >
                                                        Bỏ chọn hết
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Danh sách Dọc theo từng ngày */}
                                            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                                                {scannedGroups.map((grp, grpIdx) => {
                                                    const totalSessions = grp.sessions.length;
                                                    const selectedCount = grp.sessions.filter((s) => s.selected).length;

                                                    return (
                                                        <div
                                                            key={grp.date || grpIdx}
                                                            className="border border-stone-200 rounded-xl bg-white overflow-hidden shadow-xs"
                                                        >
                                                            {/* Header Ngày: Nền Xanh Đậm (#065f46) */}
                                                            <div className="bg-[#065f46] text-white px-3.5 py-2 flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs">📅</span>
                                                                    <span className="text-xs font-bold text-white tracking-wide">
                                                                        Ngày: {grp.date}
                                                                    </span>
                                                                </div>
                                                                {/* Đếm số phiên rút gọn 1/2, 2/3 */}
                                                                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/70 text-emerald-200 border border-emerald-700/60 font-mono">
                                                                    {selectedCount}/{totalSessions}
                                                                </span>
                                                            </div>

                                                            {/* Danh sách phiên: Đạt chuẩn nền xanh nhạt, Chưa đạt nền đỏ nhạt */}
                                                            <div className="p-2 space-y-1.5 bg-stone-50/40">
                                                                {grp.sessions.map((s, sIdx) => {
                                                                    const isPass = s.kpi.pass;
                                                                    return (
                                                                        <div
                                                                            key={s.id ?? sIdx}
                                                                            onClick={() => toggleSessionSelect(grpIdx, sIdx)}
                                                                            className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                                                                                isPass
                                                                                    ? s.selected
                                                                                        ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400/30 shadow-xs'
                                                                                        : 'bg-emerald-50/50 border-emerald-200/70 opacity-60 hover:opacity-90'
                                                                                    : s.selected
                                                                                    ? 'bg-rose-50 border-rose-400 ring-1 ring-rose-400/30 shadow-xs'
                                                                                    : 'bg-rose-50/50 border-rose-200/70 opacity-60 hover:opacity-90'
                                                                            }`}
                                                                        >
                                                                            <div className="flex items-center gap-2.5">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={s.selected}
                                                                                    onChange={() => {}}
                                                                                    className={`w-4 h-4 rounded cursor-pointer ${
                                                                                        isPass ? 'accent-emerald-700' : 'accent-rose-700'
                                                                                    }`}
                                                                                />
                                                                                <div>
                                                                                    <div
                                                                                        className={`font-bold text-xs ${
                                                                                            isPass ? 'text-emerald-950' : 'text-rose-950'
                                                                                        }`}
                                                                                    >
                                                                                        {s.note}
                                                                                    </div>
                                                                                    <div
                                                                                        className={`text-[11px] mt-0.5 ${
                                                                                            isPass ? 'text-emerald-800/80' : 'text-rose-800/80'
                                                                                        }`}
                                                                                    >
                                                                                        Thời lượng:{' '}
                                                                                        <strong className={isPass ? 'text-emerald-950' : 'text-rose-950'}>
                                                                                            {s.metric1} phút
                                                                                        </strong>{' '}
                                                                                        • Lượt xem:{' '}
                                                                                        <strong className={isPass ? 'text-emerald-950' : 'text-rose-950'}>
                                                                                            {s.metric2.toLocaleString()}
                                                                                        </strong>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                {isPass ? (
                                                                                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                                                                                        Đạt chuẩn
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md">
                                                                                        Chưa đạt
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* TAB NHẬP LINK VIDEO */}
                            {modalTab === 'link' && (
                                <div className="space-y-3 animate-in fade-in zoom-in-95">
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-stone-600 uppercase">Đường dẫn video (Reels, TikTok, Shorts)</label>
                                        <input
                                            type="text"
                                            placeholder="Dán link video vào đây..."
                                            value={videoLink}
                                            onChange={handleLinkChange}
                                            className="w-full border border-stone-300 p-2.5 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-stone-600 uppercase">Ngày đăng</label>
                                        <input
                                            type="date"
                                            value={linkDate}
                                            onChange={e => setLinkDate(e.target.value)}
                                            className="w-full border border-stone-300 p-2.5 rounded-xl text-sm outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* CẢNH BÁO GHI ĐÈ */}
                            {showOverwriteWarning && (
                                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-900 animate-in zoom-in-95">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600" />
                                        <div>
                                            <p className="font-bold">Cảnh báo trùng lặp!</p>
                                            <p className="mt-0.5">Ngày này bạn đã có báo cáo trong hệ thống. Bạn có muốn ghi đè dữ liệu mới không?</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-3 justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setShowOverwriteWarning(false)}
                                            className="px-3 py-1.5 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 text-xs font-bold text-stone-700 cursor-pointer"
                                            disabled={uploading}
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleConfirmOverwrite}
                                            disabled={uploading}
                                            className={`px-3.5 py-1.5 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                                                uploading ? 'bg-stone-400 cursor-not-allowed opacity-70' : 'bg-amber-600 hover:bg-amber-700 shadow-xs'
                                            }`}
                                        >
                                            {uploading && <Loader2 className="animate-spin" size={12} />}
                                            {uploading ? 'Đang lưu...' : 'Xác nhận ghi đè'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Nút Hành Động */}
                        {!showOverwriteWarning && (
                            <div className="p-4 border-t border-stone-200 bg-stone-50 shrink-0 flex items-center justify-between gap-3">
                                {modalTab === 'scan' && (
                                    <>
                                        <div className="text-[11px] text-stone-500">
                                            * KPI: Min 30p hoặc View ≥ 100
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsModalOpen(false)}
                                                className="px-4 py-2.5 border border-stone-300 text-stone-700 font-semibold text-xs rounded-xl hover:bg-stone-100 transition cursor-pointer"
                                            >
                                                Hủy
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSaveScan}
                                                disabled={uploading || allSelectedScanSessions.length === 0}
                                                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer disabled:cursor-not-allowed"
                                            >
                                                {uploading ? (
                                                    <>
                                                        <Loader2 className="animate-spin" size={16} />
                                                        <span>Đang lưu...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle size={16} />
                                                        <span>💾 Xác nhận lưu ({allSelectedScanSessions.length} phiên đã chọn)</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </>
                                )}
                                {modalTab === 'link' && (
                                    <div className="w-full flex justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="px-4 py-2.5 border border-stone-300 text-stone-700 font-semibold text-xs rounded-xl hover:bg-stone-100 transition cursor-pointer"
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSaveLink}
                                            disabled={uploading || !videoLink}
                                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-stone-300 text-white px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer disabled:cursor-not-allowed"
                                        >
                                            {uploading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                            {uploading ? 'Đang lưu...' : 'Lưu Báo Cáo Video'}
                                        </button>
                                    </div>
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