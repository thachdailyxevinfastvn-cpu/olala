import React, { useMemo } from 'react';

const FallingFlowers = () => {
  // 1. TỰ ĐỘNG TẠO DANH SÁCH TÊN FILE
  const flowerImages = useMemo(() => {
    return Array.from({ length: 10 }).map((_, i) => {
      const num = String(i + 1).padStart(5, '0');
      return `/flowers/hoa ${num}.webp`; 
    });
  }, []);

  // --- GIẢM SỐ LƯỢNG Ở ĐÂY ---
  // Đã giảm từ 50 xuống 20 cho thoáng mắt
  const FLOWER_COUNT = 20; 

  // 2. Tạo dữ liệu ngẫu nhiên
  const flowers = useMemo(() => {
    return Array.from({ length: FLOWER_COUNT }).map((_, i) => {
      const imgSrc = flowerImages[Math.floor(Math.random() * flowerImages.length)];
      
      return {
        id: i,
        src: imgSrc,
        left: Math.random() * 100 + '%',
        animationDuration: 8 + Math.random() * 10 + 's',
        animationDelay: '-' + (Math.random() * 15) + 's',
        size: 10 + Math.random() * 15 + 'px',
        rotation: Math.random() * 360 + 'deg',
      };
    });
  }, [flowerImages]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[50] overflow-hidden select-none">
      <style>{`
        @keyframes fall {
          0% {
            transform: translateY(-10vh) rotate(0deg) translateX(0px);
            opacity: 0;
          }
          10% {
            opacity: 0.9;
          }
          100% {
            transform: translateY(110vh) rotate(360deg) translateX(50px);
            opacity: 0;
          }
        }
      `}</style>

      {flowers.map((f) => (
        <img
          key={f.id}
          src={f.src}
          alt=""
          className="absolute object-contain opacity-80"
          style={{
            left: f.left,
            top: '-10%',
            width: f.size,
            height: f.size,
            animationName: 'fall',
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
            animationDuration: f.animationDuration,
            animationDelay: f.animationDelay,
            transform: `rotate(${f.rotation})`,
          }}
        />
      ))}
    </div>
  );
};

export default FallingFlowers;