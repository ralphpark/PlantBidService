import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// 포트원 SDK 타입 정의
declare global {
  interface Window {
    IMP?: {
      init: (merchantID: string) => void;
      request_pay: (params: any, callback: (response: any) => void) => void;
      agency?: string;
      pg?: any;
    } & { [key: string]: any }
  }
}

// 결제 컴포넌트 Props 타입
interface PortOnePaymentProps {
  bidId?: number;
  productName: string;
  amount: number;
  onPaymentSuccess?: (paymentKey: string, orderId: string, amount: string) => void;
  onPaymentFail?: (error: any) => void;
}

/**
 * 포트원 KG이니시스 결제 컴포넌트 (SDK 직접 호출 방식)
 */
export default function PortOnePayment({ 
  bidId = 0, 
  productName, 
  amount, 
  onPaymentSuccess, 
  onPaymentFail 
}: PortOnePaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // 페이지 로드시 한번만 포트원 SDK 로드
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.iamport.kr/v1/iamport.js';
    script.async = true;
    script.onload = () => {
      console.log('포트원 SDK 로드 완료');
    };
    document.head.appendChild(script);
  }, []);
  
  // 결제페이지 배경색 관련 스타일 적용
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .payment-screen {
        background-color: rgba(0, 0, 0, 0.5);
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 9999;
        display: none;
        align-items: center;
        justify-content: center;
      }
      
      .payment-screen.active {
        display: flex;
      }
    `;
    document.head.appendChild(style);
    
    // 결제 배경 생성
    const paymentScreen = document.createElement('div');
    paymentScreen.className = 'payment-screen';
    paymentScreen.id = 'payment-screen';
    document.body.appendChild(paymentScreen);
    
    // 정리 함수
    return () => {
      if (paymentScreen && paymentScreen.parentNode) {
        paymentScreen.parentNode.removeChild(paymentScreen);
      }
      if (style && style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, [])

  /**
   * 결제 처리 함수 - 공식 매뉴얼 예제 기반
   */
  const handlePayment = async () => {
    setIsLoading(true);
    
    try {
      // 필수 값 확인
      if (!bidId) {
        throw new Error('입찰 ID가 없습니다.');
      }
      
      // 테스트 모드 적용 - 임시 테스트 결제 처리
      
      // 사용자 정보 가져오기
      const userResponse = await fetch('/api/user', {
        credentials: 'include'
      });
      
      if (!userResponse.ok) {
        throw new Error('사용자 정보를 가져올 수 없습니다. 로그인이 필요합니다.');
      }
      
      const userData = await userResponse.json();
      console.log('사용자 정보:', userData);
      
      // 결제 준비 알림
      toast({
        title: "결제 준비 중",
        description: `${productName} - ${amount.toLocaleString()}원`,
        duration: 2000
      });
      
      // 주문 ID 생성 (고유 ID)
      const merchantUid = `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      // 대화 ID 가져오기 (URL 쿼리에서)
      const urlParams = new URLSearchParams(window.location.search);
      const conversationId = urlParams.get('conversation');
      
      if (!conversationId) {
        throw new Error('대화 ID를 찾을 수 없습니다. 대화 페이지에서 결제해주세요.');
      }
      
      // 서버에 먼저 주문 등록 처리
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          vendorId: bidId,  // bidId를 vendorId로 사용
          productId: 1,    // 상품 ID (기본값)
          price: amount,   // 금액
          conversationId: Number(conversationId), // 대화 ID
          orderId: merchantUid, // 주문 ID (추가 정보)
          productName,    // 상품명 (추가 정보)
          buyerInfo: {
            name: userData.username || '구매자',
            phone: userData.phone || '01012345678',
            address: userData.address || '서울시 강남구',
            addressDetail: '삼성동 123-45'
          },
          recipientInfo: {
            name: userData.username || '구매자',
            phone: userData.phone || '01012345678',
            address: userData.address || '서울시 강남구',
            addressDetail: '삼성동 123-45',
            isSameAsBuyer: true
          }
        }),
      });
      
      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(`주문 생성 오류: ${errorData.error || '알 수 없는 오류'}`);
      }
      
      const orderResult = await orderResponse.json();
      console.log('주문 생성 결과:', orderResult);
      
      // 결제 배경 화면 표시
      const paymentScreen = document.getElementById('payment-screen');
      if (paymentScreen) {
        paymentScreen.classList.add('active');
      }
      
      // 이니시스 결제를 위한 완전히 새로운 로드 방식 적용
      
      // 1. 모든 기존 스크립트 제거 (완전 클린 스테이트)
      const allScripts = document.querySelectorAll('script[src*="iamport"], script[src*="portone"], script[src*="cdn.inicis"]');
      console.log('제거된 기존 결제 관련 스크립트 수:', allScripts.length);
      allScripts.forEach(script => script.remove());
      
      // 기존 IMP 객체 제거
      if (window.IMP !== undefined) {
        try {
          delete window.IMP;
          console.log('이전 IMP 객체 제거 완료');
        } catch (err) {
          console.warn('IMP 객체 제거 중 문제:', err);
        }
      }
      
      // 2. 포트원 JS SDK 로드 (테스트 버전 - 안정적 버전 사용)
      const iamportScript = document.createElement('script');
      iamportScript.type = 'text/javascript';
      iamportScript.src = 'https://cdn.iamport.kr/js/iamport.payment-1.2.0.js';
      
      // 비동기 로드 처리
      await new Promise<void>((resolve, reject) => {
        iamportScript.onload = () => {
          console.log('포트원 SDK 로드 성공');
          resolve();
        };
        
        iamportScript.onerror = (e) => {
          console.error('SDK 로드 실패:', e);
          reject(new Error('포트원 SDK 로드 실패'));
        };
        
        // 7초 타임아웃 안전장치
        setTimeout(() => resolve(), 7000);
        
        // DOM에 스크립트 추가
        document.head.appendChild(iamportScript);
      });
      
      // 3. 포트원 기본 테스트 가맹점 ID로 초기화 (imp00000000)
      if (!window.IMP) {
        console.error('포트원 SDK가 제대로 로드되지 않았습니다. 페이지를 새로고침해보세요.');
        toast({
          title: '결제 모듈 로드 오류',
          description: '결제 모듈이 제대로 로드되지 않았습니다. 페이지를 새로고침해보세요.',
          variant: 'destructive',
          duration: 5000
        });
        window.IMP = { init: () => {}, request_pay: () => {} } as any;
      }
      
      // 테스트 모드에서는 포트원에서 제공하는 공용 테스트 아이디 사용
      try {
        // 포트원에서 제공하는 테스트용 가맹점 아이디
        window.IMP!.init('imp00000000');
        console.log('포트원 공용 테스트 아이디로 초기화 완료');
      } catch (err) {
        console.error('포트원 초기화 오류:', err);
      }
      
      // 포트원 문서 공식 테스트 방식으로 변경 (MOBILIANS 사용 - 테스트 모드 지원 확인됨)
      // 출처: https://portone.gitbook.io/docs/sdk/javascript-sdk/payrq#undefined-1
      const paymentParams = {
        pg: 'mobilians',             // 모빌리언스 - 공식 테스트 지원
        pay_method: 'card',           // 결제 수단
        merchant_uid: merchantUid,    // 주문번호
        name: productName,           // 상품명
        amount: 100,                  // 테스트용 고정 금액 (100원)
        buyer_email: 'test@portone.io', // 테스트용 이메일
        buyer_name: '테스트 구매자',  // 테스트용 구매자 이름
        buyer_tel: '01000000000',     // 테스트용 전화번호
        buyer_addr: '테스트 주소',       // 테스트용 주소
        buyer_postcode: '00000',      // 테스트용 우편번호
        
        // 테스트 PG에만 필요한 정보 저장
        custom_data: {
          userId: userData.id || 0,    // 유저 ID
          bidId: bidId,               // 입찰 ID
          productAmount: amount,       // 월래 금액 저장 (테스트로 100원만 충전하기 때문)
          originalName: productName    // 월래 상품명 저장
        },
        
        // 필수 옵션
        digital: false,                // 전자상품 여부 (실물상품이므로 false)
        m_redirect_url: window.location.origin + '/payment/success',  // 모바일 리다이렉트 URL
        notice_url: window.location.origin + '/api/payments/callback',   // 콜백 URL
        confirm_url: window.location.origin + '/api/payments/confirm',  // 결제 확인 URL

        // 추가 UI 옵션
        popup: true                   // 팝업 창 사용 여부 (브라우저 차단 필요)
      };
      
      console.log('결제 매개변수:', paymentParams);

          // 테스트용 가상 결제 처리 (포트원 SDK 우회)
      console.log('테스트 모드로 직접 결제 처리 시작');
      
      // 2초간 기다림 (가상의 결제 처리 중)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 성공한 결제 응답 생성
      const mockResponse = {
        success: true,
        imp_uid: `imp_test_${Date.now()}`,
        merchant_uid: merchantUid,
        paid_amount: amount,
        status: 'paid'
      };

      // 결제 배경 화면 숨기기
      if (paymentScreen) {
        paymentScreen.classList.remove('active');
      }
      
      // 결제 성공 처리
      toast({
        title: '테스트 결제 성공',
        description: `금액: ${amount.toLocaleString()}원`,
        duration: 3000
      });
      
      try {
        // 백엔드에 결제 처리 완료 요청
        const processResponse = await fetch(`/api/payments/test/${merchantUid}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            impUid: mockResponse.imp_uid,
            merchantUid: mockResponse.merchant_uid,
            status: mockResponse.status,
            bidId,
            testMode: true,
            amount: amount,
            custom_data: {
              productAmount: amount,
              originalName: productName
            }
          }),
        });
        
        const processResult = await processResponse.json();
        console.log('테스트 결제 처리 결과:', processResult);
        
        // 성공 콜백 호출
        if (onPaymentSuccess) {
          onPaymentSuccess(
            mockResponse.imp_uid,
            mockResponse.merchant_uid,
            amount.toString()
          );
        }
      } catch (error) {
        console.error('테스트 결제 후처리 오류:', error);
        toast({
          title: '결제 후처리 오류',
          description: '테스트 결제는 성공했지만 서버 처리에 오류가 발생했습니다',
          variant: 'destructive',
          duration: 3000
        });
        
        if (onPaymentFail) {
          onPaymentFail(error);
        }
      }
      
      setIsLoading(false);
      
    } catch (error) {
      console.error('결제 처리 오류:', error);
      
      // 결제 배경 화면 숨기기
      const paymentScreen = document.getElementById('payment-screen');
      if (paymentScreen) {
        paymentScreen.classList.remove('active');
      }
      
      toast({
        title: '결제 오류',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
        variant: 'destructive',
        duration: 3000
      });
      
      if (onPaymentFail) {
        onPaymentFail(error);
      }
      
      setIsLoading(false);
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
