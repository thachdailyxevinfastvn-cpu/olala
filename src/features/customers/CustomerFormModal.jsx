import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Plus, Trash2, MapPin, Phone, User, Car, Tag, FileText, Loader2, Star, Users, Sparkles } from 'lucide-react';
import { customerService } from './customerService';
import { authService } from '../auth/authService';
import toast from 'react-hot-toast';

const CustomerFormModal = ({ isOpen, onClose, onSuccess, isAssignMode }) => {
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [config, setConfig] = useState({ carModels: [], versions: [], sources: [], channels: [], locations: [] });
    const [suggestions, setSuggestions] = useState({ rowId: null, list: [] });
    const [staffList, setStaffList] = useState([]); // List nhân viên TVBH
    const [assignee, setAssignee] = useState(null); // Người được phân (Obj)
    const [canAssign, setCanAssign] = useState(false); // Quyền phân khách
    const wrapperRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setRows([createEmptyRow()]);
            fetchConfig();
            checkPermissionAndFetchStaff();
        } else {
            setAssignee(null); // Reset khi đóng
        }
    }, [isOpen]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setSuggestions({ rowId: null, list: [] });
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchConfig = async () => {
        try { const res = await customerService.getConfig(); if (res.status === 'success') setConfig(res.data); } catch (e) { }
    };

    const checkPermissionAndFetchStaff = async () => {
        const user = authService.getCurrentUser();
        const role = String(user?.role || '').toLowerCase();
        // Chỉ TPKD hoặc Manager mới hiện ô phân khách
        if (role.includes('manager') || role.includes('admin') || role.includes('giám đốc') || role.includes('tpkd') || role.includes('trưởng phòng')) {
            setCanAssign(true);
            try {
                const res = await customerService.getStaffList();
                if (res.status === 'success') {
                    // Chỉ lấy TVBH (theo yêu cầu)
                    const tvbh = res.data.filter(s => String(s.role || '').toLowerCase().includes('tvbh') || String(s.department || '').includes('KD'));
                    setStaffList(tvbh);
                }
            } catch (e) { console.error(e); }
        } else {
            setCanAssign(false);
        }
    };

    const createEmptyRow = () => ({
        id: Date.now() + Math.random(),
        customerName: '', phone: '', ward: '', province: '',
        carModel: '', version: '', source: 'Hãng', channel: 'Facebook', saleNote: '',
        leadRating: '-', assigneeEmail: '', assigneeRole: '', assigneeDept: ''
    });

    const handleRowChange = (id, field, value) => {
        setRows(prev => prev.map(r => {
            if (r.id !== id) return r;
            if (field === 'phone') {
                return { ...r, phone: value.replace(/\D/g, '') };
            }
            // Logic Auto-fill Assignee Info
            if (field === 'assigneeEmail') {
                const staff = staffList.find(s => s.email === value);
                return {
                    ...r,
                    assigneeEmail: value,
                    assigneeRole: staff ? (staff.role || 'TVBH') : '',
                    assigneeDept: staff ? (staff.department || staff.pkd || staff.dept || '') : ''
                };
            }
            const upd = { ...r, [field]: value };
            if (field === 'ward' && value.length > 1) {
                const m = (config.locations || []).filter(l => l.ward.toLowerCase().includes(value.toLowerCase())).slice(0, 5);
                setSuggestions({ rowId: id, list: m });
            }
            return upd;
        }));
    };

    const handleSelectSuggestion = (rid, loc) => {
        setRows(prev => prev.map(r => r.id === rid ? { ...r, ward: loc.ward, province: loc.province } : r));
        setSuggestions({ rowId: null, list: [] });
    };

    const handleAddRow = () => setRows([...rows, createEmptyRow()]);

    const handleSmartPaste = (rowId, rawText) => {
        if (!rawText || !rawText.trim()) return;

        // 1. Loại bỏ các URL links và chuẩn hóa chuỗi
        let processedText = rawText.replace(/https?:\/\/[^\s]+/g, ' ');
        processedText = processedText.replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

        const extractedData = {};

        // 2. Tìm SĐT để làm mốc chia đôi chuỗi (Trước SĐT là Tên+Địa chỉ, Sau là Ghi chú)
        const phoneRegex = /(?:0|\+84)\s*[1-9](?:\s*\d){8}/g;
        const phoneMatches = processedText.match(phoneRegex);

        let namePart = "";
        let notePart = "";

        if (phoneMatches && phoneMatches.length > 0) {
            const phoneStr = phoneMatches[0];
            let phoneNoSpace = phoneStr.replace(/\D/g, '');
            if (phoneNoSpace.length === 9) phoneNoSpace = "0" + phoneNoSpace;
            extractedData.phone = phoneNoSpace;

            const phoneIndex = processedText.indexOf(phoneStr);
            namePart = processedText.substring(0, phoneIndex);
            notePart = processedText.substring(phoneIndex + phoneStr.length);
        } else {
            namePart = processedText;
            notePart = "";
        }

        // 3. Tìm tên nhân viên (Assignee) nếu đang ở Mode Phân Khách
        if (isAssignMode && staffList.length > 0) {
            const sortedStaffs = [...staffList].sort((a, b) => (b.name || '').length - (a.name || '').length);
            for (const staff of sortedStaffs) {
                if (!staff.name) continue;
                const rgx = new RegExp(staff.name, 'i');
                if (rgx.test(namePart)) {
                    extractedData.assigneeEmail = staff.email;
                    extractedData.assigneeRole = staff.role || 'TVBH';
                    extractedData.assigneeDept = staff.department || staff.pkd || staff.dept || '';
                    namePart = namePart.replace(rgx, ' ');
                    break;
                } else if (rgx.test(notePart)) {
                    extractedData.assigneeEmail = staff.email;
                    extractedData.assigneeRole = staff.role || 'TVBH';
                    extractedData.assigneeDept = staff.department || staff.pkd || staff.dept || '';
                    notePart = notePart.replace(rgx, ' ');
                    break;
                }
            }
        }

        // 4. Tìm dòng xe
        if (config.carModels && config.carModels.length > 0) {
            const sortedCars = [...config.carModels].sort((a, b) => b.length - a.length);
            for (const car of sortedCars) {
                const rgx = new RegExp(car, 'i');
                if (rgx.test(namePart)) {
                    extractedData.carModel = car;
                    namePart = namePart.replace(rgx, ' ');
                    break;
                } else if (rgx.test(notePart)) {
                    extractedData.carModel = car;
                    notePart = notePart.replace(rgx, ' ');
                    break;
                }
            }
        }

        // Cắt bỏ chữ "Skoda" dư thừa (vì nó chỉ là tên prefix hãng, gây nhiễu tên KH)
        namePart = namePart.replace(/skoda/ig, ' ');
        notePart = notePart.replace(/skoda/ig, ' ');

        // 5. Cập nhật Tên và Note dựa trên mốc SĐT
        let finalName = namePart.replace(/\s+/g, ' ').trim();
        let finalNote = notePart.replace(/\s+/g, ' ').trim();

        // Edge case: Nếu đặt số điện thoại ngay đầu, thì namePart bị trống
        if (!finalName && finalNote) {
            const words = finalNote.split(' ');
            const nameLen = Math.min(words.length, 4);
            const hasNumber = /\d/.test(words.slice(0, nameLen).join(' '));
            if (!hasNumber) {
                finalName = words.slice(0, nameLen).join(' ');
                finalNote = words.slice(nameLen).join(' ');
            }
        }

        extractedData.customerName = finalName;
        extractedData.saleNote = finalNote;

        // 6. Cập nhật State cho Row hiện tại thay vì thay thế toàn bộ Row mới
        setRows(prev => prev.map(r => {
            if (r.id !== rowId) return r;
            return {
                ...r,
                ...extractedData,
                // Ưu tiên dùng dữ liệu cũ nếu trích xuất ko ra
                phone: extractedData.phone !== undefined ? extractedData.phone : r.phone,
                assigneeEmail: extractedData.assigneeEmail !== undefined ? extractedData.assigneeEmail : r.assigneeEmail,
                carModel: extractedData.carModel !== undefined ? extractedData.carModel : r.carModel,
                customerName: extractedData.customerName !== undefined ? extractedData.customerName : r.customerName,
                saleNote: extractedData.saleNote !== undefined ? extractedData.saleNote : r.saleNote
            };
        }));
    };

    const handleRemoveRow = (id) => {
        if (rows.length > 1) setRows(rows.filter(r => r.id !== id));
        else toast.error('Cần ít nhất 1 dòng');
    };

    // --- HÀM XỬ LÝ LƯU ---
    const handleSubmit = async () => {
        const validRows = rows.filter(r =>
            r.customerName && String(r.customerName).trim() !== '' &&
            r.phone && String(r.phone).trim() !== ''
        );

        if (validRows.length === 0) {
            toast.error("Vui lòng nhập ít nhất 1 khách hàng với đầy đủ Tên và SĐT");
            return;
        }

        // Validate if assign mode is on, every row must have an assignee
        if (isAssignMode) {
            const missingAssignee = validRows.some(r => !r.assigneeEmail);
            if (missingAssignee) {
                toast.error("Vui lòng chọn Người nhận cho tất cả khách hàng (chế độ Phân Khách).");
                return;
            }
        }

        setLoading(true);
        const toastId = toast.loading("Đang lưu dữ liệu...");

        try {
            const payload = validRows.map(row => {
                const { id, ...data } = row;
                return {
                    ...data,
                    "LEAD RATING": data.leadRating || '-'
                };
            });

            let result;
            // Nếu ở chế độ Phân khách -> Gọi API Phân khách (payload đã có assigneeEmail)
            if (isAssignMode) {
                result = await customerService.createAssignedCustomer(payload);
            } else {
                // Ngược lại -> Lưu bình thường (loại bỏ assigneeEmail nếu có)
                const cleanPayload = payload.map(({ assigneeEmail, ...rest }) => rest);
                result = await customerService.addCustomers(cleanPayload);
            }

            if (result.status === 'success' || result.success) {
                // Đóng popup trước để danh sách hiển thị
                onClose();

                if (isAssignMode) {
                    toast.success(`Đã phân bổ thành công ${validRows.length} khách!`, { id: toastId });
                    if (onSuccess) await onSuccess(result.data);
                } else {
                    toast.loading(`Đang tải lại danh sách...`, { id: toastId });
                    if (onSuccess) {
                        await onSuccess(result.data); // Đợi tải danh sách mới
                    }
                    toast.success(`Đã thêm và hiển thị khách hàng!`, { id: toastId });
                }

                setRows([createEmptyRow()]);
            } else {
                throw new Error(result.message || "Lỗi không xác định từ Server");
            }
        } catch (error) {
            console.error("Lỗi lưu:", error);
            toast.error("Lưu thất bại: " + error.message, { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[95vh] overflow-hidden" ref={wrapperRef}>
                <div className="px-6 py-4 border-b flex justify-between items-center bg-white">
                    <h3 className="text-xl font-bold text-gray-800">
                        {isAssignMode ? 'Phân Bổ Khách Hàng Mới' : 'Thêm Khách Hàng'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                </div>

                {/* THANH CÔNG CỤ PHÂN KHÁCH ĐÃ BỊ LOẠI BỎ (Move down to per row) */}

                <div id="rows-container" className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
                    {rows.map((row, idx) => (
                        <div key={row.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 relative group">
                            {rows.length > 1 && <button onClick={() => handleRemoveRow(row.id)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={18} /></button>}
                            <div className="mb-2 text-xs font-bold text-blue-600"> KHÁCH HÀNG #{idx + 1}</div>

                            <div className="mb-3 bg-purple-50 p-2 rounded border border-purple-200">
                                <label className="text-xs font-bold text-purple-700 mb-1 flex items-center gap-1">
                                    <Sparkles size={14} /> Dán nhanh nội dung tổng hợp (Smart Paste)
                                </label>
                                <textarea
                                    placeholder="VD: Trần Xuân Bình Biên Hòa Skoda Kodiaq 0987654321 Nguyễn Hoàng Thạch"
                                    className="w-full text-xs p-2 border border-purple-300 rounded outline-none focus:ring-1 focus:ring-purple-500 min-h-[50px] resize-none bg-white"
                                    onChange={(e) => handleSmartPaste(row.id, e.target.value)}
                                ></textarea>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                <div className="md:col-span-4 space-y-3">
                                    {/* ASSIGNEE DROPDOWN (ONLY VISIBLE IN ASSIGN MODE) */}
                                    {isAssignMode && (
                                        <div className="space-y-2 mb-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                            <div className="relative">
                                                <Users className="absolute left-3 top-2.5 text-blue-500 w-4 h-4" />
                                                <select
                                                    value={row.assigneeEmail}
                                                    onChange={(e) => handleRowChange(row.id, 'assigneeEmail', e.target.value)}
                                                    className={`w-full pl-9 pr-3 py-2 border border-blue-200 bg-white rounded text-sm outline-none font-bold text-blue-800 focus:ring-2 focus:ring-blue-300 ${!row.assigneeEmail && 'border-red-300'}`}
                                                >
                                                    <option value="">-- Chọn Nhân Viên (*)--</option>
                                                    {staffList.map((s, i) => (
                                                        <option key={i} value={s.email}>{s.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input value={row.assigneeRole} readOnly placeholder="Chức vụ" className="bg-gray-100 text-gray-500 text-xs p-2 rounded border" />
                                                <input value={row.assigneeDept} readOnly placeholder="Phòng ban" className="bg-gray-100 text-gray-500 text-xs p-2 rounded border" />
                                            </div>
                                        </div>
                                    )}

                                    <div className="relative"><User className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" /><input value={row.customerName} onChange={(e) => handleRowChange(row.id, 'customerName', e.target.value)} placeholder="Tên KH (*)" className={`w-full pl-9 pr-3 py-2 border rounded text-sm outline-none ${!row.customerName && 'border-red-300 bg-red-50'}`} /></div>
                                    <div className="relative"><Phone className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" /><input value={row.phone} onChange={(e) => handleRowChange(row.id, 'phone', e.target.value)} placeholder="SĐT (*)" className={`w-full pl-9 pr-3 py-2 border rounded text-sm outline-none ${!row.phone && 'border-red-300 bg-red-50'}`} /></div>

                                    <div className="relative">
                                        <Star className="absolute left-3 top-2.5 text-orange-400 w-4 h-4" />
                                        <select value={row.leadRating} onChange={(e) => handleRowChange(row.id, 'leadRating', e.target.value)} className="w-full pl-9 pr-3 py-2 border border-orange-200 bg-orange-50 rounded text-sm outline-none font-medium text-orange-800">
                                            <option value="-">-- Phân loại KH --</option>
                                            <option value="Hot">🔥 Hot (Nóng)</option>
                                            <option value="Warm">☀️ Warm (Ấm)</option>
                                            <option value="Cold">❄️ Cold (Lạnh)</option>
                                            <option value="Booking">✅ Booking</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 relative">
                                        <input value={row.ward} onChange={(e) => handleRowChange(row.id, 'ward', e.target.value)} placeholder="Phường/Xã" className="border rounded px-2 py-2 text-sm w-full" />
                                        {suggestions.rowId === row.id && suggestions.list.length > 0 && (
                                            <div className="absolute top-full left-0 w-full z-50 bg-white shadow-xl border mt-1 rounded-md overflow-hidden">
                                                {suggestions.list.map((l, i) => <div key={i} onClick={() => handleSelectSuggestion(row.id, l)} className="p-2 hover:bg-green-50 cursor-pointer text-sm border-b last:border-0">{l.ward} - <span className="text-gray-500">{l.province}</span></div>)}
                                            </div>
                                        )}
                                        <input value={row.province} readOnly placeholder="Tỉnh/TP" className="border rounded px-2 py-2 text-sm bg-gray-100" />
                                    </div>
                                </div>

                                <div className="md:col-span-4 space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <select value={row.carModel} onChange={(e) => handleRowChange(row.id, 'carModel', e.target.value)} className="border rounded p-2 text-sm w-full"><option value="">Dòng xe</option>{config.carModels?.map(c => <option key={c} value={c}>{c}</option>)}</select>
                                        <select value={row.version} onChange={(e) => handleRowChange(row.id, 'version', e.target.value)} className="border rounded p-2 text-sm w-full"><option value="">Phiên bản</option>{config.versions?.map(c => <option key={c} value={c}>{c}</option>)}</select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <select value={row.source} onChange={(e) => handleRowChange(row.id, 'source', e.target.value)} className={`border rounded p-2 text-sm w-full ${!row.source && 'border-red-300'}`}><option value="">Nguồn (*)</option>{config.sources?.map(c => <option key={c} value={c}>{c}</option>)}</select>
                                        <select value={row.channel} onChange={(e) => handleRowChange(row.id, 'channel', e.target.value)} className={`border rounded p-2 text-sm w-full ${!row.channel && 'border-red-300'}`}><option value="">Kênh (*)</option>{config.channels?.map(c => <option key={c} value={c}>{c}</option>)}</select>
                                    </div>
                                </div>

                                <div className="md:col-span-4">
                                    <textarea value={row.saleNote} onChange={(e) => handleRowChange(row.id, 'saleNote', e.target.value)} placeholder="Ghi chú (*)..." className={`border rounded p-2 text-sm w-full h-full min-h-[100px] resize-none ${!row.saleNote.trim() && 'border-red-300 bg-red-50'}`}></textarea>
                                </div>
                            </div>
                        </div>
                    ))}

                    <button onClick={handleAddRow} className="w-full py-3 border-2 border-dashed rounded text-gray-500 hover:text-green-600 flex justify-center gap-2"><Plus /> Thêm dòng</button>
                </div>

                <div className="p-4 border-t flex justify-end gap-3 bg-white">
                    <button onClick={onClose} className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded">Hủy</button>
                    <button onClick={handleSubmit} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-bold shadow flex gap-2 disabled:opacity-50">
                        <Loader2 size={18} className={loading ? "animate-spin" : "hidden"} /> <Save size={18} className={loading ? "hidden" : "block"} />
                        {loading ? 'ĐANG LƯU...' : (isAssignMode ? 'PHÂN KHÁCH NGAY' : 'LƯU KHÁCH HÀNG')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomerFormModal;