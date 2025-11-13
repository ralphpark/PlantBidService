/**
 * 포트원 브라우저 SDK를 사용한 결제 컴포넌트
 * 공식 문서: https://developers.portone.io/opi/ko/sdk/javascript-sdk/get-started
 */
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clipboard, Loader2, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { requestPayment } from '@portone/browser-sdk/v2';

interface PortOneBrowserPaymentProps {
  orderId: string;
  amount: number;
  productName: string;
  buyerName: string;
  buyerEmail: string;
  buyerTel: string;
  onComplete: (response: any) => void;
  onError?: (error: any) => void;
  onPaymentFail?: (error: any) => void;
}

// 포트원 계정에서 확인한 스토어 ID
const STORE_ID = "store-c2335caa-ad5c-4d3a-802b-568328aab2bc";
// 플랜트비드 V2 채널 키
const CHANNEL_KEY = "channel-key-5cdfe609-e895-41ae-9efd-d6a7d3148e79";

export default function PortOneBrowserPayment({
  orderId,
  amount,
  productName,
  buyerName,
  buyerEmail,
  buyerTel,
  onComplete,
  onError,
  onPaymentFail
}: PortOneBrowserPaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);

  const handlePayment = async () => {
    setIsLoading(true);

    try {
      console.log("결제 요청 시작", {
        orderId,
        amount,
        productName,
        buyerName,
        buyerEmail,
        buyerTel,
        isTestMode
      });

      // 테스트 모드일 경우 결제 창 없이 바로 성공 처리
      if (isTestMode) {
        console.log("테스트 모드 결제 요청");
        
        try {
          // 서버에 테스트 결제 요청
          const response = await fetch(`/api/payments/test/${orderId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              bidId: orderId.includes('_bid_') ? orderId.split('_bid_')[1] : null,
              amount: amount,
              custom_data: {
                productName: productName,
                buyerName: buyerName,
                buyerEmail: buyerEmail,
                buyerTel: buyerTel,
                productAmount: amount
              },
              testMode: true
            })
          });
          
          if (!response.ok) {
            throw new Error(`테스트 결제 요청 오류: ${response.status}`);
          }
          
          const result = await response.json();
          console.log("테스트 결제 성공 처리:", result);
          
          onComplete({
            orderId: orderId,
            paymentKey: result.impUid || `test_payment_${Date.now()}`,
            amount: amount,
            status: "DONE",
            method: "TEST_PAYMENT",
            isTestPayment: true
          });
        } catch (error: any) {
          console.error("테스트 결제 오류:", error);
          if (onPaymentFail) {
            onPaymentFail({
              message: error.message || "테스트 결제 오류",
              code: "TEST_PAYMENT_ERROR",
              displayMessage: "테스트 결제 처리 중 오류가 발생했습니다."
            });
          }
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // 포트원 결제 요청 - KG 이니시스 결제 설정
      // API 방식으로 결제 처리 - 서버에 정보 전송 후 체크아웃 URL 생성
      try {
        // 서버에 결제 정보 등록 요청
        const response = await fetch(`/api/payments/portone-prepare-simple`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId,
            amount,
            productName,
            buyerInfo: {
              name: buyerName,
              email: buyerEmail,
              phone: buyerTel || ""
            }
          })
        });
        
        if (!response.ok) {
          throw new Error(`체크아웃 URL 생성 오류: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // 결제 URL 확인 및 처리
        if (data.url) {
          // 결제 URL로 직접 이동 (리다이렉트)
          window.location.href = data.url;
          // 여기서 리턴하면 페이지가 나가버리기 때문에 추가 코드는 실행되지 않음
          return;
        } else {
          throw new Error('결제 URL이 제공되지 않았습니다');
        }
      } catch (payError) {
        console.error('결제 URL 생성 오류:', payError);
        if (onPaymentFail) {
          onPaymentFail({
            message: payError instanceof Error ? payError.message : '결제 URL 생성 오류',
            code: 'PAYMENT_URL_ERROR',
            displayMessage: '결제 URL을 생성하는 중 오류가 발생했습니다.'
          });
        } else if (onError) {
          onError(payError);
        }
      }
    } catch (error: any) {
      // 더 상세한 오류 로깅
      console.error("결제 오류 발생:", JSON.stringify(error, null, 2));
      console.error("결제 오류 메시지:", error.message || '메시지 없음');
      console.error("결제 오류 코드:", error.code || '코드 없음');
      console.error("결제 오류 상태:", error.status || '상태 없음');
      
      // 오류 대응 코드
      if (onPaymentFail) {
        onPaymentFail({
          message: error.message || "알 수 없는 오류",
          code: error.code || "UNKNOWN_ERROR",
          details: JSON.stringify(error),
          displayMessage: "결제 창 호출에 실패하였습니다. 채널 정보를 조회하는데 실패하였습니다."  
        });
      } else if (onError) {
        onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 테스트 모드 전환 UI */}
      <div className="flex items-center justify-between px-2 py-1 text-sm bg-yellow-50 border border-yellow-200 rounded-md">
        <div className="flex items-center space-x-2">
          <input 
            type="checkbox" 
            id="test-mode-toggle" 
            checked={isTestMode}
            onChange={(e) => setIsTestMode(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="test-mode-toggle" className="text-gray-700">
            테스트 모드 (결제 창 없이 바로 결제 성공 처리)
          </label>
        </div>
      </div>

      {/* 결제 버튼 */}
      <Button
        onClick={handlePayment}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            결제 처리 중...
          </>
        ) : (
          isTestMode ? "테스트 결제 진행" : "결제하기"
        )}
      </Button>
    </div>
  );
}
