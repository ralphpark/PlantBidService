import React, { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface InteractiveTitleProps {
  text: string;
  className?: string;
  fontSize?: string;
  fontWeight?: string;
  textColor?: string;
  highlightColor?: string;
  highlightWord?: string;
  sensitivity?: number;
}

export function InteractiveTitle({
  text,
  className = '',
  fontSize = '4rem',
  fontWeight = '700',
  textColor = 'white',
  highlightColor = '#00ff99',
  highlightWord = '',
  sensitivity = 20,
}: InteractiveTitleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // 부드러운 애니메이션을 위한 스프링 값
  const springX = useSpring(x, { stiffness: 100, damping: 30 });
  const springY = useSpring(y, { stiffness: 100, damping: 30 });

  // 마우스 이동에 따른 회전 변환 값
  const rotateX = useTransform(springY, [-sensitivity, sensitivity], [2, -2]);
  const rotateY = useTransform(springX, [-sensitivity, sensitivity], [-2, 2]);
  
  // 하이라이트 단어 찾기
  const textParts = highlightWord 
    ? text.split(new RegExp(`(${highlightWord})`, 'gi'))
    : [text];

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // 중앙으로부터의 거리 계산
      const moveX = (e.clientX - centerX) / 10;
      const moveY = (e.clientY - centerY) / 10;
      
      x.set(moveX);
      y.set(moveY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [x, y]);

  return (
    <motion.div
      ref={containerRef}
      className={`inline-block ${className}`}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        transformOrigin: 'center center',
      }}
    >
      <div 
        style={{ 
          fontWeight, 
          fontSize,
          lineHeight: '1.2',
          color: textColor,
        }}
      >
        {textParts.map((part, i) => (
          <span 
            key={i} 
            style={{ 
              color: part.toLowerCase() === highlightWord.toLowerCase() ? highlightColor : textColor,
              display: 'inline',
              whiteSpace: 'pre-wrap'
            }}
          >
            {part}
          </span>
        ))}
      </div>
    </motion.div>
  );
}