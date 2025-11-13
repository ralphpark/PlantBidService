import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, Flower, TreeDeciduous, Sprout, Palmtree, Apple, Sun } from 'lucide-react';

// 단순한 도트 인터페이스
interface Dot {
  x: number;
  y: number;
  size: number;
  opacity: number;
  initialOpacity: number;
  iconType: number; // 아이콘 타입 (1~7)
  hovered: boolean; // 호버 여부
}

interface InteractiveDotGridProps {
  color?: string;
  dotSize?: number;
  spacing?: number;
  interactive?: boolean;
  interactionRadius?: number;
  className?: string;
}

export function InteractiveDotGrid({
  color = 'rgba(255, 255, 255, 0.8)',
  dotSize = 3,
  spacing = 25,
  interactive = true,
  interactionRadius = 120, // 인터랙션 반경을 늘려 더 넓은 영역에서 반응하도록 함
  className = '',
}: InteractiveDotGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dots, setDots] = useState<Dot[]>([]);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  // 도트 그리드 생성
  useEffect(() => {
    if (!containerRef.current) return;

    const generateDots = () => {
      const container = containerRef.current;
      if (!container) return [];

      const { width, height } = container.getBoundingClientRect();
      const newDots: Dot[] = [];

      // 도트 생성
      for (let x = spacing; x < width - spacing; x += spacing) {
        for (let y = spacing; y < height - spacing; y += spacing) {
          const baseOpacity = Math.random() * 0.5 + 0.25; // 0.25 ~ 0.75 사이의 기본 투명도
          // 랜덤하게 아이콘 타입 결정 (1~7, 골고루 분포)
          const iconType = Math.floor(Math.random() * 7) + 1;
          newDots.push({
            x,
            y,
            size: dotSize,
            opacity: baseOpacity,
            initialOpacity: baseOpacity,
            iconType,
            hovered: false
          });
        }
      }
      return newDots;
    };

    const handleResize = () => {
      setDots(generateDots());
    };

    // 초기 도트 생성
    handleResize();

    // 리사이즈 이벤트 리스너 등록
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [spacing, dotSize]);

  // 마우스 움직임에 따른 인터랙션
  useEffect(() => {
    if (!interactive || !containerRef.current) return;

    const updateDots = () => {
      if (!mousePosition) {
        // 마우스가 없을 때는 모든 hover 효과 제거
        setDots(prev => prev.map(dot => ({ ...dot, hovered: false })));
      } else {
        // 마우스 위치에서 가장 가까운 도트 찾기
        console.log('마우스 위치에서 도트 찾는 중:', mousePosition);
        
        // 가장 가까운 도트 찾기
        let closestDot = null;
        let closestDistance = Infinity;
        
        dots.forEach(dot => {
          const dx = mousePosition.x - dot.x;
          const dy = mousePosition.y - dot.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < closestDistance) {
            closestDistance = distance;
            closestDot = dot;
          }
        });
        
        console.log('가장 가까운 도트 거리:', closestDistance);
        
        // 가장 가까운 도트가 일정 거리 이내이면 호버 상태로 설정
        if (closestDot && closestDistance < interactionRadius) {
          console.log('가장 가까운 도트를 하이라이트합니다');
          
          // 모든 도트를 업데이트
          setDots(dots.map(dot => {
            // 마우스와 도트 사이의 거리 계산
            const dx = mousePosition.x - dot.x;
            const dy = mousePosition.y - dot.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 도트가 마우스 근처에 있는 경우
            if (distance < interactionRadius) {
              // 거리에 따른 효과 계산
              const intensity = 1 - distance / interactionRadius;
              const targetOpacity = Math.min(dot.initialOpacity + intensity * 0.6, 1);
              const targetSize = dotSize + intensity * dotSize * 2;
              
              // 가장 가까운 도트에만 아이콘 표시
              const isClosest = dot === closestDot;
              
              return {
                ...dot,
                opacity: dot.opacity * 0.8 + targetOpacity * 0.2,
                size: dot.size * 0.8 + targetSize * 0.2,
                hovered: isClosest
              };
            }
            
            // 마우스에서 멀리 있는 도트는 원래 상태로 돌아감
            return {
              ...dot,
              opacity: dot.opacity * 0.95 + dot.initialOpacity * 0.05,
              size: dot.size * 0.9 + dotSize * 0.1,
              hovered: false
            };
          }));
        } else {
          // 충분히 가깝지 않은 경우 모든 도트의 hover 상태 해제
          setDots(dots.map(dot => ({
            ...dot,
            opacity: dot.opacity * 0.95 + dot.initialOpacity * 0.05,
            size: dot.size * 0.9 + dotSize * 0.1,
            hovered: false
          })));
        }
      }

      rafRef.current = requestAnimationFrame(updateDots);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const newPos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      
      console.log('Mouse position:', newPos);
      setMousePosition(newPos);
    };

    const handleMouseLeave = () => {
      setMousePosition(null);
    };

    containerRef.current.addEventListener('mousemove', handleMouseMove);
    containerRef.current.addEventListener('mouseleave', handleMouseLeave);
    
    // 애니메이션 시작
    rafRef.current = requestAnimationFrame(updateDots);

    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('mousemove', handleMouseMove);
        containerRef.current.removeEventListener('mouseleave', handleMouseLeave);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [interactive, mousePosition, interactionRadius, dotSize]);

  // 아이콘 컴포넌트 선택 함수
  const getPlantIcon = (iconType: number) => {
    const iconSize = 50; // 아이콘 크기 키우기
    const iconProps = { 
      size: iconSize, 
      color: '#9AE6B4', 
      strokeWidth: 1.5,
      style: { 
        filter: 'drop-shadow(0 0 10px rgba(154, 230, 180, 0.9))',
        transform: 'scale(1.2)' // 더 큰 크기로 확대
      }
    };
    
    switch(iconType) {
      case 1: return <Leaf {...iconProps} />;
      case 2: return <Flower {...iconProps} />;
      case 3: return <TreeDeciduous {...iconProps} />;
      case 4: return <Sprout {...iconProps} />;
      case 5: return <Palmtree {...iconProps} />;
      case 6: return <Apple {...iconProps} />;
      case 7: default: return <Sun {...iconProps} />;
    }
  };

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full h-full ${className}`}
      style={{ overflow: 'hidden' }}
    >
      {/* 기본 도트 그리기 */}
      {dots.map((dot, index) => (
        <motion.div
          key={`dot-${index}`}
          className="absolute rounded-full z-10"
          style={{
            left: dot.x - dot.size / 2,
            top: dot.y - dot.size / 2,
            width: dot.size,
            height: dot.size,
            backgroundColor: color,
            opacity: dot.opacity,
            zIndex: 1,
          }}
          initial={false}
          animate={{
            width: dot.size,
            height: dot.size,
            left: dot.x - dot.size / 2,
            top: dot.y - dot.size / 2,
            opacity: dot.opacity,
          }}
          transition={{ duration: 0.15 }}
        />
      ))}
      
      {/* 호버된 도트 위에 아이콘 표시 */}
      {console.log('Hovered dots:', dots.filter(dot => dot.hovered).length)}
      <AnimatePresence>
        {dots.filter(dot => dot.hovered).map((dot, index) => (
          <motion.div
            key={`icon-${index}-${dot.x}-${dot.y}`}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
            style={{
              left: dot.x,
              top: dot.y,
              zIndex: 20,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: 1, 
              opacity: 1
            }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              animate={{ 
                rotate: [0, 5, 0, -5, 0],
                scale: [1, 1.05, 1, 0.95, 1]
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="p-2 bg-[#005E43]/10 rounded-full"
              style={{ boxShadow: "0 0 15px rgba(154, 230, 180, 0.5)" }}
            >
              {getPlantIcon(dot.iconType)}
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}