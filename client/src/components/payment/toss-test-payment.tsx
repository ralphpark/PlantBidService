/**
 * 토스페이먼츠 전용 테스트 결제 컴포넌트
 * 문제 해결에 집중하여 간소화된 버전
 */
import React, { useEffect, useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// 포트원 V1 (iamport) 타입 정의
declare global {
  interface Window {
    IMP?: {
      init: (merchantID: string) => void;
      request_pay: (params: any, callback: (response: any) => void) => void;
      [key: string]: any; // 추가 속성 지원
    };
  }
}

// 테스트 결제 컴포넌트 props
interface TossTestPaymentProps {
  productName: string;
  amount: number;
  onSuccess?: (response: any) => void;
  onFail?: (error: any) => void;
}

export default function TossTestPayment({
  productName,
  amount,
  onSuccess,
  onFail
}: TossTestPaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const { toast } = useToast();
  const sdkLoaded = useRef(false);

  // 포트원 SDK 로드 함수
  const loadPortOneSDK = () => {
    return new Promise<void>((resolve, reject) => {
      try {
        // 기존 SDK 제거
        const existingScript = document.querySelector('script[src*="iamport.payment"]');
        if (existingScript) {
          existingScript.remove();
          console.log('기존 SDK 제거됨');
        }

        // 전역 객체 초기화
        if (window.IMP) window.IMP = undefined;

        // 새 스크립트 생성
        const script = document.createElement('script');
        script.src = 'https://cdn.iamport.kr/js/iamport.payment-1.2.0.js';
        script.async = true;

        script.onload = () => {
          console.log('포트원 SDK 로드 성공');
          
          if (window.IMP) {
            // 순수 토스페이먼츠 설정만 사용
            window.IMP.init('iamporttest_3');
            window.IMP.agency = 'tosspayments';
            window.IMP.pg = 'tosspayments.iamporttest_3';
            
            // 추가 설정 시도 (html5_inicis 제거 시도)
            try {
              delete (window.IMP as any).PG;
              (window.IMP as any).PG_PROVIDERS = ['tosspayments'];
              (window.IMP as any).PG_PROVIDER = 'tosspayments';
            } catch (err) {
              console.error('추가 설정 실패:', err);
            }
            
            console.log('SDK 초기화 완료:', window.IMP.pg);
            resolve();
          } else {
            console.error('SDK 로드 실패: IMP 객체가 없음');
            reject(new Error('SDK 로드 실패'));
          }
        };

        script.onerror = () => {
          console.error('SDK 로드 실패');
          reject(new Error('SDK 로드 실패'));
        };

        document.head.appendChild(script);
      } catch (error) {
        console.error('SDK 로드 중 오류:', error);
        reject(error);
      }
    });
  };

  // SDK 초기화
  useEffect(() => {
    if (sdkLoaded.current) return;
    
    setIsLoading(true);
    loadPortOneSDK()
      .then(() => {
        sdkLoaded.current = true;
        setIsReady(true);
      })
      .catch(error => {
        console.error('SDK 초기화 실패:', error);
        toast({
          title: 'SDK 초기화 실패',
          description: '결제모듈을 초기화하지 못했습니다. 페이지를 새로고침 해주세요.',
          variant: 'destructive'
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
      
    // Cleanup
    return () => {
      // 페이지 이동 시 IMP 객체 정리
    };
  }, [toast]);

  // 결제 처리 함수
  const handlePayment = () => {
    if (!window.IMP) {
      toast({
        title: '결제모듈 오류',
        description: '결제모듈이 초기화되지 않았습니다. 페이지를 새로고침 해주세요.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      const merchantUid = `mid_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      // 토스페이먼츠 전용 설정 재적용
      window.IMP.init('iamporttest_3');
      window.IMP.agency = 'tosspayments';
      window.IMP.pg = 'tosspayments.iamporttest_3';

      const payParams = {
        pg: 'tosspayments.iamporttest_3',
        pay_method: 'card',
        merchant_uid: merchantUid,
        name: productName,
        amount: amount,
        buyer_email: 'test@example.com',
        buyer_name: '테스트 구매자',
        buyer_tel: '010-1234-5678',
        m_redirect_url: `${window.location.origin}/payment/success`
      };

      console.log('결제 요청 파라미터:', payParams);

      // 결제창 호출
      window.IMP.request_pay(payParams, function(response) {
        setIsLoading(false);
        
        if (response.success) {
          console.log('결제 성공:', response);
          toast({
            title: '결제 성공',
            description: `결제금액: ${response.paid_amount.toLocaleString()}원\n주문번호: ${response.merchant_uid}`
          });
          
          if (onSuccess) onSuccess(response);
        } else {
          console.error('결제 실패:', response);
          toast({
            title: '결제 실패',
            description: response.error_msg || '결제 처리 중 오류가 발생했습니다.',
            variant: 'destructive'
          });
          
          if (onFail) onFail(response);
        }
      });
    } catch (error) {
      console.error('결제 요청 오류:', error);
      toast({
        title: '결제 오류',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive'
      });
      setIsLoading(false);
      
      if (onFail) onFail(error);
    }
  };

  return (
    <Button
      className="w-full"
      onClick={handlePayment}
      disabled={isLoading || !isReady}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          처리 중...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-4 w-4" />
          테스트 결제 ({amount.toLocaleString()}원)
        </>
      )}
    </Button>
  );
}
