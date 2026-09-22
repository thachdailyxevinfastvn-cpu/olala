import React from 'react';
import { Trash2, Phone, User, Car, Star, Users, Sparkles } from 'lucide-react';
import { processSmartPasteText } from './smartPasteUtils';

const CustomerFormRow = ({
    row,
    idx,
    config,
    staffList,
    isAssignMode,
    suggestions,
    onRowChange,
    onRemoveRow,
    onSelectSuggestion,
    showRemove,
}) => {
    const handleSmartPasteChange = (e) => {
        const rawText = e.target.value;
        const extractedData = processSmartPasteText(rawText, config, staffList, isAssignMode);
        
        if (extractedData) {
            onRowChange(row.id, 'smartPaste', extractedData);
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 relative group">
            {showRemove && (
                <button 
                    onClick={() => onRemoveRow(row.id)} 
                    className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                >
                    <Trash2 size={18} />
                </button>
            )}
            <div className="mb-2 text-xs font-bold text-blue-600">KHÁCH HÀNG #{idx + 1}</div>

            <div className="mb-3 bg-purple-50 p-2 rounded border border-purple-200">
                <label className="text-xs font-bold text-purple-700 mb-1 flex items-center gap-1">
                    <Sparkles size={14} /> Dán nhanh nội dung tổng hợp (Smart Paste)
                </label>
                <textarea
                    placeholder="VD: Trần Xuân Bình Bình Dương MG5 0987654321 Nguyễn Hoàng Thạch"
                    className="w-full text-xs p-2 border border-purple-300 rounded outline-none focus:ring-1 focus:ring-purple-500 min-h-[50px] resize-none bg-white"
                    onChange={handleSmartPasteChange}
                ></textarea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-4 space-y-3">
                    {/* ASSIGNEE DROPDOWN */}
                    {isAssignMode && (
                        <div className="space-y-2 mb-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                            <div className="relative">
                                <Users className="absolute left-3 top-2.5 text-blue-500 w-4 h-4" />
                                <select
                                    value={row.assigneeEmail}
                                    onChange={(e) => onRowChange(row.id, 'assigneeEmail', e.target.value)}
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

                    <div className="relative">
                        <User className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                        <input 
                            value={row.customerName} 
                            onChange={(e) => onRowChange(row.id, 'customerName', e.target.value)} 
                            placeholder="Tên KH (*)" 
                            className={`w-full pl-9 pr-3 py-2 border rounded text-sm outline-none ${!row.customerName && 'border-red-300 bg-red-50'}`} 
                        />
                    </div>
                    <div className="relative">
                        <Phone className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                        <input 
                            value={row.phone} 
                            onChange={(e) => onRowChange(row.id, 'phone', e.target.value)} 
                            placeholder="SĐT (*)" 
                            className={`w-full pl-9 pr-3 py-2 border rounded text-sm outline-none ${!row.phone && 'border-red-300 bg-red-50'}`} 
                        />
                    </div>

                    <div className="relative">
                        <Star className="absolute left-3 top-2.5 text-orange-400 w-4 h-4" />
                        <select 
                            value={row.leadRating} 
                            onChange={(e) => onRowChange(row.id, 'leadRating', e.target.value)} 
                            className="w-full pl-9 pr-3 py-2 border border-orange-200 bg-orange-50 rounded text-sm outline-none font-medium text-orange-800"
                        >
                            <option value="-">-- Phân loại KH --</option>
                            <option value="Hot">🔥 Hot (Nóng)</option>
                            <option value="Warm">☀️ Warm (Ấm)</option>
                            <option value="Cold">❄️ Cold (Lạnh)</option>
                            <option value="Booking">✅ Booking</option>
                        </select>
                    </div>

                    <div className="relative">
                        <Car className="absolute left-3 top-2.5 text-emerald-500 w-4 h-4 z-10" />
                        {row.testDrive === 'Chưa' || !row.testDrive ? (
                            <select
                                value="Chưa"
                                onChange={(e) => {
                                    if (e.target.value !== 'Chưa') {
                                        const tzoffset = (new Date()).getTimezoneOffset() * 60000;
                                        onRowChange(row.id, 'testDrive', new Date(Date.now() - tzoffset).toISOString().slice(0, 10));
                                    }
                                }}
                                className="w-full pl-9 pr-3 py-2 border border-emerald-200 bg-emerald-50 rounded text-sm outline-none font-bold text-emerald-700 cursor-pointer"
                            >
                                <option value="Chưa">Chưa lái</option>
                                <option value="Chọn ngày">Chọn ngày...</option>
                            </select>
                        ) : (
                            <div className="flex w-full relative">
                                <input 
                                    type="date"
                                    value={row.testDrive}
                                    onChange={(e) => onRowChange(row.id, 'testDrive', e.target.value || 'Chưa')}
                                    className="w-full pl-9 pr-8 py-2 border border-emerald-200 bg-emerald-50 rounded text-sm outline-none font-bold text-emerald-700 cursor-pointer"
                                />
                                <button 
                                    onClick={() => onRowChange(row.id, 'testDrive', 'Chưa')}
                                    className="absolute right-2 top-2.5 text-emerald-600 hover:text-emerald-800 bg-emerald-100 rounded-full w-4 h-4 flex items-center justify-center text-[10px]"
                                    type="button"
                                >✕</button>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 relative">
                        <input 
                            value={row.ward} 
                            onChange={(e) => onRowChange(row.id, 'ward', e.target.value)} 
                            placeholder="Phường/Xã" 
                            className="border rounded px-2 py-2 text-sm w-full" 
                        />
                        {suggestions.rowId === row.id && suggestions.list.length > 0 && (
                            <div className="absolute top-full left-0 w-full z-50 bg-white shadow-xl border mt-1 rounded-md overflow-hidden">
                                {suggestions.list.map((l, i) => (
                                    <div 
                                        key={i} 
                                        onClick={() => onSelectSuggestion(row.id, l)} 
                                        className="p-2 hover:bg-red-50 cursor-pointer text-sm border-b last:border-0"
                                    >
                                        {l.ward} - <span className="text-gray-500">{l.province}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <input 
                            value={row.province} 
                            readOnly 
                            placeholder="Tỉnh/TP" 
                            className="border rounded px-2 py-2 text-sm bg-gray-100" 
                        />
                    </div>
                </div>

                <div className="md:col-span-4 space-y-3">
                        <select 
                            value={row.carModel} 
                            onChange={(e) => onRowChange(row.id, 'carModel', e.target.value)} 
                            className="border rounded p-2 text-sm w-full"
                        >
                            <option value="">Dòng xe</option>
                            {config.carModels?.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    <div className="grid grid-cols-2 gap-2">
                        <select 
                            value={row.source} 
                            onChange={(e) => onRowChange(row.id, 'source', e.target.value)} 
                            className={`border rounded p-2 text-sm w-full ${!row.source && 'border-red-300'}`}
                        >
                            <option value="">Nguồn (*)</option>
                            {config.sources?.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select 
                            value={row.channel} 
                            onChange={(e) => onRowChange(row.id, 'channel', e.target.value)} 
                            className={`border rounded p-2 text-sm w-full ${!row.channel && 'border-red-300'}`}
                        >
                            <option value="">Kênh (*)</option>
                            {config.channels?.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                <div className="md:col-span-4">
                    <textarea 
                        value={row.saleNote} 
                        onChange={(e) => onRowChange(row.id, 'saleNote', e.target.value)} 
                        placeholder="Ghi chú (*)..." 
                        className={`border rounded p-2 text-sm w-full h-full min-h-[100px] resize-none ${!row.saleNote.trim() && 'border-red-300 bg-red-50'}`}
                    ></textarea>
                </div>
            </div>
        </div>
    );
};

export default CustomerFormRow;
