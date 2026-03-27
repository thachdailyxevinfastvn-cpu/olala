import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Loader2, User, Phone, MapPin, Car, Tag, FileText } from 'lucide-react';
import { customerService } from './customerService';
import toast from 'react-hot-toast';

const CustomerEditModal = ({ isOpen, onClose, customer, onSuccess, config }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (isOpen && customer) {
      // Làm sạch dữ liệu rác nếu có
      const { tempId, isNew, isSyncing, ...cleanData } = customer;
      setFormData({ ...cleanData, saleNote: '' });
    }
    setSuggestions([]);
  }, [isOpen, customer]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setSuggestions([]);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'ward' && value.length > 1) {
       const matches = (config.locations || []).filter(l => l.ward.toLowerCase().includes(value.toLowerCase())).slice(0, 5);
       setSuggestions(matches);
    }
  };

  const handleSelectSuggestion = (loc) => {
    setFormData(prev => ({ ...prev, ward: loc.ward, province: loc.province }));
    setSuggestions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const requiredFields = ['customerName', 'phone', 'carModel', 'source'];
    const missing = requiredFields.filter(f => !formData[f] || formData[f].toString().trim() === '');
    
    if (missing.length > 0) {
      toast.error('Chưa điền đủ dữ liệu bắt buộc');
      return;
    }

    setLoading(true);
    try {
      // GỬI DỮ LIỆU ĐÃ LÀM SẠCH VÀ KÈM THEO ID
      const payload = { 
          ...formData, 
          originalPhone: customer.phone, // QUAN TRỌNG
          originalCustomerName: customer.customerName
      };
      
      const res = await customerService.updateCustomer(payload);
      
      if (res.status === 'success') {
        toast.success('Cập nhật thành công!');
        onSuccess(payload); 
        onClose();
      } else { 
          toast.error(res.message || "Lỗi cập nhật"); 
      }
    } catch (error) { 
        toast.error('Lỗi Server'); 
    } finally { 
        setLoading(false); 
    }
  };

  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95 duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[95vh] overflow-hidden" ref={wrapperRef}>
        <div className="px-4 py-3 border-b flex justify-between items-center bg-gray-50">
            <div><h3 className="text-lg font-bold">Chỉnh sửa thông tin</h3><p className="text-xs text-gray-500">{customer.customerName}</p></div>
            <button onClick={onClose} className="text-gray-400 hover:text-red-500 p-2"><X size={20}/></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
            {/* ... (Phần Form giữ nguyên như cũ) ... */}
            <div className="space-y-3">
                <h4 className="text-xs font-bold text-blue-600 uppercase border-b pb-1">1. Thông tin cá nhân (*)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="relative"><User className="absolute left-3 top-2.5 text-gray-400 w-4 h-4"/><input name="customerName" value={formData.customerName || ''} onChange={handleChange} className="w-full pl-9 p-2 border rounded text-sm outline-none" placeholder="Tên KH"/></div>
                    <div className="relative"><Phone className="absolute left-3 top-2.5 text-gray-400 w-4 h-4"/><input name="phone" value={formData.phone || ''} onChange={handleChange} className="w-full pl-9 p-2 border rounded text-sm font-bold" placeholder="SĐT"/></div>
                    {/* ... (Các trường khác giữ nguyên) ... */}
                </div>
            </div>
            {/* ... (Các phần khác giữ nguyên) ... */}
        </div>

        <div className="p-4 border-t bg-white flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Hủy bỏ</button>
            <button onClick={handleSubmit} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold shadow flex items-center gap-2 text-sm disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} LƯU THAY ĐỔI
            </button>
        </div>
      </div>
    </div>
  );
};
export default CustomerEditModal;