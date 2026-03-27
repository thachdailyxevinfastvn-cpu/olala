import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Xác nhận", cancelText = "Hủy", type = "danger", processing = false }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 relative">
                <button onClick={onClose} className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition icon-hover">
                    <X size={20} />
                </button>
                <div className="p-6 text-center">
                    <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
                    <p className="text-sm text-gray-500 whitespace-pre-wrap">{message}</p>
                </div>
                <div className="bg-gray-50 px-6 py-4 flex gap-3">
                    <button onClick={onClose} disabled={processing} className="flex-1 py-2.5 rounded-lg border border-gray-300 font-bold text-gray-700 hover:bg-white transition bg-white shadow-sm active:scale-95 disabled:opacity-50">
                        {cancelText}
                    </button>
                    <button
                        onClick={() => { onConfirm(); }}
                        disabled={processing}
                        className={`flex-1 py-2.5 rounded-lg font-bold text-white shadow transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {processing ? 'Đang xử lý...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
