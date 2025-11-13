import React, { useEffect, useState } from "react";
import { Logo } from "@/components/ui/logo";
import { useKoreanTime } from "@/lib/use-korean-time";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { InteractiveDotGrid } from "@/components/ui/interactive-dot-grid";
import simdaLogoWhite from "@/assets/simda_logo_white.png";
import simdaLogoGreen from "@/assets/simda_logo_green.png";

export function Footer() {
  const { currentTime } = useKoreanTime();
  const [location] = useLocation();
  const [year] = useState(new Date().getFullYear());
  
  // 현재 경로가 홈인지 확인
  const isHomePage = location === "/";
  
  // 홈 페이지일 때와 다른 페이지일 때 스타일 구분
  const footerBg = isHomePage ? "bg-[#003A2A]" : "bg-neutral";
  const textColor = isHomePage ? "text-white" : "text-gray-600";
  const headingColor = isHomePage ? "text-white" : "text-primary";
  const linkHoverColor = isHomePage ? "hover:text-white/80" : "hover:text-primary";
  const linkDefaultColor = isHomePage ? "text-white/70" : "text-gray-600";
  const iconColor = isHomePage ? "text-white/80" : "text-primary";
  const borderColor = isHomePage ? "border-[#002F23]" : "border-gray-200";
  const copyrightColor = isHomePage ? "text-white/60" : "text-gray-500";

  return (
    <footer id="about" className={`py-16 px-4 sm:px-6 lg:px-8 ${footerBg} relative`}>
      {/* 홈페이지일 때만 인터랙티브 도트 배경 표시 */}
      {isHomePage && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
          <InteractiveDotGrid spacing={40} dotSize={2} color="rgba(255, 255, 255, 0.6)" />
        </div>
      )}
      
      <div className="container mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="mb-6">
              <div className="flex justify-center">
                <Logo className="h-10" color={isHomePage ? "white" : "primary"} />
              </div>
              <div className="mt-3 flex justify-center">
                <img 
                  src={isHomePage ? simdaLogoWhite : simdaLogoGreen} 
                  alt="Simda Logo" 
                  className="h-7" 
                />
              </div>
            </div>
            <p className={`${textColor} mb-4`}>
              AI 기술을 활용한 맞춤형 식물 추천과 
              지역 기반 입찰 시스템을 제공하는 
              혁신적인 플랫폼입니다.
            </p>
            <div className="flex space-x-4 mt-4">
              <a href="#" className={`${linkDefaultColor} ${linkHoverColor} transition-colors`}>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a href="#" className={`${linkDefaultColor} ${linkHoverColor} transition-colors`}>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                </svg>
              </a>
              <a href="#" className={`${linkDefaultColor} ${linkHoverColor} transition-colors`}>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                </svg>
              </a>
            </div>
          </motion.div>
          
          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <h3 className={`font-sans text-lg font-semibold mb-4 ${headingColor}`}>바로가기</h3>
            <ul className="space-y-2">
              <li><a href="#" className={`${linkDefaultColor} ${linkHoverColor} transition-colors`}>서비스 소개</a></li>
              <li><a href="#features" className={`${linkDefaultColor} ${linkHoverColor} transition-colors`}>주요 기능</a></li>
              <li><a href="#process" className={`${linkDefaultColor} ${linkHoverColor} transition-colors`}>이용 방법</a></li>
              <li><a href="#" className={`${linkDefaultColor} ${linkHoverColor} transition-colors`}>제휴 업체 안내</a></li>
            </ul>
          </motion.div>
          
          {/* Support */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h3 className={`font-sans text-lg font-semibold mb-4 ${headingColor}`}>고객 지원</h3>
            <ul className="space-y-2">
              <li><Link href="/terms-of-service" className={`${linkDefaultColor} ${linkHoverColor} transition-colors`}>이용약관</Link></li>
              <li><Link href="/privacy-policy" className={`${linkDefaultColor} ${linkHoverColor} transition-colors`}>개인정보처리방침</Link></li>
              <li><Link href="/customer-service" className={`${linkDefaultColor} ${linkHoverColor} transition-colors`}>고객센터</Link></li>
            </ul>
          </motion.div>
          
          {/* Contact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <h3 className={`font-sans text-lg font-semibold mb-4 ${headingColor}`}>문의하기</h3>
            <ul className="space-y-2">
              <li className={`flex items-center ${textColor}`}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-5 w-5 mr-2 ${iconColor}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>서울특별시 서초구 강남대로2길 60, 1층</span>
              </li>
              <li className={`flex items-center ${textColor}`}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-5 w-5 mr-2 ${iconColor}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                <span>02-1551-0525</span>
              </li>
              <li className={`flex items-center ${textColor}`}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-5 w-5 mr-2 ${iconColor}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <span>simgo@simgo.kr</span>
              </li>
            </ul>
          </motion.div>
        </div>
        
        {/* 사업자 정보 섹션 */}
        <motion.div
          className={`border-t ${borderColor} mt-12 pt-8`}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <div className="mb-6">
            <h3 className={`font-sans text-sm font-semibold mb-3 ${headingColor}`}>사업자 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className={`${textColor} text-xs flex`}>
                <span className="font-medium mr-2">상호명:</span>
                <span className={`${copyrightColor}`}>주식회사 에스아이엠지오</span>
              </div>
              <div className={`${textColor} text-xs flex`}>
                <span className="font-medium mr-2">대표자명:</span>
                <span className={`${copyrightColor}`}>이주연</span>
              </div>
              <div className={`${textColor} text-xs flex`}>
                <span className="font-medium mr-2">사업자등록번호:</span>
                <span className={`${copyrightColor}`}>574-88-02211</span>
              </div>
              <div className={`${textColor} text-xs flex`}>
                <span className="font-medium mr-2">통신판매신고번호:</span>
                <span className={`${copyrightColor}`}>2023-서울서초-1761호</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center">
              <p className={`${copyrightColor} text-sm mr-2`}>&copy; {year} PlantBid by</p>
              <img 
                src={isHomePage ? simdaLogoWhite : simdaLogoGreen} 
                alt="Simda Logo" 
                className="h-6 ml-1 mr-1" 
              />
              <p className={`${copyrightColor} text-sm ml-2`}>All rights reserved.</p>
            </div>
            <div className="mt-4 md:mt-0">
              <p className={`text-sm ${copyrightColor}`}>
                KST 시간 기준으로 운영됩니다. 현재 시간: <span>{currentTime}</span>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
