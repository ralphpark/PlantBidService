import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Check } from 'lucide-react';

interface SwipeButtonProps {
  onComplete: () => void;
  disabled?: boolean;
  status?: 'pending' | 'reviewing' | 'completed';
  width?: number;
  height?: number;
  text?: string;
  completedText?: string;
  reviewingText?: string;
  className?: string;
}

/**
 * 슬라이드 버튼 컴포넌트
 * 왼쪽에서 오른쪽으로 밀어서 작업 완료를 확인하는 버튼
 */
export function SwipeButton({ 
  onComplete, 
  disabled = false,
  status = 'pending',
  width = 120,
  height = 36,
  text = '밀어서 시작',
  completedText = '완료됨',
  reviewingText = '검토중',
  className = '',
}: SwipeButtonProps) {
  const [swiping, setSwiping] = useState(false);
  const [swipePosition, setSwipePosition] = useState(0);
  const [completed, setCompleted] = useState(status !== 'pending');
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const maxSwipe = width - (height - 4); // 썸네일 너비를 뺀 최대 이동 거리

  // disabled나 status가 변경될 때 UI 업데이트
  useEffect(() => {
    // completed 또는 reviewing 상태이면 오른쪽으로 이동
    if (status === 'completed' || status === 'reviewing') {
      setSwipePosition(maxSwipe);
      setCompleted(true);
    } else {
      setSwipePosition(0);
      setCompleted(false);
    }
  }, [status, maxSwipe]);

  // 마우스 다운 이벤트 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled || status === 'completed' || status === 'reviewing') return;
    
    e.preventDefault();
    setSwiping(true);
    startXRef.current = e.clientX;
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // 마우스 이동 이벤트 핸들러
  const handleMouseMove = (e: MouseEvent) => {
    if (!swiping) return;
    
    const deltaX = e.clientX - startXRef.current;
    // 이동 범위 제한 (0 ~ maxSwipe)
    const newPosition = Math.max(0, Math.min(maxSwipe, deltaX));
    setSwipePosition(newPosition);
  };

  // 마우스 업 이벤트 핸들러
  const handleMouseUp = () => {
    setSwiping(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    // 80% 이상 드래그했으면 완료로 간주
    if (swipePosition > maxSwipe * 0.8) {
      setSwipePosition(maxSwipe);
      setCompleted(true);
      onComplete();
    } else {
      // 초기 위치로 복귀
      setSwipePosition(0);
    }
  };

  // 터치 이벤트 핸들러 (모바일 지원)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || status === 'completed' || status === 'reviewing') return;
    
    setSwiping(true);
    startXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return;
    
    const deltaX = e.touches[0].clientX - startXRef.current;
    const newPosition = Math.max(0, Math.min(maxSwipe, deltaX));
    setSwipePosition(newPosition);
  };

  const handleTouchEnd = () => {
    setSwiping(false);
    
    if (swipePosition > maxSwipe * 0.8) {
      setSwipePosition(maxSwipe);
      setCompleted(true);
      onComplete();
    } else {
      setSwipePosition(0);
    }
  };

  // 배경색과 썸네일 색상 계산
  const getBackgroundColor = () => {
    if (status === 'completed') return 'bg-green-100 border-green-300';
    if (status === 'reviewing') return 'bg-yellow-100 border-yellow-300';
    return 'bg-gray-50 border-gray-200';
  };

  const getThumbColor = () => {
    if (status === 'completed') return 'bg-green-600 shadow-md';
    if (status === 'reviewing') return 'bg-yellow-500 shadow-md';
    return swipePosition > maxSwipe * 0.8 ? 'bg-green-600 shadow-md' : 'bg-[#005E43] shadow-md';
  };

  // 텍스트 내용 계산
  const getDisplayText = () => {
    if (status === 'completed') return completedText;
    if (status === 'reviewing') return reviewingText;
    return text;
  };

  return (
    <div 
      className={`relative overflow-hidden rounded touch-none select-none border ${className}`}
      style={{ width: `${width}px`, height: `${height}px` }}
      ref={trackRef}
    >
      {/* 트랙 배경 */}
      <div 
        className={`absolute inset-0 ${getBackgroundColor()} flex items-center justify-center transition-colors duration-200`}
      >
        {/* 안내 텍스트 (완료되지 않은 경우에만 표시) */}
        {!completed && (
          <div className="flex items-center gap-1 text-xs text-gray-600 font-medium ml-9">
            <span>오른쪽으로 밀어 검토중</span>
          </div>
        )}
      </div>
      
      {/* 썸네일 */}
      <div
        ref={thumbRef}
        className={`absolute top-1.5 bottom-1.5 ${getThumbColor()} rounded-md transition-colors duration-200 flex items-center justify-center cursor-grab active:cursor-grabbing transform-gpu`}
        style={{ 
          width: `${height - 3}px`, 
          transform: `translateX(${swipePosition}px)`,
          transition: swiping ? 'none' : 'transform 0.2s ease-out',
          left: '1.5px',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <span className="text-white text-xs font-medium">
          {status === 'completed' ? 
            <Check className="h-4 w-4" /> : 
            status === 'reviewing' ? 
              <span className="flex space-x-0.5">
                <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </span> : 
              <ArrowRight className="h-4 w-4 animate-pulse" />
          }
        </span>
      </div>
      
      {/* 완료 텍스트 (완료된 경우에만 표시) */}
      {completed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-gray-800">
            {getDisplayText()}
          </span>
        </div>
      )}
    </div>
  );
}