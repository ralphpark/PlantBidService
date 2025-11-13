import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { UserDropdownMenu, UserDropdownProps } from "@/components/ui/simple-dropdown";
import { motion, useScroll, useTransform } from "framer-motion";

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  
  // 현재 경로가 홈인지 확인
  const isHomePage = location === "/";
  
  // 스크롤 감지
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleLogout = () => {
    // 로그아웃 요청
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        // 로그아웃 후 추가 처리 - 페이지 리디렉션 보장
        setTimeout(() => {
          window.location.href = '/'; // 홈 페이지로 강제 이동
        }, 300);
      }
    });
  };

  const navigateToAuth = () => {
    setLocation("/auth");
  };

  // 홈 페이지와 다른 페이지의 스타일을 구분
  const headerStyles = isHomePage 
    ? {
        backgroundColor: scrolled ? "rgba(0, 94, 67, 0.98)" : "rgba(0, 94, 67, 0.7)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        boxShadow: scrolled ? "0 4px 20px rgba(0, 0, 0, 0.15)" : "0 1px 10px rgba(0, 0, 0, 0.1)",
        color: "white",
        transition: "all 0.3s ease",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
      }
    : {
        backgroundColor: "white",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        color: "rgb(31, 41, 55)",
      };
      
  // 홈 페이지와 다른 페이지의 로고 스타일 구분
  const logoColor = isHomePage ? "white" : "primary";
  
  // 홈 페이지와 다른 페이지의 링크 스타일 구분
  const linkStyles = isHomePage
    ? "font-sans text-sm font-medium text-white/90 hover:text-white transition-colors duration-300"
    : "font-sans text-sm font-medium text-gray-700 hover:text-primary transition-colors duration-300";
    
  // 홈 페이지와 다른 페이지의 모바일 메뉴 토글 버튼 스타일 구분
  const toggleButtonColor = isHomePage ? "text-white" : "text-gray-800";
  
  // 홈 페이지와 다른 페이지의 모바일 메뉴 스타일 구분
  const mobileMenuStyles = isHomePage
    ? "bg-[#005E43] text-white border-[#004835]"
    : "bg-white text-gray-700 border-gray-100";
    
  // 홈 페이지와 다른 페이지의 모바일 링크 스타일 구분
  const mobileLinkStyles = isHomePage
    ? "block py-2 font-sans text-sm font-medium text-white/90 hover:text-white"
    : "block py-2 font-sans text-sm font-medium text-gray-700 hover:text-primary";

  // 드롭다운 메뉴 props
  const dropdownTheme = isHomePage ? 'dark' as const : 'light' as const;

  return (
    <motion.header 
      className="py-5 px-4 sm:px-6 lg:px-8 fixed top-0 left-0 w-full z-50"
      style={headerStyles}
      initial={isHomePage ? { backgroundColor: "rgba(0, 94, 67, 0.7)" } : undefined}
    >
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center">
          <Logo className="h-10" color={isHomePage ? "white" : "primary"} variant="horizontal" />
        </Link>
        
        <nav className="hidden md:flex space-x-12 items-center">
          <div className="relative group">
            <a href="#features" className="flex items-center space-x-2">
              <motion.div 
                initial={{ x: 0 }}
                whileHover={{ x: 5 }}
                transition={{ duration: 0.2 }}
                className="text-green-300 pointer-events-none"
              >
                →
              </motion.div>
              <span className={`${linkStyles} hover:translate-x-1 transition-transform`}>
                특징
              </span>
            </a>
            <motion.div 
              className="h-[1px] bg-green-300 w-0 group-hover:w-full transition-all duration-300 pointer-events-none"
              initial={{ width: 0 }}
              whileHover={{ width: "100%" }}
            />
          </div>
          
          <div className="relative group">
            <a href="#process" className="flex items-center space-x-2">
              <motion.div 
                initial={{ x: 0 }}
                whileHover={{ x: 5 }}
                transition={{ duration: 0.2 }}
                className="text-green-300 pointer-events-none"
              >
                →
              </motion.div>
              <span className={`${linkStyles} hover:translate-x-1 transition-transform`}>
                이용방법
              </span>
            </a>
            <motion.div 
              className="h-[1px] bg-green-300 w-0 group-hover:w-full transition-all duration-300 pointer-events-none"
              initial={{ width: 0 }}
              whileHover={{ width: "100%" }}
            />
          </div>
          

          
          {/* Auth buttons */}
          <div className="ml-4">
            {user ? (
              <UserDropdownMenu 
                username={user.username}
                role={user.role}
                onLogout={handleLogout}
                theme={dropdownTheme}
              />
            ) : (
              <Button 
                onClick={navigateToAuth}
                variant={isHomePage ? "secondary" : "default"}
                className={isHomePage ? "text-[#005E43] bg-white hover:bg-white/90" : ""}
              >
                로그인
              </Button>
            )}
          </div>
        </nav>
        
        <div className="flex items-center md:hidden">
          {/* Auth button for mobile */}
          {user ? (
            <UserDropdownMenu 
              username={user.username}
              role={user.role}
              onLogout={handleLogout}
              size="sm"
              className="mr-2"
              theme={dropdownTheme}
            />
          ) : (
            <Button 
              variant={isHomePage ? "secondary" : "outline"} 
              size="sm" 
              className={`mr-2 ${isHomePage ? "text-blue-600 bg-white hover:bg-white/90" : ""}`}
              onClick={navigateToAuth}
            >
              로그인
            </Button>
          )}
          
          <button 
            onClick={toggleMobileMenu}
            className={toggleButtonColor}
            aria-label="Toggle mobile menu"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 6h16M4 12h16M4 18h16" 
              />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      <div 
        className={`md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'} ${mobileMenuStyles} absolute w-full left-0 top-full py-2 px-4 border-t`}
      >
        <a href="#features" className={mobileLinkStyles}>특징</a>
        <a href="#process" className={mobileLinkStyles}>이용방법</a>
      </div>
    </motion.header>
  );
}
