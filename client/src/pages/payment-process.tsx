import React, { useEffect, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, ArrowLeft, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuth } from '@/hooks/use-auth';

/**
 * 단독 결제 처리 페이지
 * 대화창과 독립적으로 결제를 처리하여 z-index 문제를 회피
 */
export default function PaymentProcessPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // URL 파라미터에서 필요한 정보 추출
  const originalOrderId = params.get('orderId'); // 원래 URL에서 받은 주문번호
  const conversationId = params.get('conversationId');
  const productName = params.get('productName');
  const price = params.get('price');
  const vendorId = params.get('vendorId');
  const returnUrl = params.get('returnUrl'); // 결제 후 돌아갈 URL
  
  // 실제 사용할 주문번호(orderId)는 변경될 수 있으므로 let으로 선언
  let orderId = originalOrderId;
  
  const [isLoading, setIsLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{
    success: boolean;
    message: string;
    orderId?: string;
    details?: any; // 결제 실패 시 상세 정보를 저장하기 위한 필드 추가
  } | null>(null);
  
  // 페이지 로드 시 필요한 정보 확인
  useEffect(() => {
    if (!orderId || !conversationId || !productName || !price || !vendorId) {
      toast({
        title: '결제 정보 오류',
        description: '필요한 정보가 누락되었습니다.',
        variant: 'destructive'
      });
    }
  }, [orderId, conversationId, productName, price, vendorId, toast]);
  
  // SDK V2 결제 처리 함수
  const handleSdkPayment = async () => {
    if (!orderId || !productName || !price) return;
    
    setIsLoading(true);
    
    try {
      // SDK 가져오기
      const PortOne = (await import('@portone/browser-sdk/v2')).default;
      
      console.log('포트원 V2 SDK 결제 요청:', {
        orderId,
        productName,
        price
      });
      
      // 사용자 정보 디버깅
      console.log('결제에 사용되는 사용자 정보:', {
        id: user?.id,
        username: user?.username,
        email: user?.email,
      });
      
      // 주의: URL에서 전달받은 orderId가 이미 있는 경우는 그대로 사용
      // 없는 경우에만 새로 생성
      let paymentId;
      
      if (orderId && orderId.startsWith('pay_') && orderId.length === 26) {
        // 이미 pay_ 형식인 경우 그대로 사용
        paymentId = orderId;
        console.log('기존 pay_ 형식 주문번호 사용:', orderId);
      } else {
        // 새로운 포트원 V2 API 규격의 결제 ID 생성
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const cleanId = (timestamp.toString() + random).replace(/[^a-zA-Z0-9]/g, '');
        const paddedId = cleanId.substring(0, 22).padEnd(22, 'f');
        paymentId = `pay_${paddedId}`;
        
        console.log('새로운 포트원 V2 API 형식 결제 ID 생성:', paymentId);
        
        // 기존 orderId가 있으면 로그에 표시
        if (orderId) {
          console.log('기존 주문번호 대체:', orderId, '→', paymentId);
        }
        
        // 이제 paymentId를 orderId로 사용
        orderId = paymentId;
      }
      
      // 생성한 paymentId와 orderId 로깅 (이제 둘이 동일함)
      console.log('통합 결제/주문 ID:', paymentId);
      
      // 결제 요청 파라미터 설정 - V2 API 형식에 맞게 설정
      const response = await PortOne.requestPayment({
        storeId: "store-c2335caa-ad5c-4d3a-802b-568328aab2bc",
        channelKey: "channel-key-5cdfe609-e895-41ae-9efd-d6a7d3148e79",
        paymentId: paymentId, // 동일한 ID를 paymentId로 사용
        orderName: productName || '',
        totalAmount: parseInt(price || '0'),
        currency: "KRW" as any, // 타입 오류 해결을 위한 any 사용
        payMethod: "CARD", // payMethod 파라미터 반드시 필요
        redirectUrl: window.location.origin + "/payment-process" + search, // 현재 URL 유지
        customer: {
          customerId: user?.id?.toString() || "guest-" + Date.now(),
          fullName: user?.username || "guest",
          phoneNumber: "010-0000-0000", // 서버에서 정보 조회 불가능할 경우 기본값 사용
          email: user?.email || "test@example.com" // 사용자 이메일 우선 사용
        }
      });
      
      console.log('SDK 결제 응답:', response);
      
      // 결제 결과 확인
      if (response && response.code && response.code !== 'SUCCESS') {
        // 결제 취소되거나 실패한 경우
        let errorMessage = "결제가 취소되었거나 실패했습니다.";
        
        // PG 제공자 에러인 경우 원본 에러 메시지 표시
        if (response.code === 'PG_PROVIDER_ERROR' || response.code === 'FAILURE_TYPE_PG') {
          errorMessage = response.message || "PG사에서 결제가 실패하였습니다.";
          
          // PG 메시지가 있으면 추가
          if (response.pgMessage) {
            errorMessage += ` (${response.pgMessage})`;
          }
          
          // PG 코드가 있으면 추가
          if (response.pgCode) {
            errorMessage += ` [코드: ${response.pgCode}]`;
          }
        } else if (response.code === 'USER_CANCEL') {
          errorMessage = "사용자가 결제를 취소하였습니다.";
        } else {
          // 기타 오류인 경우 최대한 많은 정보 표시
          errorMessage = response.message || "결제 처리 중 오류가 발생했습니다.";
        }
        
        console.log('결제 실패 상세 정보:', response);
        
        setPaymentResult({
          success: false,
          message: errorMessage,
          details: response // 결제 실패 상세 정보 저장
        });
        
        return;
      }
      
      // 결제 성공 처리
      const notifySuccess = async () => {
        try {
          // 판매자에게 입찰 성공 메시지 전송
          await fetch('/api/vendors/notify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              vendorId: vendorId ? parseInt(vendorId) : 0,
              conversationId: conversationId ? parseInt(conversationId) : 0,
              type: 'success',
              orderId: orderId || '',
              message: `입찰이 성공적으로 수락되었습니다. 주문번호: ${orderId}`
            })
          });
          
          // 다른 판매자들에게 입찰 실패 알림 전송
          await fetch('/api/vendors/notify-others', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              conversationId: conversationId ? parseInt(conversationId) : 0,
              winnerVendorId: vendorId ? parseInt(vendorId) : 0,
              message: "다른 판매자의 입찰이 선택되었습니다."
            })
          });
        } catch (error) {
          console.error("알림 전송 중 오류:", error);
        }
      };
      
      // 성공 시에만 알림 전송
      await notifySuccess();
      
      setPaymentResult({
        success: true,
        orderId: orderId,
        message: "결제가 완료되었습니다."
      });
      
    } catch (error: any) {
      console.error('결제 처리 오류:', error);
      
      // 포트원 오류 상세 로깅
      let errorMessage = "결제 중 오류가 발생했습니다.";
      
      if (error.__portOneErrorType === 'PaymentError') {
        errorMessage = `결제 오류: ${error.code || 'unknown'}`;
        console.error('포트원 결제 오류 상세:', {
          type: error.__portOneErrorType,
          code: error.code,
          message: error.message
        });
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setPaymentResult({
        success: false,
        message: errorMessage
      });
      
      toast({
        title: "결제 오류",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // 대화 페이지로 이동
  const goBackToConversation = () => {
    if (returnUrl && paymentResult?.success) {
      // 결제 성공 시 미리 지정된 반환 URL로 이동 (결제 상태 정보가 포함된 URL)
      console.log('결제 성공. 지정된 반환 URL로 이동:', decodeURIComponent(returnUrl));
      setLocation(decodeURIComponent(returnUrl));
    } else if (returnUrl && !paymentResult?.success) {
      // 결제 실패 시 실패 정보를 담아서 반환
      console.log('결제 실패. 오류 정보와 함께 지정된 반환 URL로 이동');
      const errorUrl = new URL(decodeURIComponent(returnUrl), window.location.origin);
      errorUrl.searchParams.set('paymentStatus', 'failed');
      setLocation(errorUrl.pathname + errorUrl.search);
    } else {
      // 기존 로직 유지 (지정된 반환 URL이 없는 경우)
      setLocation(conversationId ? `/ai-consultation?conversation=${conversationId}` : `/ai-consultation`);
    }
  };
  
  return (
    <DashboardLayout>
      <div className="container max-w-lg mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>
              {paymentResult ? (
                paymentResult.success ? "결제 완료" : "결제 실패"
              ) : "결제 정보 확인"}
            </CardTitle>
            <CardDescription>
              {paymentResult ? 
                (paymentResult.success ? 
                  "결제가 성공적으로 완료되었습니다." : 
                  "결제가 완료되지 않았습니다. 아래 내용을 확인해주세요.") : 
                "결제를 진행하기 전에 정보를 확인해주세요."}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {!paymentResult ? (
              <>
                <div className="p-4 border rounded-md">
                  <h3 className="font-medium mb-2">주문 정보</h3>
                  <dl className="space-y-1">
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">상품명:</dt>
                      <dd className="text-sm font-medium">{productName}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">가격:</dt>
                      <dd className="text-sm font-medium">{parseInt(price || '0').toLocaleString()}원</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">주문번호:</dt>
                      <dd className="text-sm font-medium">{orderId}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">구매자:</dt>
                      <dd className="text-sm font-medium">{user?.username || '게스트'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">이메일:</dt>
                      <dd className="text-sm font-medium">{user?.email || '-'}</dd>
                    </div>
                  </dl>
                </div>
                
                <div className="bg-muted/50 p-3 rounded-md text-sm">
                  <p>결제 버튼을 클릭하면 카드 결제 창이 열립니다. 테스트 결제는 실제 결제가 이루어지지 않습니다.</p>
                </div>
              </>
            ) : (
              <div className={`p-4 rounded-md ${paymentResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-center mb-3">
                  {paymentResult.success ? (
                    <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                  ) : (
                    <div className="mr-2 h-5 w-5 text-red-500">❌</div>
                  )}
                  <h3 className="font-medium">{paymentResult.success ? '결제 성공' : '결제 실패'}</h3>
                </div>
                <p className="text-sm">{paymentResult.message}</p>
                {paymentResult.success && paymentResult.orderId && (
                  <div className="mt-2 text-sm font-medium">
                    주문번호: {paymentResult.orderId}
                  </div>
                )}
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-2">
            {!paymentResult ? (
              <div className="w-full space-y-2">
                <Button 
                  className="w-full" 
                  onClick={handleSdkPayment}
                  disabled={isLoading || !orderId || !price}
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
                
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={goBackToConversation}
                  disabled={isLoading}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  대화로 돌아가기
                </Button>
              </div>
            ) : (
              <Button 
                className="w-full" 
                onClick={goBackToConversation}
                variant={paymentResult.success ? "default" : "outline"}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                대화로 돌아가기
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
}
