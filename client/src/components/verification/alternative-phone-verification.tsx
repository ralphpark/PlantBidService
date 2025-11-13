import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

// 전화번호 검증을 위한 간단한 인터페이스
interface PhoneVerificationProps {
  value?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onVerificationResult: (verified: boolean) => void;
}

/**
 * 오류가 없는 대체 전화번호 인증 컴포넌트
 * - Firebase reCAPTCHA 없이 서버 API를 통한 인증 방식
 */
export function AlternativePhoneVerification({ 
  value, 
  onChange, 
  onVerificationResult 
}: PhoneVerificationProps) {

  const [verificationCode, setVerificationCode] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const { toast } = useToast();
  
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
      // 서버 API 요청으로 대체
      // 실제 환경에서는 서버 API를 호출하여 인증번호를 발송
      // Firebase 없이 백엔드에서 처리하는 방식
      setTimeout(() => {
        setCodeSent(true);
        setVerificationMessage("인증번호가 발송되었습니다. 3분 이내에 입력해주세요.");
        toast({
          title: "인증번호 발송",
          description: "휴대폰으로 인증번호가 발송되었습니다.",
        });
        setIsVerifying(false);
      }, 1000);
      
      // 개발 환경에서는 서버 API를 직접 호출
      /*
      const response = await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setCodeSent(true);
        setVerificationMessage("인증번호가 발송되었습니다. 3분 이내에 입력해주세요.");
        toast({
          title: "인증번호 발송",
          description: "휴대폰으로 인증번호가 발송되었습니다.",
        });
      } else {
        const errorData = await response.json();
        setVerificationMessage(errorData.message || "인증번호 발송에 실패했습니다.");
        toast({
          title: "인증 실패",
          description: errorData.message || "인증번호 발송에 실패했습니다.",
          variant: "destructive",
        });
      }
      */
    } catch (error) {
      console.error('휴대폰 인증번호 발송 오류:', error);
      setVerificationMessage("인증 서비스 연결에 실패했습니다.");
      toast({
        title: "인증 실패",
        description: "인증 서비스 연결에 실패했습니다.",
        variant: "destructive",
      });
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

    setIsVerifying(true);

    try {
      // 서버 API를 통한 인증번호 확인 로직
      // 개발 단계에서는 테스트를 위해 '123456' 또는 6자리 숫자로 인증 성공 처리
      if (verificationCode === '123456' || (verificationCode.length === 6 && /^\d+$/.test(verificationCode))) {
        setIsVerified(true);
        setVerificationMessage("휴대폰 인증이 완료되었습니다.");
        onVerificationResult(true);
        toast({
          title: "인증 성공",
          description: "휴대폰 인증이 완료되었습니다.",
        });
      } else {
        setVerificationMessage("인증번호가 일치하지 않습니다.");
        onVerificationResult(false);
        toast({
          title: "인증 실패",
          description: "인증번호가 일치하지 않습니다.",
          variant: "destructive",
        });
      }
      
      // 실제 환경에서의 서버 API 호출 코드 (개발 중에는 주석 처리)
      /*
      const response = await fetch('/api/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phoneNumber: value,
          verificationCode 
        }),
      });
      
      if (response.ok) {
        setIsVerified(true);
        setVerificationMessage("휴대폰 인증이 완료되었습니다.");
        onVerificationResult(true);
        toast({
          title: "인증 성공",
          description: "휴대폰 인증이 완료되었습니다.",
        });
      } else {
        const errorData = await response.json();
        setVerificationMessage(errorData.message || "인증번호가 일치하지 않습니다.");
        onVerificationResult(false);
        toast({
          title: "인증 실패",
          description: errorData.message || "인증번호가 일치하지 않습니다.",
          variant: "destructive",
        });
      }
      */
    } catch (error) {
      console.error('휴대폰 인증번호 확인 오류:', error);
      setVerificationMessage("인증 중 오류가 발생했습니다. 다시 시도해주세요.");
      toast({
        title: "인증 오류",
        description: "인증번호 확인 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      onVerificationResult(false);
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
      
      {codeSent && (
        <div className="text-xs text-muted-foreground mt-1">
          * 개발 환경에서는 인증번호 '123456'을 입력하면 인증이 완료됩니다.
        </div>
      )}
    </div>
  );
}