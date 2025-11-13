import React, { useEffect, useState, useRef } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { motion, useScroll, useTransform } from "framer-motion";
import { InteractiveDotGrid } from "@/components/ui/interactive-dot-grid";
import { InteractiveTitle } from "@/components/ui/interactive-title";
import { FloatingButton } from "@/components/ui/floating-button";
import { CustomCursor } from "@/components/ui/custom-cursor";
import { useQuery } from "@tanstack/react-query";

// 타이핑 효과 컴포넌트
const TypingText = ({ phrases }: { phrases: string[] }) => {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [fontSize, setFontSize] = useState("text-3xl");
  const [showCursor, setShowCursor] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
  
  // 화면 크기에 따라 글꼴 크기 조정 함수
  const adjustFontSize = () => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const currentPhrase = phrases[currentPhraseIndex];
    
    // 텍스트 길이와 컨테이너 너비에 따라 글꼴 크기 동적 조정
    // 모바일 화면에서 더 작게 표시
    if (containerWidth < 400) {
      if (currentPhrase.length > 25) {
        setFontSize("text-lg");
      } else if (currentPhrase.length > 15) {
        setFontSize("text-xl");
      } else {
        setFontSize("text-2xl");
      }
    } 
    // 태블릿 화면
    else if (containerWidth < 640) {
      if (currentPhrase.length > 25) {
        setFontSize("text-xl");
      } else if (currentPhrase.length > 15) {
        setFontSize("text-2xl");
      } else {
        setFontSize("text-3xl");
      }
    }
    // 데스크톱 화면
    else {
      if (currentPhrase.length > 30) {
        setFontSize("text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl");
      } else if (currentPhrase.length > 20) {
        setFontSize("text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl");
      } else {
        setFontSize("text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl");
      }
    }
  };
  
  // 윈도우 크기 변경 감지 이벤트
  useEffect(() => {
    const handleResize = () => {
      adjustFontSize();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentPhraseIndex]);
  
  // 다음 문장으로 이동하는 함수
  const moveToNextPhrase = () => {
    setIsTyping(true);
    setDisplayedText("");
    setCurrentPhraseIndex((prevIndex) => (prevIndex + 1) % phrases.length);
  };
  
  // 타이핑 효과
  useEffect(() => {
    // 텍스트 길이에 맞게 폰트 크기 조정
    adjustFontSize();
    
    if (!phrases || phrases.length === 0) return;
    
    const currentPhrase = phrases[currentPhraseIndex];
    
    // 타이핑 효과 구현
    if (isTyping) {
      if (displayedText.length < currentPhrase.length) {
        // 이전 타이머 정리
        if (timerRef.current) clearTimeout(timerRef.current);
        
        // 새 타이머 설정
        timerRef.current = setTimeout(() => {
          setDisplayedText(currentPhrase.substring(0, displayedText.length + 1));
        }, 15); // 타이핑 속도 더 빠르게
      } else {
        setIsTyping(false);
        
        // 이전 타이머 정리
        if (timerRef.current) clearTimeout(timerRef.current);
        
        // 새 타이머 설정
        timerRef.current = setTimeout(() => {
          // 다음 문구로 전환
          moveToNextPhrase();
        }, 2000); // 대기 시간
      }
    }
  }, [displayedText, currentPhraseIndex, isTyping, phrases]);
  
  // 커서 깜빡임 효과
  useEffect(() => {
    const cursorTimer = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500); // 커서 깜빡임 간격
    
    return () => clearInterval(cursorTimer);
  }, []);
  
  return (
    <div 
      ref={containerRef} 
      className={`w-full text-center ${fontSize} text-green-300 font-bold min-h-[4rem] flex items-center justify-center overflow-hidden whitespace-nowrap`}
    >
      {displayedText}
      <span className={`${showCursor ? 'opacity-100' : 'opacity-0'} ml-1 w-2 h-8 bg-green-300 transition-opacity duration-200`}></span>
    </div>
  );
};

export default function Home() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { scrollYProgress } = useScroll();
  
  // 사이트 설정 데이터 불러오기 (공개 API 사용)
  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings', Date.now()], // 캐시 무효화
    queryFn: async () => {
      const response = await fetch('/api/site-settings');
      if (!response.ok) {
        throw new Error('사이트 설정을 불러오는데 실패했습니다');
      }
      const data = await response.json();
      
      if (!data.homePage) return null;
      
      try {
        // 이중 JSON 인코딩된 경우를 처리
        let homePageData = data.homePage;
        if (typeof homePageData === 'string') {
          homePageData = JSON.parse(homePageData);
        }
        if (typeof homePageData === 'string') {
          homePageData = JSON.parse(homePageData);
        }
        console.log('파싱된 홈페이지 설정:', homePageData);
        return homePageData;
      } catch (error) {
        console.error('홈페이지 설정 파싱 오류:', error);
        console.log('원본 데이터:', data);
        return null;
      }
    },
  });
  
  // 스크롤에 따른 효과
  const scrollTransformProps = {
    opacity: useTransform(scrollYProgress, [0, 0.2], [1, 0]),
    scale: useTransform(scrollYProgress, [0, 0.2], [1, 0.95]),
    y: useTransform(scrollYProgress, [0, 0.2], [0, -50]),
  };
  
  useEffect(() => {
    document.title = "PlantBid by simda - AI 기반 맞춤 식물 추천 & 지역 입찰형 판매 서비스";
    
    // 스크롤 위치를 맨 위로 초기화
    window.scrollTo(0, 0);
  }, []);
  
  return (
    <div className="font-sans bg-[#005E43] text-white">
      <CustomCursor />
      
      {/* 인터랙티브 도트 배경 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <InteractiveDotGrid spacing={30} dotSize={2} />
      </div>
      
      {/* 인터랙티브 식물 아이콘 제거됨 */}
      
      <Header />
      
      <main className="pt-20">
        {/* 히어로 섹션 */}
        <motion.section 
          className="relative min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-4 sm:px-6 pb-16"
          style={scrollTransformProps}
        >
          <div className="container mx-auto text-center z-10 relative">
            <div className="mb-8 z-50 relative">
              <div className="font-bold mb-4 leading-tight text-white"
                   style={{ 
                     position: 'relative',
                     zIndex: 100,
                     maxWidth: '100%'
                   }}>
                <div className="flex flex-col items-center w-full py-6">
                  <div className="flex justify-start w-full mb-2 px-12 sm:px-16 md:px-24 lg:px-32 xl:px-40">
                    <div className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-left font-bold">
                      {siteSettings?.title || "우리는"}
                    </div>
                  </div>
                  
                  {/* 타이핑 효과 영역 */}
                  <div className="w-full my-4 flex justify-center">
                    <TypingText phrases={siteSettings?.typingPhrases || [
                      "식물 경험의 혁신",
                      "식물을 구매하는 새로운 제안",
                      "실물과 가격을 확인하고 구매하는 온라인 서비스",
                      "원하는 곳 어디든 가까운 곳에서 배송",
                      "Zero 가맹비, 저렴한 수수료의 판매자 서비스"
                    ]} />
                  </div>
                  
                  <div className="flex justify-end w-full mt-2 px-8 sm:px-12 md:px-16 lg:px-20">
                    <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-right font-bold">
                      {siteSettings?.subtitle || "을(를) 하고 있습니다"}
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-white mt-6 max-w-2xl mx-auto relative z-50">
                <p className="text-center whitespace-nowrap px-4" style={{ fontSize: 'clamp(12px, 2.5vw, 20px)', overflow: 'visible' }}>
                  AI가 환경과 목적에 맞는 식물을 추천하고, 지역 업체의 맞춤 제안까지 한 번에 받아보세요.
                </p>
              </div>
            </div>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center mt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <FloatingButton 
                size="lg"
                className="bg-white text-[#005E43] hover:bg-white/90 font-semibold px-8 py-6 text-lg rounded-md"
                onClick={() => {
                  if (user) {
                    navigate("/ai-consultation");
                  } else {
                    navigate("/auth");
                  }
                }}
              >
                인공지능 상담하기
              </FloatingButton>
              
              <FloatingButton 
                size="lg"
                className="bg-white text-[#005E43] hover:bg-white/90 font-semibold px-8 py-6 text-lg rounded-md"
                onClick={() => navigate("/explore")}
              >
                식물 살펴보기
              </FloatingButton>
            </motion.div>
          </div>
          
          {/* 스크롤 인디케이터 */}
          <motion.div 
            className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
          >
            <div className="flex flex-col items-center">
              <span className="text-white/70 text-sm mb-2">스크롤하여 더 알아보기</span>
              <motion.div 
                className="w-1 h-10 rounded-full bg-white/30 overflow-hidden"
                animate={{ 
                  boxShadow: ["0 0 0px rgba(255,255,255,0)", "0 0 10px rgba(255,255,255,0.5)", "0 0 0px rgba(255,255,255,0)"]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 2 
                }}
              >
                <motion.div 
                  className="w-full bg-white h-5 rounded-full"
                  animate={{ 
                    y: ["-100%", "120%"] 
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 1.5,
                    ease: "easeInOut" 
                  }}
                />
              </motion.div>
            </div>
          </motion.div>
        </motion.section>
        
        {/* 특징 설명 섹션 */}
        <section id="features" className="relative bg-gradient-to-b from-[#005E43] to-[#004835] py-20 px-4 sm:px-6">
          <div className="container mx-auto">
            <motion.h2 
              className="text-3xl md:text-4xl font-bold text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <span className="text-white">AI가 찾아주는 </span>
              <span className="text-green-300">맞춤형 식물</span>
            </motion.h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-4 xl:gap-2 max-w-6xl mx-auto">
              {/* 특징 1 */}
              <motion.div 
                className="bg-white/10 p-6 rounded-xl backdrop-blur-md"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <div className="text-green-300 text-4xl mb-4">01</div>
                <h3 className="text-xl font-semibold mb-3">개인 환경에 맞는 추천</h3>
                <p className="text-white/80">
                  빛, 습도, 공간 등 당신의 환경을 AI가 분석하여 최적의 식물을 추천해드립니다.
                </p>
              </motion.div>
              
              {/* 특징 2 */}
              <motion.div 
                className="bg-white/10 p-6 rounded-xl backdrop-blur-md"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <div className="text-green-300 text-4xl mb-4">02</div>
                <h3 className="text-xl font-semibold mb-3">지역 기반 판매 연결</h3>
                <p className="text-white/80">
                  내 주변 식물 판매자들로부터 직접 맞춤형 제안을 받아보세요.
                </p>
              </motion.div>
              
              {/* 특징 3 */}
              <motion.div 
                className="bg-white/10 p-6 rounded-xl backdrop-blur-md"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <div className="text-green-300 text-4xl mb-4">03</div>
                <h3 className="text-xl font-semibold mb-3">식물 관리 가이드</h3>
                <p className="text-white/80">
                  구매 후에도 AI의 도움으로 식물을 건강하게 관리하는 방법을 배울 수 있습니다.
                </p>
              </motion.div>
            </div>
          </div>
        </section>
        
        {/* 이용방법 섹션 */}
        <section id="process" className="bg-gradient-to-b from-[#004835] to-[#003A2A] py-20 px-4 sm:px-6">
          <div className="container mx-auto max-w-4xl">
            <motion.h2 
              className="text-3xl md:text-4xl font-bold text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <span className="text-white">간단한 </span>
              <span className="text-green-300">3단계 이용방법</span>
            </motion.h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* 단계 1 */}
              <motion.div 
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <div className="w-20 h-20 bg-green-300 rounded-full flex items-center justify-center mx-auto mb-4 text-[#005E43] text-3xl font-bold">
                  1
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">AI 상담 시작</h3>
                <p className="text-white/80">
                  간단한 질문에 답하면 AI가 당신의 환경과 취향을 분석합니다
                </p>
              </motion.div>
              
              {/* 단계 2 */}
              <motion.div 
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <div className="w-20 h-20 bg-green-300 rounded-full flex items-center justify-center mx-auto mb-4 text-[#005E43] text-3xl font-bold">
                  2
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">맞춤 제안 받기</h3>
                <p className="text-white/80">
                  주변 판매자들이 가격과 배송 조건을 제안합니다
                </p>
              </motion.div>
              
              {/* 단계 3 */}
              <motion.div 
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <div className="w-20 h-20 bg-green-300 rounded-full flex items-center justify-center mx-auto mb-4 text-[#005E43] text-3xl font-bold">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">구매 완료</h3>
                <p className="text-white/80">
                  최적의 제안을 선택하고 안전하게 결제하세요
                </p>
              </motion.div>
            </div>
          </div>
        </section>
        
        {/* CTA 섹션 */}
        <section className="bg-gradient-to-b from-[#003A2A] to-[#002D22] py-20 px-4 sm:px-6 text-center">
          <div className="container mx-auto max-w-3xl">
            <motion.h2 
              className="text-3xl md:text-4xl font-bold mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              당신의 식물 여정을 <span className="text-green-300">오늘 시작하세요</span>
            </motion.h2>
            
            <motion.p 
              className="text-white/80 text-lg mb-10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              단 몇 분 만에 당신에게 딱 맞는 식물을 찾아드립니다. 
              자연과 함께하는 더 건강하고 아름다운 일상을 경험하세요.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true, margin: "-100px" }}
              className="inline-block" // 내용물 크기에 맞춤
            >
              <FloatingButton 
                size="lg"
                className="bg-white text-[#005E43] hover:bg-white/90 font-semibold px-10 py-4 text-xl rounded-md mx-auto"
                onClick={() => {
                  if (user) {
                    navigate("/ai-consultation");
                  } else {
                    navigate("/auth");
                  }
                }}
              >
                지금 시작하기
              </FloatingButton>
            </motion.div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
