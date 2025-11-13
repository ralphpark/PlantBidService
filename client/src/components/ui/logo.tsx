import React from "react";
import simdaLogo from "../../assets/simda_logo_green.png";

interface LogoProps {
  className?: string;
  color?: "white" | "primary";
  variant?: "stacked" | "horizontal";
}

export function Logo({ 
  className = "h-12", 
  color = "primary", 
  variant = "stacked"
}: LogoProps) {
  // 색상에 따른 클래스 결정
  const textColorClass = color === "white" ? "text-white" : "text-primary";
  const subTextColorClass = color === "white" ? "text-white/80" : "text-muted-foreground";
  
  // 가로/세로 배치에 따른 클래스 결정
  const containerClasses = variant === "stacked" 
    ? "flex flex-col items-center" 
    : "flex items-center gap-3";
  
  const textContainerClasses = variant === "stacked" 
    ? "mt-2 text-center" 
    : "flex items-baseline";
  
  // 로고 반환
  return (
    <div className={containerClasses}>
      {/* 이미지 로고는 일단 사용하지 않고 텍스트로만 표현 */}
      {false && <img 
        src={simdaLogo} 
        alt="simda logo" 
        className={className} 
      />}
      
      {/* 텍스트 로고 */}
      <div className={textContainerClasses}>
        <span className={`font-bold text-xl ${textColorClass}`}>PlanB</span>
        <span className={`text-sm ml-1 ${subTextColorClass}`}>by simda</span>
      </div>
    </div>
  );
}
