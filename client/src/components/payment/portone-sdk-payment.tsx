import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// 포트원 타입 정의 (window에 전역으로 추가됨)
declare global {
  interface Window {
    IMP?: any;
  }
}

/**
 * 포트원 SDK 결제 컴포넌트 타입
 */
interface PortOneSdkPaymentProps {
  bidId?: number;
  productName: string;
  amount: number;
  buyerInfo?: {
    name: string;
    phone: string;
    address: string;
    addressDetail?: string;
    email?: string;
  };
  recipientInfo?: {
    name: string;
    phone: string;
    address: string;
    addressDetail?: string;
    isSameAsBuyer?: boolean;
  };
  onPaymentSuccess?: (paymentKey: string, orderId: string, amount: string) => void;
  onPaymentFail?: (error: any) => void;
}

/**
 * 포트원 SDK 결제 컴포넌트
 * 포트원 JS SDK를 사용하여 리플릿 환경에서도 안정적으로 결제창을 열 수 있습니다.
 * API 대신 SDK 방식으로 변경하여 리플릿에서 발생하는 API 연결 문제를 우회합니다.
 */
export default function PortOneSdkPayment({ 
  bidId = 0, 
  productName, 
  amount, 
  buyerInfo = {
    name: '',
    phone: '',
    address: '',
    addressDetail: '',
    email: ''
  },
  recipientInfo,
  onPaymentSuccess, 
  onPaymentFail 
}: PortOneSdkPaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  
  // SDK 초기화 함수 - 스크립트가 로드된 후 IMP 초기화
  const initializeImp = () => {
    if (window.IMP) {
      // 포트원 가맹점 식별코드
      const merchantID = 'imp49910675';  // 포트원 가맹점 식별코드 (PG사 마크 아이디와는 별개)
      console.log(`포트원 SDK 초기화: ${merchantID}, 상점ID: MOI3204387`);
      window.IMP.init(merchantID);
      return true;
    }
    return false;
  };

  // 포트원 SDK 로드
  useEffect(() => {
    // 스크립트가 이미 로드되었는지 확인
    if (document.querySelector('script[src="https://cdn.iamport.kr/v1/iamport.js"]')) {
      console.log('포트원 스크립트가 이미 로드되어 있습니다.');
      const initialized = initializeImp();
      setScriptLoaded(initialized);
      return;
    }

    console.log('포트원 스크립트 로드 시작');
    // 스크립트 요소 생성
    const script = document.createElement('script');
    script.src = 'https://cdn.iamport.kr/v1/iamport.js';
    script.async = true;
    script.onload = () => {
      console.log('포트원 스크립트 로드 완료');
      setTimeout(() => {
        const initialized = initializeImp();
        console.log('포트원 SDK 초기화 완료 여부:', initialized);
        setScriptLoaded(initialized);
      }, 500); // 약간의 지연시간을 두어 스크립트가 완전히 로드된 후 초기화
    };
    script.onerror = (error) => {
      console.error('포트원 스크립트 로드 실패:', error);
      toast({
        title: '결제 모듈 로드 실패',
        description: '결제 기능을 사용할 수 없습니다. 페이지를 새로고침해주세요.',
        variant: 'destructive'
      });
    };

    // 문서에 스크립트 추가
    document.head.appendChild(script);

    // 컴포넌트 언마운트시 클린업
    return () => {
      // 필요한 경우 클린업 코드 추가
    };
  }, [toast]);

  /**
   * 결제 완료 콜백 처리 함수
   */
  const handlePaymentComplete = (response: any) => {
    const { success, error_msg, imp_uid, merchant_uid, paid_amount } = response;
    setIsLoading(false);
    
    if (success) {
      console.log('결제 성공:', response);
      toast({
        title: '결제 성공',
        description: `금액: ${Number(paid_amount).toLocaleString()}원`,
      });
      
      // 성공 콜백 호출
      if (onPaymentSuccess) {
        onPaymentSuccess(imp_uid, merchant_uid, paid_amount.toString());
      }
    } else {
      console.error('결제 실패:', error_msg);
      toast({
        title: '결제 실패',
        description: error_msg || '결제 처리 중 오류가 발생했습니다',
        variant: 'destructive',
      });
      
      // 실패 콜백 호출
      if (onPaymentFail) {
        onPaymentFail({ message: error_msg });
      }
    }
  };
  
  /**
   * 결제 처리 함수
   */
  const handlePayment = async () => {
    setIsLoading(true);
    
    try {
      // SDK가 로드되지 않은 경우
      if (!scriptLoaded || !window.IMP) {
        // SDK 다시 초기화 시도
        if (window.IMP) {
          initializeImp();
        } else {
          throw new Error('결제 모듈이 로드되지 않았습니다. 페이지를 새로고침해주세요.');
        }
      }
      
      // 필수 값 확인
      if (!bidId) {
        throw new Error('입찰 ID가 없습니다.');
      }
      
      // 주문 ID 생성 (고유 ID)
      const now = new Date();
      const timestamp = now.getTime();
      const random = Math.random().toString(36).substring(2, 8);
      const merchantUid = `order_${timestamp}_${random}`;
      
      // 결제 준비 알림
      toast({
        title: "결제 준비 중",
        description: `${productName} - ${amount.toLocaleString()}원`,
        duration: 2000
      });
      
      // 대화 ID 가져오기 (URL 쿼리에서)
      const urlParams = new URLSearchParams(window.location.search);
      const conversationId = urlParams.get('conversation');
      
      if (!conversationId) {
        throw new Error('대화 ID를 찾을 수 없습니다. 대화 페이지에서 결제해주세요.');
      }
      
      // 서버에 주문 등록
      console.log('주문 등록 요청:', {
        vendorId: bidId,
        productId: 1,
        price: amount,
        conversationId,
        orderId: merchantUid,
        productName
      });
      
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          vendorId: bidId,
          productId: 1,
          price: amount,
          conversationId: Number(conversationId),
          orderId: merchantUid,
          productName,
          buyerInfo,
          recipientInfo,
        }),
      });
      
      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(`주문 생성 오류: ${errorData.error || '알 수 없는 오류'}`);
      }
      
      const orderResult = await orderResponse.json();
      console.log('주문 생성 결과:', orderResult);
      
      // 포트원 SDK가 있는지 재확인
      if (!window.IMP) {
        throw new Error('포트원 SDK가 로드되지 않았습니다. 페이지를 새로고침해주세요.');
      }
      
      // 결제창 열기 전에 SDK 재초기화
      window.IMP.init('imp49910675');
      
      console.log('결제창 열기:', {
        pg: 'inicis.MOI3204387',  // KG이니시스 + 상점 아이디 지정 (이니시스 기본값 사용)
        pay_method: 'card',
        merchant_uid: merchantUid,
        name: productName,
        amount: amount,
        buyer_email: buyerInfo.email || 'customer@example.com',
        buyer_name: buyerInfo.name,
        buyer_tel: buyerInfo.phone,
        buyer_addr: buyerInfo.address
      });
      
      // 결제창 호출
      window.IMP.request_pay({
        pg: 'inicis.MOI3204387',  // KG이니시스 + 상점 아이디 지정 (기본형 사용)
        pay_method: 'card',
        merchant_uid: merchantUid,
        name: productName,
        amount: amount,
        buyer_email: buyerInfo.email || 'customer@example.com',
        buyer_name: buyerInfo.name || '구매자',
        buyer_tel: buyerInfo.phone || '01012341234',
        buyer_addr: (buyerInfo.address + (buyerInfo.addressDetail ? ` ${buyerInfo.addressDetail}` : '')) || '서울시',
        buyer_postcode: '123456',
        m_redirect_url: `${window.location.origin}/payment/success`
      }, handlePaymentComplete);
      
    } catch (error) {
      console.error('결제 처리 오류:', error);
      setIsLoading(false);
      
      toast({
        title: '결제 오류',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
        variant: 'destructive',
        duration: 3000
      });
      
      if (onPaymentFail) {
        onPaymentFail(error);
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button 
        className="w-full" 
        onClick={handlePayment}
        disabled={isLoading || !scriptLoaded}
        variant="default"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            결제 처리 중...
          </>
        ) : !scriptLoaded ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            결제 모듈 로드 중...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            카드 결제 진행
          </>
        )}
      </Button>
    </div>
  );
}
