import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PortOne from '@portone/browser-sdk/v2';

interface PortOneSDKV2PaymentProps {
  bidId?: number; // bidId는 선택사항으로 변경
  conversationId?: number; // 대화 ID
  amount: number;
  productName: string;
  buyerName: string;
  buyerEmail?: string;
  buyerTel?: string;
  onComplete?: (response: any) => void;
  onError?: (error: any) => void;
  onPaymentFail?: (error: {
    message: string;
    code?: string;
    displayMessage?: string;
    details?: string;
  }) => void;
}

/**
 * 포트원 V2 SDK를 사용한 결제 컴포넌트
 * 권장 사항: 가이드에 따라 SDK를 사용하여 CSP/Same-Origin 이슈 회피
 */
export default function PortOneSDKV2Payment({
  bidId,
  conversationId,
  amount,
  productName,
  buyerName,
  buyerEmail,
  buyerTel,
  onComplete,
  onError,
  onPaymentFail
}: PortOneSDKV2PaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  /**
   * 결제 처리 함수
   */
  const handlePayment = async () => {
    setIsLoading(true);

    try {
      // bidId는 선택사항으로 변경했으므로 이 검증은 제거

      // 통합 주문/결제 ID 생성 (포트원 V2 API 규격에 맞는 pay_ 형식)
      // 'pay_' + 22자 형식으로 생성 (총 26자)
      const now = new Date();
      const timestamp = now.getTime();
      const random = Math.random().toString(36).substring(2, 8);
      const cleanId = (timestamp.toString() + random).replace(/[^a-zA-Z0-9]/g, '');
      const paddedId = cleanId.substring(0, 22).padEnd(22, 'f');
      const orderId = `pay_${paddedId}`; // 주문번호를 pay_ 형식으로 통일
      
      // 동일한 ID를 paymentId로 사용 (이제 주문ID와 결제ID가 동일)
      const paymentId = orderId;

      // 결제 준비 알림
      toast({
        title: "결제 준비 중",
        description: `${productName} - ${amount.toLocaleString()}원`,
        duration: 2000
      });

      // 생성한 paymentId와 orderId 로깅
      console.log('포트원 V2 API 형식 결제 ID:', paymentId);
      console.log('포트원 orderId(merchantUID):', orderId);
      
      // 상점 식별자 (MID)는 고정값 사용
      // 포트원 이니시스 연동 시 필수: MOI3204387 형식의 고정값 사용 (대시보드 표시용)
      const merchantId = "MOI3204387"; // 고정된 이니시스 상점 ID (MID)
      
      // 추가 파라미터 조정 - 대화 ID와 입찰 ID 포함
      const redirectUrl = new URL(window.location.origin + "/payment-test");
      if (conversationId) redirectUrl.searchParams.append("conversationId", conversationId.toString());
      if (bidId) redirectUrl.searchParams.append("bidId", bidId.toString());
      
      // 공식 문서에 따른 URL 파라미터 설정
      // 표준: https://developers.portone.io/docs/ko/v2-payment/v2-sdk/payment-request
      redirectUrl.searchParams.append("mid", merchantId); // 상점 식별자 (MID)
      redirectUrl.searchParams.append("pg", `inicis.${merchantId}`); // PG사.MID 형식
      redirectUrl.searchParams.append("merchant_uid", paymentId); // 주문번호
      redirectUrl.searchParams.append("payment_id", paymentId); // 결제 ID
      console.log('파라미터가 포함된 리다이렉트 URL:', redirectUrl.toString());
      
      // PortOne SDK V2에서 결제 요청
      // 중요: 포트원 SDK V2가 인식하는 파라미터 형식으로 설정
      // 가장 중요한 이니시스 PG 설정 - 반드시 'inicis.MOI3204387' 형식으로 설정해야 함
      console.log(`포트원 결제 요청 상점 식별자(MID): ${merchantId}`); // 로그에 MID 출력
      
      // 공식 가이드에 따른 정확한 설정
      // 1. 주문 번호와 결제 ID 구분 (merchant_uid와 paymentId는 다름)
      const merchantUID = orderId; // 이 orderId는 각 주문마다 고유한 식별자
      
      // 2. PG사 설정 - 이니시스 필수
      // PG 파라미터는 "PG사코드.MID" 형식 (inicis.{발급된MID})
      const pg = `inicis.${merchantId}`; // 올바른 형식: inicis.MOI3204387
      console.log('포트원 PG 설정:', pg);

      // 공식 문서에 기반한 올바른 파라미터 구성
      const paymentParams = {
        // 포트원 필수 기본 정보
        storeId: "store-c2335caa-ad5c-4d3a-802b-568328aab2bc", // 포트원 스토어 ID
        channelKey: "channel-key-5cdfe609-e895-41ae-9efd-d6a7d3148e79", // 포트원 채널 키
        paymentId: paymentId,  // 결제 고유 식별자 (pay_ 형식, 26자)
        
        // 결제 기본 정보
        orderName: productName, // 주문명
        totalAmount: amount, // 결제 금액
        currency: "KRW" as any, // 통화
        payMethod: "CARD", // 결제 방법
        redirectUrl: redirectUrl.toString(), // 결제 후 리다이렉트 URL
        
        // 고객 정보
        customer: {
          customerId: "guest-" + Date.now(),
          fullName: buyerName || "guest",
          phoneNumber: buyerTel || "",
          email: buyerEmail || ""
        },
        
        // 핵심 PG 설정 (가이드 기반)
        pgProvider: "INICIS" as any, // PG사 제공자
        pg: pg, // "inicis.MID" 형식 (PG사코드.MID)
        
        // 상점 정보 (공식 문서 기반)
        mid: merchantId, // 상점 식별자 - 이니시스에서 발급받은 MID
        merchant_uid: paymentId // 주문 번호 (결제 식별자와 동일하게 사용)
      };
      
      console.log('포트원 SDK 결제 요청 파라미터:', paymentParams);
      
      // @ts-ignore - 타입스크립트 오류 무시
      const response = await PortOne.requestPayment(paymentParams);

      console.log('포트원 SDK 결제 응답:', response);

      // 결제 성공 처리
      if (response && onComplete) {
        // 응답 형식에 맞게 결제 결과 처리
        onComplete({
          orderId: orderId,
          paymentKey: (response as any).paymentKey || (response as any).paymentId || '',
          amount: amount.toString(),
          status: (response as any).status || "DONE",
          paymentMethod: "CARD" // PortOne V2 SDK 형식으로 변경
        });
      }

    } catch (error: any) {
      console.error('결제 처리 오류:', error);

      // 결제 실패 처리
      if (onPaymentFail) {
        onPaymentFail({
          message: error.message || "알 수 없는 오류",
          code: error.code || "UNKNOWN_ERROR",
          details: JSON.stringify(error),
          displayMessage: "결제 처리 중 오류가 발생했습니다."
        });
      } else if (onError) {
        onError(error);
      }
    } finally {
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
            카드 결제하기
          </>
        )}
      </Button>
    </div>
  );
}