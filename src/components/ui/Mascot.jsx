import React, { useState, useEffect, useRef } from 'react';

const Mascot = () => {
  const [showSecond, setShowSecond] = useState(false);
  
  // --- STATE KÉO THẢ ---
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(null); // { x: 0, y: 0 } hoặc null
  const dragOffset = useRef({ x: 0, y: 0 }); // Lưu khoảng cách từ điểm click đến góc phần tử
  const mascotRef = useRef(null); // Ref để lấy vị trí hiện tại của Mascot

  // Ảnh (Giữ nguyên)
  const img1 = '/linh-vat-trong-suot1.png?v=1';
  const img2 = '/linh-vat-trong-suot2.png?v=1';

  // Hiệu ứng vòng lặp (Giữ nguyên)
  useEffect(() => {
    const interval = setInterval(() => {
      setShowSecond(prev => !prev);
    }, 500); 

    return () => clearInterval(interval);
  }, []);

  // --- LOGIC XỬ LÝ KÉO THẢ (Giữ nguyên) ---

  // 1. Bắt đầu bấm (Chuột hoặc Chạm)
  const handleStart = (clientX, clientY) => {
    setIsDragging(true);
    
    if (mascotRef.current) {
      const rect = mascotRef.current.getBoundingClientRect();
      
      // Nếu chưa có vị trí (đang ở vị trí mặc định), set vị trí hiện tại
      if (!position) {
        setPosition({ x: rect.left, y: rect.top });
      }
      
      const currentLeft = position ? position.x : rect.left;
      const currentTop = position ? position.y : rect.top;

      dragOffset.current = {
        x: clientX - currentLeft,
        y: clientY - currentTop
      };
    }
  };

  const onMouseDown = (e) => {
    e.preventDefault(); 
    handleStart(e.clientX, e.clientY);
  };

  const onTouchStart = (e) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  // 2. Đang di chuyển
  useEffect(() => {
    const handleMove = (e) => {
      if (!isDragging) return;
      
      let clientX, clientY;
      
      if (e.type.includes('mouse')) {
        e.preventDefault();
        clientX = e.clientX;
        clientY = e.clientY;
      } else if (e.type.includes('touch')) {
        const touch = e.touches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
      }

      setPosition({
        x: clientX - dragOffset.current.x,
        y: clientY - dragOffset.current.y
      });
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);


  // --- RENDER ---

  // Class CSS chung cho ảnh
  // THAY ĐỔI: Tăng từ w-24 h-24 lên w-28 h-28 (Bự hơn 1 xíu trên mobile)
  const imgCommonClasses = "absolute bottom-4 left-4 w-32 h-32 md:w-36 md:h-36 object-contain drop-shadow-2xl pointer-events-none select-none";

  return (
    <div 
      ref={mascotRef}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      
      style={position ? { 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          bottom: 'auto',
          right: 'auto', // Reset right để tránh conflict khi kéo
          transform: 'none'
      } : {}}

      // Class CSS Container:
      // THAY ĐỔI: Tăng kích thước vùng chứa từ w-32 h-32 lên w-36 h-36 để vừa với ảnh mới
      className={`fixed z-[9999] pointer-events-auto select-none w-36 h-36 md:w-48 md:h-48 flex items-end justify-start p-4 cursor-move touch-none ${!position ? 'bottom-0 left-0' : ''}`}
    >
      
      {/* Ảnh 1 */}
      <img 
        src={img1} 
        alt="Skoda Mascot Pose 1" 
        onDragStart={(e) => e.preventDefault()}
        className={`${imgCommonClasses} ${showSecond ? 'hidden' : 'block'}`}
      />

      {/* Ảnh 2 */}
      <img 
        src={img2} 
        alt="Skoda Mascot Pose 2" 
        onDragStart={(e) => e.preventDefault()}
        className={`${imgCommonClasses} ${!showSecond ? 'hidden' : 'block'}`}
      />
    </div>
  );
};

export default Mascot;