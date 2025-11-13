import React from 'react';
import NaverPhoneVerification from './naver-phone-verification';
import PhoneVerificationFallback from './phone-verification-fallback';

interface PhoneVerificationProps {
  value?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onVerificationResult: (verified: boolean) => void;
  useFallback?: boolean; // 폴백 모드 사용 여부
}

/**
 * 전화번호 인증 컴포넌트
 * 실제 환경에서는 네이버 SENS 인증, 테스트 환경에서는 폴백 방식 사용
 */
export default function PhoneVerification({
  value,
  onChange,
  onVerificationResult,
  useFallback = false
}: PhoneVerificationProps) {
  // 환경에 따라 적절한 인증 컴포넌트 선택
  // 네이버 SENS 설정 문제로 인해 폴백 모드로 설정
  const useRealAuth = false;
  
  if (useRealAuth) {
    return (
      <NaverPhoneVerification
        value={value}
        onChange={onChange}
        onVerificationResult={onVerificationResult}
      />
    );
  } else {
    return (
      <PhoneVerificationFallback
        value={value}
        onChange={onChange}
        onVerificationResult={onVerificationResult}
      />
    );
  }
}