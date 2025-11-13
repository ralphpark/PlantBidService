import React, { useEffect, useState } from 'react';
import { Progress } from "@/components/ui/progress";
import { cn } from '@/lib/utils';

interface PasswordStrengthProps {
  password: string;
}

export interface PasswordValidation {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export function validatePassword(password: string): PasswordValidation {
  return {
    hasMinLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
}

export function calculateStrength(validation: PasswordValidation): number {
  const { hasMinLength, hasUppercase, hasNumber, hasSpecialChar } = validation;
  const criteria = [hasMinLength, hasUppercase, hasNumber, hasSpecialChar];
  return criteria.filter(Boolean).length;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const [strength, setStrength] = useState(0);
  const [validation, setValidation] = useState<PasswordValidation>({
    hasMinLength: false,
    hasUppercase: false,
    hasNumber: false, 
    hasSpecialChar: false
  });

  useEffect(() => {
    if (!password) {
      setStrength(0);
      setValidation({
        hasMinLength: false,
        hasUppercase: false,
        hasNumber: false,
        hasSpecialChar: false
      });
      return;
    }

    const validationResult = validatePassword(password);
    setValidation(validationResult);
    setStrength(calculateStrength(validationResult));
  }, [password]);

  // 강도에 따른 색상 및 라벨
  const getStrengthColor = () => {
    if (strength === 0) return 'bg-slate-200';
    if (strength === 1) return 'bg-red-500';
    if (strength === 2) return 'bg-orange-500';
    if (strength === 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = () => {
    if (strength === 0) return '비밀번호를 입력하세요';
    if (strength === 1) return '매우 취약';
    if (strength === 2) return '취약';
    if (strength === 3) return '적정';
    return '안전';
  };

  return (
    <div className="space-y-2">
      <Progress value={strength * 25} className={cn("h-2", getStrengthColor())} />
      
      <div className="text-xs flex justify-between">
        <span className={cn(
          "font-medium",
          strength === 0 ? "text-slate-500" :
          strength === 1 ? "text-red-500" :
          strength === 2 ? "text-orange-500" :
          strength === 3 ? "text-yellow-500" :
          "text-green-500"
        )}>
          {getStrengthLabel()}
        </span>
        
        <span className="text-slate-500">
          {strength}/4
        </span>
      </div>
      
      <ul className="text-xs space-y-1 mt-2">
        <li className={validation.hasMinLength ? "text-green-500" : "text-slate-500"}>
          ✓ 최소 8자 이상
        </li>
        <li className={validation.hasUppercase ? "text-green-500" : "text-slate-500"}>
          ✓ 대문자 포함
        </li>
        <li className={validation.hasNumber ? "text-green-500" : "text-slate-500"}>
          ✓ 숫자 포함
        </li>
        <li className={validation.hasSpecialChar ? "text-green-500" : "text-slate-500"}>
          ✓ 특수문자 포함
        </li>
      </ul>
    </div>
  );
}