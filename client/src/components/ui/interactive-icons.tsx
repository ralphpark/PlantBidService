import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Leaf, Flower, TreeDeciduous, Sprout, Palmtree, Apple, Sun } from 'lucide-react';

interface PlantIconProps {
  x: number;
  y: number;
  iconType: number;
}

export function PlantIcon({ x, y, iconType }: PlantIconProps) {
  // 아이콘 크기 및 스타일 설정
  const iconSize = 80; // 매우 큰 아이콘 크기
  const iconProps = { 
    size: iconSize, 
    color: '#9AE6B4', 
    strokeWidth: 1.5,
    style: { 
      filter: 'drop-shadow(0 0 12px rgba(154, 230, 180, 0.9))'
    }
  };

  // 아이콘 타입에 따라 다른 아이콘 렌더링
  const getIcon = () => {
    switch(iconType) {
      case 1: return <Leaf {...iconProps} />;
      case 2: return <Flower {...iconProps} />;
      case 3: return <TreeDeciduous {...iconProps} />;
      case 4: return <Sprout {...iconProps} />;
      case 5: return <Palmtree {...iconProps} />;
      case 6: return <Apple {...iconProps} />;
      case 7: default: return <Sun {...iconProps} />;
    }
  }

  return (
    <motion.div
      className="absolute transform -translate-x-1/2 -translate-y-1/2"
      style={{
        left: x,
        top: y,
        zIndex: 100, // 높은 z-index로 설정
        pointerEvents: 'none', // 마우스 이벤트 무시
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
        rotate: [0, 5, 0, -5, 0]
      }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ 
        duration: 0.5,
        rotate: {
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }}
    >
      <div 
        className="p-4 rounded-full" 
        style={{ 
          background: 'rgba(0, 94, 67, 0.15)',
          boxShadow: '0 0 20px rgba(154, 230, 180, 0.6)'
        }}
      >
        {getIcon()}
      </div>
    </motion.div>
  );
}

interface InteractiveIconsProps {
  spacing?: number;
}

export function InteractiveIcons({ spacing = 25 }: InteractiveIconsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [currentIconType, setCurrentIconType] = useState(1);
  
  // 마우스 이벤트 추적
  useEffect(() => {
    if (!containerRef.current) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    };
    
    const handleMouseLeave = () => {
      setMousePosition(null);
    };
    
    // 4초마다 아이콘 타입 변경
    const iconChangeInterval = setInterval(() => {
      setCurrentIconType(prev => (prev % 7) + 1);
    }, 4000);
    
    containerRef.current.addEventListener('mousemove', handleMouseMove);
    containerRef.current.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      containerRef.current?.removeEventListener('mousemove', handleMouseMove);
      containerRef.current?.removeEventListener('mouseleave', handleMouseLeave);
      clearInterval(iconChangeInterval);
    };
  }, []);
  
  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 w-full h-full z-10"
      style={{ pointerEvents: 'none' }}
    >
      {mousePosition && (
        <PlantIcon 
          x={mousePosition.x} 
          y={mousePosition.y} 
          iconType={currentIconType}
        />
      )}
    </div>
  );
}