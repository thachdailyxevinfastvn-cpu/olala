import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../api/firebase';
import { collection, getDocs, doc, setDoc, updateDoc, writeBatch, getDoc } from 'firebase/firestore';
import { authService } from '../auth/authService';
import { UserPlus, UserCheck, UserX, Edit2, Shield, ArrowUpDown, ChevronDown, ChevronUp, Trash2, ListPlus, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StaffManagementPage() {
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [modalTab, setModalTab] = useState('single'); // 'single' hoặc 'list'
    const [pastedList, setPastedList] = useState(''); // Textarea để dán danh sách
    const [emailWebhook, setEmailWebhook] = useState(''); // Webhook URL gửi mail tự động
    const [sendingMailId, setSendingMailId] = useState(null); // ID nhân sự đang gửi mail
    const [syncing, setSyncing] = useState(false); // Trạng thái đồng bộ Sheets
    const [settingTrigger, setSettingTrigger] = useState(false); // Trạng thái thiết lập lịch
    const [sendingBulkMail, setSendingBulkMail] = useState(false); // Trạng thái gửi mail hàng loạt
    
    // Checkbox selection state
    const [selectedIds, setSelectedIds] = useState([]);

    // Sort configuration state
    const [sortConfig, setSortConfig] = useState({ key: 'role', direction: 'asc' });

    // Modal Form State
    const [formData, setFormData] = useState({
        username: '',
        name: '',
        staffCode: '',
        department: '',
        email: '',
        password: '',
        role: 'sale',
        active: true
    });

    const rolesList = [
        { value: 'admin', label: 'Admin (Quản lý hệ thống)' },
        { value: 'tpkd', label: 'TPKD (Trưởng phòng)' },
        { value: 'sale', label: 'Sale (Tư vấn bán hàng)' }
    ];

    // Tải danh sách nhân sự và cấu hình webhook
    const fetchStaff = async () => {
        setLoading(true);
        try {
            // 1. Tải danh sách users
            const snap = await getDocs(collection(db, 'users'));
            const list = [];
            snap.forEach(docSnap => {
                list.push({ id: docSnap.id, ...docSnap.data() });
            });
            setStaffList(list);
            setSelectedIds([]); // Reset selection

            // 2. Tải cấu hình Webhook gửi email
            try {
                const configSnap = await getDoc(doc(db, 'configs', 'metadata'));
                if (configSnap.exists()) {
                    setEmailWebhook(configSnap.data().emailWebhook || '');
                }
            } catch (err) {
                // Fail-safe for metadata permissions
            }
        } catch (e) {
            console.warn("Lỗi đọc Firestore users:", e);
            const currentUser = authService.getCurrentUser();
            if (currentUser) {
                setStaffList([{ id: currentUser.id || 'admin', ...currentUser }]);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, []);

    // Sắp xếp danh sách nhân sự
    const sortedStaffList = useMemo(() => {
        const sorted = [...staffList];
        if (!sortConfig.key) return sorted;
        
        sorted.sort((a, b) => {
            let aVal = a[sortConfig.key] || '';
            let bVal = b[sortConfig.key] || '';

            if (sortConfig.key === 'active') {
                aVal = a.active !== false ? '1_active' : '2_inactive';
                bVal = b.active !== false ? '1_active' : '2_inactive';
            }

            if (typeof aVal === 'string') {
                return sortConfig.direction === 'asc'
                    ? aVal.localeCompare(bVal, 'vi', { sensitivity: 'base' })
                    : bVal.localeCompare(aVal, 'vi', { sensitivity: 'base' });
            }
            return 0;
        });
        return sorted;
    }, [staffList, sortConfig]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const renderSortIcon = (key) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={12} className="text-stone-400 group-hover:text-stone-600 transition ml-1" />;
        return sortConfig.direction === 'asc' 
            ? <ChevronUp size={12} className="text-red-600 ml-1" />
            : <ChevronDown size={12} className="text-red-600 ml-1" />;
    };

    // Selection handlers
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(sortedStaffList.map(s => s.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    // Bulk actions
    const handleBulkActive = async (activeState) => {
        if (selectedIds.length === 0) return;
        const stateText = activeState ? 'kích hoạt' : 'tạm ngưng';
        if (!window.confirm(`Bạn có chắc chắn muốn ${stateText} ${selectedIds.length} nhân sự đã chọn?`)) return;

        setLoading(true);
        try {
            const batch = writeBatch(db);
            selectedIds.forEach(id => {
                const userRef = doc(db, 'users', id);
                batch.update(userRef, { active: activeState });
            });
            await batch.commit();
            toast.success(`Đã ${stateText} hàng loạt thành công!`);
            fetchStaff();
        } catch (e) {
            toast.error("Lỗi cập nhật hàng loạt: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        const currentUser = authService.getCurrentUser();
        
        const deleteableIds = selectedIds.filter(id => {
            const staff = staffList.find(s => s.id === id);
            const role = String(staff?.role || '').toLowerCase();
            return role !== 'admin' && id !== currentUser?.username;
        });

        if (deleteableIds.length === 0) {
            toast.error("Không thể xóa các tài khoản Admin để bảo vệ quyền truy cập!");
            return;
        }

        const confirmMsg = `Bạn có chắc chắn muốn xóa vĩnh viễn ${deleteableIds.length} nhân sự đã chọn? (Hệ thống đã tự lọc bỏ các tài khoản Admin để bảo vệ).`;
        if (!window.confirm(confirmMsg)) return;

        setLoading(true);
        try {
            const batch = writeBatch(db);
            deleteableIds.forEach(id => {
                batch.delete(doc(db, 'users', id));
            });
            await batch.commit();
            toast.success(`Đã xóa thành công ${deleteableIds.length} nhân sự!`);
            fetchStaff();
        } catch (e) {
            toast.error("Lỗi xóa hàng loạt: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkSendMail = async () => {
        if (selectedIds.length === 0) return;
        if (!emailWebhook.trim()) {
            toast.error("Vui lòng cấu hình Webhook trước khi gửi mail hàng loạt!");
            return;
        }

        const selectedStaff = selectedIds
            .map(id => staffList.find(s => s.id === id))
            .filter(s => s && s.email);

        if (selectedStaff.length === 0) {
            toast.error("Không có nhân sự nào được chọn có cấu hình email!");
            return;
        }

        const confirmMsg = `Bạn có chắc chắn muốn tự động gửi email thông tin tài khoản đến ${selectedStaff.length} nhân sự đã chọn?`;
        if (!window.confirm(confirmMsg)) return;

        setSendingBulkMail(true);
        const toastId = toast.loading(`Đang gửi email hàng loạt cho ${selectedStaff.length} nhân sự...`);
        
        try {
            const promises = selectedStaff.map(async (staff) => {
                const usernameVal = staff.username || staff.id;
                const codeVal = staff.staffCode || `NV${String(usernameVal).slice(-4)}`;
                const passwordVal = staff.password || 'mg123';

                return fetch(emailWebhook.trim(), {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({
                        email: staff.email,
                        name: staff.name,
                        username: usernameVal,
                        password: passwordVal,
                        staffCode: codeVal
                    })
                });
            });

            await Promise.all(promises);
            toast.success(`Đã tự động gửi email thông tin tài khoản cho ${selectedStaff.length} nhân sự thành công!`, { id: toastId });
            setSelectedIds([]);
        } catch (error) {
            console.error("Lỗi gửi mail hàng loạt:", error);
            toast.error("Gửi email hàng loạt thất bại: " + error.message, { id: toastId });
        } finally {
            setSendingBulkMail(false);
        }
    };

    const handleOpenCreate = () => {
        setIsEditMode(false);
        setModalTab('single');
        setPastedList('');
        setFormData({
            username: '',
            name: '',
            staffCode: '',
            department: '',
            email: '',
            password: 'mg123',
            role: 'sale',
            active: true
        });
        setShowModal(true);
    };

    const handleOpenEdit = (staff) => {
        setIsEditMode(true);
        setModalTab('single');
        setFormData({
            username: staff.username || staff.id,
            name: staff.name || '',
            staffCode: staff.staffCode || '',
            department: staff.department || '',
            email: staff.email || '',
            password: staff.password || 'mg123',
            role: staff.role || 'sale',
            active: staff.active !== false
        });
        setShowModal(true);
    };

    // Lưu cấu hình Webhook gửi email
    const handleSaveWebhook = async () => {
        try {
            await updateDoc(doc(db, 'configs', 'metadata'), {
                emailWebhook: emailWebhook.trim()
            });
            toast.success("Đã lưu cấu hình Webhook gửi email tự động!");
        } catch (e) {
            toast.error("Lỗi lưu cấu hình: " + e.message);
        }
    };

    const handleSyncSheets = async () => {
        if (!emailWebhook.trim()) {
            toast.error("Vui lòng cấu hình Webhook trước khi đồng bộ!");
            return;
        }
        setSyncing(true);
        const toastId = toast.loading("Đang đồng bộ dữ liệu về Google Sheets...");
        try {
            await fetch(emailWebhook.trim(), {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'runSync' })
            });
            toast.success("Đồng bộ dữ liệu Google Sheets thành công!", { id: toastId });
        } catch (e) {
            console.error(e);
            toast.error("Đồng bộ thất bại: " + e.message, { id: toastId });
        } finally {
            setSyncing(false);
        }
    };

    const handleSetupTrigger = async () => {
        if (!emailWebhook.trim()) {
            toast.error("Vui lòng cấu hình Webhook trước khi cài đặt!");
            return;
        }
        setSettingTrigger(true);
        const toastId = toast.loading("Đang cài đặt lịch sao lưu tự động 7h sáng...");
        try {
            await fetch(emailWebhook.trim(), {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'setupTrigger' })
            });
            toast.success("Đã cài đặt lịch sao lưu tự động lúc 7h sáng thành công!", { id: toastId });
        } catch (e) {
            console.error(e);
            toast.error("Cài đặt lịch thất bại: " + e.message, { id: toastId });
        } finally {
            setSettingTrigger(false);
        }
    };

    // Xóa tất cả nhân sự cũ
    const handleClearAll = async () => {
        const currentUser = authService.getCurrentUser();
        const confirmMsg = "CẢNH BÁO: Hành động này sẽ xóa các nhân sự cũ (TPKD, Sale) ra khỏi hệ thống. TOÀN BỘ tài khoản Admin sẽ được giữ lại để bảo vệ quyền truy cập hệ thống. Bạn có chắc chắn muốn thực hiện?";
        if (!window.confirm(confirmMsg)) return;

        setLoading(true);
        try {
            const batch = writeBatch(db);
            let count = 0;
            staffList.forEach(staff => {
                const role = String(staff.role || '').toLowerCase();
                const isSystemAdmin = role === 'admin' || staff.id === currentUser?.username;
                
                if (!isSystemAdmin) {
                    batch.delete(doc(db, 'users', staff.id));
                    count++;
                }
            });
            if (count > 0) {
                await batch.commit();
                toast.success(`Đã xóa sạch thành công ${count} nhân sự cũ (TPKD, Sale). Giữ lại các tài khoản Admin!`);
            } else {
                toast.success("Không có nhân sự TPKD/Sale nào khác để xóa.");
            }
            fetchStaff();
        } catch (e) {
            console.error(e);
            toast.error("Lỗi xóa nhân sự: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    // Gửi email tự động thông qua Google Apps Script hoặc mailto dự phòng
    const handleSendMail = async (staff) => {
        if (!staff.email) {
            toast.error("Nhân viên này chưa được cập nhật email!");
            return;
        }

        const usernameVal = staff.username || staff.id;
        const codeVal = staff.staffCode || `NV${String(usernameVal).slice(-4)}`;
        const passwordVal = staff.password || 'mg123';

        // 1. Nếu có Webhook Google Apps Script, gửi tự động qua HTTP POST
        if (emailWebhook.trim()) {
            setSendingMailId(staff.id);
            const toastId = toast.loading(`Đang tự động gửi email từ mkt.mgbinhduong@gmail.com...`);
            try {
                await fetch(emailWebhook.trim(), {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({
                        email: staff.email,
                        name: staff.name,
                        username: usernameVal,
                        password: passwordVal,
                        staffCode: codeVal
                    })
                });
                toast.success(`Đã tự động gửi email thông tin tài khoản đến ${staff.email}!`, { id: toastId });
            } catch (error) {
                console.error("Lỗi gửi mail tự động:", error);
                toast.error("Gửi tự động thất bại. Đang mở Mail App dự phòng...", { id: toastId });
                // Fallback mailto
                triggerMailtoFallback(staff, codeVal, usernameVal, passwordVal);
            } finally {
                setSendingMailId(null);
            }
        } else {
            // 2. Không có Webhook -> Giao diện mailto truyền thống
            triggerMailtoFallback(staff, codeVal, usernameVal, passwordVal);
        }
    };

    const triggerMailtoFallback = (staff, codeVal, usernameVal, passwordVal) => {
        const subject = encodeURIComponent("Chào mừng bạn gia nhập MG Bình Dương!");
        const body = encodeURIComponent(
            `Kính chào ${staff.name},\n\n` +
            `Chúc mừng bạn đã chính thức trở thành thành viên của gia đình MG Bình Dương.\n\n` +
            `Dưới đây là thông tin tài khoản đăng nhập hệ thống CRM của bạn:\n` +
            `- Mã nhân viên: ${codeVal}\n` +
            `- Tên đăng nhập (User): ${usernameVal}\n` +
            `- Mật khẩu mặc định: ${passwordVal}\n\n` +
            `Vui lòng truy cập đường dẫn sau để đăng nhập vào hệ thống:\n` +
            `Đường link đăng nhập: https://crm.binhduong-mgmotor.com.vn\n\n` +
            `Trân trọng,\nBan quản trị MG Bình Dương.`
        );

        window.location.href = `mailto:${staff.email}?subject=${subject}&body=${body}`;
        toast.success(`Đã mở trình gửi thư tay đến ${staff.email}`);
    };

    // Hàm lưu đơn lẻ
    const handleSave = async (e) => {
        e.preventDefault();
        const usernameClean = String(formData.username).trim().toLowerCase();
        
        if (!usernameClean || !formData.name || !formData.password) {
            toast.error("Vui lòng điền đủ Tên đăng nhập, Họ tên và Mật khẩu!");
            return;
        }

        const autoCode = formData.staffCode.trim() || `NV${usernameClean.slice(-4)}`;

        try {
            const userRef = doc(db, 'users', usernameClean);
            const payload = {
                username: usernameClean,
                name: formData.name.trim(),
                staffCode: autoCode,
                department: formData.department.trim(),
                email: formData.email.trim(),
                password: formData.password.trim(),
                role: formData.role,
                active: formData.active,
                phone: usernameClean,
                updatedAt: new Date().toISOString()
            };

            if (!isEditMode) {
                const exists = staffList.some(s => String(s.id).toLowerCase() === usernameClean);
                if (exists) {
                    toast.error("Tên đăng nhập này đã tồn tại!");
                    return;
                }
                payload.createdAt = new Date().toISOString();
                await setDoc(userRef, payload);
                toast.success("Thêm nhân sự mới thành công!");
            } else {
                await updateDoc(userRef, payload);
                toast.success("Cập nhật thông tin thành công!");
            }

            setShowModal(false);
            fetchStaff();
        } catch (error) {
            console.error("Lỗi lưu nhân sự:", error);
            toast.error("Lỗi khi lưu dữ liệu: " + error.message);
        }
    };

    // Lưu hàng loạt từ danh sách dán vào (Chức vụ | Phòng ban | Tên NV | SDT | Email)
    const handleSaveList = async (e) => {
        e.preventDefault();
        if (!pastedList.trim()) {
            toast.error("Vui lòng dán dữ liệu danh sách nhân sự!");
            return;
        }

        const lines = pastedList.split('\n');
        const batch = writeBatch(db);
        let count = 0;
        const seenUsernames = new Set();

        for (let line of lines) {
            let row = line.split('|');
            if (row.length < 4) {
                row = line.split('\t');
            }

            if (row.length < 4) continue;

            const chucVu = row[0].trim();
            const phongBan = row[1].trim();
            const tenNv = row[2].trim();
            const sdt = row[3].trim().toLowerCase();
            const email = row.length >= 5 ? row[4].trim() : '';

            if (sdt.includes('sđt') || sdt.includes('sdt') || tenNv.toLowerCase().includes('tên nv')) {
                continue;
            }

            if (!tenNv || !sdt) continue;

            // Quyền hạn
            let role = 'sale';
            const cvLower = chucVu.toLowerCase();
            if (cvLower.includes('admin') || cvLower.includes('quản lý') || cvLower.includes('giám đốc')) {
                role = 'admin';
            } else if (cvLower.includes('trưởng phòng') || cvLower.includes('tpkd')) {
                role = 'tpkd';
            }

            const autoCode = `NV${sdt.slice(-4)}`;
            const userRef = doc(db, 'users', sdt);

            batch.set(userRef, {
                username: sdt,
                phone: sdt,
                name: tenNv,
                staffCode: autoCode,
                department: phongBan,
                email: email,
                password: 'mg123',
                role: role,
                active: true,
                createdAt: new Date().toISOString()
            });

            seenUsernames.add(sdt);
            count++;
        }

        if (count === 0) {
            toast.error("Không tìm thấy dòng dữ liệu nào hợp lệ! Định dạng mẫu: Chức vụ | Phòng ban | Tên NV | SDT | Email");
            return;
        }

        try {
            setLoading(true);
            await batch.commit();
            toast.success(`Đã thêm thành công ${count} nhân viên mới vào hệ thống!`);
            setShowModal(false);
            fetchStaff();
        } catch (error) {
            console.error("Lỗi import danh sách:", error);
            toast.error("Không lưu được danh sách: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Toggle nhanh trạng thái active
    const toggleActive = async (staff) => {
        const nextState = staff.active === false;
        try {
            const userRef = doc(db, 'users', staff.id);
            await updateDoc(userRef, { active: nextState });
            toast.success(`${nextState ? 'Kích hoạt' : 'Tạm ngưng'} tài khoản thành công`);
            fetchStaff();
        } catch (e) {
            toast.error("Lỗi cập nhật trạng thái");
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div>
                    <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2 tracking-tight">
                        <Shield className="text-red-600" size={22} />
                        Quản trị Nhân sự
                    </h2>
                    <p className="text-stone-500 text-xs mt-0.5 font-medium">Bảng quản trị tài khoản, phân quyền và dữ liệu liên thông.</p>
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={handleClearAll}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-2 px-3 rounded-lg border border-stone-300 transition active:scale-[0.98] text-xs"
                        title="Xóa toàn bộ nhân viên cũ (Không xóa Admin)"
                    >
                        <Trash2 size={15} className="text-stone-600" />
                        Dọn nhân viên cũ
                    </button>
                    <button
                        onClick={handleOpenCreate}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition active:scale-[0.98] text-xs"
                    >
                        <UserPlus size={16} />
                        Tạo nhân sự mới
                    </button>
                </div>
            </div>

            {/* Email Webhook & Google Sheets Sync Settings */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 mb-5 space-y-3.5 shadow-sm">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-stone-200 pb-3">
                    <div className="flex-1">
                        <h4 className="text-xs font-bold text-stone-800">Cấu hình tự động gửi email (Google Apps Script Web App)</h4>
                        <p className="text-[10px] text-stone-400 mt-0.5">Nhập link Web App để gửi email tự động từ mkt.mgbinhduong@gmail.com và đồng bộ hóa Sheets.</p>
                    </div>
                    <div className="flex items-center gap-2 md:w-3/5">
                        <input
                            type="url"
                            value={emailWebhook}
                            onChange={(e) => setEmailWebhook(e.target.value)}
                            placeholder="https://script.google.com/macros/s/.../exec"
                            className="flex-1 p-2 border border-stone-200 rounded text-xs outline-none focus:ring-1 focus:ring-red-500 font-mono"
                        />
                        <button
                            onClick={handleSaveWebhook}
                            className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold py-2 px-4 rounded transition active:scale-[0.97] shrink-0"
                        >
                            Lưu Webhook
                        </button>
                    </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-0.5">
                    <div>
                        <h4 className="text-xs font-bold text-stone-800">Sao lưu & Đồng bộ Google Sheets</h4>
                        <p className="text-[10px] text-stone-400 mt-0.5">Xuất toàn bộ dữ liệu (Khách hàng, Lịch trực, Báo cáo) về Google Sheets thủ công hoặc tự động.</p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={handleSyncSheets}
                            disabled={syncing}
                            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-4 rounded transition active:scale-[0.97] disabled:opacity-50"
                        >
                            {syncing ? "Đang đồng bộ..." : "Đồng bộ Sheets ngay"}
                        </button>
                        <button
                            onClick={handleSetupTrigger}
                            disabled={settingTrigger}
                            className="flex-1 sm:flex-none bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold py-2 px-4 rounded transition active:scale-[0.97] disabled:opacity-50"
                        >
                            {settingTrigger ? "Đang cài đặt..." : "Thiết lập lịch 7h sáng"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Bulk Actions Panel */}
            {selectedIds.length > 0 && (
                <div className="bg-stone-900 text-white p-3 rounded-xl mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="text-xs font-bold text-stone-300">
                        Đang chọn <span className="text-red-400 font-mono text-sm">{selectedIds.length}</span> nhân sự
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => handleBulkActive(true)}
                            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded text-xs transition"
                        >
                            Kích hoạt
                        </button>
                        <button
                            onClick={() => handleBulkActive(false)}
                            className="flex-1 sm:flex-none bg-orange-600 hover:bg-orange-700 text-white font-bold py-1.5 px-3 rounded text-xs transition"
                        >
                            Tạm ngưng
                        </button>
                        <button
                            onClick={handleBulkSendMail}
                            disabled={sendingBulkMail}
                            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded text-xs transition flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                            <Mail size={12} />
                            Gửi Email
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded text-xs transition flex items-center justify-center gap-1"
                        >
                            <Trash2 size={12} />
                            Xóa chọn
                        </button>
                    </div>
                </div>
            )}

            {/* List Table */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-16 text-center text-stone-400 text-xs">Đang đồng bộ dữ liệu nhân viên...</div>
                ) : sortedStaffList.length === 0 ? (
                    <div className="p-16 text-center text-stone-400 text-xs">Chưa có thông tin nhân viên nào trên hệ thống.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-stone-50/75 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider select-none">
                                    <th className="p-3.5 pl-4 w-10 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.length === sortedStaffList.length}
                                            onChange={handleSelectAll}
                                            className="w-3.5 h-3.5 text-red-600 border-stone-300 rounded focus:ring-red-500 cursor-pointer"
                                        />
                                    </th>
                                    <th className="p-3.5 pl-2 cursor-pointer group" onClick={() => requestSort('name')}>
                                        <div className="flex items-center">Họ và tên {renderSortIcon('name')}</div>
                                    </th>
                                    <th className="p-3.5 pl-2 cursor-pointer group" onClick={() => requestSort('staffCode')}>
                                        <div className="flex items-center">Mã NV {renderSortIcon('staffCode')}</div>
                                    </th>
                                    <th className="p-3.5 cursor-pointer group" onClick={() => requestSort('username')}>
                                        <div className="flex items-center">Số điện thoại (User) {renderSortIcon('username')}</div>
                                    </th>
                                    <th className="p-3.5 cursor-pointer group" onClick={() => requestSort('department')}>
                                        <div className="flex items-center">Phòng ban {renderSortIcon('department')}</div>
                                    </th>
                                    <th className="p-3.5">Email</th>
                                    <th className="p-3.5">Mật khẩu</th>
                                    <th className="p-3.5 text-center cursor-pointer group" onClick={() => requestSort('role')}>
                                        <div className="flex items-center justify-center">Phân quyền {renderSortIcon('role')}</div>
                                    </th>
                                    <th className="p-3.5 text-center cursor-pointer group" onClick={() => requestSort('active')}>
                                        <div className="flex items-center justify-center">Trạng thái {renderSortIcon('active')}</div>
                                    </th>
                                    <th className="p-3.5 text-center">Tác vụ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {sortedStaffList.map((staff) => {
                                    const isActive = staff.active !== false;
                                    const codeVal = staff.staffCode || `NV${String(staff.username || staff.id).slice(-4)}`;
                                    const isSending = sendingMailId === staff.id;
                                    return (
                                        <tr key={staff.id} className={`hover:bg-stone-50/40 transition-colors ${!isActive ? 'bg-stone-50/30 text-stone-400' : ''}`}>
                                            <td className="p-3.5 pl-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(staff.id)}
                                                    onChange={() => handleSelectRow(staff.id)}
                                                    className="w-3.5 h-3.5 text-red-600 border-stone-300 rounded focus:ring-red-500 cursor-pointer"
                                                />
                                            </td>
                                            <td className="p-3.5 pl-2 font-bold text-stone-900">
                                                <div className="flex items-center gap-2.5">
                                                    <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                                    {staff.name}
                                                </div>
                                            </td>
                                            <td className="p-3.5 pl-2 font-mono font-bold text-stone-600">{codeVal}</td>
                                            <td className="p-3.5 font-mono font-bold text-blue-600">{staff.username || staff.id}</td>
                                            <td className="p-3.5 font-medium">{staff.department || <span className="text-stone-300 italic font-normal">Chưa thiết lập</span>}</td>
                                            <td className="p-3.5 font-mono text-stone-500">{staff.email || <span className="text-stone-300 italic font-normal">-</span>}</td>
                                            <td className="p-3.5 font-mono text-stone-500 font-bold">{staff.password}</td>
                                            <td className="p-3.5 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                                    staff.role === 'admin' ? 'bg-red-50 border-red-200 text-red-700' :
                                                    staff.role === 'tpkd' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                                    'bg-stone-50 border-stone-200 text-stone-700'
                                                }`}>
                                                    {staff.role === 'admin' ? 'Admin' : staff.role === 'tpkd' ? 'TPKD' : 'Sale'}
                                                </span>
                                            </td>
                                            <td className="p-3.5 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                                                }`}>
                                                    {isActive ? 'Hoạt động' : 'Tạm ngưng'}
                                                </span>
                                            </td>
                                            <td className="p-3.5 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => handleSendMail(staff)}
                                                        disabled={isSending}
                                                        className={`p-1.5 rounded transition ${isSending ? 'text-stone-400 bg-stone-100' : 'text-stone-500 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                                        title="Gửi mail tài khoản tự động"
                                                    >
                                                        <Mail size={14} className={isSending ? 'animate-pulse' : ''} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenEdit(staff)}
                                                        className="p-1.5 text-stone-500 hover:text-blue-600 hover:bg-stone-100 rounded transition"
                                                        title="Chỉnh sửa thông tin"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => toggleActive(staff)}
                                                        className={`p-1.5 rounded transition ${
                                                            isActive ? 'text-red-500 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'
                                                        }`}
                                                        title={isActive ? "Tạm ngưng hoạt động" : "Kích hoạt trở lại"}
                                                    >
                                                        {isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Create/Edit */}
            {showModal && (
                <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-stone-200">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-stone-150 bg-stone-50 flex items-center justify-between">
                            <h3 className="font-bold text-stone-900 text-sm">
                                {isEditMode ? "Cập nhật tài khoản" : "Tạo nhân sự"}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-stone-400 hover:text-stone-600 font-bold text-sm">✕</button>
                        </div>

                        {/* Modal Tabs */}
                        {!isEditMode && (
                            <div className="flex border-b border-stone-200 text-xs font-bold text-stone-500">
                                <button
                                    onClick={() => setModalTab('single')}
                                    className={`flex-1 py-3 text-center border-b-2 transition ${modalTab === 'single' ? 'text-red-600 border-red-600 bg-red-50/20' : 'border-transparent hover:bg-stone-50'}`}
                                >
                                    Thêm từng người
                                </button>
                                <button
                                    onClick={() => setModalTab('list')}
                                    className={`flex-1 py-3 text-center border-b-2 transition ${modalTab === 'list' ? 'text-red-600 border-red-600 bg-red-50/20' : 'border-transparent hover:bg-stone-50'}`}
                                >
                                    Thêm theo danh sách dán
                                </button>
                            </div>
                        )}

                        {/* Modal Content - Thêm từng người */}
                        {modalTab === 'single' ? (
                            <form onSubmit={handleSave} className="p-4 space-y-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Số điện thoại (Tên đăng nhập)*</label>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData(p => ({ ...p, username: e.target.value }))}
                                        disabled={isEditMode}
                                        placeholder="Ví dụ: 0912345678"
                                        className="w-full p-2 border border-stone-200 rounded text-xs outline-none focus:ring-1 focus:ring-red-500 bg-white disabled:bg-stone-50 disabled:text-stone-400 font-mono font-bold"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Họ và tên nhân viên*</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                                            placeholder="Ví dụ: Nguyễn Văn A"
                                            className="w-full p-2 border border-stone-200 rounded text-xs outline-none focus:ring-1 focus:ring-red-500 font-medium"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Mã nhân viên (Để trống = tự tạo)</label>
                                        <input
                                            type="text"
                                            value={formData.staffCode}
                                            onChange={(e) => setFormData(p => ({ ...p, staffCode: e.target.value }))}
                                            placeholder="Ví dụ: MGBD001"
                                            className="w-full p-2 border border-stone-200 rounded text-xs outline-none focus:ring-1 focus:ring-red-500 font-mono font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Phòng ban</label>
                                        <input
                                            type="text"
                                            value={formData.department}
                                            onChange={(e) => setFormData(p => ({ ...p, department: e.target.value }))}
                                            placeholder="Ví dụ: PKD-1"
                                            className="w-full p-2 border border-stone-200 rounded text-xs outline-none focus:ring-1 focus:ring-red-500 font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Quyền hạn*</label>
                                        <select
                                            value={formData.role}
                                            onChange={(e) => setFormData(p => ({ ...p, role: e.target.value }))}
                                            className="w-full p-2 border border-stone-200 rounded text-xs outline-none focus:ring-1 focus:ring-red-500 bg-white"
                                        >
                                            {rolesList.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                                        placeholder="nhanvien@gmail.com"
                                        className="w-full p-2 border border-stone-200 rounded text-xs outline-none focus:ring-1 focus:ring-red-500 font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Mật khẩu đăng nhập*</label>
                                    <input
                                        type="text"
                                        value={formData.password}
                                        onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                                        placeholder="Mật khẩu..."
                                        className="w-full p-2 border border-stone-200 rounded text-xs outline-none focus:ring-1 focus:ring-red-500 font-mono font-bold"
                                        required
                                    />
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                    <input
                                        type="checkbox"
                                        id="activeCheck"
                                        checked={formData.active}
                                        onChange={(e) => setFormData(p => ({ ...p, active: e.target.checked }))}
                                        className="w-3.5 h-3.5 text-red-600 border-stone-300 rounded focus:ring-red-500 cursor-pointer"
                                    />
                                    <label htmlFor="activeCheck" className="text-xs font-semibold text-stone-700 cursor-pointer select-none">
                                        Cho phép hoạt động và đăng nhập
                                    </label>
                                </div>

                                {/* Footer */}
                                <div className="pt-3.5 border-t border-stone-150 flex justify-end gap-2 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 border border-stone-200 rounded text-stone-600 hover:bg-stone-50 font-bold"
                                    >
                                        Đóng
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow-sm transition active:scale-95"
                                    >
                                        Lưu thiết lập
                                    </button>
                                </div>
                            </form>
                        ) : (
                            /* Modal Content - Thêm theo danh sách dán */
                            <form onSubmit={handleSaveList} className="p-4 space-y-3.5">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-[10px] font-bold text-stone-400 uppercase">Dán danh sách nhân sự*</label>
                                        <span className="text-[10px] text-red-500 font-medium font-mono">Pass mặc định: mg123</span>
                                    </div>
                                    <textarea
                                        value={pastedList}
                                        onChange={(e) => setPastedList(e.target.value)}
                                        rows={8}
                                        placeholder={`Định dạng mỗi dòng một người:\nChức vụ | Phòng ban | Tên NV | SDT | Email\n\nVí dụ:\nTrưởng phòng | PKD 1 | Nguyễn Văn A | 0912345678 | a@gmail.com\nNhân viên | PKD 1 | Nguyễn Văn B | 0987654321 | b@gmail.com`}
                                        className="w-full p-3 border border-stone-200 rounded text-xs outline-none focus:ring-1 focus:ring-red-500 font-mono leading-relaxed"
                                        required
                                    />
                                    <p className="text-[10px] text-stone-400 mt-1 leading-normal italic">
                                        * Số điện thoại (SDT) được dùng để đăng nhập. Mã nhân viên (Mã NV) sẽ tự động tạo từ SDT dưới dạng NVxxxx để tránh trùng lặp thông tin.
                                    </p>
                                </div>

                                {/* Footer */}
                                <div className="pt-3.5 border-t border-stone-150 flex justify-end gap-2 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 border border-stone-200 rounded text-stone-600 hover:bg-stone-50 font-bold"
                                    >
                                        Đóng
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow-sm transition active:scale-95 flex items-center gap-1.5"
                                    >
                                        <ListPlus size={14} />
                                        Nhập danh sách
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
