import React from 'react';

const Lantern = () => {
  return (
    // Đây là phiên bản vẽ bằng CSS thuần (không cần ảnh) để bạn test ngay cho nhanh
    // Sau này có ảnh đẹp thì thay thẻ <img> vào sau
    <div className="absolute top-0 left-10 z-50 flex flex-col items-center origin-top animate-swing">
        {/* Dây treo */}
        <div className="h-24 w-1 bg-yellow-600"></div>
        
        {/* Thân đèn */}
        <div className="relative w-20 h-24 bg-red-600 rounded-lg shadow-lg flex items-center justify-center overflow-hidden animate-pulse">
            {/* Chữ Phúc/Lộc hoặc Logo Skoda mờ */}
            <div className="w-16 h-20 border-2 border-yellow-400 rounded flex items-center justify-center">
                <span className="text-yellow-400 font-bold text-2xl">Skoda</span>
            </div>
            {/* Hiệu ứng bóng sáng */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        </div>

        {/* Tua rua bên dưới */}
        <div className="flex space-x-2 -mt-1">
             <div className="w-1 h-12 bg-yellow-500 animate-sway"></div>
             <div className="w-1 h-16 bg-yellow-500 animate-sway delay-75"></div>
             <div className="w-1 h-12 bg-yellow-500 animate-sway delay-150"></div>
        </div>
    </div>
  );
};

export default Lantern;