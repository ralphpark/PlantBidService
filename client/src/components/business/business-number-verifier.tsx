import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle, Loader2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// 비즈니스 정보 인터페이스
interface BusinessInfo {
  status: string;         // 사업자 상태 (계속사업자, 휴업자, 폐업자 등)
  taxType: string;        // 과세 유형 (부가가치세 일반과세자 등)
  validBusiness: boolean; // 유효한 사업자 여부
  endDate?: string;       // 폐업 날짜 (해당 시)
}

interface BusinessNumberVerifierProps {
  value: string | undefined;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onVerificationResult: (isVerified: boolean) => void;
}

export default function BusinessNumberVerifier({ 
  value, 
  onChange,
  onVerificationResult 
}: BusinessNumberVerifierProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const { toast } = useToast();

  // 사업자 등록번호 형식 검증 (정규식)
  const isValidFormat = (number: string | undefined) => {
    if (!number) return false;
    
    // 하이픈을 제외한 숫자만 추출
    const digitsOnly = number.replace(/[^0-9]/g, '');
    
    // 정확히 10자리인지 확인
    if (digitsOnly.length !== 10) return false;
    
    // 정규식 형식 검증 (필요시)
    const regex = /^[0-9]{3}-[0-9]{2}-[0-9]{5}$/;
    
    // 두 가지 방식으로 검증
    return regex.test(number) || digitsOnly.length === 10;
  };

  // 사업자 등록번호 자동 하이픈 추가
  const formatBusinessNumber = (input: string) => {
    // 숫자만 추출
    const numbers = input.replace(/[^0-9]/g, '');
    
    // 최대 10자리로 제한
    const trimmed = numbers.slice(0, 10);
    
    // 하이픈 추가 (3-2-5 형식)
    if (trimmed.length <= 3) {
      return trimmed;
    } else if (trimmed.length <= 5) {
      return `${trimmed.slice(0, 3)}-${trimmed.slice(3)}`;
    } else {
      return `${trimmed.slice(0, 3)}-${trimmed.slice(3, 5)}-${trimmed.slice(5)}`;
    }
  };

  // 입력값 변경 핸들러 (하이픈 자동 추가)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatBusinessNumber(e.target.value);
    
    // 원래 input 요소의 value를 변경하여 커서 위치를 유지
    e.target.value = formatted;
    
    // 부모 컴포넌트의 onChange 호출
    onChange(e);
    
    // 변경 시 검증 상태 초기화
    if (isVerified) {
      setIsVerified(false);
      setVerificationMessage(null);
      setBusinessInfo(null);
      onVerificationResult(false);
    }
  };

  // 검증 버튼 클릭 핸들러
  const handleVerify = async () => {
    const businessNumber = value || '';
    
    if (!businessNumber) {
      toast({
        title: "검증 실패",
        description: "사업자 등록번호를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!isValidFormat(businessNumber)) {
      toast({
        title: "형식 오류",
        description: "올바른 사업자 등록번호 형식이 아닙니다. (예: 123-45-67890)",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    setVerificationMessage(null);

    try {
      const response = await fetch('/api/verify-business', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ businessNumber }),
      });

      const result = await response.json();

      setIsVerified(result.success);
      setVerificationMessage(result.message);
      setBusinessInfo(result.businessInfo || null);
      onVerificationResult(result.success);

      if (result.success) {
        toast({
          title: "검증 성공",
          description: "유효한 사업자 등록번호입니다.",
        });
      } else {
        toast({
          title: "검증 실패",
          description: result.message || "유효하지 않은 사업자 등록번호입니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('사업자 번호 검증 오류:', error);
      setVerificationMessage("검증 중 오류가 발생했습니다. 다시 시도해주세요.");
      toast({
        title: "검증 오류",
        description: "사업자 등록번호 검증 중 오류가 발생했습니다.",
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
        {isVerified && (
          <CheckCircle className="h-5 w-5 text-green-500" />
        )}
        <Button 
          type="button"
          onClick={handleVerify}
          disabled={isVerifying || !value || value.length < 8}
          className="whitespace-nowrap"
        >
          {isVerifying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              검증 중
            </>
          ) : (
            "번호 검증"
          )}
        </Button>
      </div>
      
      {verificationMessage && (
        <div className={`text-sm flex items-center ${isVerified ? 'text-green-600' : 'text-red-600'}`}>
          {isVerified ? (
            <CheckCircle className="h-4 w-4 mr-1" />
          ) : (
            <AlertCircle className="h-4 w-4 mr-1" />
          )}
          {verificationMessage}
        </div>
      )}
      {businessInfo && isVerified && (
        <div className="text-sm bg-slate-50 p-2 rounded border border-green-200">
          <div className="flex items-center text-slate-700 mb-1">
            <Info className="h-4 w-4 mr-2 text-slate-500" />
            <span className="font-medium">사업자 정보</span>
          </div>
          <div className="grid grid-cols-2 gap-x-2 text-xs">
            <div className="text-slate-500">사업자 상태:</div>
            <div className="text-slate-900 font-medium">{businessInfo.status}</div>
            
            <div className="text-slate-500">과세 유형:</div>
            <div className="text-slate-900 font-medium">{businessInfo.taxType}</div>
            
            {businessInfo.endDate && (
              <>
                <div className="text-slate-500">폐업일:</div>
                <div className="text-slate-900 font-medium">{businessInfo.endDate}</div>
              </>
            )}
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        사업자 등록번호는 국세청에 등록된 사업자 정보와 대조하여 검증됩니다.
      </p>
    </div>
  );
}