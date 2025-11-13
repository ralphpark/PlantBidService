import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import PortOneSDKV2Payment from '@/components/payment/portone-sdk-v2-payment';
import PortOneBrowserPayment from '@/components/payment/portone-browser-sdk-payment';

export default function PaymentTestPage() {
  const [orderId, setOrderId] = useState(`order-${Date.now()}`);
  const [amount, setAmount] = useState('10000');
  const [productName, setProductName] = useState('테스트 상품');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  // 현재 사용자 정보 가져오기
  const { data: user, isLoading: isUserLoading } = useQuery<any>({
    queryKey: ['/api/user'],
    queryFn: async () => {
      const response = await axios.get('/api/user');
      return response.data;
    },
    retry: false
  });
  
  // 사용자 정보가 로드되면 필드 업데이트
  React.useEffect(() => {
    if (user) {
      setCustomerName(user.username || '');
      setCustomerEmail(user.email || '');
      setCustomerPhone(user.phone || '');
    }
  }, [user]);

  // 서버 API를 통한 결제 처리
  const handleServerPayment = async () => {
    try {
      setIsLoading(true);
      setError('');
      setPaymentUrl('');
      setResult(null);

      // 주문 정보 생성 - 필수 파라미터 추가
      const createOrderResponse = await axios.post('/api/orders', {
        orderId,
        vendorId: 3, // 판매자 ID (심다) 
        productId: 1, // 테스트용 상품 ID (알로카시아)
        conversationId: 147, // 대화 ID
        price: amount, // 가격
        // 구매자 정보 추가 (API 요구사항)
        buyerInfo: {
          name: customerName || '테스트 사용자',
          email: customerEmail || 'test@example.com',
          phone: customerPhone || '010-1234-5678',
          address: '서울시 강남구 삼성동 123-456',
          postcode: '06164'
        },
        // 수령인 정보 추가 (API 요구사항)
        recipientInfo: {
          name: customerName || '테스트 사용자',
          email: customerEmail || 'test@example.com',
          phone: customerPhone || '010-1234-5678',
          address: '서울시 강남구 삼성동 123-456',
          postcode: '06164'
        }
      });

      console.log('주문 생성 결과:', createOrderResponse.data);

      // 결제 처리 요청
      const response = await axios.post(`/api/payments/process/${orderId}`, {
        product_name: productName,
        amount,
        buyer_name: customerName,
        buyer_email: customerEmail,
        buyer_tel: customerPhone
      });

      console.log('결제 처리 응답:', response.data);

      if (response.data.success && response.data.checkoutUrl) {
        setPaymentUrl(response.data.checkoutUrl);
        setResult(response.data);

        // 새 창에서 결제 페이지 열기
        window.open(response.data.checkoutUrl, 'portOnePayment', 'width=800,height=700');
      } else {
        setError('결제 처리에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('결제 처리 오류:', err);
      setError(err.response?.data?.error || err.message || '결제 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 결제 창에서 메시지 수신 처리
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'payment_success') {
        alert('결제가 성공적으로 완료되었습니다!');
        fetchPaymentResult();
      } else if (event.data === 'payment_fail') {
        alert('결제에 실패했습니다.');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [orderId]);

  // 결제 결과 조회
  const fetchPaymentResult = async () => {
    try {
      const response = await axios.get(`/api/payments/order/${orderId}`);
      setResult(response.data);
    } catch (err: any) {
      console.error('결제 결과 조회 오류:', err);
    }
  };

  // 결제 완료 처리 콜백
  const handlePaymentComplete = (response: any) => {
    console.log('결제 완료됨:', response);
    setResult(response);
    fetchPaymentResult();
  };

  // 결제 에러 처리 콜백
  const handlePaymentError = (error: any) => {
    console.error('결제 에러:', error);
    setError(error.message || '결제 처리 중 오류가 발생했습니다.');
  };

  // 결제 실패 처리 콜백
  const handlePaymentFail = (error: any) => {
    console.error('결제 실패:', error);
    setError(error.displayMessage || error.message || '결제에 실패했습니다.');
  };

  return (
    <div className="container max-w-3xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>포트원 V2 API 결제 테스트</CardTitle>
          <CardDescription>
            다양한 결제 방식을 테스트할 수 있습니다.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Tabs defaultValue="form" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="form">기본 설정</TabsTrigger>
              <TabsTrigger value="sdk-v2">SDK V2 방식</TabsTrigger>
              <TabsTrigger value="browser-sdk">브라우저 SDK</TabsTrigger>
            </TabsList>
            
            <TabsContent value="form" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="orderId">주문번호</Label>
                <Input
                  id="orderId"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="주문번호를 입력하세요"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="productName">상품명</Label>
                <Input
                  id="productName"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="상품명을 입력하세요"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">결제금액 (원)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="결제 금액을 입력하세요"
                />
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <Label htmlFor="customerName">구매자 이름</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="구매자 이름을 입력하세요"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerEmail">구매자 이메일</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="구매자 이메일을 입력하세요"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerPhone">구매자 전화번호</Label>
                <Input
                  id="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="구매자 전화번호를 입력하세요"
                />
              </div>

              <Button 
                onClick={handleServerPayment} 
                disabled={isLoading || !orderId || !amount}
                className="w-full mt-4"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  '서버 API 방식 결제하기'
                )}
              </Button>
            </TabsContent>
            
            <TabsContent value="sdk-v2" className="space-y-4 mt-4">
              <div className="bg-blue-50 p-4 rounded-md mb-4">
                <h3 className="text-lg font-medium mb-2">포트원 V2 SDK 방식</h3>
                <p className="text-sm text-gray-600">
                  포트원이 제공하는 최신 SDK를 사용하는 방식으로, CSP 제한을 회피하고 안정적인 결제를 제공합니다.
                </p>
              </div>
              
              <PortOneSDKV2Payment 
                amount={parseInt(amount)}
                productName={productName}
                buyerName={customerName || '테스트 사용자'}
                buyerEmail={customerEmail}
                buyerTel={customerPhone}
                onComplete={handlePaymentComplete}
                onError={handlePaymentError}
                onPaymentFail={handlePaymentFail}
              />
            </TabsContent>
            
            <TabsContent value="browser-sdk" className="space-y-4 mt-4">
              <div className="bg-yellow-50 p-4 rounded-md mb-4">
                <h3 className="text-lg font-medium mb-2">브라우저 SDK 방식</h3>
                <p className="text-sm text-gray-600">
                  API 방식으로 결제 URL을 생성하고 리다이렉트하는 방식입니다. checkout.portone.io 도메인에 대한 접근이 필요합니다.
                </p>
              </div>
              
              <PortOneBrowserPayment
                orderId={orderId}
                amount={parseInt(amount)}
                productName={productName}
                buyerName={customerName}
                buyerEmail={customerEmail}
                buyerTel={customerPhone}
                onComplete={handlePaymentComplete}
                onError={handlePaymentError}
                onPaymentFail={handlePaymentFail}
              />
            </TabsContent>
          </Tabs>

          {error && (
            <div className="bg-red-50 text-red-800 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {paymentUrl && (
            <div className="bg-blue-50 text-blue-800 p-3 rounded-md">
              <p className="font-medium">결제 URL이 생성되었습니다:</p>
              <a 
                href={paymentUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 underline text-sm break-all"
              >
                {paymentUrl}
              </a>
            </div>
          )}

          {result && (
            <div className="bg-green-50 text-green-800 p-3 rounded-md">
              <p className="font-medium">결제 정보:</p>
              <pre className="text-xs overflow-auto whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
