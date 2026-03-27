import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { customerService } from './customerService';
import { authService } from '../auth/authService';
import CustomerFormModal from './CustomerFormModal';
import { Search, Plus, Loader2, Phone, User, Calendar, MessageSquare, Save, X, GripVertical, Briefcase, Car, PieChart, ShieldCheck, ShieldAlert, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// --- SUB-COMPONENT: FORM CHI TIẾT ---
const CustomerDetailPane = ({ customer, config, onSave, loadingSave }) => {
    const [formData, setFormData] = useState({});
    const [suggestions, setSuggestions] = useState([]);
    const [roleLevel, setRoleLevel] = useState(1);
    const [isContactMenuOpen, setIsContactMenuOpen] = useState(false);

    useEffect(() => {
        try {
            const user = authService.getCurrentUser();
            if (user) {
                const role = String(user.role || '').toLowerCase();
                if (role.includes('admin') || role.includes('giám đốc') || role.includes('quản lý')) setRoleLevel(3);
                else if (role.includes('trưởng phòng') || role.includes('tpkd')) setRoleLevel(2);
                else setRoleLevel(1);
            }
        } catch (error) { setRoleLevel(1); }
    }, []);

    useEffect(() => {
        if (customer) {
            setFormData({ ...customer, newNote: '' });
            setSuggestions([]);
            setIsContactMenuOpen(false);
        }
    }, [customer]);

    const handleChange = (e) => {
        const { name, value } = e.target;
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

    const handleSubmit = () => {
        const requiredFields = ['customerName', 'phone', 'carModel', 'version', 'source', 'channel'];
        const missing = requiredFields.filter(f => !formData[f] || String(formData[f]).trim() === '');
        if (missing.length > 0) { toast.error('Thiếu: ' + missing.join(', ')); return; }
        onSave({ ...formData, originalPhone: customer.phone });
    };

    // --- XỬ LÝ LIÊN HỆ ---
    const handleContactClick = () => {
        const phone = formData.phone;
        if (!phone) { toast.error("Chưa có số điện thoại"); return; }

        if (window.innerWidth < 768) {
            setIsContactMenuOpen(true);
        } else {
            let cleanPhone = phone.replace(/\D/g, '');
            if (cleanPhone.startsWith('0')) {
                cleanPhone = '84' + cleanPhone.substring(1);
            }
            window.location.href = `zalo://conversation?phone=${cleanPhone}`;
        }
    };

    if (!customer) return (
        <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
            <User size={64} className="mb-4 text-gray-200" /><p>Chọn khách hàng để xem chi tiết</p>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* 1. HEADER (BỎ NÚT LIÊN HỆ CŨ) */}
            <div className="px-5 py-4 border-b flex items-center bg-gray-50 shrink-0 shadow-sm z-10 pr-12 justify-between">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 line-clamp-1">{formData.customerName}</h3>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-sm text-gray-600 font-mono font-bold flex items-center gap-1">
                            <Phone size={14}/> {formData.phone}
                        </p>
                    </div>
                </div>
            </div>

            {/* 2. BODY */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-6 bg-white pb-20">
                {/* Khối Phụ trách */}
                <div className="border rounded-lg p-4 bg-gray-50/50 border-gray-100">
                    <h4 className="text-xs font-bold text-blue-600 uppercase mb-3 flex items-center gap-2"><Briefcase size={14}/> Phụ trách</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Nhân viên</label><div className="font-medium text-gray-800 text-sm">{customer.saleName || '---'}</div></div>
                        <div><label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Phòng ban</label><div className="font-medium text-gray-800 text-sm">{customer.department || '---'}</div></div>
                    </div>
                </div>

                {/* Khối Thông tin khách */}
                <div className="border rounded-lg p-4 border-gray-200">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><User size={14}/> Khách hàng</h4>
                    
                    {/* SỬA LAYOUT Ở ĐÂY: Mobile 1 cột, PC 2 cột để tránh bị ép */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 font-bold uppercase">Họ tên (*)</label>
                            <input name="customerName" value={formData.customerName || ''} onChange={handleChange} className="w-full p-2 border rounded text-sm focus:ring-1 focus:ring-green-500 outline-none" />
                        </div>
                        
                        {/* --- Ô NHẬP SĐT VÀ NÚT LIÊN HỆ --- */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 font-bold uppercase">SĐT (*)</label>
                            <div className="flex items-center gap-1">
                                {/* min-w-0 là chìa khóa để input tự co lại khi hết chỗ */}
                                <input 
                                    name="phone" 
                                    value={formData.phone || ''} 
                                    onChange={handleChange} 
                                    className="flex-1 w-full p-2 border rounded text-sm font-bold text-gray-800 focus:ring-1 focus:ring-green-500 outline-none min-w-0" 
                                />
                                {/* Nút bấm không bị co lại */}
                                <button 
                                    onClick={handleContactClick}
                                    title="Liên hệ (Gọi/Zalo)"
                                    className="w-[38px] h-[38px] bg-green-600 hover:bg-green-700 text-white rounded flex items-center justify-center shadow-sm shrink-0 transition active:scale-95"
                                >
                                    <MessageCircle size={20} />
                                </button>
                            </div>
                        </div>
                        {/* ---------------------------------- */}

                        <div className="space-y-1 relative col-span-1 sm:col-span-1">
                            <label className="text-[10px] text-gray-500 font-bold uppercase">Phường / Xã</label>
                            <div className="relative"><input name="ward" value={formData.ward || ''} onChange={handleChange} className="w-full p-2 border rounded text-sm focus:ring-1 focus:ring-green-500 outline-none" autoComplete="off" placeholder="Nhập để tìm..."/>{suggestions.length > 0 && (<div className="absolute top-full left-0 w-full bg-white border shadow-xl mt-1 max-h-40 overflow-y-auto rounded z-50">{suggestions.map((loc, idx) => (<div key={idx} onClick={() => handleSelectSuggestion(loc)} className="p-2 hover:bg-green-50 cursor-pointer text-sm border-b last:border-0"><span className="font-bold">{loc.ward}</span> <span className="text-gray-400 text-xs">- {loc.province}</span></div>))}</div>)}</div>
                        </div>
                        <div className="space-y-1 col-span-1 sm:col-span-1">
                            <label className="text-[10px] text-gray-500 font-bold uppercase">Tỉnh / Thành</label>
                            <input name="province" value={formData.province || ''} readOnly className="w-full p-2 border rounded text-sm bg-gray-100 text-gray-500 cursor-not-allowed" />
                        </div>
                    </div>
                </div>

                {/* Khối Xe & Nguồn */}
                <div className="border rounded-lg p-4 border-gray-200">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><Car size={14}/> Xe & Nguồn</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[10px] text-gray-500 font-bold uppercase">Dòng xe</label><select name="carModel" value={formData.carModel || ''} onChange={handleChange} className="w-full p-2 border rounded text-sm bg-white outline-none"><option value="">-- Chọn --</option>{config.carModels?.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                        <div className="space-y-1"><label className="text-[10px] text-gray-500 font-bold uppercase">Phiên bản</label><select name="version" value={formData.version || ''} onChange={handleChange} className="w-full p-2 border rounded text-sm bg-white outline-none"><option value="">-- Chọn --</option>{config.versions?.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                        <div className="space-y-1"><label className="text-[10px] text-gray-500 font-bold uppercase">Nguồn</label><select name="source" value={formData.source || ''} onChange={handleChange} className="w-full p-2 border rounded text-sm bg-white outline-none"><option value="">-- Chọn --</option>{config.sources?.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                        <div className="space-y-1"><label className="text-[10px] text-gray-500 font-bold uppercase">Kênh</label><select name="channel" value={formData.channel || ''} onChange={handleChange} className="w-full p-2 border rounded text-sm bg-white outline-none"><option value="">-- Chọn --</option>{config.channels?.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    </div>
                </div>

                {/* Khối Ghi chú */}
                <div className="space-y-4">
                    <div className="border rounded-lg p-4 border-blue-200 bg-blue-50/30">
                        <h4 className="text-xs font-bold text-blue-600 uppercase mb-2 flex items-center gap-2"><MessageSquare size={14}/> Ghi chú TVBH (Cấp 1)</h4>
                        <div className="bg-white p-3 rounded border border-blue-100 text-xs text-gray-700 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono mb-2">{customer.saleNote || <span className="text-gray-400 italic">Chưa có ghi chú.</span>}</div>
                        {roleLevel === 1 && (<textarea name="newNote" value={formData.newNote || ''} onChange={handleChange} className="w-full p-2 border-2 border-blue-200 rounded text-sm focus:border-blue-500 outline-none min-h-[60px]" placeholder="Nhập ghi chú TVBH..."></textarea>)}
                    </div>
                    {roleLevel >= 2 && (
                    <div className="border rounded-lg p-4 border-orange-200 bg-orange-50/30">
                        <h4 className="text-xs font-bold text-orange-600 uppercase mb-2 flex items-center gap-2"><ShieldCheck size={14}/> Ý kiến TPKD (Cấp 2)</h4>
                        <div className="bg-white p-3 rounded border border-orange-100 text-xs text-gray-700 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono mb-2">{customer.tpkdNote || <span className="text-gray-400 italic">Chưa có ý kiến.</span>}</div>
                        {roleLevel === 2 && <textarea name="newNote" value={formData.newNote || ''} onChange={handleChange} className="w-full p-2 border-2 border-orange-200 rounded text-sm focus:border-orange-500 outline-none min-h-[60px]" placeholder="Nhập chỉ đạo TPKD..."></textarea>}
                    </div>
                    )}
                    {roleLevel === 3 && (
                    <div className="border rounded-lg p-4 border-red-200 bg-red-50/30">
                        <h4 className="text-xs font-bold text-red-600 uppercase mb-2 flex items-center gap-2"><ShieldAlert size={14}/> Ý kiến Giám đốc (Cấp 3)</h4>
                        <div className="bg-white p-3 rounded border border-red-100 text-xs text-gray-700 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono mb-2">{customer.mNote || <span className="text-gray-400 italic">Chưa có ý kiến.</span>}</div>
                        <textarea name="newNote" value={formData.newNote || ''} onChange={handleChange} className="w-full p-2 border-2 border-red-200 rounded text-sm focus:border-red-500 outline-none min-h-[60px]" placeholder="Nhập ý kiến Ban Giám Đốc..."></textarea>
                    </div>
                    )}
                </div>
            </div>

            {/* 3. FOOTER */}
            <div className="p-4 border-t bg-white shrink-0 pb-safe">
                 <button 
                    onClick={handleSubmit} 
                    disabled={loadingSave} 
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 text-sm disabled:opacity-50 active:scale-95 transition"
                 >
                    {loadingSave ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>} 
                    LƯU HỒ SƠ KHÁCH HÀNG
                </button>
            </div>

            {/* --- MOBILE CONTACT MENU --- */}
            {isContactMenuOpen && (
                <div 
                    className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setIsContactMenuOpen(false)}
                >
                    <div 
                        className="bg-white w-full max-w-xs rounded-2xl overflow-hidden shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()} 
                    >
                        <div className="text-center">
                            <h3 className="font-bold text-gray-800 text-lg">Liên hệ</h3>
                            <p className="text-sm text-gray-500">{formData.phone}</p>
                        </div>
                        
                        <a 
                            href={`tel:${formData.phone}`} 
                            className="flex items-center justify-center gap-3 w-full bg-green-100 text-green-700 py-3.5 rounded-xl font-bold hover:bg-green-200 transition active:scale-95"
                        >
                            <Phone size={20} /> Gọi trực tiếp
                        </a>
                        
                        <a 
                            href={`https://zalo.me/${formData.phone?.replace(/\D/g,'')}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="flex items-center justify-center gap-3 w-full bg-blue-100 text-blue-700 py-3.5 rounded-xl font-bold hover:bg-blue-200 transition active:scale-95"
                        >
                            <MessageCircle size={20} /> Chat Zalo
                        </a>

                        <button 
                            onClick={() => setIsContactMenuOpen(false)} 
                            className="w-full py-3 text-gray-500 font-medium hover:bg-gray-50 rounded-xl"
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- COMPONENT CHÍNH ---
const CustomerList = () => {
  const [rawData, setRawData] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const today = new Date().toISOString().split('T')[0];
  const [dateRange, setDateRange] = useState({ start: today, end: today });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({ sources: [], carModels: [], locations: [] });
  const [filters, setFilters] = useState({ carModel: '', source: '', department: '', status: '' });

  const sidebarRef = useRef(null);
  const isResizing = useRef(false);

  const startResizing = useCallback((e) => { e.preventDefault(); isResizing.current = true; document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', stopResizing); document.body.style.cursor = 'col-resize'; }, []);
  const stopResizing = useCallback(() => { isResizing.current = false; document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', stopResizing); document.body.style.cursor = ''; }, []);
  const handleMouseMove = useCallback((e) => { if (isResizing.current && sidebarRef.current) { let newWidth = e.clientX; if (newWidth < 320) newWidth = 320; if (newWidth > 600) newWidth = 600; sidebarRef.current.style.width = `${newWidth}px`; } }, []);

  const fetchData = async () => {
    setLoading(true);
    setSelectedCustomer(null);
    try {
      if (!customerService || !customerService.getCustomers) {
          toast.error("Lỗi kết nối dịch vụ khách hàng");
          return;
      }
      const [resConfig, resCust] = await Promise.all([
          customerService.getConfig(), 
          customerService.getCustomers(dateRange.start, dateRange.end) 
      ]);
      
      if (resConfig?.status === 'success') setConfig(resConfig.data || { sources: [], carModels: [], locations: [] });
      if (resCust?.status === 'success') {
        const validData = Array.isArray(resCust.data) ? resCust.data : [];
        setRawData(validData);
        setCustomers(validData);
      }
    } catch (error) { console.error(error); toast.error('Lỗi tải dữ liệu'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const getDaysDiff = (dStr) => {
    if (!dStr || !String(dStr).includes('/')) return 999;
    try {
        const [d, m, y] = String(dStr).split('/');
        return Math.floor((new Date() - new Date(y, m - 1, d)) / (86400000));
    } catch { return 999; }
  };

  useEffect(() => {
    let res = rawData;
    if (searchTerm) {
        const lower = searchTerm.toLowerCase().trim();
        res = res.filter(c => 
            String(c.customerName || '').toLowerCase().includes(lower) || 
            String(c.phone || '').includes(lower) ||
            String(c.saleNote || '').toLowerCase().includes(lower)
        );
    }
    if (filters.carModel) res = res.filter(c => c.carModel === filters.carModel);
    if (filters.source) res = res.filter(c => c.source === filters.source);
    if (filters.department) res = res.filter(c => c.department === filters.department);
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
    setCustomers(res);
  }, [searchTerm, filters, rawData]);

  const distinctDepartments = useMemo(() => {
      const depts = rawData.map(c => c.department).filter(Boolean);
      return [...new Set(depts)].sort();
  }, [rawData]);

  const sourceStats = useMemo(() => {
      const stats = {};
      customers.forEach(c => {
          const s = c.source || 'Chưa rõ';
          stats[s] = (stats[s] || 0) + 1;
      });
      return stats;
  }, [customers]);

  const handleSaveChanges = async (updatedData) => {
      setSaving(true);
      try {
          const res = await customerService.updateCustomer(updatedData);
          if (res.status === 'success') {
              toast.success('Đã cập nhật hồ sơ!');
              fetchData(); 
          } else { toast.error(res.message); }
      } catch (error) { toast.error('Lỗi server'); } finally { setSaving(false); }
  };

  const getDaysInfo = (dStr) => {
    if (!dStr) return { text: 'Mới', color: 'text-green-600', bg: 'bg-green-50' };
    const diff = getDaysDiff(dStr);
    if (diff === 0) return { text: 'Hôm nay', color: 'text-green-600', bg: 'bg-green-50' };
    if (diff <= 3) return { text: `${diff} ngày`, color: 'text-blue-600', bg: 'bg-blue-50' };
    if (diff <= 7) return { text: `${diff} ngày`, color: 'text-orange-600', bg: 'bg-orange-50' };
    return { text: `${diff} ngày`, color: 'text-red-600', bg: 'bg-red-50' };
  };

  const getLatestNote = (note) => note ? String(note).split('\n')[0] : "Chưa có ghi chú";

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col md:flex-row bg-gray-100 overflow-hidden rounded-lg border border-gray-200 shadow-sm">
      
      {/* LEFT SIDEBAR (DS KHÁCH HÀNG) */}
      <div ref={sidebarRef} className="flex flex-col bg-slate-100 h-full w-full md:w-[380px] shrink-0 overflow-hidden" style={{ minWidth: '320px' }}>
        
        {/* HEADER DANH SÁCH */}
        <div className="p-3 border-b space-y-2 bg-white z-10 shadow-sm border-t-0">
            <div className="flex justify-between items-center">
                <h2 className="font-bold text-gray-800 flex items-center gap-2">DS KHÁCH HÀNG <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">{customers.length}</span></h2>
                <button onClick={()=>setIsAddModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white p-1.5 rounded shadow"><Plus size={18}/></button>
            </div>

            <div className="flex gap-2 items-center bg-gray-50 p-1.5 rounded border">
                <input type="date" value={dateRange.start} onChange={e=>setDateRange({...dateRange, start: e.target.value})} className="border rounded text-xs px-2 py-1 outline-none w-full"/>
                <span className="text-gray-400">-</span>
                <input type="date" value={dateRange.end} onChange={e=>setDateRange({...dateRange, end: e.target.value})} className="border rounded text-xs px-2 py-1 outline-none w-full"/>
                <button onClick={fetchData} className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-bold whitespace-nowrap">Xem</button>
            </div>

            {customers.length > 0 && (
                <div className="flex flex-wrap gap-2 text-[10px] bg-blue-50 border border-blue-100 p-2 rounded">
                    <span className="flex items-center gap-1 font-bold text-blue-700"><PieChart size={10}/> Nguồn:</span>
                    {Object.entries(sourceStats).map(([key, count]) => (
                        <span key={key} className="bg-white px-1.5 py-0.5 rounded border border-blue-100 text-gray-600 shadow-sm">{key}: <b className="text-blue-600">{count}</b></span>
                    ))}
                </div>
            )}

            <div className="relative"><Search className="absolute left-2 top-2 text-gray-400 w-4 h-4"/><input placeholder="Tìm tên, sđt, note..." className="pl-8 border rounded text-sm w-full py-1.5 outline-none bg-gray-50" onChange={e=>setSearchTerm(e.target.value)}/></div>
            
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
                 <select className="border rounded px-2 py-1 text-xs bg-white outline-none min-w-[90px]" value={filters.source} onChange={e=>setFilters({...filters,source:e.target.value})}><option value="">--Nguồn--</option>{config.sources?.map((s,i)=><option key={i} value={s}>{s}</option>)}</select>
                 <select className="border rounded px-2 py-1 text-xs bg-white outline-none min-w-[80px]" value={filters.carModel} onChange={e=>setFilters({...filters,carModel:e.target.value})}><option value="">--Xe--</option>{config.carModels?.map((c,i)=><option key={i} value={c}>{c}</option>)}</select>
                 <select className="border rounded px-2 py-1 text-xs bg-white outline-none min-w-[100px]" value={filters.department} onChange={e=>setFilters({...filters,department:e.target.value})}><option value="">--Phòng ban--</option>{distinctDepartments.map((d,i)=><option key={i} value={d}>{d}</option>)}</select>
                 <select className="border rounded px-2 py-1 text-xs bg-white outline-none min-w-[100px]" value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}>
                    <option value="">--Trạng thái--</option>
                    <option value="new">🟢 Hôm nay</option>
                    <option value="hot">🔵 1-3 ngày</option>
                    <option value="warm">🟠 4-7 ngày</option>
                    <option value="cold">🔴 &gt; 7 ngày</option>
                 </select>
            </div>
        </div>

        {/* LIST ITEMS */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {loading ? <div className="p-10 text-center"><Loader2 className="animate-spin inline text-green-600"/></div> : 
             customers.map((c, i) => {
                const dayInfo = getDaysInfo(c.lastUpdated);
                const isActive = selectedCustomer?.phone === c.phone;
                const cardClass = isActive ? 'bg-green-50 ring-2 ring-green-500 shadow-md transform scale-[1.01]' : 'bg-white border border-transparent hover:border-green-300 hover:shadow-md hover:-translate-y-0.5 shadow-sm';

                return (
                    <div key={i} onClick={() => setSelectedCustomer(c)} className={`p-3 rounded-lg cursor-pointer transition-all duration-200 relative group ${cardClass}`}>
                        <div className="text-[10px] text-gray-400 mb-1 flex items-center gap-1 border-b border-dashed border-gray-100 pb-1">
                            <Calendar size={10}/> <span className="font-medium text-gray-500">{c.date}</span>
                        </div>
                        <div className="flex justify-between items-start mb-1 mt-1">
                            <h4 className={`text-sm font-bold ${isActive ? 'text-green-800' : 'text-gray-800'}`}>{c.customerName}</h4>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap ${dayInfo.bg} ${dayInfo.color}`}>{dayInfo.text}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs mb-2">
                             <span className="text-blue-600 font-mono font-medium tracking-tight">{c.phone}</span>
                             <span className="text-gray-500 font-medium flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded"><Car size={10}/> {c.carModel}</span>
                        </div>
                        <div className="text-[11px] text-gray-500 line-clamp-1 italic flex items-center gap-1">
                            <MessageSquare size={10} className="shrink-0 text-gray-400"/> {getLatestNote(c.saleNote)}
                        </div>
                    </div>
                )
             })
            }
        </div>
      </div>

      <div className="hidden md:flex w-[4px] bg-gray-200 hover:bg-green-500 cursor-col-resize items-center justify-center transition-colors shrink-0 z-20" onMouseDown={startResizing}><GripVertical size={12} className="text-gray-400"/></div>

      {/* RIGHT FORM WRAPPER (MODAL MOBILE) */}
      <div className={`
          fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4
          md:static md:bg-transparent md:p-0 md:flex-1 md:h-full md:block
          ${selectedCustomer ? 'flex' : 'hidden md:flex'}
      `}>
          {/* INNER BOX */}
          <div className={`
              bg-white w-full flex flex-col relative
              rounded-xl shadow-2xl overflow-hidden h-[85vh]
              md:max-h-full md:h-full md:rounded-none md:shadow-none
          `}>
              {/* Nút X */}
              <button 
                  onClick={() => setSelectedCustomer(null)} 
                  className="md:hidden absolute top-3 right-3 z-50 p-2 bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-500 rounded-full transition shadow-sm"
              >
                  <X size={20}/>
              </button>

              <CustomerDetailPane customer={selectedCustomer} config={config} onSave={handleSaveChanges} loadingSave={saving} />
          </div>
      </div>

      <CustomerFormModal isOpen={isAddModalOpen} onClose={()=>setIsAddModalOpen(false)} onSuccess={fetchData} />
    </div>
  );
};

export default CustomerList;