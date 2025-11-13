import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface PhoneVerificationFallbackProps {
  value?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onVerificationResult: (verified: boolean) => void;
}

/**
 * 간단한 폴백 전화번호 인증 컴포넌트
 * 실제 Firebase 인증이 테스트 환경에서 작동하지 않을 때 사용
 */
export default function PhoneVerificationFallback({
  value,
  onChange,
  onVerificationResult
}: PhoneVerificationFallbackProps) {
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const { toast } = useToast();

  // 개발 환경에서 사용할 테스트 인증 코드
  const TEST_VERIFICATION_CODE = '123456';

  // 전화번호 형식 검증 (정규식) - 더 유연한 검증
  const isValidFormat = (number: string | undefined) => {
    if (!number) return false;
    
    // 숫자만 추출해서 길이 확인
    const digitsOnly = number.replace(/[^0-9]/g, '');
    
    // 전화번호는 10-11자리여야 함
    if (digitsOnly.length < 10 || digitsOnly.length > 11) return false;
    
    // 01로 시작해야 함
    return digitsOnly.startsWith('01');
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
      // 서버 API 호출하여 실제로 인증번호 발송
      const response = await fetch('/api/verify/phone/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setCodeSent(true);
        setVerificationMessage("인증번호가 발송되었습니다. 3분 이내에 입력해주세요.");
        toast({
          title: "인증번호 발송",
          description: "휴대폰으로 인증번호가 발송되었습니다.",
        });
        
        // 개발 환경에서는 테스트 코드 콘솔 출력
        console.log("테스트 인증 코드:", TEST_VERIFICATION_CODE);
      } else {
        toast({
          title: "인증번호 발송 실패",
          description: result.message || "인증번호 발송에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("인증번호 발송 오류:", error);
      toast({
        title: "인증번호 발송 오류",
        description: "서버 연결 중 오류가 발생했습니다.",
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

    const phoneNumber = value || '';
    if (!phoneNumber) {
      toast({
        title: "인증 실패",
        description: "휴대폰 번호가 필요합니다.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    
    try {
      // 서버 API 호출하여 인증번호 검증
      const response = await fetch('/api/verify/phone/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phoneNumber,
          code: verificationCode
        }),
      });
      
      const result = await response.json();
      const isCorrect = result.success;
      
      // 개발 환경에서는 하드코딩된 코드와 비교하여 검증할 수도 있음
      // 서버 검증이 실패하면 여기서 추가 검증
      const fallbackCorrect = verificationCode === TEST_VERIFICATION_CODE;
      const finalResult = isCorrect || fallbackCorrect;
      
      setIsVerified(finalResult);
      setVerificationMessage(finalResult 
        ? "휴대폰 인증이 완료되었습니다." 
        : "인증번호가 일치하지 않습니다.");
      
      onVerificationResult(finalResult);
      
      if (finalResult) {
        toast({
          title: "인증 성공",
          description: "휴대폰 인증이 완료되었습니다.",
        });
      } else {
        toast({
          title: "인증 실패",
          description: result.message || "인증번호가 일치하지 않습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("인증번호 확인 오류:", error);
      
      // 서버 오류 시 개발 환경에서는 하드코딩된 코드로 폴백
      const fallbackCorrect = verificationCode === TEST_VERIFICATION_CODE;
      
      setIsVerified(fallbackCorrect);
      setVerificationMessage(fallbackCorrect 
        ? "휴대폰 인증이 완료되었습니다. (개발 환경 폴백)" 
        : "인증번호가 일치하지 않습니다.");
      
      onVerificationResult(fallbackCorrect);
      
      if (fallbackCorrect) {
        toast({
          title: "인증 성공 (개발 환경)",
          description: "휴대폰 인증이 완료되었습니다.",
        });
      } else {
        toast({
          title: "인증 실패",
          description: "인증번호가 일치하지 않습니다.",
          variant: "destructive",
        });
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        {isVerified && (
          <CheckCircle className="h-5 w-5 text-green-500" />
        )}
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
        <div className="text-xs text-muted-foreground mt-2">
          * 테스트 환경에서는 인증번호 <strong>{TEST_VERIFICATION_CODE}</strong>을 입력하면 인증이 완료됩니다.
        </div>
      )}
      
      <div className="text-xs text-yellow-600 mt-1 flex items-center">
        <AlertCircle className="h-3 w-3 mr-1" />
        개발 환경 전용: 실제 배포 시 네이버 SENS API 인증으로 교체됩니다.
      </div>
    </div>
  );
}