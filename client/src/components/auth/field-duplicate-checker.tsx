import React, { useState, useEffect, InputHTMLAttributes, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/queryClient';
import { debounce } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface FieldDuplicateCheckerProps extends InputHTMLAttributes<HTMLInputElement> {
  fieldName: 'username' | 'email' | 'phone' | 'businessNumber';
  fieldLabel: string;
  value?: string;
  onDuplicateCheck: (isDuplicate: boolean) => void;
  disabled?: boolean;
}

export const FieldDuplicateChecker = forwardRef<HTMLInputElement, FieldDuplicateCheckerProps>((
  {
    fieldName,
    fieldLabel,
    value,
    onDuplicateCheck,
    disabled = false,
    ...props
  }, 
  ref
) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [wasChecked, setWasChecked] = useState(false);
  const { toast } = useToast();

  // 사업자 등록번호 포맷팅
  const formatBusinessNumber = (input: string): string => {
    if (fieldName !== 'businessNumber') return input;
    
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
  
  // 입력이 변경될 때마다 중복 검사 상태 초기화
  useEffect(() => {
    if (wasChecked) {
      setIsDuplicate(false);
      setWasChecked(false);
      onDuplicateCheck(false);
    }
  }, [value]);

  // 디바운스 적용된 중복 검사 함수
  const checkDuplicate = debounce(async (value: string) => {
    if (!value || value.length < 3 || disabled) {
      setIsChecking(false);
      return;
    }

    try {
      setIsChecking(true);
      const response = await apiRequest('POST', '/api/check-duplicate', {
        field: fieldName,
        value
      });
      
      const data = await response.json();
      setIsDuplicate(data.exists);
      setWasChecked(true);
      onDuplicateCheck(data.exists);
      
      if (data.exists) {
        toast({
          title: "중복 확인",
          description: `이미 사용 중인 ${fieldLabel}입니다.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error(`${fieldLabel} 중복 확인 오류:`, error);
      toast({
        title: "오류",
        description: `${fieldLabel} 중복 확인 중 오류가 발생했습니다.`,
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  }, 500);

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value && value.length >= 3) {
      checkDuplicate(value);
    }
    
    if (props.onBlur) {
      props.onBlur(e);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 사업자 등록번호인 경우 자동 포맷팅 적용
    if (fieldName === 'businessNumber') {
      const formatted = formatBusinessNumber(e.target.value);
      e.target.value = formatted;
    }
    
    // 부모 컴포넌트의 onChange 호출
    if (props.onChange) {
      props.onChange(e);
    }
  };

  return (
    <div className="relative">
      <Input
        {...props}
        ref={ref}
        disabled={disabled || isChecking}
        onBlur={handleBlur}
        onChange={handleChange}
        className={`${
          wasChecked
            ? isDuplicate
              ? 'border-red-500 focus:ring-red-500'
              : 'border-green-500 focus:ring-green-500'
            : ''
        } ${props.className || ''}`}
      />
      
      {wasChecked && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isDuplicate ? (
            <span className="text-red-500 text-xs">사용 불가</span>
          ) : (
            <span className="text-green-500 text-xs">사용 가능</span>
          )}
        </div>
      )}
      
      {isChecking && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <span className="text-slate-500 text-xs">확인 중...</span>
        </div>
      )}
    </div>
  );
});