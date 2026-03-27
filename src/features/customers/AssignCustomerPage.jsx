import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataProvider';
import { Loader2, Phone, User, Calendar, Car, Download, Plus, RefreshCw, LayoutList, Table, Search, Users, UserPlus, Trash2 } from 'lucide-react';
import { customerService } from './customerService';
import { authService } from '../auth/authService';
import CustomerFormModal from './CustomerFormModal';
import ConfirmModal from '../../components/ui/ConfirmModal';
import toast from 'react-hot-toast';

const AssignCustomerPage = () => {
    const { assignedCustomers, loadingAssigned, fetchAssignedCustomers } = useData();

    // --- STATE ---
    const [viewMode, setViewMode] = useState('table');
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [filteredCustomers, setFilteredCustomers] = useState([]);

    const [selectedCustomer, setSelectedCustomer] = useState(null); // Cho Detail Modal
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [canAssign, setCanAssign] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, customer: null, action: 'accept' });
    const [selectedPhones, setSelectedPhones] = useState([]);
    const currentUser = authService.getCurrentUser();

    // --- INIT ---
    useEffect(() => {
        // 1. Phân quyền
        const user = authService.getCurrentUser();
        const role = String(user?.role || '').toLowerCase();
        if (role.includes('manager') || role.includes('admin') || role.includes('giám đốc') || role.includes('tpkd') || role.includes('trưởng phòng')) {
            setCanAssign(true);
        }

        // 2. Default Date Range (Tháng hiện tại - Giống CustomerList)
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const formatDate = (date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };
        setDateRange({ start: formatDate(start), end: formatDate(end) });

        // 3. Fetch Data
        fetchAssignedCustomers(false);
    }, []);

    // --- HELPER: Parse Date DD/MM/YYYY ---
    const parseDateVN = (dStr) => {
        if (!dStr || typeof dStr !== 'string') return null;
        try {
            const parts = dStr.split('/');
            if (parts.length !== 3) return null;
            const [d, m, y] = parts;
            return new Date(y, m - 1, d);
        } catch { return null; }
    };

    // --- FILTER LOGIC ---
    useEffect(() => {
        let res = assignedCustomers || [];

        // 1. Lọc theo ngày (Dựa trên NGÀY PHÂN)
        const dStart = new Date(dateRange.start); dStart.setHours(0, 0, 0, 0);
        const dEnd = new Date(dateRange.end); dEnd.setHours(23, 59, 59, 999);

        if (dateRange.start && dateRange.end) {
            res = res.filter(c => {
                const d = parseDateVN(c.dateAssign || c.date); // Ưu tiên ngày phân
                return d && d >= dStart && d <= dEnd;
            });
        }

        // 2. Search
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            res = res.filter(c =>
                String(c.customerName).toLowerCase().includes(lower) ||
                String(c.phone).includes(lower) ||
                String(c.saleNote).toLowerCase().includes(lower) ||
                String(c.carModel).toLowerCase().includes(lower) ||
                String(c.creatorName).toLowerCase().includes(lower)
            );
        }

        setFilteredCustomers(res);
        // Clear selection when filters change
        setSelectedPhones([]);
    }, [assignedCustomers, searchTerm, dateRange]);

    // --- ACTIONS ---
    const handleRefresh = () => {
        fetchAssignedCustomers(true);
        toast.success("Đã làm mới dữ liệu!");
    };

    const handleCreateSuccess = () => {
        toast.success("Đã phân khách thành công!");
        setIsAddModalOpen(false);
        fetchAssignedCustomers(true);
    };

    const handleAcceptCustomer = (cust) => {
        if (cust) setConfirmModal({ isOpen: true, customer: cust, action: 'accept' });
    };

    const handleDeleteCustomer = (cust) => {
        if (cust) setConfirmModal({ isOpen: true, customer: cust, action: 'delete' });
    };

    const handleConfirmAction = async () => {
        const { customer: cust, action } = confirmModal;

        setProcessing(true);

        if (action === 'acceptBatch') {
            const toastId = toast.loading(`Đang xử lý nhận ${selectedPhones.length} khách...`);
            let successCount = 0;
            try {
                for (const phone of selectedPhones) {
                    const res = await customerService.acceptCustomer(phone);
                    if (res.status === 'success') successCount++;
                }
                toast.success(`Đã nhận thành công ${successCount}/${selectedPhones.length} khách!`, { id: toastId });
                setSelectedPhones([]);
                setConfirmModal({ isOpen: false, customer: null, action: 'accept' });
                fetchAssignedCustomers(true);
            } catch (error) {
                console.error(error);
                toast.error("Lỗi khi nhận nhiều khách", { id: toastId });
            } finally {
                setProcessing(false);
            }
            return;
        }

        if (!cust) {
            setProcessing(false);
            return;
        }

        const toastId = toast.loading(action === 'delete' ? "Đang xóa..." : "Đang xử lý nhận khách...");

        try {
            let res;
            if (action === 'delete') {
                res = await customerService.deleteAssignedCustomer(cust.phone);
            } else {
                res = await customerService.acceptCustomer(cust.phone);
            }
            if (res.status === 'success') {
                toast.success(action === 'delete' ? "Đã xóa thành công!" : "Đã nhận khách thành công!", { id: toastId });
                setConfirmModal({ isOpen: false, customer: null, action: 'accept' });
                fetchAssignedCustomers(true);
            } else {
                toast.error(res.message || "Lỗi khi thực hiện hành động", { id: toastId });
            }
        } catch (error) {
            console.error(error);
            toast.error("Lỗi kết nối", { id: toastId });
        } finally {
            setProcessing(false);
        }
    };

    // --- BATCH SELECTION HELPERS ---
    const assignableCustomers = useMemo(() => {
        if (!currentUser) return [];
        const myName = String(currentUser.name).toLowerCase().trim();
        const myEmail = String(currentUser.email).toLowerCase().trim();
        return filteredCustomers.filter(c => {
            const rowSale = String(c.saleName).toLowerCase().trim();
            return rowSale === myName || rowSale === myEmail;
        });
    }, [filteredCustomers, currentUser]);

    const toggleSelectAll = () => {
        if (selectedPhones.length === assignableCustomers.length) {
            setSelectedPhones([]);
        } else {
            setSelectedPhones(assignableCustomers.map(c => c.phone));
        }
    };

    const toggleSelectPhone = (phone) => {
        setSelectedPhones(prev =>
            prev.includes(phone) ? prev.filter(p => p !== phone) : [...prev, phone]
        );
    };

    const getDaysDiff = (dStr) => {
        if (!dStr) return 0; // Chưa có ngày phân -> coi như mới
        try {
            const d = parseDateVN(dStr);
            if (!d) return 0;
            const diffTime = Math.abs(new Date() - d);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays;
        } catch { return 0; }
    };

    // --- RENDER HEADER ---
    const renderHeader = () => (
        <div className="p-3 border-b space-y-2 bg-white sticky top-0 z-20 shadow-sm">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <h2 className="font-bold text-green-800 flex items-center gap-2"> KHÁCH ĐƯỢC PHÂN <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full border border-green-200">{filteredCustomers.length}</span></h2>

                    {/* View Switcher */}
                    <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200 shadow-sm">
                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-white text-blue-600 shadow' : 'text-gray-400 hover:text-gray-600'}`}><LayoutList size={14} /></button>
                        <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${viewMode === 'table' ? 'bg-white text-blue-600 shadow' : 'text-gray-400 hover:text-gray-600'}`}><Table size={14} /></button>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={handleRefresh} className="p-1.5 hover:bg-gray-100 rounded text-gray-500 shadow-sm border border-transparent hover:border-gray-200 transition" title="Làm mới"><RefreshCw size={18} /></button>
                    {/* BUTTON PHÂN KHÁCH MỚI (CHỈ CHO TPKD/MANAGER) */}
                    {selectedPhones.length > 0 && (
                        <button
                            onClick={() => setConfirmModal({ isOpen: true, action: 'acceptBatch' })}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 px-3 rounded shadow-sm flex items-center gap-2 text-xs transition"
                        >
                            <Download size={16} /> NHẬN {selectedPhones.length} KHÁCH
                        </button>
                    )}
                    {canAssign && (
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded shadow-sm flex items-center gap-2 text-xs transition"
                        >
                            <UserPlus size={16} /> <span className="hidden sm:inline">PHÂN KHÁCH</span>
                        </button>
                    )}
                </div>
            </div>

            {/* FILTERS */}
            <div className="flex flex-col sm:flex-row gap-2 items-center bg-gray-50 p-1.5 rounded border">
                <div className="flex gap-2 items-center w-full sm:w-auto">
                    <input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} className="border rounded text-xs px-2 py-1 outline-none w-full sm:w-32" />
                    <span className="text-gray-400">-</span>
                    <input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} className="border rounded text-xs px-2 py-1 outline-none w-full sm:w-32" />
                </div>
                <div className="relative w-full sm:flex-1"><Search className="absolute left-2 top-2 text-gray-400 w-3.5 h-3.5" /><input placeholder="Tìm: Tên, SĐT, Người tạo, Xe..." className="pl-7 border rounded text-xs w-full py-1.5 outline-none bg-white focus:ring-1 focus:ring-blue-400" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
            </div>
        </div>
    );

    // --- RENDER TABLE ---
    const renderTable = () => (
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm flex flex-col h-full">
            <div className="overflow-auto flex-1">
                <table className="w-full text-xs text-left border-collapse min-w-[900px]">
                    <thead className="bg-gray-100 text-gray-700 font-bold sticky top-0 z-10 border-b">
                        <tr>
                            <th className="p-3 border-r text-center w-10">
                                {assignableCustomers.length > 0 ? (
                                    <input
                                        type="checkbox"
                                        onChange={toggleSelectAll}
                                        checked={selectedPhones.length > 0 && selectedPhones.length === assignableCustomers.length}
                                        className="w-4 h-4 cursor-pointer accent-green-600"
                                    />
                                ) : "#"}
                            </th>
                            <th className="p-3 border-r w-24">NGÀY PHÂN</th>
                            <th className="p-3 border-r w-40">KHÁCH HÀNG</th>
                            <th className="p-3 border-r w-28">SĐT</th>
                            <th className="p-3 border-r w-32">NGƯỜI TẠO</th>
                            <th className="p-3 border-r w-32">NGƯỜI NHẬN</th>
                            <th className="p-3 border-r w-32">DÒNG XE</th>
                            <th className="p-3 border-r w-24 text-center">CHỜ NHẬN</th>
                            <th className="p-3 border-r min-w-[200px]">GHI CHÚ</th>
                            <th className="p-3 text-center w-24 sticky right-0 bg-gray-100 shadow-l">HÀNH ĐỘNG</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {loadingAssigned ? (
                            <tr><td colSpan="9" className="p-10 text-center"><Loader2 className="animate-spin inline text-green-600" /> Đang tải...</td></tr>
                        ) : filteredCustomers.length === 0 ? (
                            <tr><td colSpan="9" className="p-10 text-center text-gray-500 italic">Không tìm thấy dữ liệu phù hợp.</td></tr>
                        ) : (
                            filteredCustomers.map((c, i) => {
                                const days = getDaysDiff(c.dateAssign);
                                let daysBadge = { bg: 'bg-green-100', text: 'text-green-700', label: 'Hôm nay' };
                                if (days > 0) daysBadge = { bg: 'bg-blue-50', text: 'text-blue-600', label: `${days} ngày` };
                                if (days > 3) daysBadge = { bg: 'bg-orange-50', text: 'text-orange-600', label: `${days} ngày` };
                                if (days > 7) daysBadge = { bg: 'bg-red-50', text: 'text-red-600', label: `${days} ngày` };

                                const myName = String(currentUser?.name || '').toLowerCase().trim();
                                const myEmail = String(currentUser?.email || '').toLowerCase().trim();
                                const rowSale = String(c.saleName).toLowerCase().trim();
                                const isAssignee = myName === rowSale || myEmail === rowSale;
                                const rowCreator = String(c.creatorName).toLowerCase().trim();
                                const isCreator = currentUser && (myName === rowCreator || myEmail === rowCreator);

                                return (
                                    <tr key={i} className={`border-b hover:bg-blue-50 transition-colors group ${selectedPhones.includes(c.phone) ? 'bg-green-50/50' : ''}`}>
                                        <td className="p-3 border-r text-center text-gray-400">
                                            {isAssignee ? (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPhones.includes(c.phone)}
                                                    onChange={() => toggleSelectPhone(c.phone)}
                                                    className="w-4 h-4 cursor-pointer accent-green-600"
                                                />
                                            ) : (i + 1)}
                                        </td>
                                        <td className="p-3 border-r font-mono text-gray-600">{c.dateAssign || c.date}</td>
                                        <td className="p-3 border-r font-bold text-gray-800">{c.customerName}</td>
                                        <td className="p-3 border-r font-mono text-blue-600">{c.phone}</td>
                                        <td className="p-3 border-r text-gray-700 flex items-center gap-1"><User size={12} className="text-gray-400" /> {c.creatorName || 'N/A'}</td>
                                        <td className="p-3 border-r font-bold text-blue-700">{c.saleName || 'N/A'}</td>
                                        <td className="p-3 border-r text-gray-700 font-medium">{c.carModel} <span className="font-normal text-gray-400 text-[10px]">{c.version}</span></td>
                                        <td className="p-3 border-r text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${daysBadge.bg} ${daysBadge.text}`}>{daysBadge.label}</span>
                                        </td>
                                        <td className="p-3 border-r text-gray-500 italic max-w-[200px] truncate" title={c.saleNote}>{c.saleNote}</td>
                                        <td className="p-2 text-center sticky right-0 bg-white group-hover:bg-blue-50 shadow-l flex items-center justify-center gap-1">
                                            {/* Logic nút NHẬN: Chỉ hiện với Người được phân (Assignee) */}
                                            {(() => {
                                                if (isAssignee) {
                                                    return (
                                                        <button
                                                            onClick={() => handleAcceptCustomer(c)}
                                                            disabled={processing}
                                                            className="bg-green-600 hover:bg-green-700 text-white text-[10px] py-1.5 px-2 rounded shadow-sm font-bold flex items-center justify-center gap-1 flex-1 active:scale-95 transition"
                                                            title="Nhận khách"
                                                        >
                                                            <Download size={12} /> NHẬN
                                                        </button>
                                                    );
                                                }
                                                if (isCreator) return <span className="text-[10px] text-gray-400 italic">Đã phân</span>;
                                                return null;
                                            })()}

                                            {/* Logic nút XÓA: Creator hoặc Manager */}
                                            {(() => {
                                                if (canAssign || isCreator) {
                                                    return (
                                                        <button
                                                            onClick={() => handleDeleteCustomer(c)}
                                                            className="bg-red-100 hover:bg-red-200 text-red-600 p-1.5 rounded shadow-sm transition"
                                                            title="Xóa khách này"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )
                                                }
                                                return null;
                                            })()}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // --- RENDER LIST (Mobile/Old style) ---
    const renderList = () => (
        <div className="space-y-3 p-2 overflow-auto h-full bg-gray-100">
            {filteredCustomers.map((c, i) => {
                const days = getDaysDiff(c.dateAssign);

                const myName = String(currentUser?.name || '').toLowerCase().trim();
                const myEmail = String(currentUser?.email || '').toLowerCase().trim();
                const rowSale = String(c.saleName).toLowerCase().trim();
                const isAssignee = myName === rowSale || myEmail === rowSale;

                return (
                    <div key={i} className={`p-4 bg-white rounded-lg shadow-sm border ${selectedPhones.includes(c.phone) ? 'border-green-500 ring-1 ring-green-500 bg-green-50/50' : 'border-gray-200'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                {isAssignee && (
                                    <input
                                        type="checkbox"
                                        checked={selectedPhones.includes(c.phone)}
                                        onChange={() => toggleSelectPhone(c.phone)}
                                        className="w-4 h-4 cursor-pointer accent-green-600 mr-1"
                                    />
                                )}
                                <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded">{c.carModel}</span>
                                {days > 3 && <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded animate-pulse">{days} ngày chưa nhận</span>}
                            </div>
                            <span className="text-xs text-gray-400 font-mono">{c.dateAssign}</span>
                        </div>
                        <h3 className="font-bold text-gray-800 text-lg">{c.customerName}</h3>
                        <p className="text-sm text-gray-600 font-mono mb-2">{c.phone}</p>

                        <div className="flex flex-col gap-1 mb-3 bg-gray-50 p-2 rounded">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Users size={12} /> Người tạo: <span className="font-bold text-gray-700">{c.creatorName || 'Hệ thống'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-blue-600">
                                <User size={12} /> Người nhận: <span className="font-bold text-blue-700">{c.saleName || 'N/A'}</span>
                            </div>
                        </div>

                        {c.saleNote && <div className="text-xs text-gray-500 italic mb-3">"{c.saleNote}"</div>}

                        {/* Logic Button NHẬN (Mobile) */}
                        {(() => {
                            if (isAssignee) {
                                return (
                                    <button
                                        onClick={() => handleAcceptCustomer(c)}
                                        className="w-full bg-green-600 text-white font-bold py-2 rounded-lg shadow-sm flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <Download size={16} /> XÁC NHẬN NHẬN KHÁCH
                                    </button>
                                );
                            }
                            const rowCreator = String(c.creatorName).toLowerCase().trim();
                            const isCreator = currentUser && (myName === rowCreator || myEmail === rowCreator);
                            if (isCreator) return <div className="w-full py-2 bg-gray-100 text-gray-400 text-center text-xs italic rounded">Đã phân cho {c.saleName}</div>;
                            return null;
                        })()}
                        {/* Mobile Delete */}
                        {
                            (() => {
                                const rowCreator = String(c.creatorName).toLowerCase().trim();
                                const isCreator = currentUser && (myName === rowCreator || myEmail === rowCreator);
                                if (canAssign || isCreator) {
                                    return (
                                        <button
                                            onClick={() => handleDeleteCustomer(c)}
                                            className="w-full mt-2 bg-red-100 text-red-600 font-bold py-2 rounded-lg shadow-sm flex items-center justify-center gap-2 active:scale-95"
                                        >
                                            <Trash2 size={16} /> Xóa khách này
                                        </button>
                                    );
                                }
                                return null;
                            })()
                        }
                    </div>
                );
            })}
        </div >
    );

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] bg-gray-100 overflow-hidden rounded-lg border border-gray-200 shadow-sm">
            {renderHeader()}
            <div className="flex-1 overflow-hidden p-2">
                {viewMode === 'table' ? renderTable() : renderList()}
            </div>

            {/* Modal Phân Khách Mới */}
            <CustomerFormModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={handleCreateSuccess}
                isAssignMode={true}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={handleConfirmAction}
                title={confirmModal.action === 'delete' ? "Xóa Khách Hàng" : confirmModal.action === 'acceptBatch' ? "Nhận Nhiều Khách" : "Xác nhận NHẬN khách"}
                message={confirmModal.action === 'delete' ? `CẢNH BÁO: Bạn có chắc chắn muốn xóa khách hàng ${confirmModal.customer?.customerName}? Hành động này không thể hoàn tác.` : confirmModal.action === 'acceptBatch' ? `Bạn có chắc chắn muốn nhận ${selectedPhones.length} khách hàng đã chọn?` : `Bạn có chắc chắn muốn nhận khách hàng: ${confirmModal.customer?.customerName}?`}
                confirmText={confirmModal.action === 'delete' ? "XÓA NGAY" : "NHẬN NGAY"}
                cancelText="Hủy bỏ"
                type={confirmModal.action === 'delete' ? "danger" : "primary"}
                processing={processing}
            />
        </div>
    );
};

export default AssignCustomerPage;
