import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useData } from '../../context/DataProvider';
import { authService } from '../auth/authService';
import CustomerFormModal from './CustomerFormModal';
import { Search, Plus, Loader2, Phone, User, Calendar, MessageSquare, Save, X, GripVertical, Briefcase, Car, PieChart, ShieldCheck, ShieldAlert, MessageCircle, RefreshCw, Star, Users, LayoutList, Table, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

// --- COMPONENT CON: CUSTOMER DETAIL PANE ---
const CustomerDetailPane = ({ customer, config, onSave, loadingSave, onClose }) => {
    const [formData, setFormData] = useState({});
    const [suggestions, setSuggestions] = useState([]);
    const [roleLevel, setRoleLevel] = useState(1);
    const [isContactMenuOpen, setIsContactMenuOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        try {
            const user = authService.getCurrentUser();
            if (user) {
                const role = String(user.role || '').toLowerCase();
                if (role.includes('admin') || role.includes('giám đốc') || role.includes('quản lý') || role.includes('manager')) setRoleLevel(3);
                else if (role.includes('trưởng phòng') || role.includes('tpkd')) setRoleLevel(2);
                else setRoleLevel(1);
            }
        } catch (error) { setRoleLevel(1); }
    }, []);

    useEffect(() => {
        if (customer) {
            const dataToShow = {
                ...customer,
                leadRating: customer['LEAD RATING'] || customer.leadRating || customer.rating || '-',
                newNote: ''
            };
            setFormData(dataToShow);
            setSuggestions([]);
            setIsContactMenuOpen(false);
        }
    }, [customer]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'phone') {
            setFormData(prev => ({ ...prev, [name]: value.replace(/\D/g, '') }));
            return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'ward' && value.length > 1 && config && Array.isArray(config.locations)) {
            const matches = config.locations.filter(l => l.ward && l.ward.toLowerCase().includes(value.toLowerCase())).slice(0, 5);
            setSuggestions(matches);
        } else { setSuggestions([]); }
    };

    const handleSelectSuggestion = (loc) => {
        setFormData(prev => ({ ...prev, ward: loc.ward, province: loc.province }));
        setSuggestions([]);
    };

    const handleSubmit = async () => {
        const requiredFields = ['customerName', 'phone', 'carModel', 'source'];
        const missing = requiredFields.filter(f => !formData[f] || String(formData[f]).trim() === '');
        if (missing.length > 0) {
            toast.error('Vui lòng nhập: Tên, SĐT, Dòng xe, Nguồn');
            return;
        }

        const payload = {
            ...formData,
            originalPhone: customer.phone,
            originalCustomerName: customer.customerName,
            "LEAD RATING": formData.leadRating || '-'
        };

        if (payload.key === 0 || payload.key === '0') delete payload.key;
        delete payload.isNew; delete payload.isSyncing; delete payload.tempId;

        setIsSaving(true);
        try {
            await onSave(payload);
        } finally {
            setIsSaving(false);
        }
    };

    const handleContactClick = () => {
        const phone = formData.phone;
        if (!phone) { toast.error("Chưa có số điện thoại"); return; }
        if (window.innerWidth < 768) {
            setIsContactMenuOpen(true);
        } else {
            let cleanPhone = phone.replace(/\D/g, '');
            if (cleanPhone.startsWith('0')) cleanPhone = '84' + cleanPhone.substring(1);
            window.location.href = `zalo://conversation?phone=${cleanPhone}`;
        }
    };

    if (!customer) return (
        <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
            <User size={64} className="mb-4 text-gray-200" /><p>Chọn khách hàng để xem chi tiết</p>
        </div>
    );

    return (
        <div className="flex flex-col h-full w-full flex-1 min-h-0 bg-white relative">
            <div className="px-5 py-4 border-b flex items-center bg-gray-50 shrink-0 shadow-sm z-10 pr-12 justify-between">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 line-clamp-1">{formData.customerName}</h3>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-sm text-gray-600 font-mono font-bold flex items-center gap-1"><Phone size={14} /> {formData.phone}</p>
                    </div>
                </div>
                {onClose && (
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                        <X size={20} />
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-6 bg-white pb-20">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-white p-1.5 rounded-full shadow-sm text-blue-600"><Users size={16} /></div>
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold">Phụ trách</p>
                            <p className="text-sm font-bold text-gray-800">{formData.saleName || 'Chưa rõ'}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Phòng ban</p>
                        <span className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded font-bold border border-blue-200">
                            {formData.department || 'PKD-?'}
                        </span>
                    </div>
                </div>

                <div className="border rounded-lg p-4 border-gray-200">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><User size={14} /> Khách hàng</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[10px] text-gray-500 font-bold uppercase">Họ tên (*)</label><input name="customerName" value={formData.customerName || ''} onChange={handleChange} className="w-full p-2 border rounded text-sm focus:ring-1 focus:ring-green-500 outline-none" /></div>
                        <div className="space-y-1"><label className="text-[10px] text-gray-500 font-bold uppercase">SĐT (*)</label><div className="flex items-center gap-1"><input name="phone" value={formData.phone || ''} onChange={handleChange} className="flex-1 w-full p-2 border rounded text-sm font-bold text-gray-800 focus:ring-1 focus:ring-green-500 outline-none min-w-0" placeholder="Chỉ nhập số..." /><button onClick={handleContactClick} className="w-[38px] h-[38px] bg-green-600 hover:bg-green-700 text-white rounded flex items-center justify-center shadow-sm shrink-0 transition active:scale-95"><MessageCircle size={20} /></button></div></div>
                        <div className="space-y-1 relative col-span-1 sm:col-span-1"><label className="text-[10px] text-gray-500 font-bold uppercase">Phường / Xã</label><div className="relative"><input name="ward" value={formData.ward || ''} onChange={handleChange} className="w-full p-2 border rounded text-sm focus:ring-1 focus:ring-green-500 outline-none" autoComplete="off" placeholder="Nhập để tìm..." />{suggestions.length > 0 && (<div className="absolute top-full left-0 w-full bg-white border shadow-xl mt-1 max-h-40 overflow-y-auto rounded z-50">{suggestions.map((loc, idx) => (<div key={idx} onClick={() => handleSelectSuggestion(loc)} className="p-2 hover:bg-green-50 cursor-pointer text-sm border-b last:border-0"><span className="font-bold">{loc.ward}</span> <span className="text-gray-400 text-xs">- {loc.province}</span></div>))}</div>)}</div></div>
                        <div className="space-y-1 col-span-1 sm:col-span-1"><label className="text-[10px] text-gray-500 font-bold uppercase">Tỉnh / Thành</label><input name="province" value={formData.province || ''} readOnly className="w-full p-2 border rounded text-sm bg-gray-100 text-gray-500 cursor-not-allowed" /></div>
                    </div>
                </div>

                <div className="border rounded-lg p-4 border-gray-200">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><Car size={14} /> Xe & Đánh giá</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1 col-span-2">
                            <label className="text-[10px] text-orange-600 font-bold uppercase flex items-center gap-1"><Star size={10} /> Lead Rating (Phân loại)</label>
                            <select name="leadRating" value={formData.leadRating || '-'} onChange={handleChange} className="w-full p-2 border border-orange-200 bg-orange-50 rounded text-sm font-bold text-orange-700 outline-none focus:ring-1 focus:ring-orange-500">
                                <option value="-">-</option>
                                <option value="Hot">🔥 Hot (Nóng)</option>
                                <option value="Warm">☀️ Warm (Ấm)</option>
                                <option value="Cold">❄️ Cold (Lạnh)</option>
                                <option value="Booking">✅ Booking</option>
                            </select>
                        </div>
                        <div className="space-y-1"><label className="text-[10px] text-gray-500 font-bold uppercase">Dòng xe</label><select name="carModel" value={formData.carModel || ''} onChange={handleChange} className="w-full p-2 border rounded text-sm bg-white outline-none"><option value="">-- Chọn --</option>{config.carModels?.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                        <div className="space-y-1"><label className="text-[10px] text-gray-500 font-bold uppercase">Phiên bản</label><select name="version" value={formData.version || ''} onChange={handleChange} className="w-full p-2 border rounded text-sm bg-white outline-none"><option value="">-- Chọn --</option>{config.versions?.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                        <div className="space-y-1"><label className="text-[10px] text-gray-500 font-bold uppercase">Nguồn</label><select name="source" value={formData.source || ''} onChange={handleChange} className="w-full p-2 border rounded text-sm bg-white outline-none"><option value="">-- Chọn --</option>{config.sources?.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                        <div className="space-y-1"><label className="text-[10px] text-gray-500 font-bold uppercase">Kênh</label><select name="channel" value={formData.channel || ''} onChange={handleChange} className="w-full p-2 border rounded text-sm bg-white outline-none"><option value="">-- Chọn --</option>{config.channels?.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="border rounded-lg p-4 border-blue-200 bg-blue-50/30">
                        <h4 className="text-xs font-bold text-blue-600 uppercase mb-2 flex items-center gap-2"><MessageSquare size={14} /> Ghi chú TVBH</h4>
                        <div className="bg-white p-3 rounded border border-blue-100 text-xs text-gray-700 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono mb-2">{customer.saleNote || <span className="text-gray-400 italic">Chưa có ghi chú.</span>}</div>
                        {roleLevel === 1 && (<textarea name="newNote" value={formData.newNote || ''} onChange={handleChange} className="w-full p-2 border-2 border-blue-200 rounded text-sm focus:border-blue-500 outline-none min-h-[60px]" placeholder="Nhập ghi chú TVBH..."></textarea>)}
                    </div>

                    {roleLevel >= 2 && (
                        <div className="border rounded-lg p-4 border-orange-200 bg-orange-50/30">
                            <h4 className="text-xs font-bold text-orange-600 uppercase mb-2 flex items-center gap-2"><ShieldCheck size={14} /> Ý kiến TPKD</h4>
                            <div className="bg-white p-3 rounded border border-orange-100 text-xs text-gray-700 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono mb-2">{customer.tpkdNote || <span className="text-gray-400 italic">Chưa có ý kiến.</span>}</div>
                            {roleLevel === 2 && <textarea name="newNote" value={formData.newNote || ''} onChange={handleChange} className="w-full p-2 border-2 border-orange-200 rounded text-sm focus:border-orange-500 outline-none min-h-[60px]" placeholder="Nhập chỉ đạo TPKD..."></textarea>}
                        </div>
                    )}

                    {roleLevel === 3 && (
                        <div className="border rounded-lg p-4 border-red-200 bg-red-50/30">
                            <h4 className="text-xs font-bold text-red-600 uppercase mb-2 flex items-center gap-2"><ShieldAlert size={14} /> Ý kiến Giám đốc</h4>
                            <div className="bg-white p-3 rounded border border-red-100 text-xs text-gray-700 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono mb-2">{customer.mNote || <span className="text-gray-400 italic">Chưa có ý kiến.</span>}</div>
                            <textarea name="newNote" value={formData.newNote || ''} onChange={handleChange} className="w-full p-2 border-2 border-red-200 rounded text-sm focus:border-red-500 outline-none min-h-[60px]" placeholder="Nhập ý kiến Ban Giám Đốc..."></textarea>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 border-t bg-white shrink-0 pb-safe">
                <button onClick={handleSubmit} disabled={loadingSave || isSaving} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 text-sm disabled:opacity-50 active:scale-95 transition">{(loadingSave || isSaving) ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} LƯU HỒ SƠ KHÁCH HÀNG</button>
            </div>

            {isContactMenuOpen && (
                <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setIsContactMenuOpen(false)}>
                    <div className="bg-white w-full max-w-xs rounded-2xl overflow-hidden shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="text-center"><h3 className="font-bold text-gray-800 text-lg">Liên hệ</h3><p className="text-sm text-gray-500">{formData.phone}</p></div>
                        <a href={`tel:${formData.phone}`} className="flex items-center justify-center gap-3 w-full bg-green-100 text-green-700 py-3.5 rounded-xl font-bold hover:bg-green-200 transition active:scale-95"><Phone size={20} /> Gọi trực tiếp</a>
                        <a href={`https://zalo.me/${formData.phone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-3 w-full bg-blue-100 text-blue-700 py-3.5 rounded-xl font-bold hover:bg-blue-200 transition active:scale-95"><MessageCircle size={20} /> Chat Zalo</a>
                        <button onClick={() => setIsContactMenuOpen(false)} className="w-full py-3 text-gray-500 font-medium hover:bg-gray-50 rounded-xl">Đóng</button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- COMPONENT CHÍNH ---
const CustomerList = () => {
    const { customers, loadingCustomers, fetchCustomers, addCustomerSilent, updateCustomerOptimistic, config } = useData();

    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState({ start: new Date().toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] });

    // STATE VIEW MODE: 'list' (Thẻ) | 'table' (Bảng)
    const [viewMode, setViewMode] = useState('list');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [filters, setFilters] = useState({ carModel: '', source: '', department: '', status: '', saleName: '', leadRating: '' });

    const sidebarRef = useRef(null);
    const isResizing = useRef(false);

    const startResizing = useCallback((e) => { e.preventDefault(); isResizing.current = true; document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', stopResizing); document.body.style.cursor = 'col-resize'; }, []);
    const stopResizing = useCallback(() => { isResizing.current = false; document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', stopResizing); document.body.style.cursor = ''; }, []);
    const handleMouseMove = useCallback((e) => { if (isResizing.current && sidebarRef.current && viewMode === 'list') { let newWidth = e.clientX; if (newWidth < 320) newWidth = 320; if (newWidth > 600) newWidth = 600; sidebarRef.current.style.width = `${newWidth}px`; } }, [viewMode]);

    // KHỞI TẠO: Mặc định lấy từ đầu tháng
    useEffect(() => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const formatDate = (date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };
        const range = { start: formatDate(start), end: formatDate(end) };
        setDateRange(range);
        fetchCustomers(false, range.start, range.end);
    }, []);

    const getDaysDiff = (dStr) => {
        if (!dStr || !String(dStr).includes('/')) return 999;
        try { const [d, m, y] = String(dStr).split('/'); return Math.floor((new Date() - new Date(y, m - 1, d)) / (86400000)); } catch { return 999; }
    };

    useEffect(() => {
        let res = customers || [];

        // --- LOGIC PHÂN QUYỀN TẠI CLIENT ---
        const user = authService.getCurrentUser();
        if (user) {
            const role = String(user.role || '').toLowerCase().trim();
            const userDepartment = String(user.department || user.pkd || '').trim();
            const userId = String(user.id || '').trim();
            const userName = String(user.name || '').toLowerCase().trim();

            const isManager = role.includes('manager') || role.includes('admin') || role.includes('giám đốc') || role.includes('quản lý');
            const isTPKD = role.includes('tpkd') || role.includes('trưởng phòng');

            if (isManager) {
            } else if (isTPKD) {
                if (userDepartment) {
                    res = res.filter(c => String(c.department || '').trim() === userDepartment);
                } else res = [];
            } else {
                res = res.filter(c =>
                    (userId && String(c.staffId || c.saleId || '').trim() === userId) ||
                    (userName && String(c.saleName || c.pic || '').toLowerCase().trim() === userName)
                );
            }
        }

        // --- TÌM KIẾM THÔNG MINH (Smart Search) ---
        if (searchTerm) {
            const keywords = searchTerm.toLowerCase().trim().split(' ').filter(k => k.length > 0);
            res = res.filter(c => {
                const ratingVal = c['LEAD RATING'] || c.leadRating || c.rating || '';
                // Phải thỏa mãn tất cả các từ khóa
                return keywords.every(keyword => (
                    String(c.customerName || '').toLowerCase().includes(keyword) ||
                    String(c.phone || '').includes(keyword) ||
                    String(c.saleNote || '').toLowerCase().includes(keyword) ||
                    String(c.saleName || '').toLowerCase().includes(keyword) ||
                    String(c.department || '').toLowerCase().includes(keyword) ||
                    String(ratingVal).toLowerCase().includes(keyword) ||
                    String(c.carModel || '').toLowerCase().includes(keyword) ||
                    String(c.source || '').toLowerCase().includes(keyword)
                ));
            });
        }

        if (filters.carModel) res = res.filter(c => c.carModel === filters.carModel);
        if (filters.source) res = res.filter(c => c.source === filters.source);
        if (filters.department) res = res.filter(c => c.department === filters.department);
        if (filters.saleName) res = res.filter(c => c.saleName === filters.saleName);
        if (filters.leadRating) {
            res = res.filter(c => {
                const rating = c.leadRating || c['LEAD RATING'] || c.rating || '-';
                return rating === filters.leadRating;
            });
        }
        if (filters.status) {
            res = res.filter(c => {
                const diff = getDaysDiff(c.lastUpdated);
                if (filters.status === 'new') return diff === 0;
                if (filters.status === 'hot') return diff >= 1 && diff <= 3;
                if (filters.status === 'warm') return diff >= 4 && diff <= 7;
                if (filters.status === 'cold') return diff > 7;
                return true;
            });
        }
        setFilteredCustomers(res);
    }, [searchTerm, filters, customers]);

    const distinctDepartments = useMemo(() => {
        const depts = (customers || []).map(c => c.department).filter(Boolean);
        return [...new Set(depts)].sort();
    }, [customers]);

    const distinctSaleNames = useMemo(() => {
        const names = (customers || []).map(c => c.saleName).filter(Boolean);
        return [...new Set(names)].sort();
    }, [customers]);

    const sourceStats = useMemo(() => {
        const stats = {};
        (filteredCustomers || []).forEach(c => { const s = c.source || 'Chưa rõ'; stats[s] = (stats[s] || 0) + 1; });
        return stats;
    }, [filteredCustomers]);

    const handleSaveChanges = async (updatedData) => {
        toast.success('Đã cập nhật hồ sơ!');

        const user = authService.getCurrentUser();
        const role = String(user?.role || '').toLowerCase();

        // Tạo một bản sao để chỉnh sửa optimistic
        let optimisticData = { ...updatedData };

        if (optimisticData.newNote && String(optimisticData.newNote).trim() !== '') {
            const now = new Date();
            const pad = (n) => n.toString().padStart(2, '0');
            const timeLog = `${pad(now.getHours())}:${pad(now.getMinutes())} ${pad(now.getDate())}/${pad(now.getMonth() + 1)}`;
            const entry = `[${user?.name || 'User'} - ${timeLog}]: ${optimisticData.newNote}`;

            if (role.includes('admin') || role.includes('giám đốc') || role.includes('manager')) {
                optimisticData.mNote = entry + '\n' + (optimisticData.mNote || '');
            } else if (role.includes('tpkd') || role.includes('trưởng phòng')) {
                optimisticData.tpkdNote = entry + '\n' + (optimisticData.tpkdNote || '');
            } else {
                optimisticData.saleNote = entry + '\n' + (optimisticData.saleNote || '');
            }
        }

        setSelectedCustomer(prev => {
            if (prev && prev.phone === optimisticData.originalPhone) {
                return { ...prev, ...optimisticData, newNote: '' };
            }
            return prev;
        });

        await updateCustomerOptimistic(optimisticData);
    };

    const handleCreateCustomer = async () => {
        // Modal sẽ tự đóng, ở đây ta chỉ cần fetch lại
        await fetchCustomers(true, dateRange.start, dateRange.end);
    };

    const handleRefresh = async () => {
        const toastId = toast.loading("Đang tải lại dữ liệu...");
        await fetchCustomers(true, dateRange.start, dateRange.end);
        toast.success("Đã tải xong!", { id: toastId });
    };

    // Hàm tính trạng thái ngày
    const getDaysInfo = (dStr) => {
        if (!dStr) return { text: 'Mới', color: 'text-green-600', bg: 'bg-green-50' };
        const diff = getDaysDiff(dStr);
        if (diff === 0) return { text: 'Hôm nay', color: 'text-green-600', bg: 'bg-green-50' };
        if (diff <= 3) return { text: `${diff} ngày`, color: 'text-blue-600', bg: 'bg-blue-50' };
        if (diff <= 7) return { text: `${diff} ngày`, color: 'text-orange-600', bg: 'bg-orange-50' };
        return { text: `${diff} ngày`, color: 'text-red-600', bg: 'bg-red-50' };
    };

    const getLatestNote = (note) => note ? String(note).split('\n')[0] : "Chưa có ghi chú";

    // --- HÀM COPY MỚI (CHỐNG LỖI CẤU TRÚC BẢNG) ---
    const handleCopyTable = () => {
        if (!filteredCustomers || filteredCustomers.length === 0) {
            toast.error('Không có dữ liệu để copy!');
            return;
        }

        // Tạo Header chuẩn
        const headers = ['STT', 'NGÀY TẠO', 'TÊN KH', 'SĐT', 'LEAD RATING', 'TÊN NHÂN VIÊN', 'PHÒNG BAN', 'LOẠI XE', 'NGUỒN', 'KÊNH', 'TRẠNG THÁI', 'GHI CHÚ'];
        let dataString = headers.join('\t') + '\n';

        // Lấy dữ liệu trực tiếp từ Array (Đảm bảo không dính thẻ HTML hay khoảng trắng dư)
        filteredCustomers.forEach((c, i) => {
            const dayInfo = getDaysInfo(c.lastUpdated);
            const rating = c.leadRating || c['LEAD RATING'] || c.rating || '-';

            // Xóa các ký tự xuống dòng trong ghi chú để không làm vỡ cấu trúc dòng của Excel
            const cleanNote = (getLatestNote(c.saleNote) || '').replace(/\r?\n|\r/g, ' ').trim();

            const rowData = [
                i + 1,
                c.date || '',
                c.customerName || '',
                c.phone || '',
                rating,
                c.saleName || '',
                c.department || '',
                c.carModel || '',
                c.source || '',
                c.channel || '',
                dayInfo.text || '',
                cleanNote
            ];
            dataString += rowData.join('\t') + '\n';
        });

        navigator.clipboard.writeText(dataString)
            .then(() => toast.success('Đã copy dữ liệu bảng!'))
            .catch(() => toast.error('Copy thất bại!'));
    };

    // --- RENDER PHẦN HEADER DÙNG CHUNG ---
    const renderHeaderControls = (fullWidth = false) => (
        <div className={`p-3 border-b space-y-2 bg-white z-10 shadow-sm border-t-0 ${fullWidth ? 'rounded-t-lg' : ''}`}>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2">DS KHÁCH HÀNG <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">{filteredCustomers.length}</span></h2>

                    {/* NÚT CHUYỂN ĐỔI CHẾ ĐỘ XEM */}
                    <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200 shadow-sm">
                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-white text-blue-600 shadow' : 'text-gray-400 hover:text-gray-600'}`} title="Chế độ Thẻ (List)"><LayoutList size={14} /></button>
                        <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${viewMode === 'table' ? 'bg-white text-blue-600 shadow' : 'text-gray-400 hover:text-gray-600'}`} title="Chế độ Bảng (Table)"><Table size={14} /></button>
                    </div>
                </div>

                <div className="flex gap-2">
                    {/* Nút copy chỉ hiện ở chế độ bảng */}
                    {viewMode === 'table' && filteredCustomers.length > 0 && (
                        <button onClick={handleCopyTable} className="hidden md:flex bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 font-bold py-1.5 px-3 rounded shadow-sm items-center gap-1 text-xs transition active:scale-95">
                            <Copy size={14} /> Copy Bảng
                        </button>
                    )}
                    <button onClick={handleRefresh} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><RefreshCw size={18} /></button>
                    <button onClick={() => setIsAddModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white p-1.5 rounded shadow"><Plus size={18} /></button>
                </div>
            </div>
            <div className="flex gap-2 items-center bg-gray-50 p-1.5 rounded border">
                <input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} className="border rounded text-xs px-2 py-1 outline-none w-full" />
                <span className="text-gray-400">-</span>
                <input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} className="border rounded text-xs px-2 py-1 outline-none w-full" />
                <button onClick={handleRefresh} className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Xem</button>
            </div>
            {filteredCustomers.length > 0 && viewMode === 'list' && (
                <div className="flex flex-wrap gap-2 text-[10px] bg-blue-50 border border-blue-100 p-2 rounded">
                    <span className="flex items-center gap-1 font-bold text-blue-700"><PieChart size={10} /> Nguồn:</span>
                    {Object.entries(sourceStats).map(([key, count]) => (<span key={key} className="bg-white px-1.5 py-0.5 rounded border border-blue-100 text-gray-600 shadow-sm">{key}: <b className="text-blue-600">{count}</b></span>))}
                </div>
            )}
            <div className="relative"><Search className="absolute left-2 top-2 text-gray-400 w-4 h-4" /><input placeholder="Tìm: Tên, SĐT, Note, NV, Lead Rating, Phòng ban..." className="pl-8 border rounded text-sm w-full py-1.5 outline-none bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-400" onChange={e => setSearchTerm(e.target.value)} /></div>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth whitespace-nowrap">
                <select className="border rounded px-2 py-1 text-xs bg-white outline-none min-w-[90px]" value={filters.source} onChange={e => setFilters({ ...filters, source: e.target.value })}><option value="">--Nguồn--</option>{config.sources?.map((s, i) => <option key={i} value={s}>{s}</option>)}</select>
                <select className="border rounded px-2 py-1 text-xs bg-white outline-none min-w-[80px]" value={filters.carModel} onChange={e => setFilters({ ...filters, carModel: e.target.value })}><option value="">--Xe--</option>{config.carModels?.map((c, i) => <option key={c} value={c}>{c}</option>)}</select>
                <select className="border rounded px-2 py-1 text-xs bg-white outline-none min-w-[100px]" value={filters.department} onChange={e => setFilters({ ...filters, department: e.target.value })}><option value="">--Phòng ban--</option>{distinctDepartments.map((d, i) => <option key={i} value={d}>{d}</option>)}</select>
                <select className="border rounded px-2 py-1 text-xs bg-white outline-none min-w-[100px]" value={filters.saleName} onChange={e => setFilters({ ...filters, saleName: e.target.value })}><option value="">--Tên NV--</option>{distinctSaleNames.map((n, i) => <option key={i} value={n}>{n}</option>)}</select>
                <select className="border rounded px-2 py-1 text-xs bg-white outline-none min-w-[100px]" value={filters.leadRating} onChange={e => setFilters({ ...filters, leadRating: e.target.value })}>
                    <option value="">--Rating--</option>
                    <option value="Hot">🔥 Hot</option>
                    <option value="Warm">☀️ Warm</option>
                    <option value="Cold">❄️ Cold</option>
                    <option value="Booking">✅ Booking</option>
                    <option value="-">-</option>
                </select>
                <select className="border rounded px-2 py-1 text-xs bg-white outline-none min-w-[100px]" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
                    <option value="">--Trạng thái--</option>
                    <option value="new">🟢 Hôm nay</option>
                    <option value="hot">🔵 1-3 ngày</option>
                    <option value="warm">🟠 4-7 ngày</option>
                    <option value="cold">🔴 &gt; 7 ngày</option>
                </select>
            </div>
        </div>
    );

    return (
        <div className="h-[calc(100vh-80px)] flex flex-col md:flex-row bg-gray-100 overflow-hidden rounded-lg border border-gray-200 shadow-sm">

            {/* ==================== VIEW MODE: LIST (Dạng Thẻ) ==================== */}
            {viewMode === 'list' && (
                <>
                    <div ref={sidebarRef} className="flex flex-col bg-slate-100 h-full w-full md:w-[380px] shrink-0 overflow-hidden" style={{ minWidth: '320px' }}>
                        {renderHeaderControls(false)}
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {loadingCustomers ? <div className="p-10 text-center"><Loader2 className="animate-spin inline text-green-600" /></div> :
                                filteredCustomers.map((c, i) => {
                                    const dayInfo = getDaysInfo(c.lastUpdated);
                                    const isActive = selectedCustomer?.phone === c.phone;
                                    const cardClass = isActive ? 'bg-green-50 ring-2 ring-green-500 shadow-md transform scale-[1.01]' : 'bg-white border border-transparent hover:border-green-300 hover:shadow-md hover:-translate-y-0.5 shadow-sm';
                                    const rating = c.leadRating || c['LEAD RATING'] || c.rating || '-';
                                    return (
                                        <div key={i} onClick={() => setSelectedCustomer(c)} className={`p-3 rounded-lg cursor-pointer transition-all duration-200 relative group ${cardClass}`}>
                                            <div className="flex items-center justify-between mb-2 pb-1 border-b border-dashed border-gray-100">
                                                <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">{c.department || 'N/A'}</span>
                                                <span className="text-[10px] text-gray-500 font-medium flex items-center gap-1"><User size={10} /> {c.saleName || 'Sale'}</span>
                                            </div>
                                            <div className="text-[10px] text-gray-400 mb-1 flex items-center gap-1"><Calendar size={10} /> <span className="font-medium text-gray-500">{c.date}</span></div>
                                            <div className="flex justify-between items-start mb-1 mt-1">
                                                <h4 className={`text-sm font-bold ${isActive ? 'text-green-800' : 'text-gray-800'}`}>{c.customerName}</h4>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap ${dayInfo.bg} ${dayInfo.color}`}>{dayInfo.text}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs mb-2">
                                                <span className="text-blue-600 font-mono font-medium tracking-tight">{c.phone}</span>
                                                <span className="text-gray-500 font-medium flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded"><Car size={10} /> {c.carModel}</span>
                                            </div>
                                            {rating !== '-' && (
                                                <div className="flex items-center gap-1 mb-1">
                                                    <span className={`text-[10px] font-bold px-1.5 rounded border flex items-center gap-1 ${rating === 'Hot' ? 'bg-red-100 text-red-600 border-red-200' : rating === 'Warm' ? 'bg-orange-100 text-orange-600 border-orange-200' : rating === 'Booking' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}><Star size={8} fill="currentColor" /> {rating}</span>
                                                </div>
                                            )}
                                            <div className="text-[11px] text-gray-500 line-clamp-1 italic flex items-center gap-1"><MessageSquare size={10} className="shrink-0 text-gray-400" /> {getLatestNote(c.saleNote)}</div>
                                        </div>
                                    )
                                })
                            }
                        </div>
                    </div>
                    {/* Thanh kéo chỉnh độ rộng Sidebar (Desktop) */}
                    <div className="hidden md:flex w-[4px] bg-gray-200 hover:bg-green-500 cursor-col-resize items-center justify-center transition-colors shrink-0 z-20" onMouseDown={startResizing}><GripVertical size={12} className="text-gray-400" /></div>

                    {/* DETAIL PANE CHO LIST VIEW (Có Sidepane trên Desktop, Full modal trên Mobile) */}
                    <div className={`fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 md:static md:bg-transparent md:p-0 md:flex-1 md:h-full md:flex-col md:items-stretch ${selectedCustomer ? 'flex' : 'hidden md:flex'}`}>
                        <div className={`bg-white w-full flex flex-col relative rounded-xl shadow-2xl overflow-hidden h-[85vh] md:max-h-full md:h-full md:rounded-none md:shadow-none`}>
                            <button onClick={() => setSelectedCustomer(null)} className="md:hidden absolute top-3 right-3 z-50 p-2 bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-500 rounded-full transition shadow-sm"><X size={20} /></button>
                            <CustomerDetailPane customer={selectedCustomer} config={config} onSave={handleSaveChanges} loadingSave={false} onClose={() => setSelectedCustomer(null)} />
                        </div>
                    </div>
                </>
            )}

            {/* ==================== VIEW MODE: TABLE (Dạng Bảng) ==================== */}
            {viewMode === 'table' && (
                <div className="flex flex-col h-full w-full bg-white relative">
                    {renderHeaderControls(true)}
                    <div className="flex-1 overflow-auto bg-gray-50 p-3">
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden h-full flex flex-col">
                            <div className="overflow-x-auto flex-1 pb-4">
                                <table id="customer-table-export" className="w-full text-xs text-left border-collapse min-w-max">
                                    <thead className="bg-gray-100 text-gray-700 font-bold sticky top-0 z-10 shadow-sm border-b border-gray-200">
                                        <tr>
                                            <th className="p-3 border-r text-center w-12">STT</th>
                                            <th className="p-3 border-r">NGÀY TẠO</th>
                                            {/* ĐÃ TÁCH TÊN KH VÀ SĐT LÀM 2 CỘT */}
                                            <th className="p-3 border-r">TÊN KH</th>
                                            <th className="p-3 border-r">SĐT</th>
                                            <th className="p-3 border-r text-center">LEAD RATING</th>
                                            <th className="p-3 border-r">TÊN NHÂN VIÊN</th>
                                            <th className="p-3 border-r">PHÒNG BAN</th>
                                            <th className="p-3 border-r">LOẠI XE</th>
                                            <th className="p-3 border-r">NGUỒN</th>
                                            <th className="p-3 border-r">KÊNH</th>
                                            <th className="p-3 border-r text-center">TRẠNG THÁI</th>
                                            <th className="p-3 max-w-[200px]">GHI CHÚ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white">
                                        {loadingCustomers ? (
                                            <tr><td colSpan="12" className="p-10 text-center"><Loader2 className="animate-spin inline text-green-600" /> Đang tải dữ liệu...</td></tr>
                                        ) : filteredCustomers.length === 0 ? (
                                            <tr><td colSpan="12" className="p-10 text-center text-gray-500 italic">Không tìm thấy dữ liệu.</td></tr>
                                        ) : (
                                            filteredCustomers.map((c, i) => {
                                                const dayInfo = getDaysInfo(c.lastUpdated);
                                                const rating = c.leadRating || c['LEAD RATING'] || c.rating || '-';

                                                return (
                                                    <tr key={i} onClick={() => setSelectedCustomer(c)} className="border-b even:bg-gray-50 odd:bg-white hover:bg-blue-50 cursor-pointer transition-colors group">
                                                        <td className="p-3 border-r text-center text-gray-500">{i + 1}</td>
                                                        <td className="p-3 border-r font-mono text-gray-600">{c.date}</td>
                                                        {/* ĐÃ TÁCH TÊN KH VÀ SĐT LÀM 2 Ô DỮ LIỆU */}
                                                        <td className="p-3 border-r font-bold text-gray-800">{c.customerName}</td>
                                                        <td className="p-3 border-r text-blue-600 font-mono">{c.phone}</td>
                                                        <td className="p-3 border-r text-center">
                                                            {rating !== '-' ? (
                                                                <span className={`text-[10px] font-bold px-2 py-1 rounded border inline-flex items-center gap-1 ${rating === 'Hot' ? 'bg-red-100 text-red-600 border-red-200' : rating === 'Warm' ? 'bg-orange-100 text-orange-600 border-orange-200' : rating === 'Booking' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}><Star size={10} fill="currentColor" /> {rating}</span>
                                                            ) : <span className="text-gray-400">-</span>}
                                                        </td>
                                                        <td className="p-3 border-r font-medium text-gray-700">{c.saleName}</td>
                                                        <td className="p-3 border-r text-gray-600">{c.department}</td>
                                                        <td className="p-3 border-r font-bold text-gray-700">{c.carModel}</td>
                                                        <td className="p-3 border-r text-gray-600">{c.source}</td>
                                                        <td className="p-3 border-r text-gray-600">{c.channel}</td>
                                                        <td className="p-3 border-r text-center">
                                                            <span className={`text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap ${dayInfo.bg} ${dayInfo.color}`}>{dayInfo.text}</span>
                                                        </td>
                                                        <td className="p-3 text-gray-500 max-w-[200px] truncate" title={c.saleNote}>{getLatestNote(c.saleNote)}</td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* MODAL CHI TIẾT KHI CLICK VÀO BẢNG (Popup giống Mobile) */}
                    {selectedCustomer && (
                        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200">
                            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col relative animate-in zoom-in-95 duration-200">
                                <CustomerDetailPane
                                    customer={selectedCustomer}
                                    config={config}
                                    onSave={handleSaveChanges}
                                    loadingSave={false}
                                    onClose={() => setSelectedCustomer(null)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL TẠO MỚI KHÁCH HÀNG */}
            <CustomerFormModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSuccess={handleCreateCustomer} />
        </div>
    );
};

export default CustomerList;