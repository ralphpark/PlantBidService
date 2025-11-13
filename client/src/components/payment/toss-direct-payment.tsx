import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// 토스 페이먼츠 직접 연동을 위한 컴포넌트
interface TossDirectPaymentProps {
  bidId?: number;
  productName: string;
  amount: number;
  onPaymentSuccess?: (paymentKey: string, orderId: string, amount: string) => void;
  onPaymentFail?: (error: any) => void;
}

export default function TossDirectPayment({
  bidId = 0,
  productName,
  amount,
  onPaymentSuccess,
  onPaymentFail
}: TossDirectPaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // 결제 처리 함수
  const handlePayment = async () => {
    setIsLoading(true);

    try {
      // 주문 ID 생성 (유니크 ID)
      const orderId = `toss_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      // 결제 정보 준비 시작 안내
      toast({
        title: "결제 준비 중",
        description: "토스 페이먼츠 결제를 준비하는 중입니다...",
        duration: 2000
      });

      // 토스 페이먼츠 결제창 설정
      const clientKey = 'test_ck_lpP2YxJ4K877JAdv7KX8RGZwXLOb'; // 테스트 클라이언트 키
      const successUrl = `${window.location.origin}/payment/success`;
      const failUrl = `${window.location.origin}/payment/fail`;

      // 결제 페이지 URL 생성
      const paymentUrl = new URL('https://test-checkout.tosspayments.com/v1/redirect');
      paymentUrl.searchParams.append('clientKey', clientKey);
      paymentUrl.searchParams.append('amount', amount.toString());
      paymentUrl.searchParams.append('orderId', orderId);
      paymentUrl.searchParams.append('orderName', productName);
      paymentUrl.searchParams.append('successUrl', successUrl);
      paymentUrl.searchParams.append('failUrl', failUrl);
      
      // 추가 정보
      paymentUrl.searchParams.append('customerName', '고객명');
      paymentUrl.searchParams.append('customerEmail', 'customer@example.com');
      paymentUrl.searchParams.append('locale', 'ko');
      
      console.log('토스 페이먼츠 결제 URL:', paymentUrl.toString());
      
      // 결제창 팝업으로 열기
      const width = 450;
      const height = 700;
      const left = (window.screen.width / 2) - (width / 2);
      const top = (window.screen.height / 2) - (height / 2);
      
      const popup = window.open(
        paymentUrl.toString(),
        'TossPaymentsWindow',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
      );
      
      if (!popup) {
        throw new Error('팝업 창이 차단되었습니다. 팝업 차단을 해제해주세요.');
      }
      
      // 결제 완료/취소 감지
      const checkInterval = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkInterval);
          // 성공 여부 확인 로직이 필요 (현재는 단순 메시지만 표시)
          toast({
            title: "결제 창이 닫힘",
            description: "결제가 완료되었거나 취소되었습니다.",
            duration: 3000
          });
          setIsLoading(false);
        }
      }, 500);
      
      // 5분 후 자동 종료 (안전장치)
      setTimeout(() => {
        if (!popup.closed) {
          popup.close();
          clearInterval(checkInterval);
          
          toast({
            title: "결제 시간 초과",
            description: "결제 시간이 초과되었습니다.",
            variant: "destructive",
            duration: 3000
          });
          
          if (onPaymentFail) {
            onPaymentFail(new Error('결제 시간이 초과되었습니다.'));
          }
          
          setIsLoading(false);
        }
      }, 300000); // 5분 타임아웃
      
    } catch (error) {
      console.error('토스 페이먼츠 결제 오류:', error);
      
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
          토스 직접결제
        </>
      )}
    </Button>
  );
}
