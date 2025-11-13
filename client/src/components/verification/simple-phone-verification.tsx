import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

// 전화번호 검증을 위한 인터페이스
interface SimplePhoneVerificationProps {
  value?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onVerificationResult: (verified: boolean) => void;
}

/**
 * 단순화된 전화번호 인증 컴포넌트
 * 테스트 환경에서 사용 가능, 실제 환경에서는 Firebase OTP 인증 로직 추가 필요
 */
export default function SimplePhoneVerification({
  value,
  onChange,
  onVerificationResult
}: SimplePhoneVerificationProps) {
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
  const handleSendVerificationCode = () => {
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
    
    // 실제 환경에서는 서버 API 호출하여 인증번호 발송
    // 여기서는 개발 환경을 위한 시뮬레이션
    setTimeout(() => {
      setCodeSent(true);
      setVerificationMessage("인증번호가 발송되었습니다. 3분 이내에 입력해주세요.");
      toast({
        title: "인증번호 발송",
        description: "휴대폰으로 인증번호가 발송되었습니다.",
      });
      setIsVerifying(false);
    }, 1000);
  };

  // 인증번호 확인 클릭 핸들러
  const handleVerifyCode = () => {
    if (!verificationCode) {
      toast({
        title: "인증 실패",
        description: "인증번호를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    
    // 개발 환경에서는 123456을 올바른 코드로 간주
    setTimeout(() => {
      const isCorrect = verificationCode === '123456';
      
      setIsVerified(isCorrect);
      setVerificationMessage(isCorrect 
        ? "휴대폰 인증이 완료되었습니다." 
        : "인증번호가 일치하지 않습니다.");
      
      onVerificationResult(isCorrect);
      setIsVerifying(false);
      
      if (isCorrect) {
        toast({
          title: "인증 성공",
          description: "휴대폰 인증이 완료되었습니다.",
        });
      } else {
        toast({
          title: "인증 실패",
          description: "인증번호가 일치하지 않습니다.",
          variant: "destructive",
        });
      }
    }, 1000);
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
        <div className="text-xs text-muted-foreground mt-2">
          * 테스트 환경에서는 인증번호 <strong>123456</strong>을 입력하면 인증이 완료됩니다.
        </div>
      )}
    </div>
  );
}