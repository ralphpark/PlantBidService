import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// 윈도우 타입 확장 (타입 에러 해결)
declare global {
  interface Window {
    PortOne?: {
      getIMP: () => any;
      setGlobalConfiguration: (config: any) => void;
      loadUI: (config: string) => void;
    };
    IMP?: {
      init: (merchantID: string) => void;
      request_pay: (params: any, callback: (response: any) => void) => void;
      agency?: string;
      pg?: any;
    } & {
      // V2 확장 속성 추가 (타입스크립트 오류 해결)
      [key: string]: any;
    };
    __PortOneSDKLoaded?: () => void;
  }
}

// PortOne 결제 위젯 컴포넌트의 Props 타입
interface PortOnePaymentProps {
  bidId: number;
  productName: string;
  amount: number;
  onPaymentSuccess?: (paymentKey: string, orderId: string, amount: string) => void;
  onPaymentFail?: (error: any) => void;
}

export default function PortOnePayment({ 
  bidId, 
  productName, 
  amount, 
  onPaymentSuccess, 
  onPaymentFail 
}: PortOnePaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [orderId, setOrderId] = useState<string>('');
  const { toast } = useToast();

  // 주문 ID 생성 (유니크한 ID 생성)
  useEffect(() => {
    // 주문 ID는 order_ 접두사와 고유 식별자 조합 (포트원 V2 API와 별개)
    const newOrderId = `order_${Math.random().toString(36).substring(2, 10)}`;
    setOrderId(newOrderId);
  }, [bidId]);

  // 포트원 SDK 초기화 - V1 API 사용
  useEffect(() => {
    // 기존 스크립트 제거 (클린업)
    const cleanUpExistingScript = () => {
      // V1 스크립트 제거
      const v1Script = document.querySelector('script[src*="iamport.kr"]');
      if (v1Script) {
        v1Script.remove();
        console.log('기존 포트원 V1 SDK 제거');
      }
      
      // V2 스크립트 제거
      const v2Script = document.querySelector('script[src*="portone.io"]');
      if (v2Script) {
        v2Script.remove();
        console.log('기존 포트원 V2 SDK 제거');
      }
      
      // 기존 표시 노드 제거 추가 (포트원 UI를 생성하는 div)
      const portoneDivs = document.querySelectorAll('div[class*="portone"]');
      portoneDivs.forEach(div => div.remove());
      
      // 기존 오브젝트 제거
      if (window.IMP) window.IMP = undefined;
      if (window.PortOne) window.PortOne = undefined;
    };
    
    // 포트원 SDK 로드 - 실패 원인 분석 및 수정
    const loadPortOneSDK = () => {
      // 기존 스크립트 제거
      cleanUpExistingScript();
      
      try {
        // 시도 #1: 직접 객체 생성으로 테스트
        console.log('SDK 로드 전 메르카도 ID 확인: imp16062547');
        
        // 포트원 SDK 로드
        const script = document.createElement('script');
        script.src = 'https://cdn.iamport.kr/js/iamport.payment-1.2.0.js'; // 기존에 잘 작동하는 버전 사용
        script.async = true;
        
        // 스크립트 로드 완료 후 처리
        script.onload = () => {
          console.log('포트원 SDK 스크립트 로드 성공!');
          
          if (window.IMP) {
            // 머천트 ID 초기화
            window.IMP.init('imp16062547');
            console.log('포트원 초기화 성공! 머천트ID: imp16062547');
            
            // PG 설정 구성 - 오류해결을 위한 추가 작업
            // 토스페이먼츠 정보 설정
            try {
              // 토스페이먼츠만 사용하도록 설정
              window.IMP.agency = 'tosspayments';
              // 토스페이먼츠만 명시적으로 설정
              (window.IMP as any).pg = 'tosspayments.iamporttest_3';
              (window.IMP as any).PG_PROVIDER = 'tosspayments';
              console.log('포트원 PG 설정 완료:', window.IMP.pg);
            } catch (error) {
              console.error('PG 설정 중 오류:', error);
            }
          } else {
            console.error('SDK 로드 실패: window.IMP 객체가 없습니다');
          }
        };
        
        script.onerror = (error) => {
          console.error('포트원 SDK 로드 오류:', error);
        };
        
        // 스크립트 엘리먼트 추가
        document.head.appendChild(script);
        
      } catch (error) {
        console.error('포트원 SDK 로드 중 예외 발생:', error);
      }
    };
    
    // SDK 로드 시작
    loadPortOneSDK();
    
    // 컴포넌트 언마운트 시 클린업
    return () => {
      cleanUpExistingScript();
    };
  }, []);

  /**
   * 서버 API 방식의 포트원 결제를 처리합니다.
   */
  const prepareServerSidePayment = async (params: {
    bidId: number;
    orderId: string;
    productName: string;
    amount: number;
  }) => {
    try {
      console.log('서버 API 기반 포트원 결제 준비 시작...');
      
      // 서버에 결제 준비 요청 (서버 측에서 포트원 API 호출)
      const response = await fetch('/api/payments/portone-prepare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 세션 쿠키를 서버로 전송하기 위해 추가
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '결제 준비 요청에 실패했습니다.');
      }
      
      const paymentData = await response.json();
      
      if (!paymentData.success) {
        throw new Error(paymentData.error || '결제 정보 준비에 실패했습니다.');
      }
      
      console.log('서버 API 결제 준비 완료:', paymentData);
      return paymentData;
    } catch (error) {
      console.error('결제 준비 중 오류 발생:', error);
      throw error;
    }
  };

  // 포트원 결제창 호출 - 가장 기본적인 샘플 기반으로 수정
  const openPortOnePayment = async (data: {
    orderId: string;
    orderName: string;
    amount: string;
    buyerName?: string;
    buyerTel?: string;
    buyerEmail?: string;
  }): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      if (!window.IMP) {
        console.error('포트원 SDK가 로드되지 않았습니다.');
        reject(new Error('결제 모듈이 로드되지 않았습니다.'));
        return;
      }
      
      console.log('포트원 결제창 호출 정보:', data);
      
      // 현재 서버 도메인 구하기
      const host = window.location.host;
      const protocol = window.location.protocol;
      const baseUrl = `${protocol}//${host}`;
      
      // 결제 성공/실패 시 리다이렉트 URL
      const redirectUrl = `${baseUrl}/api/payments/portone-success?orderId=${data.orderId}&amount=${data.amount}`;
      
      // 결제 진행 상태를 추적하기 위한 플래그
      let paymentCompleted = false;
      
      // 결제창이 열렸음을 부모 창에 알림
      window.postMessage({ action: 'PAYMENT_WINDOW_OPENED' }, '*');
      
      // 포트원 결제 진행을 위한 파라미터
      const paymentParams = {
        // PG 설정 - 토스페이먼츠로 변경
        pg: 'tosspayments.iamporttest_3', // 토스페이먼츠 테스트 계정 명시
        // 기본 필수 필드
        pay_method: 'card',     // 결제수단
        merchant_uid: data.orderId, // 상호 보관용 주문번호
        name: data.orderName,   // 상품명
        amount: parseInt(data.amount), // 결제금액
        
        // 구매자 정보 - 기본 정보만 제공
        buyer_name: data.buyerName || '게스트',  // 구매자 이름
        buyer_tel: data.buyerTel || '010-0000-0000',     // 구매자 전화번호
        buyer_email: data.buyerEmail || 'guest@example.com', // 구매자 이메일
        
        // 리다이렉트 URL 설정
        m_redirect_url: redirectUrl,  // 모바일 결제 후 리다이렉트 URL
        
        // 추가 토스 페이먼츠 파라미터
        bypass: {
          tosspayments: {
            clientKey: 'test_ck_lpP2YxJ4K877JAdv7KX8RGZwXLOb'
          }
        }
      };
      
      console.log('포트원 결제 파라미터:', JSON.stringify(paymentParams, null, 2));
      
      try {
        // 포트원 샘플과 같이 가장 기본적인 방식으로 호출
        window.IMP.request_pay(paymentParams, (rsp: any) => {
          console.log('포트원 콜백 함수 호출됨:', rsp);
          paymentCompleted = true;
          
          if (rsp.success) {
            console.log('결제 성공:', rsp);
            resolve(rsp);
          } else {
            console.error('결제 실패:', rsp);
            
            // 구체적인 오류 메시지 구성
            let errorMessage = rsp.error_msg || '결제에 실패했습니다.';
            
            // PG 오류 코드 및 메시지 처리
            if (rsp.code === 'PG_PROVIDER_ERROR' && rsp.pgCode) {
              // API에서 제공하는 원본 메시지를 그대로 표시
              if (rsp.pgMessage) {
                errorMessage = `${errorMessage} (${rsp.pgMessage})`;
              }
            }
            
            reject(new Error(errorMessage));
          }
        });
      } catch (sdkError) {
        console.error('포트원 SDK 호출 오류:', sdkError);
        reject(new Error('결제 모듈 실행 중 오류가 발생했습니다.'));
      }
      
      // 결제창이 닫힌 후 처리를 위한 메시지 이벤트 리스너
      const messageHandler = (event: MessageEvent) => {
        if (event.data && event.data.type === 'PORTONE_PAYMENT_CANCELED') {
          console.log('결제 취소 이벤트 감지');
          paymentCompleted = true;
          window.removeEventListener('message', messageHandler);
          reject(new Error('결제가 취소되었습니다.'));
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      // 타임아웃 안전장치 (2분)
      setTimeout(() => {
        if (!paymentCompleted) {
          console.log('결제 시간 초과');
          window.removeEventListener('message', messageHandler);
          reject(new Error('결제 시간이 초과되었습니다.'));
        }
      }, 120000);
    });
  };

  // 서버 API 기반 포트원 결제 처리 함수
  const handlePayment = async () => {
    if (!orderId) {
      toast({
        title: "결제 준비 오류",
        description: "주문 ID를 생성할 수 없습니다.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // 결제 프로세스 시작 안내
      toast({
        title: "결제 준비 중",
        description: "서버에서 결제 정보를 준비하는 중입니다...",
        duration: 2000
      });
      
      console.log('서버 API 기반 포트원 결제 프로세스 시작...');
      
      // 서버 API를 통한 결제 준비 (포트원 REST API 호출)
      try {
        // 포트원 결제 준비 (서버 API 기반)
        const paymentData = await prepareServerSidePayment({
          bidId,
          orderId,
          productName,
          amount
        });
        
        // 결제 정보 표시
        const { orderId: preparedOrderId, amount: amountStr, orderName } = paymentData;
        
        toast({
          title: "결제 정보 준비 완료",
          description: `상품: ${orderName}\n금액: ${parseInt(amountStr).toLocaleString()}원`,
          duration: 2000
        });
        
        console.log('서버에서 받은 결제 데이터:', paymentData);
        
        // IMP SDK 기반 결제창 호출
        try {
          const paymentResult = await openPortOnePayment({
            orderId: paymentData.orderId,
            orderName: paymentData.orderName,
            amount: paymentData.amount
          });
          
          console.log('결제 성공:', paymentResult);
          
          // 성공 콜백 호출 (결제 성공 시)
          if (onPaymentSuccess) {
            // V2 API paymentKey 확인
            const portonePaymentKey = (paymentResult as any).paymentKey || (paymentResult as any).imp_uid;
            console.log('포트원 결제 키 저장:', portonePaymentKey);
            
            // paymentKey 개선: V2 API에서는 paymentKey, V1에서는 imp_uid 사용
            onPaymentSuccess(
              portonePaymentKey, // 개선된 결제 키
              (paymentResult as any).merchant_uid,
              (paymentResult as any).paid_amount.toString()
            );
          }
          
          toast({
            title: "결제 성공",
            description: "결제가 성공적으로 완료되었습니다.",
            duration: 3000
          });
          
        } catch (error) {
          console.error('결제창 호출 중 오류:', error);
          
          toast({
            title: "결제 실패",
            description: error instanceof Error ? error.message : "결제 처리 중 오류가 발생했습니다.",
            variant: "destructive",
            duration: 3000
          });
          
          // 실패 시 콜백 호출
          if (onPaymentFail) {
            onPaymentFail(error);
          }
        }
        
      } catch (error) {
        // 결제 준비 API 호출 실패
        console.error('결제 준비 중 오류 발생:', error);
        
        toast({
          title: "결제 준비 실패",
          description: error instanceof Error ? error.message : "결제 준비 중 오류가 발생했습니다.",
          variant: "destructive",
          duration: 3000
        });
        
        // 실패 시 콜백 호출
        if (onPaymentFail) {
          onPaymentFail(error);
        }
      }
      
    } catch (error) {
      console.error("결제 오류:", error);
      
      // 결제 실패 시 콜백 호출
      if (onPaymentFail) {
        onPaymentFail(error);
      }
      
      toast({
        title: "결제 실패",
        description: error instanceof Error ? error.message : "결제 처리 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      className="w-full" 
      onClick={handlePayment}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          결제 처리 중...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-4 w-4" />
          결제하기
        </>
      )}
    </Button>
  );
}