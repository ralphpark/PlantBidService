import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export interface UserDropdownProps {
  username: string;
  role: string;
  onLogout: () => void;
  size?: 'default' | 'sm';
  className?: string;
  theme?: 'light' | 'dark';
}

/**
 * Radix UI의 DropdownMenu 컴포넌트는 내부 구현에서 무한 리렌더링 문제를 일으킬 수 있습니다.
 * 이 문제를 해결하기 위해 직접 구현한 간단한 드롭다운 메뉴입니다.
 */
export function UserDropdownMenu({
  username,
  role,
  onLogout,
  size = 'default',
  className = '',
  theme = 'light',
}: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const toggleDropdown = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);
  
  const handleLogoutClick = useCallback(() => {
    onLogout();
    setIsOpen(false);
  }, [onLogout]);
  
  const roleLabel = 
    role === "user" ? "식물 애호가" : 
    role === "vendor" ? "지역 판매자" : 
    "관리자";

  // 드롭다운 외부 클릭 시 닫기 이벤트 핸들러 추가
  const handleOutsideClick = useCallback((e: MouseEvent) => {
    const target = e.target as Node;
    const dropdown = document.getElementById('user-dropdown-content');
    const button = document.getElementById('user-dropdown-button');
    
    if (dropdown && !dropdown.contains(target) && button && !button.contains(target)) {
      setIsOpen(false);
    }
  }, []);
  
  // 드롭다운이 열려있을 때만 외부 클릭 이벤트 리스너 등록
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    } else {
      document.removeEventListener('mousedown', handleOutsideClick);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, handleOutsideClick]);

  // 테마에 맞는 버튼 스타일 설정
  const buttonVariant = theme === 'dark' ? 'secondary' : 'outline';
  const buttonClass = theme === 'dark' 
    ? `bg-white/10 text-white border-white/30 hover:bg-white/20 ${className}` 
    : className;
  
  // 테마에 맞는 드롭다운 스타일 설정
  const dropdownClass = theme === 'dark'
    ? "absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-[#005E43] ring-1 ring-white/20 ring-opacity-5 z-50"
    : "absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50";
  
  const dropdownTextClass = theme === 'dark'
    ? "px-4 py-2 text-xs text-white/70"
    : "px-4 py-2 text-xs text-muted-foreground";
    
  const dropdownDividerClass = theme === 'dark'
    ? "border-t border-[#007854]"
    : "border-t border-gray-100";
    
  const dropdownItemClass = theme === 'dark'
    ? "block w-full text-left px-4 py-2 text-sm text-white/90 hover:bg-[#007854]"
    : "block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100";

  return (
    <div className="relative">
      <Button 
        id="user-dropdown-button"
        variant={buttonVariant}
        size={size} 
        className={buttonClass}
        onClick={toggleDropdown}
      >
        {username}
      </Button>
      
      {isOpen && (
        <div 
          id="user-dropdown-content"
          className={dropdownClass}
        >
          <div className="py-1">
            <div className={dropdownTextClass}>
              {roleLabel}
            </div>
            <div className={dropdownDividerClass}></div>
            
            {/* 판매자인 경우 대시보드 링크 표시 */}
            {role === "vendor" && (
              <a
                href="/vendor-dashboard"
                className={dropdownItemClass}
                data-testid="link-vendor-dashboard"
              >
                판매자 대시보드
              </a>
            )}
            
            {/* 관리자인 경우 대시보드 링크 표시 */}
            {role === "admin" && (
              <a
                href="/admin/dashboard"
                className={dropdownItemClass}
                data-testid="link-admin-dashboard"
              >
                관리자 대시보드
              </a>
            )}
            
            {/* 주문 내역 링크 */}
            <a
              href="/order-history"
              className={dropdownItemClass}
              data-testid="link-order-history"
            >
              주문 내역
            </a>
            
            {/* 비밀번호 변경 링크 */}
            <a
              href="/change-password"
              className={dropdownItemClass}
              data-testid="link-change-password"
            >
              비밀번호 변경
            </a>
            
            <button
              onClick={handleLogoutClick}
              className={dropdownItemClass}
              data-testid="button-logout"
            >
              로그아웃
            </button>
          </div>
        </div>
      )}
    </div>
  );
}