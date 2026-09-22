import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Loader2, RefreshCw, Briefcase, FileText, Gift, Info } from 'lucide-react';
import { calendarService } from './calendarService';
import toast from 'react-hot-toast';
import { authService } from '../auth/authService';

const staticHolidays = {
  '01-01': 'Tết Dương Lịch',
  '02-14': 'Lễ Tình Nhân',
  '03-08': 'Quốc Tế Phụ Nữ',
  '04-30': 'Giải Phóng Miền Nam',
  '05-01': 'Quốc Tế Lao Động',
  '05-19': 'Sinh Nhật Bác',
  '06-01': 'Quốc Tế Thiếu Nhi',
  '09-02': 'Quốc Khánh',
  '10-20': 'Phụ Nữ Việt Nam',
  '11-20': 'Nhà Giáo Việt Nam',
  '12-22': 'Quân Đội NDVN',
  '12-24': 'Giáng Sinh',
};

const dynamicHolidays = {
  // 2025
  '2025-01-28': 'Giao Thừa', '2025-01-29': 'Mùng 1 Tết', '2025-01-30': 'Mùng 2 Tết', '2025-01-31': 'Mùng 3 Tết',
  '2025-04-07': 'Giỗ Tổ Hùng Vương',
  // 2026
  '2026-02-16': 'Giao Thừa', '2026-02-17': 'Mùng 1 Tết ÂL', '2026-02-18': 'Mùng 2 Tết', '2026-02-19': 'Mùng 3 Tết',
  '2026-04-26': 'Giỗ Tổ Hùng Vương',
  // 2027
  '2027-02-05': 'Giao Thừa', '2027-02-06': 'Mùng 1 Tết ÂL', '2027-02-07': 'Mùng 2 Tết', '2027-02-08': 'Mùng 3 Tết',
  '2027-04-16': 'Giỗ Tổ Hùng Vương',
};

const getHoliday = (dateObj) => {
  if (!dateObj) return null;
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const yyyy = dateObj.getFullYear();
  return staticHolidays[`${mm}-${dd}`] || dynamicHolidays[`${yyyy}-${mm}-${dd}`] || null;
};

const CalendarPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [editModal, setEditModal] = useState({ open: false, dateObj: null, dateStr: '', content: '', pkd: '' });
  const [saving, setSaving] = useState(false);

  const currentUser = authService.getCurrentUser();
  const role = String(currentUser?.role || '').toLowerCase();
  const canEdit = role.includes('tpkd') || role.includes('admin') || role.includes('quản lý') || role.includes('giám đốc');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await calendarService.getCalendarData();
      if (res.status === 'success') {
        setData(res.data);
      } else {
        toast.error(res.message || 'Lỗi tải lịch trực');
      }
    } catch (err) {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Chủ Nhật

    const calendarGrid = [];
    let currentDay = 1;

    // Các ngày trống đầu tháng
    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) {
        calendarGrid.push(null);
    }
    
    // Các ngày trong tháng
    for (let i = 1; i <= days; i++) {
        calendarGrid.push(new Date(year, month, i));
    }

    return calendarGrid;
  };

  const daysGrid = getDaysInMonth(currentMonth);

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const getEventsForDay = (dateObj) => {
    if (!dateObj) return [];
    // timezone safe local compare
    const tzoffset = dateObj.getTimezoneOffset() * 60000;
    const dateStr = new Date(dateObj.getTime() - tzoffset).toISOString().slice(0, 10);
    return data.filter(d => d.date === dateStr);
  };

  const isToday = (dateObj) => {
    if (!dateObj) return false;
    const today = new Date();
    return dateObj.getDate() === today.getDate() && 
           dateObj.getMonth() === today.getMonth() && 
           dateObj.getFullYear() === today.getFullYear();
  };

  const handleDayClick = (dateObj, existingEvent) => {
    if (!canEdit || !dateObj) return;
    const tzoffset = dateObj.getTimezoneOffset() * 60000;
    const dateStr = new Date(dateObj.getTime() - tzoffset).toISOString().slice(0, 10);
    
    setEditModal({
      open: true,
      dateObj: dateObj,
      dateStr: dateStr,
      content: existingEvent ? existingEvent.content : '',
      pkd: existingEvent ? existingEvent.pkd : ''
    });
  };

  const handleSaveModal = async () => {
    setSaving(true);
    try {
      const res = await calendarService.updateCalendarData({
        date: editModal.dateStr,
        content: editModal.content,
        pkd: editModal.pkd
      });
      if (res.status === 'success') {
        toast.success(res.message);
        setEditModal({ open: false, dateObj: null, dateStr: '', content: '', pkd: '' });
        fetchData();
      } else {
        toast.error(res.message || 'Lỗi cập nhật');
      }
    } catch (err) {
      toast.error('Lỗi khi lưu dữ liệu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col bg-gray-100 overflow-hidden rounded-lg border border-gray-200">
      <div className="p-4 border-b bg-white flex justify-between items-center shrink-0">
        <h2 className="font-bold gap-2 text-xl text-red-800 flex items-center">
            <CalendarIcon size={24} /> Lịch Trực
        </h2>
        
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded text-gray-600 font-bold px-3">{'<'}</button>
                <div className="font-bold text-gray-800 uppercase min-w-[150px] text-center">THÁNG {currentMonth.getMonth() + 1} / {currentMonth.getFullYear()}</div>
                <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded text-gray-600 font-bold px-3">{'>'}</button>
            </div>
            
            <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 bg-gray-50">
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-900 text-sm shadow-sm">
            <h3 className="font-bold text-base mb-2 flex items-center gap-2 text-amber-800">
                <Info size={18} /> QUY ĐỊNH GIỜ TRỰC
            </h3>
            <p className="font-bold mb-2">Nhân viên trực từ thứ hai đến thứ bảy: 07h30 - 18h00; Chủ nhật: 8h00 - 17h00</p>
            <ul className="list-disc pl-5 space-y-1 font-medium">
                <li>Showroom, bàn ghế, xe trưng bày phải luôn sạch sẽ, gọn gàng.</li>
                <li>Catalogue, bảng báo giá, các file liên quan luôn luôn chuẩn bị đầy đủ.</li>
                <li>Báo cáo đầy đủ thông tin khách hàng đã tiếp tại Showroom theo ngày.</li>
                <li>Trong ca trực nếu vắng mặt phải có lý do và báo cáo đầy đủ đến Trưởng phòng kinh doanh hoặc Giám đốc.</li>
                <li>Nhân viên trực thực hiện đúng tiêu chuẩn đồng phục theo quy định công ty, vi phạm cắt lịch trực ngay tại thời điểm vi phạm.</li>
            </ul>
        </div>
        {loading ? (
            <div className="h-full flex items-center justify-center text-red-600">
                <Loader2 size={40} className="animate-spin" />
            </div>
        ) : (
            <>
                {/* --- MOBILE VIEW --- */}
                <div className="md:hidden flex flex-col gap-3 pb-6">
                    {daysGrid.filter(d => d).map((dateObj, idx) => {
                        const events = getEventsForDay(dateObj);
                        const isCurDay = isToday(dateObj);
                        const holidayName = getHoliday(dateObj);
                        const dayOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][dateObj.getDay()];
                        
                        return (
                            <div 
                              key={`mb-${idx}`} 
                              onClick={() => handleDayClick(dateObj, events[0])}
                              className={`flex gap-3 p-3 rounded-xl border shadow-sm transition
                                ${isCurDay ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}
                                ${canEdit ? 'cursor-pointer active:scale-[0.98]' : ''}
                              `}
                            >
                                <div className={`flex flex-col items-center justify-center shrink-0 w-14 rounded-lg p-2
                                    ${isCurDay ? 'bg-red-600 text-white shadow-md' : 'bg-gray-50 text-gray-500 border'}
                                `}>
                                    <span className="text-[10px] font-bold uppercase mb-0.5">{dayOfWeek}</span>
                                    <span className="text-xl font-black leading-tight">{dateObj.getDate()}</span>
                                </div>
                                
                                <div className="flex-1 flex flex-col justify-center min-h-[48px]">
                                    {holidayName && (
                                        <div className="mb-2">
                                            <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 px-2 py-0.5 rounded-md text-[10px] font-bold border border-red-100 uppercase">
                                                <Gift size={12} className="shrink-0" /> {holidayName}
                                            </span>
                                        </div>
                                    )}
                                    
                                    {events.length > 0 ? (
                                        <div className="space-y-2">
                                            {events.map((evt, eIdx) => {
                                                const p = String(evt.pkd || '').toUpperCase();
                                                const isPkd2 = p.includes('PKD-2') || p.includes('PDK-2') || p.includes('PKD 2') || p.includes('PDK 2');
                                                const color = isPkd2 
                                                    ? { bg: 'bg-orange-50', border: 'border-orange-100', textTitle: 'text-orange-800', textSubtitle: 'text-orange-600' }
                                                    : { bg: 'bg-blue-50', border: 'border-blue-100', textTitle: 'text-blue-800', textSubtitle: 'text-blue-600' };
                                                
                                                return (
                                                    <div key={eIdx} className={`p-2 rounded-lg ${color.bg} border ${color.border}`}>
                                                        <div className={`font-bold ${color.textTitle} text-sm flex items-start gap-1.5`}>
                                                            <FileText size={14} className="shrink-0 mt-0.5" /> <span className="line-clamp-2">{evt.content}</span>
                                                        </div>
                                                        {evt.pkd && (
                                                            <div className={`text-xs ${color.textSubtitle} flex items-center gap-1 font-medium mt-1`}>
                                                                <Briefcase size={12} className="shrink-0" /> {evt.pkd}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-gray-400 text-xs italic">
                                            {canEdit ? '+ Nhấn để tạo lịch trực' : 'Không có lịch...'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* --- DESKTOP VIEW --- */}
                <div className="hidden md:block bg-white rounded-xl shadow-sm border overflow-hidden min-w-[800px]">
                <div className="grid grid-cols-7 bg-gray-100 border-b text-center text-xs font-bold text-gray-500 uppercase">
                    {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'].map(day => (
                        <div key={day} className="py-3 border-r last:border-0">{day}</div>
                    ))}
                </div>
                
                <div className="grid grid-cols-7 auto-rows-fr">
                    {daysGrid.map((dateObj, idx) => {
                        const events = getEventsForDay(dateObj);
                        const isCurDay = isToday(dateObj);
                        const holidayName = getHoliday(dateObj);
                        
                        return (
                            <div 
                              key={idx} 
                              onClick={() => handleDayClick(dateObj, events[0])}
                              className={`border-r border-b min-h-[120px] p-2 hover:bg-gray-50 transition border-transparent hover:border-gray-200 
                                ${!dateObj ? 'bg-gray-50/50' : isCurDay ? 'bg-red-50/30' : 'bg-white'}
                                ${canEdit && dateObj ? 'cursor-pointer hover:shadow-inner' : ''}
                              `}
                            >
                                {dateObj && (
                                    <div className="h-full flex flex-col pointer-events-none">
                                        <div className={`flex justify-between items-start mb-2`}>
                                            <div className="flex-1">
                                                {holidayName && (
                                                    <span className="inline-flex items-center gap-0.5 bg-red-50 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold border border-red-100 uppercase mt-0.5 mx-0.5 max-w-full text-left leading-tight">
                                                        <Gift size={10} className="shrink-0" /> <span className="truncate">{holidayName}</span>
                                                    </span>
                                                )}
                                            </div>
                                            <div className={`text-right text-sm font-bold shrink-0 ${isCurDay ? 'text-red-600' : holidayName ? 'text-red-500' : 'text-gray-400'}`}>
                                                <span className={isCurDay ? 'bg-red-100 px-2 py-0.5 rounded-full' : ''}>
                                                    {dateObj.getDate()}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-1 flex-1">
                                            {events.map((evt, eIdx) => {
                                                const p = String(evt.pkd || '').toUpperCase();
                                                const isPkd2 = p.includes('PKD-2') || p.includes('PDK-2') || p.includes('PKD 2') || p.includes('PDK 2');
                                                const color = isPkd2 
                                                    ? { bg: 'bg-orange-50', border: 'border-orange-100', textTitle: 'text-orange-800', textSubtitle: 'text-orange-600' }
                                                    : { bg: 'bg-blue-50', border: 'border-blue-100', textTitle: 'text-blue-800', textSubtitle: 'text-blue-600' };
                                                
                                                return (
                                                    <div key={eIdx} className={`p-1.5 rounded ${color.bg} border ${color.border} flex flex-col gap-1 text-xs shadow-sm`}>
                                                        <div className={`font-bold ${color.textTitle} flex items-center gap-1 line-clamp-2`} title={evt.content}>
                                                            <FileText size={10} className="shrink-0" /> {evt.content}
                                                        </div>
                                                        {evt.pkd && (
                                                            <div className={`text-[10px] ${color.textSubtitle} flex items-center gap-1 font-medium`}>
                                                                <Briefcase size={10} className="shrink-0" /> {evt.pkd}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
          </>
        )}
      </div>

      {editModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b bg-red-50">
              <h3 className="font-bold text-red-800">Cập nhật Lịch Trực</h3>
              <p className="text-sm text-red-600 mt-1">Ngày: {editModal.dateObj?.getDate()}/{editModal.dateObj?.getMonth() + 1}/{editModal.dateObj?.getFullYear()}</p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">NỘI DUNG</label>
                <input 
                  type="text" 
                  value={editModal.content} 
                  onChange={e => setEditModal({...editModal, content: e.target.value})}
                  className="w-full border p-2 rounded outline-none focus:border-red-500 text-sm"
                  placeholder="VD: Nhóm A..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">TRƯỜNG PKD NỘI BỘ</label>
                <input 
                  type="text" 
                  value={editModal.pkd} 
                  onChange={e => setEditModal({...editModal, pkd: e.target.value})}
                  className="w-full border p-2 rounded outline-none focus:border-red-500 text-sm"
                  placeholder="VD: PKD-1"
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2 bg-gray-50">
              <button 
                onClick={() => setEditModal({ ...editModal, open: false })}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded font-medium"
              >Hủy</button>
              <button 
                onClick={handleSaveModal}
                disabled={saving}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded font-bold hover:bg-red-700 flex items-center gap-2"
              >
                {saving && <Loader2 size={14} className="animate-spin" />} Lưu lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
