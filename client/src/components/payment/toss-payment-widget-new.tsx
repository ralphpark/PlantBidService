import { useEffect, useRef, useState } from 'react';

// 토스페이먼츠 타입 선언
declare global {
  interface Window {
    PaymentWidget: any;
  }
}

// 토스페이먼츠 결제 위젯 Props 타입 정의
interface TossPaymentWidgetProps {
  clientKey: string;
  customerKey: string;
  orderId: string;
  orderName: string;
  amount: string | number;
  successUrl: string;
  failUrl: string;
  customerName?: string;
  customerEmail?: string;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

/**
 * 토스페이먼츠 결제 위젯 컴포넌트
 * @description https://docs.tosspayments.com/guides/payment-widget/integration
 * 공식 문서의 예제를 따라 완전히 새로 작성
 */
const TossPaymentWidgetNew = ({
  clientKey,
  customerKey,
  orderId,
  orderName,
  amount,
  successUrl,
  failUrl,
  customerName,
  customerEmail,
  onReady,
  onError
}: TossPaymentWidgetProps) => {
  // 고유 ID 생성 (페이지에 여러 위젯이 있을 경우 충돌 방지)
  const uniqueId = useRef(`toss-${Math.random().toString(36).substring(2, 9)}`);
  const paymentMethodsId = `payment-methods-${uniqueId.current}`;
  const paymentButtonId = `payment-button-${uniqueId.current}`;
  
  // 결제 금액 계산
  const getAmountValue = () => {
    const amountNumber = typeof amount === 'string' ? parseInt(amount.replace(/,/g, '')) : amount;
    if (isNaN(amountNumber) || amountNumber <= 0) {
      console.error(`유효하지 않은 결제 금액: ${amount}`);
      return 0;
    }
    return amountNumber;
  };
  
  useEffect(() => {
    // 스크립트 로드 함수
    const loadPaymentWidget = async () => {
      try {
        // 이미 로드된 스크립트가 있는지 확인
        if (!document.querySelector('script[src="https://js.tosspayments.com/v1/payment-widget"]')) {
          // 스크립트 로드
          const script = document.createElement('script');
          script.src = 'https://js.tosspayments.com/v1/payment-widget';
          script.async = true;
          document.head.appendChild(script);
          
          // 스크립트 로드 완료 대기
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
          });
        }
        
        // PaymentWidget 객체가 로드될 때까지 기다림
        let retries = 0;
        while (!window.PaymentWidget && retries < 20) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }
        
        if (!window.PaymentWidget) {
          throw new Error('PaymentWidget을 찾을 수 없습니다.');
        }
        
        // 결제 금액 확인
        const amountValue = getAmountValue();
        if (amountValue <= 0) {
          throw new Error(`유효하지 않은 금액: ${amount}`);
        }
        
        // 결제 위젯 초기화
        const paymentWidget = window.PaymentWidget(clientKey, customerKey);
        
        // 결제 수단 UI 렌더링
        paymentWidget.renderPaymentMethods(`#${paymentMethodsId}`, {
          value: amountValue,
          currency: 'KRW',
        });
        
        // 결제 버튼 렌더링
        paymentWidget.renderPaymentButton(`#${paymentButtonId}`, {
          theme: 'primary',
          borderRadius: '8px',
        }, {
          orderId: orderId,
          orderName: orderName,
          customerName: customerName,
          customerEmail: customerEmail,
          successUrl: successUrl,
          failUrl: failUrl,
        });
        
        console.log('토스페이먼츠 결제 위젯 렌더링 완료');
        if (onReady) onReady();
      } catch (error) {
        console.error('토스페이먼츠 결제 위젯 초기화 오류:', error);
        if (onError) onError(error as Error);
      }
    };
    
    // 컴포넌트 마운트 시 실행
    const timerId = setTimeout(() => {
      loadPaymentWidget();
    }, 100);
    
    // 컴포넌트 언마운트 시 정리
    return () => {
      clearTimeout(timerId);
    };
  }, [
    clientKey, 
    customerKey, 
    orderId, 
    orderName, 
    amount, 
    successUrl, 
    failUrl, 
    customerName, 
    customerEmail, 
    onReady, 
    onError
  ]);
  
  return (
    <div className="toss-payment-widget">
      <div id={paymentMethodsId} style={{ marginBottom: '1rem' }}></div>
      <div id={paymentButtonId} style={{ width: '100%', height: '48px' }}></div>
    </div>
  );
};

export default TossPaymentWidgetNew;