import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import axios from 'axios';

interface NaverPhoneVerificationProps {
  value?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onVerificationResult: (verified: boolean) => void;
}

export default function NaverPhoneVerification({
  value,
  onChange,
  onVerificationResult
}: NaverPhoneVerificationProps) {
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
      // 서버에 인증번호 요청
      const response = await axios.post('/api/verify/phone/send', {
        phoneNumber
      });
      
      if (response.data.success) {
        setCodeSent(true);
        setVerificationMessage("인증번호가 발송되었습니다. 3분 이내에 입력해주세요.");
        
        toast({
          title: "인증번호 발송",
          description: "휴대폰으로 인증번호가 발송되었습니다.",
        });
      } else {
        throw new Error(response.data.message || "인증번호 발송 실패");
      }
    } catch (error: any) {
      console.error('인증번호 전송 오류:', error);
      
      toast({
        title: "인증번호 전송 실패",
        description: error.response?.data?.message || error.message || "인증번호 전송 중 오류가 발생했습니다.",
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

    if (!codeSent) {
      toast({
        title: "인증 실패",
        description: "먼저 인증번호를 요청해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    
    try {
      // 서버에 인증번호 확인 요청
      const response = await axios.post('/api/verify/phone/check', {
        phoneNumber: value,
        code: verificationCode
      });
      
      if (response.data.success) {
        // 성공 처리
        setIsVerified(true);
        setVerificationMessage("휴대폰 인증이 완료되었습니다.");
        onVerificationResult(true);
        
        toast({
          title: "인증 성공",
          description: "휴대폰 인증이 완료되었습니다.",
        });
      } else {
        throw new Error(response.data.message || "인증번호 확인 실패");
      }
    } catch (error: any) {
      console.error('인증번호 확인 오류:', error);
      
      setIsVerified(false);
      setVerificationMessage("인증번호가 일치하지 않습니다.");
      onVerificationResult(false);
      
      toast({
        title: "인증 실패",
        description: error.response?.data?.message || error.message || "인증번호가 일치하지 않습니다.",
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
    </div>
  );
}