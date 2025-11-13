import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    PaymentWidget: any;
  }
}

// 토스페이먼츠 결제 위젯 props 타입 정의
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

const TossPaymentWidget = ({
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
  const paymentContainerRef = useRef<HTMLDivElement>(null);
  const paymentMethodsContainerRef = useRef<HTMLDivElement>(null);
  const paymentButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Payment Widget 초기화
    const initPaymentWidget = async () => {
      try {
        // PaymentWidget이 로드될 때까지 대기 (최대 5초)
        const waitForPaymentWidget = () => {
          return new Promise<void>((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 최대 5초(100ms * 50)
            
            const checkPaymentWidget = () => {
              if (window.PaymentWidget) {
                console.log('PaymentWidget 객체 확인됨!');
                resolve();
              } else if (window.tossPaymentsScriptLoaded) {
                console.log('스크립트 로드는 완료되었지만 PaymentWidget 객체가 없음');
                
                // 스크립트를 다시 로드해보기
                const script = document.createElement('script');
                script.src = 'https://js.tosspayments.com/v1/payment-widget';
                script.async = false;
                document.head.appendChild(script);
                
                setTimeout(checkPaymentWidget, 100);
              } else if (attempts < maxAttempts) {
                attempts++;
                console.log(`PaymentWidget 로드 대기 중... (${attempts}/${maxAttempts})`);
                setTimeout(checkPaymentWidget, 100);
              } else {
                reject(new Error('PaymentWidget 로드 타임아웃'));
              }
            };
            
            checkPaymentWidget();
          });
        };

        try {
          await waitForPaymentWidget();
        } catch (error) {
          console.error('PaymentWidget 로드 실패:', error);
          // 스크립트를 직접 로드해보기
          const script = document.createElement('script');
          script.src = 'https://js.tosspayments.com/v1/payment-widget';
          script.async = false;
          
          // 스크립트 로드 완료 대기
          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = (e) => reject(e);
            document.head.appendChild(script);
          });
          
          // 한번 더 체크
          if (!window.PaymentWidget) {
            throw new Error('스크립트 수동 로드 후에도 PaymentWidget 객체가 없음');
          }
        }
        console.log('PaymentWidget 초기화 시작', 'window.PaymentWidget 존재 여부:', !!window.PaymentWidget);

        // 금액 변환 (문자열 -> 숫자)
        const amountNumber = typeof amount === 'string' ? parseInt(amount.replace(/,/g, '')) : amount;
        if (isNaN(amountNumber) || amountNumber <= 0) {
          throw new Error(`유효하지 않은 결제 금액: ${amount}`);
        }

        console.log(`결제 금액: ${amountNumber}원`, '모든 정보:', { 
          clientKey, customerKey, orderId, orderName, amount: amountNumber, 
          successUrl, failUrl, customerName, customerEmail 
        });

        // 결제 위젯 초기화 - 직접 ref 요소 사용
        const paymentMethodsElement = paymentMethodsContainerRef.current;
        if (!paymentMethodsElement) {
          throw new Error('결제 방법 컨테이너를 찾을 수 없습니다.');
        }

        const paymentWidget = window.PaymentWidget.renderPaymentMethods(
          paymentMethodsElement,
          { 
            value: amountNumber,
            currency: 'KRW',
            country: 'KR',
          },
          { 
            clientKey: clientKey,
            customerKey: customerKey
          }
        );

        // 결제 위젯 UI 렌더링
        await paymentWidget.readyToPayment();
        console.log('결제 위젯 준비 완료');

        // 결제하기 버튼 추가 - ref 사용
        const paymentButtonElement = paymentButtonRef.current;
        if (!paymentButtonElement) {
          throw new Error('결제 버튼 컨테이너를 찾을 수 없습니다.');
        }
        
        window.PaymentWidget.renderPaymentButton(
          paymentButtonElement, 
          { 
            textColor: '#ffffff', 
            backgroundColor: '#0A2463',
            borderRadius: '8px',
            hoverTextColor: '#ffffff', 
            hoverBackgroundColor: '#0E2E7C',
          }, 
          {
            orderId: orderId,
            orderName: orderName,
            customerName: customerName,
            customerEmail: customerEmail,
            successUrl: successUrl,
            failUrl: failUrl,
          }
        );

        // 준비 완료 이벤트 발생
        if (onReady) {
          onReady();
        }
      } catch (error) {
        console.error('토스페이먼츠 결제 위젯 초기화 에러:', error);
        if (onError) {
          onError(error as Error);
        }
      }
    };

    initPaymentWidget();
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
    <div ref={paymentContainerRef} className="payment-widget">
      <div ref={paymentMethodsContainerRef} id="payment-methods" className="payment-methods" style={{ width: '100%', marginBottom: '16px' }}></div>
      <div ref={paymentButtonRef} id="payment-button" className="payment-button" style={{ width: '100%', minHeight: '52px', cursor: 'pointer' }}></div>
    </div>
  );
};

export default TossPaymentWidget;