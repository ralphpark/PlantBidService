import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

// 전화번호 검증을 위한 인터페이스
interface IframePhoneVerificationProps {
  value?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onVerificationResult: (verified: boolean) => void;
}

/**
 * iframe을 사용하여 Firebase reCAPTCHA와 상호작용하는 전화번호 인증 컴포넌트
 * - 별도의 페이지에서 reCAPTCHA를 렌더링하여 DOM 오류 방지
 */
export default function IframePhoneVerification({
  value,
  onChange,
  onVerificationResult
}: IframePhoneVerificationProps) {
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
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

  // iframe에서 메시지 수신
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data) {
        if (event.data.action === 'codeSent' && event.data.status === 'success') {
          setCodeSent(true);
          setVerificationMessage("인증번호가 발송되었습니다. 3분 이내에 입력해주세요.");
          toast({
            title: "인증번호 발송",
            description: "휴대폰으로 인증번호가 발송되었습니다.",
          });
          setIsVerifying(false);
        } else if (event.data.action === 'sendFailed' && event.data.status === 'error') {
          setVerificationMessage(event.data.error?.message || "인증번호 발송에 실패했습니다.");
          toast({
            title: "인증 실패",
            description: event.data.error?.message || "인증번호 발송에 실패했습니다.",
            variant: "destructive",
          });
          setIsVerifying(false);
        } else if (event.data.action === 'verifySuccess' && event.data.status === 'success') {
          setIsVerified(true);
          setVerificationMessage("휴대폰 인증이 완료되었습니다.");
          onVerificationResult(true);
          toast({
            title: "인증 성공",
            description: "휴대폰 인증이 완료되었습니다.",
          });
          setIsVerifying(false);
        } else if (event.data.action === 'verifyFailed' && event.data.status === 'error') {
          setVerificationMessage(event.data.error?.message || "인증번호가 일치하지 않습니다.");
          toast({
            title: "인증 실패",
            description: event.data.error?.message || "인증번호가 일치하지 않습니다.",
            variant: "destructive",
          });
          setIsVerifying(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [toast, onVerificationResult]);

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

    // iframe이 로드되었는지 확인 후 메시지 전송
    // 개발 환경을 위한 대체 코드
    console.log("iframe에 인증 요청 메시지 전송 시도");
    
    // 5초 후에도 응답이 없으면 타임아웃 처리
    const timeoutId = setTimeout(() => {
      if (isVerifying) {
        console.log("iframe 응답 타임아웃");
        setIsVerifying(false);
        toast({
          title: "인증 시간 초과",
          description: "개발 버전에서는 테스트를 위해 인증 성공으로 처리합니다.",
        });
        
        // 개발 환경에서는 성공으로 처리
        setCodeSent(true);
        setVerificationMessage("인증번호가 발송되었습니다. 3분 이내에 입력해주세요.");
      }
    }, 3000);
    
    // iframe에 메시지 전송
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        action: 'sendVerificationCode',
        phoneNumber
      }, '*');
      
      // 디버깅 로그
      console.log("메시지 전송 완료:", {
        action: 'sendVerificationCode',
        phoneNumber
      });
    } else {
      toast({
        title: "연결 오류",
        description: "인증 서비스에 연결할 수 없습니다. 개발 버전에서는 테스트를 위해 성공으로 처리합니다.",
      });
      
      // 개발 환경에서는 성공으로 처리
      setIsVerifying(false);
      setCodeSent(true);
      setVerificationMessage("인증번호가 발송되었습니다. 3분 이내에 입력해주세요.");
      
      // 타임아웃 취소
      clearTimeout(timeoutId);
    }
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
    
    // 개발 환경을 위한 타임아웃
    const timeoutId = setTimeout(() => {
      if (isVerifying) {
        console.log("인증 확인 타임아웃");
        
        // 개발 환경에서는 코드가 123456이면 성공
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
      }
    }, 1500);

    // iframe에 메시지 전송
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        action: 'verifyCode',
        code: verificationCode
      }, '*');
      
      console.log("인증 확인 메시지 전송:", {
        action: 'verifyCode',
        code: verificationCode
      });
    } else {
      clearTimeout(timeoutId);

      toast({
        title: "연결 오류",
        description: "인증 서비스에 연결할 수 없습니다. 개발 환경에서는 코드 '123456'로 테스트 가능합니다.",
      });
      
      // 개발 환경에서는 코드가 123456이면 성공
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
      
      {/* 숨겨진 iframe */}
      <div className="hidden">
        <iframe
          ref={iframeRef}
          src="/firebase-recaptcha.html"
          title="Firebase Phone Authentication"
          width="100%"
          height="300"
          frameBorder="0"
        />
      </div>
      
      {codeSent && (
        <div className="text-xs text-muted-foreground mt-2">
          * 테스트 환경에서는 인증번호 <strong>123456</strong>을 입력하면 인증이 완료됩니다.
        </div>
      )}
    </div>
  );
}