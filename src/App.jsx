import React, { useState, useEffect, useRef } from 'react';
import { api } from './api';
import './App.css';
import { Button, Input, Select, Modal, Form, message, Divider } from 'antd';
import { 
  UserOutlined, LockOutlined, AppstoreOutlined, TeamOutlined, 
  CarOutlined, BarChartOutlined, FileDoneOutlined, 
  PlusOutlined, SearchOutlined, PhoneOutlined, ArrowLeftOutlined,
  LogoutOutlined, SaveOutlined, CalendarOutlined, HistoryOutlined,
  FileTextOutlined, DeleteOutlined
} from '@ant-design/icons';

const { Option } = Select;
const { TextArea } = Input;

// ... (Giữ nguyên các hàm UTILS: getFirstDayOfMonth, LoginScreen...)
const getFirstDayOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
};
const getLastDayOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
};
const formatDate = (dateStr) => dateStr || '--/--';

const LoginScreen = ({ onLogin, loading }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  return (
    <div className="tet-login-container">
      {[...Array(8)].map((_, i) => (<div key={i} className="tet-particle" style={{left: `${Math.random() * 100}%`, animationDuration: `${3+Math.random()*5}s`}}></div>))}
      <div className="tet-login-card">
        <h2 className="tet-title">SKODA CRM</h2>
        <p className="tet-subtitle">HỆ THỐNG QUẢN TRỊ KHÁCH HÀNG</p>
        <form onSubmit={(e)=>{e.preventDefault(); onLogin({username, password})}} style={{width:'100%'}}>
          <div className="tet-input-group"><UserOutlined className="tet-input-icon"/><input className="tet-input" placeholder="Tên đăng nhập / SĐT" value={username} onChange={e=>setUsername(e.target.value)}/></div>
          <div className="tet-input-group"><LockOutlined className="tet-input-icon"/><input type="password" className="tet-input" placeholder="Mật khẩu" value={password} onChange={e=>setPassword(e.target.value)}/></div>
          <button type="submit" className="tet-btn" disabled={loading}>{loading ? 'ĐANG KẾT NỐI...' : 'ĐĂNG NHẬP'}</button>
        </form>
      </div>
    </div>
  );
};

// --- COMPONENT HIỂN THỊ LỊCH SỬ LOG ---
const NoteHistory = ({ content, type = 'sale' }) => {
  if (!content) return null;
  const typeClass = type === 'tpkd' ? 'history-tpkd' : type === 'm' ? 'history-m' : '';
  return (
    <div className={`note-history-box ${typeClass}`}>
      {content}
    </div>
  );
};

// --- FORM CHỈNH SỬA CHI TIẾT (CÓ TÍNH NĂNG LOG) ---
// Thêm prop 'record' để lấy dữ liệu lịch sử
const EditCustomerForm = ({ form, config, roleLevel, record }) => (
  <div className="smart-form-box">
    {/* Thông tin chung */}
    <div className="smart-grid">
       <div className="custom-form-item">
          <label className="custom-label">Họ tên <span style={{color:'red'}}>*</span></label>
          <Form.Item name="customerName" noStyle rules={[{required:true}]}><Input size="large" placeholder="Nhập tên"/></Form.Item>
       </div>
       <div className="custom-form-item">
          <label className="custom-label">Điện thoại <span style={{color:'red'}}>*</span></label>
          <Form.Item name="phone" noStyle rules={[{required:true}]}><Input size="large" placeholder="09xxxx"/></Form.Item>
       </div>
       <div className="custom-form-item full-width">
          <label className="custom-label">Khu vực / Tỉnh thành</label>
          <Form.Item name="province" noStyle>
             <Select size="large" showSearch placeholder="Chọn Tỉnh" optionFilterProp="children">{config.provinces?.map(p => <Option key={p} value={p}>{p}</Option>)}</Select>
          </Form.Item>
       </div>
    </div>
    <Divider orientation="left" style={{borderColor:'#e2e8f0', color:'#2563eb', fontSize:12, margin:'12px 0'}}>NHU CẦU & XE</Divider>
    <div className="smart-grid">
       <div className="custom-form-item mobile-half">
          <label className="custom-label">Dòng xe</label>
          <Form.Item name="carModel" noStyle><Select size="large" placeholder="Chọn xe">{config.carModels?.map(c=><Option key={c} value={c}>{c}</Option>)}</Select></Form.Item>
       </div>
       <div className="custom-form-item mobile-half">
          <label className="custom-label">Màu sắc</label>
          <Form.Item name="carColor" noStyle><Select size="large" placeholder="Màu">{config.carColors?.map(c=><Option key={c} value={c}>{c}</Option>)}</Select></Form.Item>
       </div>
       <div className="custom-form-item">
          <label className="custom-label">Kênh QC</label>
          <Form.Item name="channel" noStyle><Select size="large" placeholder="Kênh">{config.channels?.map(s=><Option key={s} value={s}>{s}</Option>)}</Select></Form.Item>
       </div>
       <div className="custom-form-item">
          <label className="custom-label">Nguồn</label>
          <Form.Item name="source" noStyle><Select size="large" placeholder="Nguồn">{config.sources?.map(s=><Option key={s} value={s}>{s}</Option>)}</Select></Form.Item>
       </div>
       <div className="custom-form-item">
          <label className="custom-label">Trạng thái</label>
          <Form.Item name="status" noStyle><Select size="large">{config.statuses?.map(s=><Option key={s} value={s}>{s}</Option>)}</Select></Form.Item>
       </div>
       <div className="custom-form-item">
          <label className="custom-label">Đánh giá</label>
          <Form.Item name="rating" noStyle><Select size="large" placeholder="Tiềm năng">{config.ratings?.map(r=><Option key={r} value={r}>{r}</Option>)}</Select></Form.Item>
       </div>
    </div>

    <Divider orientation="left" style={{borderColor:'#e2e8f0', color:'#2563eb', fontSize:12, margin:'12px 0'}}>NHẬT KÝ & GHI CHÚ</Divider>

    {/* 1. GHI CHÚ SALE */}
    <div className="custom-form-item full-width">
       <div className="note-label-row"><label className="custom-label">Ghi chú TVBH</label><span className="note-badge">Lịch sử</span></div>
       {/* Hiển thị lịch sử (Không cho sửa) */}
       <NoteHistory content={record?.saleNote} type="sale" />
       {/* Ô nhập mới */}
       <Form.Item name="saleNote" noStyle><TextArea rows={2} placeholder="Nhập ghi chú mới (Hệ thống tự lưu giờ)..." /></Form.Item>
    </div>
    
    {/* 2. GHI CHÚ TPKD */}
    {roleLevel >= 2 && (
       <div className="custom-form-item full-width" style={{marginTop:12}}>
          <div className="note-label-row"><label className="custom-label" style={{color:'#d97706'}}>Ghi chú TPKD</label><span className="note-badge">Chỉ TPKD</span></div>
          <NoteHistory content={record?.tpkdNote} type="tpkd" />
          <Form.Item name="tpkdNote" noStyle><TextArea rows={2} style={{background:'#fffbeb', borderColor:'#fcd34d'}} placeholder="Chỉ đạo mới..."/></Form.Item>
       </div>
    )}
    
    {/* 3. GHI CHÚ GIÁM ĐỐC */}
    {roleLevel >= 3 && (
       <div className="custom-form-item full-width" style={{marginTop:12}}>
          <div className="note-label-row"><label className="custom-label" style={{color:'#dc2626'}}>Ghi chú Giám đốc</label><span className="note-badge">Chỉ BGĐ</span></div>
          <NoteHistory content={record?.mNote} type="m" />
          <Form.Item name="mNote" noStyle><TextArea rows={2} style={{background:'#fef2f2', borderColor:'#fca5a5'}} placeholder="Ý kiến mới..."/></Form.Item>
       </div>
    )}
  </div>
);

// ... (BulkAddForm giữ nguyên như code trước) ...
const BulkAddForm = ({ bulkData, setBulkData, config }) => {
  const addRow = () => setBulkData([...bulkData, { customerName: '', phone: '', carModel: undefined, source: undefined, channel: undefined, saleNote: '' }]);
  const removeRow = (idx) => setBulkData(bulkData.filter((_, i) => i !== idx));
  const updateRow = (idx, field, val) => {
    const newData = [...bulkData];
    newData[idx][field] = val;
    setBulkData(newData);
  };
  return (
    <div className="smart-form-box">
      <div className="bulk-table-container">
        <table className="bulk-table">
          <thead>
            <tr>
              <th style={{width:'20%'}}>HỌ TÊN <span style={{color:'red'}}>*</span></th>
              <th style={{width:'15%'}}>SĐT <span style={{color:'red'}}>*</span></th>
              <th style={{width:'15%'}}>KÊNH QC</th>
              <th style={{width:'15%'}}>NGUỒN</th>
              <th style={{width:'15%'}}>XE</th>
              <th style={{width:'15%'}}>GHI CHÚ</th>
              <th style={{width:'5%'}}></th>
            </tr>
          </thead>
          <tbody>
            {bulkData.map((row, i) => (
              <tr key={i}>
                <td><Input className="bulk-input" placeholder="Tên" value={row.customerName} onChange={e=>updateRow(i, 'customerName', e.target.value)} /></td>
                <td><Input className="bulk-input" placeholder="09xxxx" value={row.phone} onChange={e=>updateRow(i, 'phone', e.target.value)} /></td>
                <td><Select className="bulk-input" placeholder="Kênh" value={row.channel} onChange={v=>updateRow(i, 'channel', v)} bordered={false} style={{padding:0}}>{config.channels?.map(c=><Option key={c} value={c}>{c}</Option>)}</Select></td>
                <td><Select className="bulk-input" placeholder="Nguồn" value={row.source} onChange={v=>updateRow(i, 'source', v)} bordered={false} style={{padding:0}}>{config.sources?.map(s=><Option key={s} value={s}>{s}</Option>)}</Select></td>
                <td><Select className="bulk-input" placeholder="Xe" value={row.carModel} onChange={v=>updateRow(i, 'carModel', v)} bordered={false} style={{padding:0}}>{config.carModels?.map(c=><Option key={c} value={c}>{c}</Option>)}</Select></td>
                <td><Input className="bulk-input" placeholder="Note..." value={row.saleNote} onChange={e=>updateRow(i, 'saleNote', e.target.value)} /></td>
                <td style={{textAlign:'center'}}>{bulkData.length > 1 && <div className="btn-remove-row" onClick={()=>removeRow(i)}><DeleteOutlined/></div>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bulk-actions"><Button type="dashed" icon={<PlusOutlined/>} onClick={addRow}>Thêm dòng</Button><span style={{fontSize:12, color:'#64748b'}}>Nhập {bulkData.length} khách</span></div>
    </div>
  );
};

// --- MAIN APP ---
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('customers'); 
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [config, setConfig] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getLastDayOfMonth());
  
  const [editingItem, setEditingItem] = useState(null); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [bulkData, setBulkData] = useState([{ customerName: '', phone: '', carModel: undefined, source: undefined, channel: undefined, saleNote: '' }]);
  
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const sidebarListRef = useRef(null);
  const resizerRef = useRef(null);
  const isResizing = useRef(false);

  // ... (Giữ nguyên logic Resize & Login) ...
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    const onMouseDown = (e) => {
        if (e.target !== resizerRef.current) return;
        isResizing.current = true;
        document.body.style.cursor = 'col-resize';
        if(sidebarListRef.current) sidebarListRef.current.style.transition = 'none';
        const onMouseMove = (ev) => {
            if (!isResizing.current || !sidebarListRef.current) return;
            let newWidth = ev.clientX - 260; 
            if (newWidth < 300) newWidth = 300; if (newWidth > 800) newWidth = 800;
            sidebarListRef.current.style.width = `${newWidth}px`;
        };
        const onMouseUp = () => {
            isResizing.current = false; document.body.style.cursor = 'default';
            if(sidebarListRef.current) sidebarListRef.current.style.transition = '';
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => { window.removeEventListener('resize', handleResize); window.removeEventListener('mousedown', onMouseDown); }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('skoda_user');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (user) {
      api.getConfig().then(res => res?.status === 'success' && setConfig(res.data));
      loadData();
    }
  }, [user]);

  // LOGIC ĐỔ DỮ LIỆU VÀO FORM
  useEffect(() => {
    if (editingItem && form) {
        // Đổ dữ liệu vào form, NHƯNG XÓA TRẮNG các ô Note để người dùng nhập mới
        form.setFieldsValue({
            ...editingItem,
            saleNote: '', // Để trống cho nhập mới
            tpkdNote: '', 
            mNote: ''
        });
    }
  }, [editingItem]);

  useEffect(() => {
    let res = customers;
    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        res = res.filter(c => c.customerName?.toLowerCase().includes(lower) || c.phone?.includes(lower));
    }
    setFilteredCustomers(res);
  }, [customers, searchTerm, startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    try {
       const res = await api.getCustomers(1, '', user);
       if (res?.status === 'success') setCustomers(res.data.map((item, i) => ({...item, key: i})));
    } catch(e) {} finally { setLoading(false); }
  };

  const handleLogin = async (c) => {
    setLoading(true);
    const res = await api.login(c.username, c.password);
    setLoading(false);
    if (res.status === 'success') {
       message.success(`Xin chào ${res.data.name}`);
       setUser(res.data);
       localStorage.setItem('skoda_user', JSON.stringify(res.data));
    } else message.error(res.message);
  };

  const handleSave = async () => {
    message.loading({content:'Đang lưu...', key:'s'});
    try {
        let res;
        if (editingItem) {
            const v = await form.validateFields();
            // Gửi dữ liệu update. Chú ý: v.saleNote là nội dung MỚI.
            res = await api.updateCustomer({ ...editingItem, ...v });
        } else {
            const validItems = bulkData.filter(i => i.customerName && i.phone);
            if (validItems.length === 0) throw new Error('Vui lòng nhập ít nhất Tên và SĐT');
            res = await api.addCustomers(validItems, user);
        }
        if (res.status === 'success') {
           message.success({content:'Thành công!', key:'s'});
           setIsModalOpen(false);
           if (!editingItem) setBulkData([{ customerName: '', phone: '', carModel: undefined, source: undefined, channel: undefined, saleNote: '' }]);
           loadData();
        } else message.error({content:res.message, key:'s'});
    } catch(e) { message.error({content: e.message || 'Lỗi nhập liệu', key:'s'}); }
  };

  const onCardClick = (item) => {
      setEditingItem(item);
      if (!isDesktop) setIsModalOpen(true);
  };

  const onAddNewClick = () => {
      setEditingItem(null); 
      if (!isDesktop) setIsModalOpen(true);
  };

  const getRoleLevel = (u) => {
    if (!u) return 0;
    const r = (u.role || '').toLowerCase();
    if (['admin', 'manager', 'giám đốc'].some(x => r.includes(x))) return 3;
    if (['tpkd', 'leader', 'trưởng phòng'].some(x => r.includes(x))) return 2;
    return 1;
  };

  if (!user) return <LoginScreen onLogin={handleLogin} loading={loading} />;

  const total = customers.length;
  const hot = customers.filter(c => c.rating === 'Hot').length;
  const deals = customers.filter(c => c.status === 'Chốt').length;

  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <div className="desktop-sidebar">
         <div className="brand"><CarOutlined /> SKODA CRM</div>
         <div className="user-profile-card"><div className="user-avatar-sidebar">{user.name.charAt(0)}</div><div className="user-details"><div className="name">{user.name}</div><div className="role">{user.role}</div></div></div>
         <div className={`nav-item ${view==='dashboard'?'active':''}`} onClick={()=>setView('dashboard')}><AppstoreOutlined/> Dashboard</div>
         <div className={`nav-item ${view==='customers'?'active':''}`} onClick={()=>setView('customers')}><TeamOutlined/> Khách hàng</div>
         <div className="nav-item"><CarOutlined/> Lái thử</div>
         <div style={{marginTop:'auto'}}></div>
         <div className="nav-item" onClick={()=>{localStorage.removeItem('skoda_user'); setUser(null)}} style={{color:'#ef4444'}}><LogoutOutlined/> Đăng xuất</div>
      </div>

      <div className="main-area">
         {view === 'dashboard' && (
           <>
             <div className="mobile-header"><div className="header-title">Dashboard</div></div>
             <div className="content-scroll">
                <div className="banner-card"><div style={{fontSize:11, opacity:0.8, fontWeight:700, letterSpacing:1}}>HÔM NAY</div><div style={{fontSize:22, fontWeight:800, margin:'5px 0'}}>{new Date().toLocaleDateString('vi-VN')}</div></div>
                <div className="stats-grid">
                   <div className="stat-box"><span className="stat-val" style={{color:'#3b82f6'}}>{total}</span><span className="stat-lbl">TỔNG KHÁCH</span></div>
                   <div className="stat-box"><span className="stat-val" style={{color:'#ef4444'}}>{hot}</span><span className="stat-lbl">KHÁCH HOT</span></div>
                   <div className="stat-box"><span className="stat-val" style={{color:'#10b981'}}>{deals}</span><span className="stat-lbl">ĐÃ CHỐT</span></div>
                </div>
             </div>
           </>
         )}

         {view === 'customers' && (
           <div className="split-container">
              {/* LIST */}
              <div className="split-list" ref={sidebarListRef} style={isDesktop ? { width: '450px', flex: 'none' } : { flex: 1 }}>
                 <div className="list-header-bar">
                    <div style={{display:'flex', alignItems:'center', gap:10}}>
                       <Button icon={<ArrowLeftOutlined/>} shape="circle" onClick={()=>setView('dashboard')} className="mobile-only"/>
                       <div style={{fontSize:18, fontWeight:700, color:'#1e293b'}}>Khách Hàng</div>
                    </div>
                    {isDesktop && <Button type="primary" icon={<PlusOutlined/>} onClick={onAddNewClick}>Thêm mới</Button>}
                 </div>
                 <div className="filter-bar">
                    <div className="date-row"><input type="date" className="date-input" value={startDate} onChange={e=>setStartDate(e.target.value)} /><span>-</span><input type="date" className="date-input" value={endDate} onChange={e=>setEndDate(e.target.value)} /></div>
                    <div className="search-row"><SearchOutlined className="search-ico"/><input className="search-inp" placeholder="Tìm tên, SĐT..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} /></div>
                 </div>
                 <div className="cust-list-scroll">
                    {filteredCustomers.map((c, i) => (
                       <div key={i} className={`cust-card ${editingItem?.key===c.key ? 'active' : ''}`} onClick={() => onCardClick(c)}>
                          <div className="cust-content">
                             <div className="c-row-1"><div className="c-name">{c.customerName}</div><span className="c-badge">{c.status}</span></div>
                             <div className="c-phone-row"><PhoneOutlined style={{fontSize:12}}/> {c.phone}</div>
                             <div className="c-sale-row"><UserOutlined/> Sale: <b>{c.saleName}</b> &bull; {c.carModel}</div>
                             {/* SHOW LOG PREVIEW */}
                             {c.saleNote && (
                               <div className="c-note-preview">
                                 <FileTextOutlined style={{marginTop:2}} />
                                 <span className="c-note-text">{c.saleNote.split('\n')[0]}</span> {/* Chỉ hiện dòng đầu */}
                               </div>
                             )}
                             <div className="c-footer-dates"><div className="date-item"><CalendarOutlined/> {formatDate(c.date)}</div><div className="date-item update"><HistoryOutlined/> {formatDate(c.lastUpdated)}</div></div>
                          </div>
                          <div className="cust-action"><a href={`tel:${c.phone}`} className="btn-call-box" onClick={(e)=>e.stopPropagation()}><PhoneOutlined/></a><span className="lbl-call">GỌI</span></div>
                       </div>
                    ))}
                 </div>
                 <div className="fab-add" onClick={onAddNewClick}><PlusOutlined style={{color:'white'}}/></div>
              </div>

              {isDesktop && <div className="resizer-bar" ref={resizerRef}></div>}

              {/* DETAIL (RIGHT PANEL) */}
              <div className="split-detail">
                 <div className="detail-header">
                    <div className="detail-title">{editingItem ? 'Chi Tiết Hồ Sơ' : 'Thêm Khách Hàng (Nhập Nhanh)'}</div>
                    <Button type="primary" icon={<SaveOutlined/>} onClick={handleSave} style={{background:'#2563eb'}}>Lưu Dữ Liệu</Button>
                 </div>
                 <div className="detail-body">
                    {editingItem ? (
                        <Form form={form} layout="vertical">
                           {/* TRUYỀN editingItem VÀO ĐỂ HIỂN THỊ LỊCH SỬ LOG */}
                           <EditCustomerForm form={form} config={config} roleLevel={getRoleLevel(user)} record={editingItem} />
                        </Form>
                    ) : (
                        <BulkAddForm bulkData={bulkData} setBulkData={setBulkData} config={config} />
                    )}
                 </div>
              </div>
           </div>
         )}

         <div className="bottom-nav">
            <div className={`b-nav-item ${view==='dashboard'?'active':''}`} onClick={()=>setView('dashboard')}><AppstoreOutlined/> Dashboard</div>
            <div className={`b-nav-item ${view==='customers'?'active':''}`} onClick={()=>setView('customers')}><TeamOutlined/> Khách hàng</div>
            <div className="b-nav-item"><CarOutlined/> Lái thử</div>
         </div>
      </div>

      <Modal 
         open={isModalOpen} 
         onCancel={() => setIsModalOpen(false)} 
         width={800} centered
         title={<div style={{fontSize:18, fontWeight:'bold', color:'#2563eb'}}>{editingItem ? 'Cập nhật' : 'Thêm mới'}</div>}
         footer={[<Button key="back" onClick={() => setIsModalOpen(false)}>Hủy</Button>, <Button key="submit" type="primary" onClick={handleSave} style={{background:'#2563eb'}}>Lưu lại</Button>]}
      >
         <Form form={form} layout="vertical" style={{marginTop:15}}>
            {editingItem 
                ? <EditCustomerForm form={form} config={config} roleLevel={getRoleLevel(user)} record={editingItem} /> 
                : <EditCustomerForm form={form} config={config} roleLevel={getRoleLevel(user)} record={null} /> // Mobile add new cũng dùng form này cho gọn
            }
         </Form>
      </Modal>
    </div>
  );
}

export default App;