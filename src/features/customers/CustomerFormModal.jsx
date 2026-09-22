import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Plus, Loader2 } from 'lucide-react';
import { customerService } from './customerService';
import { authService } from '../auth/authService';
import toast from 'react-hot-toast';
import CustomerFormRow from './CustomerFormRow';

const CustomerFormModal = ({ isOpen, onClose, onSuccess, isAssignMode }) => {
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [config, setConfig] = useState({ carModels: [], versions: [], sources: [], channels: [], locations: [] });
    const [suggestions, setSuggestions] = useState({ rowId: null, list: [] });
    const [staffList, setStaffList] = useState([]); // List nhân viên TVBH
    const [canAssign, setCanAssign] = useState(false); // Quyền phân khách
    const wrapperRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setRows([createEmptyRow()]);
            fetchConfig();
            checkPermissionAndFetchStaff();
        } else {
            // Reset modal state if needed when closing
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
        try { 
            const res = await customerService.getConfig(); 
            if (res.status === 'success') setConfig(res.data); 
        } catch (e) { console.error(e); }
    };

    const checkPermissionAndFetchStaff = async () => {
        const user = authService.getCurrentUser();
        const role = String(user?.role || '').toLowerCase();
        
        if (role.includes('manager') || role.includes('admin') || role.includes('giám đốc') || role.includes('tpkd') || role.includes('trưởng phòng')) {
            setCanAssign(true);
            try {
                const res = await customerService.getStaffList();
                if (res.status === 'success') {
                    const tvbh = res.data.filter(s => s.active !== false && s.role !== 'admin');
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
        leadRating: '-', assigneeEmail: '', assigneeRole: '', assigneeDept: '',
        testDrive: 'Chưa'
    });

    const handleRowChange = (id, field, value) => {
        setRows(prev => prev.map(r => {
            if (r.id !== id) return r;
            
            if (field === 'smartPaste') {
                // value is extractedData
                return {
                    ...r,
                    ...value,
                    phone: value.phone !== undefined ? value.phone : r.phone,
                    assigneeEmail: value.assigneeEmail !== undefined ? value.assigneeEmail : r.assigneeEmail,
                    carModel: value.carModel !== undefined ? value.carModel : r.carModel,
                    customerName: value.customerName !== undefined ? value.customerName : r.customerName,
                    saleNote: value.saleNote !== undefined ? value.saleNote : r.saleNote
                };
            }

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

    const handleRemoveRow = (id) => {
        if (rows.length > 1) setRows(rows.filter(r => r.id !== id));
        else toast.error('Cần ít nhất 1 dòng');
    };

    const handleSubmit = async () => {
        const validRows = rows.filter(r =>
            r.customerName && String(r.customerName).trim() !== '' &&
            r.phone && String(r.phone).trim() !== ''
        );

        if (validRows.length === 0) {
            toast.error("Vui lòng nhập ít nhất 1 khách hàng với đầy đủ Tên và SĐT");
            return;
        }

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
            if (isAssignMode) {
                result = await customerService.createAssignedCustomer(payload);
            } else {
                const cleanPayload = payload.map(({ assigneeEmail, ...rest }) => rest);
                result = await customerService.addCustomers(cleanPayload);
            }

            if (result.status === 'success' || result.success) {
                onClose();

                if (isAssignMode) {
                    toast.success(`Đã phân bổ thành công ${validRows.length} khách!`, { id: toastId });
                    if (onSuccess) await onSuccess(result.data);
                } else {
                    toast.loading(`Đang tải lại danh sách...`, { id: toastId });
                    if (onSuccess) {
                        await onSuccess(result.data); 
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

                <div id="rows-container" className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
                    {rows.map((row, idx) => (
                        <CustomerFormRow
                            key={row.id}
                            row={row}
                            idx={idx}
                            config={config}
                            staffList={staffList}
                            isAssignMode={isAssignMode}
                            suggestions={suggestions}
                            onRowChange={handleRowChange}
                            onRemoveRow={handleRemoveRow}
                            onSelectSuggestion={handleSelectSuggestion}
                            showRemove={rows.length > 1}
                        />
                    ))}

                    <button 
                        onClick={handleAddRow} 
                        className="w-full py-3 border-2 border-dashed rounded text-gray-500 hover:text-green-600 flex justify-center gap-2"
                    >
                        <Plus /> Thêm dòng
                    </button>
                </div>

                <div className="p-4 border-t flex justify-end gap-3 bg-white">
                    <button onClick={onClose} className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded">Hủy</button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={loading} 
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-bold shadow flex gap-2 disabled:opacity-50"
                    >
                        <Loader2 size={18} className={loading ? "animate-spin" : "hidden"} /> 
                        <Save size={18} className={loading ? "hidden" : "block"} />
                        {loading ? 'ĐANG LƯU...' : (isAssignMode ? 'PHÂN KHÁCH NGAY' : 'LƯU KHÁCH HÀNG')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomerFormModal;