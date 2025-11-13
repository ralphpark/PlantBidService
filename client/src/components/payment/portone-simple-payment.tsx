import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// 포트원 SDK 타입 정의
// portone-payment-new.tsx 파일과 동일한 타입 정의 사용

// 결제 컴포넌트 Props 타입
interface PortOneSimplePaymentProps {
  bidId?: number;
  productName: string;
  amount: number;
  onPaymentSuccess?: (paymentKey: string, orderId: string, amount: string) => void;
  onPaymentFail?: (error: any) => void;
}

/**
 * 포트원 KG이니시스 결제 컴포넌트
 */
export default function PortOneSimplePayment({ 
  bidId = 0, 
  productName, 
  amount, 
  onPaymentSuccess, 
  onPaymentFail 
}: PortOneSimplePaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [orderId, setOrderId] = useState<string>('');
  const { toast } = useToast();

  // 주문 ID 생성 (유니크한 ID 생성)
  useEffect(() => {
    // 포맷: bidId_타임스탬프_랜덤문자열
    const newOrderId = `${bidId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    setOrderId(newOrderId);
  }, [bidId]);

  // 포트원 SDK 초기화 - KG이니시스 설정
  useEffect(() => {
    const initSDK = async () => {
      // 포트원 SDK를 새로 설치
      try {
        // KG이니시스 설정
        const merchantId = 'imp49910675'; // 포트원 가맹점 식별코드
        const channel_key = 'channel-key-5cdfe609-e895-41ae-9efd-d6a7d3148e79'; // 채널 키
        console.log('포트원 초기화 상점ID:', merchantId);
        
        // 기존 SDK 제거 및 스크립트 로드
        const scripts = document.querySelectorAll('script[src*="iamport"]');
        scripts.forEach(script => script.remove());
        
        // 스크립트 로드 - 최신 SDK 버전 사용
        const script = document.createElement('script');
        script.src = 'https://cdn.iamport.kr/v1/iamport.js';
        script.onload = () => {
          if (window.IMP) {
            window.IMP.init(merchantId);
            console.log('포트원 SDK 초기화 완료 - KG이니시스');
          }
        };
        document.head.appendChild(script);
      } catch (error) {
        console.error('SDK 초기화 오류:', error);
      }
    };
    
    initSDK();
  }, []);

  /**
   * 간소화된 서버 API 방식의 포트원 결제를 처리합니다.
   */
  const prepareServerSidePayment = async (params: {
    bidId: number;
    orderId: string;
    productName: string;
    amount: number;
  }) => {
    try {
      console.log('서버 API 기반 포트원 결제 준비 시작...');
      
      // 서버에 결제 준비 요청 (간소화된 API 사용)
      const response = await fetch('/api/payments/portone-prepare-simple', {
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

  // 포트원 결제창 호출 - 직접 URL 열기 방식 사용
  const openPaymentWindow = (paymentUrl: string): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      try {
        // URL 유효성 검사
        if (!paymentUrl || !paymentUrl.startsWith('http')) {
          console.error('유효하지 않은 결제 URL:', paymentUrl);
          reject(new Error(`유효하지 않은 결제 URL입니다: ${paymentUrl}`));
          return;
        }
        
        // 결제 URL 로그 상세 출력
        console.log('결제 URL 열기 시도:', {
          url: paymentUrl,
          timestamp: new Date().toISOString()
        });
        
        // 팝업 창으로 결제 URL 열기 - 팝업 크기 키우기
        const width = 800;
        const height = 800;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);
        
        const popup = window.open(
          paymentUrl, 
          'PortOnePaymentWindow',
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes,toolbar=no,menubar=no,location=yes`
        );
        
        if (!popup) {
          console.error('팝업 창 열기 실패');
          reject(new Error('팝업 창이 차단되었습니다. 팝업 차단을 해제해주세요.'));
          return;
        }
        
        // 팝업에 포커스
        popup.focus();
        
        // 자원 관리를 위한 변수
        let popupCheckTimer: NodeJS.Timeout | null = null;
        let timeoutTimer: NodeJS.Timeout | null = null;
        
        // 자원 해제 함수
        const cleanup = () => {
          if (popupCheckTimer) {
            clearInterval(popupCheckTimer);
            popupCheckTimer = null;
          }
          
          if (timeoutTimer) {
            clearTimeout(timeoutTimer);
            timeoutTimer = null;
          }
          
          window.removeEventListener('message', messageHandler);
          
          if (popup && !popup.closed) {
            popup.close();
          }
        };
        
        // 메시지 이벤트 처리기
        const messageHandler = (event: MessageEvent) => {
          // 메시지 디버깅
          console.log('받은 메시지:', {
            origin: event.origin,
            hasSource: !!event.source,
            dataType: typeof event.data,
            data: event.data ? (typeof event.data === 'object' ? JSON.stringify(event.data) : event.data) : 'null'
          });
          
          try {
            // 테스트 메시지 무시
            if (event.data && event.data.type === 'ping') {
              console.log('단순 테스트 메시지 무시');
              return;
            }
            
            // 데이터 추출
            const { data } = event;
            
            if (!data) {
              console.log('메시지에 데이터가 없습니다');
              return;
            }
            
            // 결제 성공 처리
            if (data.type === 'PAYMENT_SUCCESS') {
              console.log('결제 성공 메시지:', data);
              cleanup();
              resolve(data);
              return;
            }
            
            // 결제 실패 처리
            if (data.type === 'PAYMENT_FAIL') {
              console.log('결제 실패 메시지:', data);
              cleanup();
              reject(new Error(data.message || '결제가 취소되었습니다'));
              return;
            }
          } catch (err) {
            console.error('메시지 처리 오류:', err);
          }
        };
        
        // 메시지 리스너 등록
        window.addEventListener('message', messageHandler);
        
        // 팝업 창 닫힘 감지
        popupCheckTimer = setInterval(() => {
          if (popup.closed) {
            console.log('팝업창이 닫혔습니다');
            cleanup();
            reject(new Error('결제창이 닫혀 결제가 완료되지 않았습니다'));
          }
        }, 500);
        
        // 타임아웃 (2분)
        timeoutTimer = setTimeout(() => {
          console.log('결제 시간 초과 (타임아웃)');
          cleanup();
          reject(new Error('결제 시간이 초과되었습니다'));
        }, 120000);
        
      } catch (error) {
        console.error('결제창 열기 오류:', error);
        reject(error);
      }
    });
  };

  // KG이니시스 결제 처리 함수 - 포트원 SDK 사용
  const handleDirectSDKPayment = async () => {
    setIsLoading(true);

    try {
      // 사용자 정보 가져오기
      const userResponse = await fetch('/api/user', {
        credentials: 'include'
      });
      const userData = await userResponse.json();
      
      if (!window.IMP) {
        throw new Error('포트원 SDK가 로드되지 않았습니다');
      }
      
      console.log('유저 데이터:', userData);
      
      // 주문 ID 생성 (유니크 ID)
      const orderId = `kg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      // 결제 정보 준비 시작 안내
      toast({
        title: "결제 준비 중",
        description: "KG이니시스 결제를 준비하는 중입니다...",
        duration: 2000
      });

      // 결제 요청 매개변수 - KG이니시스 사용
      const param = {
        pg: 'html5_inicis.INIBillTst', // KG이니시스 테스트 계정
        pay_method: 'card', // 결제수단
        merchant_uid: orderId, // 공급자가 부여하는 주문번호
        name: productName, // 상품명
        amount, // 결제금액
        buyer_email: userData.email || '', // 구매자 이메일
        buyer_name: userData.username || '', // 구매자 이름
        buyer_tel: userData.phone || '010-0000-0000', // 구매자 전화번호
        buyer_addr: userData.address || '', // 구매자 주소
        buyer_postcode: userData.zipCode || '', // 구매자 우편번호
        m_redirect_url: window.location.origin + '/payment/mobile-redirect',
        channel_key: 'channel-key-5cdfe609-e895-41ae-9efd-d6a7d3148e79', // 채널 키
      };
      
      console.log('포트원(KG이니시스) 결제 시도:', param);

      // 포트원 결제 창 호출
      window.IMP.request_pay(param, (response) => {
        try {
          console.log('결제 응답:', response);
          
          if (response.success) {
            // 결제 성공 시
            toast({
              title: "결제 완료",
              description: "결제가 완료되었습니다.",
              duration: 2000
            });
            
            // 성공 콜백 호출
            if (onPaymentSuccess) {
              onPaymentSuccess(
                response.imp_uid,
                response.merchant_uid,
                response.paid_amount.toString()
              );
            }
          } else {
            // 결제 실패 시
            toast({
              title: "결제 실패",
              description: `오류: ${response.error_msg}`,
              variant: "destructive"
            });
            
            // 실패 콜백 호출
            if (onPaymentFail) {
              onPaymentFail(response);
            }
          }
        } catch (error) {
          console.error('결제 응답 처리 오류:', error);
          
          toast({
            title: "결제 오류",
            description: "결제 응답을 처리하는 중 오류가 발생했습니다.",
            variant: "destructive"
          });
          
          if (onPaymentFail) {
            onPaymentFail(error);
          }
        } finally {
          setIsLoading(false);
        }
      });
      
    } catch (error) {
      console.error('KG이니시스 결제 처리 오류:', error);
      
      toast({
        title: "결제 오류",
        description: error instanceof Error ? error.message : "결제 처리 중 오류가 발생했습니다.",
        variant: "destructive",
        duration: 3000
      });
      
      if (onPaymentFail) {
        onPaymentFail(error);
      }
      
      setIsLoading(false);
    }
  };

  // 간소화된 서버 API 기반 포트원 결제 처리 함수
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
      
      // 서버 API를 통한 결제 준비 (간소화된 API 호출)
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
        
        // 결제 URL이 없는 경우 에러 처리
        if (!paymentData.url) {
          throw new Error('결제 URL이 생성되지 않았습니다.');
        }
        
        // URL 기반 결제창 열기
        try {
          if (!paymentData.url) {
            throw new Error('결제 URL이 없습니다.');
          }
          
          // 결제 URL이 있는지 확인하고 로그로 출력
          console.log('결제 URL 확인:', paymentData.url);
          
          // 결제 URL을 열기 전에 디버그 로그 추가
          console.log('결제 전 현재 데이터:', { paymentData, orderId });
          
          // 결제 URL 표시를 위한 상세 로그
          toast({
            title: '결제 이동 중...',
            description: '결제 창으로 이동합니다.',
            duration: 1000
          });
          
          // 결제 창으로 이동 (모바일 추가 고려)
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          
          setTimeout(() => {
            // 100ms 뒤에 이동 (토스트 표시 후)
            if (isMobile) {
              console.log('모바일 결제 창 열기:', paymentData.url);
              window.location.href = paymentData.url;
            } else {
              console.log('데스크탑 결제 창 열기:', paymentData.url);
              window.location.href = paymentData.url;
            }
          }, 100);
          
          return; // 현재 창에서 이동하미로 이 후 코드는 실행되지 않음
          
          // 결제창이 바로 열리고 결과는 리다이렉트로 처리되므로 아래 코드는 실행되지 않음
          // 색션을 저장하고 리다이렉트 받음
          
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
        // 결제 준비 API 호출 실패 시 백업 방식으로 SDK 직접 호출
        console.error('결제 준비 중 오류 발생, SDK 직접 호출 방식으로 전환:', error);
        
        toast({
          title: "대체 결제 방식 사용",
          description: "서버 API 방식 실패. SDK 직접 호출 방식으로 전환합니다.",
          duration: 2000
        });
        
        // SDK 직접 호출 방식으로 시도
        handleDirectSDKPayment();
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

  // 서버 API 방식으로 변경 (클라이언트 SDK가 CSP 정책으로 작동하지 않음)
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
            KG이니시스 결제
          </>
        )}
      </Button>
      
      {/* 개발용 버튼 - 대체 방식 */}
      <Button 
        className="w-full mt-2 text-xs" 
        onClick={handleDirectSDKPayment}
        disabled={isLoading}
        variant="outline"
        size="sm"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            클라이언트 SDK...
          </>
        ) : (
          <>
            <CreditCard className="mr-1 h-3 w-3" />
            클라이언트 SDK 방식 (대체용)
          </>
        )}
      </Button>
    </div>
  );
}
