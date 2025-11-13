import React, { useState, useEffect } from 'react';
type PaymentSuccessCallback = (paymentId: string, orderId: string, amount: string) => void;
type PaymentFailCallback = (error: any) => void;
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * 포트원 V2 API를 사용한 결제 컴포넌트 인터페이스
 */
interface PortOneV2PaymentProps {
  bidId: number;
  amount: number;
  productName: string;
  buyerInfo: {
    name: string;
    email?: string;
    phone: string;
    address: string;
    addressDetail?: string;
    zipCode?: string;
  };
  recipientInfo: {
    name: string;
    phone: string;
    address: string;
    addressDetail?: string;
    zipCode?: string;
  };
  onPaymentSuccess?: (paymentId: string, orderId: string, amount: string) => void;
  onPaymentFail?: (error: any) => void;
}

/**
 * 포트원 V2 API를 사용한 결제 컴포넌트
 * - 서버 사이드 API 호출 방식
 * - CSP 제한을 회피하기 위한 구현
 */
export function PortOneV2Payment({
  bidId,
  amount,
  productName,
  buyerInfo,
  recipientInfo,
  onPaymentSuccess,
  onPaymentFail
}: PortOneV2PaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [messageListener, setMessageListener] = useState<((event: MessageEvent) => void) | null>(null);

  // 결제 완료 메시지 리스너 설정
  useEffect(() => {
    // 기존 리스너 정리
    if (messageListener) {
      window.removeEventListener('message', messageListener);
    }

    // 새 리스너 생성
    const listener = (event: MessageEvent) => {
      // 출처 검증 - null 체크 추가
      if (!event || !event.origin || event.origin !== window.location.origin) return;

      const data = event.data;
      if (!data) return;
      
      console.log('결제 창으로부터 메시지 수신:', data);

      // 결제 성공 메시지 처리
      if (data && data.type === 'PAYMENT_SUCCESS') {
        setIsLoading(false);
        toast({
          title: '결제 성공',
          description: `${productName} - ${Number(data.amount).toLocaleString()}원`,
        });

        // 성공 콜백 호출
        if (onPaymentSuccess) {
          onPaymentSuccess(data.paymentKey, data.orderId, data.amount.toString());
        }
      }

      // 결제 실패 메시지 처리
      else if (data && data.type === 'PAYMENT_FAIL') {
        setIsLoading(false);
        toast({
          title: '결제 실패',
          description: data.message || '결제 처리 중 오류가 발생했습니다',
          variant: 'destructive',
        });

        // 실패 콜백 호출
        if (onPaymentFail) {
          onPaymentFail({ message: data.message });
        }
      }
    };

    // 리스너 등록
    window.addEventListener('message', listener);
    setMessageListener(listener);

    // 컴포넌트 언마운트시 정리
    return () => {
      window.removeEventListener('message', listener);
    };
  }, [onPaymentSuccess, onPaymentFail, productName, toast]);

  /**
   * 결제 처리 함수
   */
  const handlePayment = async () => {
    setIsLoading(true);

    try {
      // 필수 값 확인
      if (!bidId) {
        throw new Error('입찰 ID가 없습니다.');
      }

      // 주문 ID 생성 (고유 ID)
      const now = new Date();
      const timestamp = now.getTime();
      const random = Math.random().toString(36).substring(2, 8);
      const orderId = `order_${timestamp}_${random}`;

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

      // 서버에 결제 준비 요청
      // 고정된 상점 식별자 (MID) 추가
      const merchantId = "MOI3204387"; // 고정된 상점 ID
      
      console.log('서버에 결제 준비 요청:', {
        bidId,
        orderId,
        productName,
        amount,
        buyerInfo,
        recipientInfo,
        conversationId,
        merchantId // MID 추가
      });

      const prepareResponse = await fetch('/api/payments/portone-prepare-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 세션 쿠키 포함
        body: JSON.stringify({
          bidId,
          orderId,
          productName,
          amount,
          buyerInfo,
          recipientInfo,
          conversationId: Number(conversationId),
          merchantId // MID 추가
        }),
      });

      if (!prepareResponse.ok) {
        const errorData = await prepareResponse.json();
        throw new Error(`결제 준비 오류: ${errorData.error || '알 수 없는 오류'}`);
      }

      const paymentData = await prepareResponse.json();
      console.log('결제 준비 응답:', paymentData);

      // 결제 URL 확인
      if (!paymentData.url) {
        throw new Error('결제 URL을 받지 못했습니다.');
      }

      // 팝업 창으로 결제 페이지 열기
      const paymentWindow = window.open(
        paymentData.url,
        'PortOnePayment',
        'width=500,height=700,resizable=yes,scrollbars=yes'
      );

      if (!paymentWindow) {
        throw new Error('결제창을 열 수 없습니다. 팝업 차단을 확인해주세요.');
      }

      // 팝업 창 상태 체크 인터벌 설정
      const checkInterval = setInterval(() => {
        if (paymentWindow.closed) {
          clearInterval(checkInterval);
          setIsLoading(false);
          console.log('사용자가 결제창을 닫았습니다.');
        }
      }, 500);

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
        disabled={isLoading}
        variant="default"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            결제 처리 중...
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
