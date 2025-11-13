import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { auth } from '@/lib/firebase';
import { 
  PhoneAuthProvider, 
  RecaptchaVerifier, 
  signInWithPhoneNumber
} from 'firebase/auth';

interface FirebasePhoneVerificationProps {
  value?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onVerificationResult: (verified: boolean) => void;
}

export default function FirebasePhoneVerification({
  value,
  onChange,
  onVerificationResult
}: FirebasePhoneVerificationProps) {
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [recaptchaVerified, setRecaptchaVerified] = useState(false);
  const { toast } = useToast();

  // Firebase RecaptchaVerifier 인스턴스 생성
  // useEffect 제거 - reCAPTCHA는 인증번호 요청 시에만 생성

  // 전화번호 형식 검증 (정규식)
  const isValidFormat = (number: string | undefined) => {
    if (!number) return false;
    const regex = /^01[0-9]-[0-9]{4}-[0-9]{4}$/;
    return regex.test(number);
  };

  // 전화번호 자동 하이픈 추가
  const formatPhoneNumber = (input: string) => {
    // 숫자만 추출
    const numbers = input.replace(/[^0-9]/g, '');
    
    // 최대 11자리로 제한
    const trimmed = numbers.slice(0, 11);
    
    // 하이픈 추가 (3-4-4 형식)
    if (trimmed.length <= 3) {
      return trimmed;
    } else if (trimmed.length <= 7) {
      return `${trimmed.slice(0, 3)}-${trimmed.slice(3)}`;
    } else {
      return `${trimmed.slice(0, 3)}-${trimmed.slice(3, 7)}-${trimmed.slice(7)}`;
    }
  };

  // 입력값 변경 핸들러 (하이픈 자동 추가)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    
    // 원래 input 요소의 value를 변경
    e.target.value = formatted;
    
    // 부모 컴포넌트의 onChange 호출
    onChange(e);
    
    // 변경 시 검증 상태 초기화
    if (isVerified) {
      setIsVerified(false);
      setVerificationMessage(null);
      setCodeSent(false);
      onVerificationResult(false);
    }
  };

  // 인증번호 전송 클릭 핸들러
  const handleSendVerificationCode = async () => {
    const phoneNumber = value || '';
    
    if (!phoneNumber) {
      toast({
        title: "인증 실패",
        description: "휴대폰 번호를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!isValidFormat(phoneNumber)) {
      toast({
        title: "형식 오류",
        description: "올바른 휴대폰 번호 형식이 아닙니다. (예: 010-1234-5678)",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    setVerificationMessage(null);
    
    try {
      // 전화번호 국가 코드 추가 (한국: +82)
      const formattedNumber = '+82' + phoneNumber.replace(/-/g, '').substring(1);
      console.log("포맷된 전화번호:", formattedNumber);
      
      // reCAPTCHA 확인
      // 새로운 reCAPTCHA 인스턴스 생성
      const recaptchaContainer = document.getElementById('recaptcha-container');
      if (!recaptchaContainer) {
        throw new Error('reCAPTCHA 컨테이너를 찾을 수 없습니다.');
      }
      
      // 기존 reCAPTCHA 요소가 있다면 제거
      while (recaptchaContainer.firstChild) {
        recaptchaContainer.removeChild(recaptchaContainer.firstChild);
      }

      // reCAPTCHA 인스턴스 생성
      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'normal',
        'callback': () => {
          console.log('인증 번호 요청 중 reCAPTCHA 인증 성공');
          setRecaptchaVerified(true);
        }
      });
      
      console.log("reCAPTCHA 인스턴스 생성 완료");
      
      // 인증번호 요청
      console.log("인증번호 요청 시작...");
      const confirmation = await signInWithPhoneNumber(auth, formattedNumber, recaptchaVerifier);
      console.log("인증번호 요청 완료:", confirmation ? "성공" : "실패");
      
      // 성공 시
      setConfirmationResult(confirmation);
      setCodeSent(true);
      setVerificationMessage("인증번호가 발송되었습니다. 3분 이내에 입력해주세요.");
      
      // 디버깅 정보 표시
      console.log("confirmationResult 설정됨:", !!confirmation);
      
      toast({
        title: "인증번호 발송",
        description: "휴대폰으로 인증번호가 발송되었습니다.",
      });
      
      // Firebase가 테스트 모드인 경우 개발 목적으로 표시
      if (confirmation && confirmation.verificationId) {
        console.log("verificationId:", confirmation.verificationId);
      }
      
      // 시뮬레이션 환경 처리 - 개발 환경에서 테스트 용도
      if (import.meta.env.DEV) {
        console.log("개발 환경: 실제 SMS 전송 제한이 있을 수 있습니다.");
        console.log("테스트 목적으로 Firebase 콘솔에서 받은 코드를 사용하세요.");
      }
      
    } catch (error: any) {
      console.error('인증번호 전송 오류:', error);
      console.error('오류 세부정보:', error.code, error.message);
      
      // 오류 처리
      if (error.code === 'auth/invalid-phone-number') {
        toast({
          title: "전화번호 형식 오류",
          description: "국제 형식에 맞지 않는 전화번호입니다. 다시 확인해주세요.",
          variant: "destructive",
        });
      } else if (error.code === 'auth/quota-exceeded') {
        toast({
          title: "할당량 초과",
          description: "SMS 발송 할당량이 초과되었습니다. 나중에 다시 시도해주세요.",
          variant: "destructive",
        });
      } else if (error.code === 'auth/too-many-requests') {
        toast({
          title: "너무 많은 요청",
          description: "너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "인증번호 전송 실패",
          description: error.message || "인증번호 전송 중 오류가 발생했습니다. 다시 시도해주세요.",
          variant: "destructive",
        });
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // 인증번호 확인 클릭 핸들러
  const handleVerifyCode = async () => {
    if (!verificationCode) {
      toast({
        title: "인증 실패",
        description: "인증번호를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!confirmationResult) {
      toast({
        title: "인증 실패",
        description: "인증번호를 먼저 요청해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    
    try {
      // 인증번호 확인
      await confirmationResult.confirm(verificationCode);
      
      // 성공 처리
      setIsVerified(true);
      setVerificationMessage("휴대폰 인증이 완료되었습니다.");
      onVerificationResult(true);
      
      toast({
        title: "인증 성공",
        description: "휴대폰 인증이 완료되었습니다.",
      });
    } catch (error: any) {
      console.error('인증번호 확인 오류:', error);
      
      setIsVerified(false);
      setVerificationMessage("인증번호가 일치하지 않습니다.");
      onVerificationResult(false);
      
      toast({
        title: "인증 실패",
        description: error.message || "인증번호가 일치하지 않습니다.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Input
            value={value || ''}
            onChange={handleInputChange}
            placeholder="휴대폰 번호 (010-1234-5678)"
            className={`pr-10 ${isVerified ? 'border-green-500' : ''}`}
            maxLength={13} // 하이픈 포함 최대 길이
            disabled={isVerified || codeSent}
          />
          {isVerified && (
            <CheckCircle className="h-5 w-5 text-green-500 absolute right-3 top-1/2 transform -translate-y-1/2" />
          )}
        </div>
        {!codeSent ? (
          <Button 
            type="button"
            onClick={handleSendVerificationCode}
            disabled={isVerifying || !value || !isValidFormat(value) || isVerified}
            className="whitespace-nowrap"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                전송 중
              </>
            ) : (
              "인증번호 전송"
            )}
          </Button>
        ) : !isVerified && (
          <Button 
            type="button"
            onClick={handleSendVerificationCode}
            disabled={isVerifying}
            className="whitespace-nowrap"
          >
            재전송
          </Button>
        )}
      </div>
      
      {codeSent && !isVerified && (
        <div className="flex items-center space-x-2 mt-2">
          <Input
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="인증번호 6자리 입력"
            className="flex-1"
            maxLength={6}
          />
          <Button 
            type="button"
            onClick={handleVerifyCode}
            disabled={isVerifying || !verificationCode || verificationCode.length < 6}
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                확인 중
              </>
            ) : (
              "확인"
            )}
          </Button>
        </div>
      )}
      
      {verificationMessage && (
        <div className={`text-sm flex items-center ${isVerified ? 'text-green-600' : codeSent ? 'text-blue-600' : 'text-red-600'}`}>
          {isVerified ? (
            <CheckCircle className="h-4 w-4 mr-1" />
          ) : (
            <AlertCircle className="h-4 w-4 mr-1" />
          )}
          {verificationMessage}
        </div>
      )}
      
      {/* 숨겨진 reCAPTCHA 컨테이너 */}
      <div id="recaptcha-container" className="mt-2"></div>
    </div>
  );
}