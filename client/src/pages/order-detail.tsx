import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { 
  Loader2, 
  ArrowLeft, 
  CheckCircle2, 
  Truck, 
  MapPin, 
  RefreshCcw
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

/**
 * 주문 상태별 배지 색상
 */
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'created':
      return <Badge variant="outline">주문 생성</Badge>;
    case 'paid':
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600">결제 완료</Badge>;
    case 'preparing':
      return <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">상품 준비중</Badge>;
    case 'shipping':
      return <Badge variant="secondary">배송 중</Badge>;
    case 'delivered':
      return <Badge variant="default">배송 완료</Badge>;
    case 'completed':
      return <Badge variant="default">주문 완료</Badge>;
    case 'cancelled':
      return <Badge variant="destructive">주문 취소</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

/**
 * 주문 상세 페이지
 */
export default function OrderDetailPage() {
  // Hooks
  const { orderId } = useParams<{ orderId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  // 결제 취소 상태를 위한 상태값
  
  // 자동 동기화 함수
  const autoSyncPayment = useCallback(async () => {
    if (!orderId) return null;
    
    try {
      setIsSyncing(true);
      
      // 자동 동기화 API 호출 (Vite 미들웨어를 우회하는 직접 경로로 변경)
      const response = await fetch(`/__direct/payments/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ orderId })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('결제 정보 자동 동기화 실패:', data.error);
        return null;
      }
      
      console.log('결제 정보 자동 동기화 성공:', data);
      return data.payment;
      
    } catch (error) {
      console.error('결제 정보 자동 동기화 오류:', error);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [orderId, setIsSyncing]);
  
  // 주문 상세 정보 조회
  const { 
    data: order, 
    isLoading, 
    isError,
    error,
    refetch: refetchOrder
  } = useQuery({
    queryKey: [`order-${orderId}`],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) {
        throw new Error('주문 정보를 불러오는데 실패했습니다.');
      }
      return response.json();
    },
    enabled: !!orderId
  });
  
  // 결제 정보 조회 (직접 API 경로 사용)
  const { 
    data: payment,
    isLoading: isPaymentLoading,
    refetch: refetchPayment
  } = useQuery({
    queryKey: [`payment-${orderId}`],
    queryFn: async () => {
      // 직접 API 경로로 변경하여 Vite 미들웨어 우회
      const response = await fetch(`/__direct/payments/order/${orderId}`);
      if (!response.ok) {
        console.log('결제 정보 조회 실패:', orderId);
        return null; // 결제 정보가 없을 수 있으므로 오류로 처리하지 않음
      }
      const data = await response.json();
      console.log('결제 정보 조회 성공:', data);
      return data;
    },
    enabled: !!orderId && !!order
  });
  
  // 자동 동기화 시도 상태 관리
  const [syncAttempted, setSyncAttempted] = useState(false);
  
  // 주문 상태 자동 업데이트 함수
  const updateOrderStatusFromPayment = useCallback(async () => {
    if (!order || !payment || !orderId) return;
    
    // 주문 상태와 결제 상태가 일치하지 않는 경우 자동 업데이트
    // "created" 상태이지만 결제 정보가 "success"인 경우 "paid"로 업데이트
    if (order.status === 'created' && 
        (payment.status === 'success' || payment.status === 'SUCCESS')) {
      console.log('주문 상태를 "paid"로 자동 업데이트합니다:', orderId);
      
      try {
        const response = await fetch(`/api/orders/${orderId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'paid' })
        });
        
        if (response.ok) {
          console.log('주문 상태 업데이트 성공');
          // 주문 정보 새로고침
          refetchOrder();
        } else {
          console.error('주문 상태 업데이트 실패');
        }
      } catch (error) {
        console.error('주문 상태 업데이트 오류:', error);
      }
    }
  }, [order, payment, orderId, refetchOrder]);
  
  // 자동 동기화 효과
  useEffect(() => {
    // 주문 정보가 있지만 결제 정보가 없는 경우에 자동 동기화 시도 (한 번만 시도)
    // 주문 상태를 체크하지 않고, 모든 주문에 대해 시도
    if (order && !payment && !syncAttempted && !isPaymentLoading) {
      console.log('결제 정보가 없는 주문을 발견하여 자동 동기화를 시도합니다:', orderId);
      setSyncAttempted(true); // 시도 한 번만 하도록 표시
      setIsSyncing(true);
      
      autoSyncPayment().then(syncedPayment => {
        if (syncedPayment) {
          console.log('결제 정보 동기화 성공. 데이터 리로드:', syncedPayment);
          refetchPayment();
        } else {
          console.log('결제 정보를 찾을 수 없습니다.');
        }
        setIsSyncing(false);
      }).catch((error) => {
        console.error('결제 정보 동기화 오류:', error);
        setIsSyncing(false);
      });
    }
  }, [order, payment, autoSyncPayment, refetchPayment, syncAttempted, isPaymentLoading, setIsSyncing, orderId]);
  
  // 결제 정보가 로드되면 주문 상태 업데이트 시도
  useEffect(() => {
    if (order && payment && !isPaymentLoading) {
      updateOrderStatusFromPayment();
    }
  }, [order, payment, isPaymentLoading, updateOrderStatusFromPayment]);
  
  // 판매자 전용: 주문 상태 업데이트
  const updateOrderStatus = async (status: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) {
        throw new Error('주문 상태를 업데이트하는데 실패했습니다.');
      }
      
      toast({
        title: '주문 상태 업데이트',
        description: '주문 상태가 업데이트되었습니다.',
        variant: 'default'
      });
      
      // 데이터 리프레쉬
      window.location.reload();
      
    } catch (error: any) {
      toast({
        title: '주문 상태 업데이트 실패',
        description: error.message || '주문 상태를 업데이트하는데 실패했습니다.',
        variant: 'destructive'
      });
    }
  };
  
  // 결제 취소 기능 - 포트원 V2 API 사용한 최종 버전
  const cancelPayment = async () => {
    if (!orderId || !payment?.paymentKey) {
      toast({
        title: '결제 취소 실패',
        description: '주문 정보 또는 결제 키가 없습니다.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setIsCancelling(true);
      
      // UI에 로딩 메시지 표시
      toast({
        title: '결제 취소 요청 중...', 
        description: '결제 취소가 진행 중입니다. 잠시만 기다려주세요.',
        variant: 'default'
      });
      
      console.log('결제 취소 시작 - 포트원 V2 API 사용');
      console.log('취소할 결제 정보:', {
        orderId,
        paymentKey: payment.paymentKey,
        status: payment.status
      });
      
      // 직접 라우터 엔드포인트 사용 (가이드에 따른 변경)
      const endpoint = '/__direct/payments/cancel';
      
      // 결제 취소 API 호출 (Accept 헤더 추가 - 가이드에 따른 변경)
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ 
          orderId,
          reason: '고객 요청에 의한 취소',
          paymentKey: payment.paymentKey
        })
      });
      
      // 매우 강화된 응답 처리 - 모든 예외 상황 처리
      let data;
      
      try {
        // 응답 상태 확인 로깅
        console.log(`결제 취소 API 응답 상태: ${response.status} ${response.statusText}`);
        console.log('응답 헤더:', {
          'content-type': response.headers.get('content-type'),
          'date': response.headers.get('date'),
          'x-powered-by': response.headers.get('x-powered-by')
        });
        
        // 응답 형식 확인
        const contentType = response.headers.get('content-type') || '';
        console.log('컨텐츠 타입:', contentType);
        
        // 응답 텍스트 가져오기
        const responseText = await response.text();
        
        // 텍스트 로깅 및 길이 체크
        const textPreview = responseText.length > 100 
          ? responseText.substring(0, 100) + '...' 
          : responseText;
        console.log(`응답 텍스트 (${responseText.length}바이트):`, textPreview);
        
        // 빈 응답 처리
        if (!responseText || !responseText.trim()) {
          console.log('빈 응답 감지 - 기본 성공 데이터 사용');
          data = { 
            success: response.ok, 
            message: response.ok ? '결제 취소가 처리되었습니다.' : '결제 취소 중 오류가 발생했습니다.'
          };
        } 
        // HTML 응답 감지 및 처리
        else if (responseText.startsWith('<!DOCTYPE html>') || responseText.startsWith('<html')) {
          console.log('HTML 응답 감지 - 서버 재시작 필요');
          
          // 이 경우는 서버 오류이므로 명확하게 오류로 처리
          data = { 
            success: false, 
            message: '서버 오류: 새로고침 후 다시 시도해주세요.',
            htmlResponse: true,
            serverError: true
          };
          
          toast({
            variant: "destructive",
            title: "서버 오류",
            description: "서버가 올바르게 응답하지 않았습니다. 새로고침 후 다시 시도해주세요.",
            duration: 5000,
          });
          
          return;
        }
        // JSON 파싱 시도
        else {
          try {
            data = JSON.parse(responseText);
            console.log('JSON 파싱 성공:', data);
          } catch (parseError) {
            console.error('JSON 파싱 실패:', parseError);
            
            // 파싱 실패시 기본 성공 응답 생성
            if (response.ok) {
              data = { 
                success: true, 
                message: '결제 취소 요청이 처리되었습니다만 응답을 해석할 수 없습니다.'
              };
            } else {
              throw new Error('서버 응답을 파싱할 수 없습니다: ' + textPreview);
            }
          }
        }
        
        // 응답이 명시적으로 실패를 반환했을 경우 에러 처리
        if (data && data.success === false) {
          throw new Error(data.error || data.message || '결제 취소 처리 실패');
        }
      } catch (e) {
        console.error('응답 처리 중 오류:', e);
        throw e;
      }
      console.log('결제 취소 API 응답:', data);
      
      // 모달 닫기
      setIsCancelModalOpen(false);
      
      // 결제 취소 상태에 따른 메시지 표시
      if (data.success) {
        // 포트원 API 성공 여부에 따라 메시지 구분
        if (data.apiCallSuccess) {
          toast({
            title: '결제 취소 완료 - PG 통합 성공', 
            description: '결제가 성공적으로 취소되었습니다.',
            variant: 'default'
          });
        } else {
          toast({
            title: '결제 취소 완료 - DB 업데이트 성공', 
            description: '결제 정보가 취소 상태로 업데이트되었습니다.',
            variant: 'default'
          });
        }
        
        // 데이터 새로고침
        await Promise.all([refetchPayment(), refetchOrder()]);
        
        // 추가 지연 후 한 번 더 데이터 새로고침 (경쟁 상태 문제 해결)
        setTimeout(async () => {
          await Promise.all([refetchPayment(), refetchOrder()]);
          console.log('추가 데이터 새로고침 완료');
          
          // 여전히 상태가 변경되지 않았다면 전체 페이지 새로고침
          if (order?.status !== 'cancelled') {
            console.log('주문 상태가 여전히 변경되지 않아 페이지 새로고침');
            window.location.reload();
          }
        }, 1500);
      } else {
        // API 호출은 성공했지만 결제 취소에 실패한 경우
        throw new Error(data.error || '결제 취소 처리 중 오류가 발생했습니다.');
      }
      
    } catch (error: any) {
      console.error('결제 취소 중 예상치 못한 오류:', error);
      toast({
        title: '결제 취소 중 오류',
        description: '오류가 발생했지만 취소가 진행되었을 수 있습니다. 확인을 위해 페이지를 새로고침합니다.',
        variant: 'default'
      });
      
      // 오류가 발생해도 새로고침하여 UI 업데이트
      setTimeout(() => {
        Promise.all([refetchPayment(), refetchOrder()])
          .then(() => {
            setIsCancelModalOpen(false);
          })
          .catch(() => {
            // 실패하면 전체 페이지 리로드
            window.location.reload();
          });
      }, 1000);
    } finally {
      setIsCancelling(false);
    }
  };
  
  // 취소된 주문 처리는 이제 취소 완료 상태 표시로 대체

  // 장바구니 페이지로 이동
  const goBack = () => {
    navigate('/order-history');
  };
  
  // 로딩 상태
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container py-10 flex justify-center items-center">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">주문 정보를 불러오는 중...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }
  
  // 오류 상태
  if (isError || !order) {
    return (
      <DashboardLayout>
        <div className="container py-10">
          <div className="max-w-md mx-auto text-center p-6 border rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-10 w-10 text-destructive mx-auto mb-4"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h2 className="text-xl font-bold">주문을 찾을 수 없습니다</h2>
            <p className="text-muted-foreground mt-2">
              {error instanceof Error ? error.message : '요청하신 주문이 존재하지 않거나 접근 권한이 없습니다.'}
            </p>
            <Button onClick={goBack} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" /> 주문 목록으로 돌아가기
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }
  
  // 주문 데이터 구조 분해
  const { 
    status, 
    buyerInfo, 
    recipientInfo, 
    price, 
    createdAt,
    productId, 
    vendorId,
    paymentInfo,
    trackingInfo,
  } = order;
  
  // 상태 변수들
  const isVendor = user && (user.role === 'vendor' || user.role === 'admin') && user.id === vendorId;
  const isPaid = status === 'paid' || status === 'shipping' || status === 'delivered' || status === 'completed';
  const isShipping = status === 'shipping' || status === 'delivered' || status === 'completed';
  const isDelivered = status === 'delivered' || status === 'completed';
  const isCompleted = status === 'completed';

  // 메인 UI 렌더링
  return (
    <DashboardLayout>
      <div className="container py-6 max-w-4xl">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={goBack}
            className="mr-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            돌아가기
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">주문 상세 정보</h1>
          <div className="ml-4">
            {getStatusBadge(status)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 주문 기본 정보 */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>주문 정보</CardTitle>
              <CardDescription>주문 번호: {orderId}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">주문 날짜</h3>
                <p className="text-sm mt-1">
                  {new Date(createdAt).toLocaleDateString('ko-KR', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium">결제 금액</h3>
                <p className="text-lg font-bold mt-1">
                  {parseFloat(price).toLocaleString()}원
                </p>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium">결제 정보</h3>
                <div className="text-sm mt-1">
                  {isPaymentLoading ? (
                    <p>결제 정보를 불러오는 중...</p>
                  ) : payment ? (
                    <div className="space-y-1">
                      <p><span className="font-medium">결제 수단:</span> {payment.method || '카드 결제'}</p>
                      <p><span className="font-medium">결제 상태:</span> {payment.status}</p>
                      {payment.approvedAt && (
                        <p>
                          <span className="font-medium">결제 승인 시간:</span>{' '}
                          {new Date(payment.approvedAt).toLocaleDateString('ko-KR', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      )}
                      {payment.paymentKey && (
                        <p>
                          <span className="font-medium">결제 고유번호:</span>{' '}
                          {payment.paymentKey}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {isSyncing ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <p>결제 정보 가져오는 중...</p>
                        </div>
                      ) : isPaid ? (
                        <div className="space-y-2">
                          <p>결제 정보가 없습니다.</p>
                          <p className="text-xs text-muted-foreground">결제가 완료된 주문이지만 결제 정보를 찾을 수 없습니다.</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => {
                              setIsSyncing(true);
                              autoSyncPayment().then(syncedPayment => {
                                if (syncedPayment) {
                                  toast({
                                    title: '결제 정보 동기화 성공',
                                    description: '결제 정보가 성공적으로 동기화되었습니다.',
                                    variant: 'default'
                                  });
                                  refetchPayment();
                                } else {
                                  toast({
                                    title: '결제 정보 동기화 실패',
                                    description: '결제 정보를 찾을 수 없습니다. KG 이니시스 결제 보류를 확인해주세요.',
                                    variant: 'destructive'
                                  });
                                }
                                setIsSyncing(false);
                              }).catch(error => {
                                console.error('결제 정보 동기화 오류:', error);
                                toast({
                                  title: '결제 정보 동기화 오류',
                                  description: '결제 정보를 동기화하는 중 오류가 발생했습니다.',
                                  variant: 'destructive'
                                });
                                setIsSyncing(false);
                              });
                            }}
                          >
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            결제 정보 동기화
                          </Button>
                        </div>
                      ) : (
                        <p>결제 정보가 없습니다.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {isShipping && trackingInfo && (
                <div>
                  <h3 className="text-sm font-medium">배송 정보</h3>
                  <div className="text-sm mt-1 space-y-1">
                    {trackingInfo.company && <p><span className="font-medium">배송업체:</span> {trackingInfo.company}</p>}
                    {trackingInfo.trackingNumber && (
                      <p>
                        <span className="font-medium">송장번호:</span>{' '}
                        {trackingInfo.trackingNumber}
                      </p>
                    )}
                    {trackingInfo.shippingDate && (
                      <p>
                        <span className="font-medium">배송일:</span>{' '}
                        {new Date(trackingInfo.shippingDate).toLocaleDateString('ko-KR')}
                      </p>
                    )}
                    {trackingInfo.estimatedDeliveryDate && (
                      <p>
                        <span className="font-medium">예상 배송일:</span>{' '}
                        {new Date(trackingInfo.estimatedDeliveryDate).toLocaleDateString('ko-KR')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2">
              {/* 판매자 관리 기능 */}
              {isVendor && (
                <>
                  {status === 'paid' && (
                    <Button 
                      onClick={() => updateOrderStatus('shipping')}
                      className="flex-1"
                    >
                      <Truck className="mr-2 h-4 w-4" />
                      배송 시작
                    </Button>
                  )}
                  {status === 'shipping' && (
                    <Button 
                      onClick={() => updateOrderStatus('delivered')}
                      className="flex-1"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      배송 완료
                    </Button>
                  )}
                  {status === 'delivered' && (
                    <Button 
                      onClick={() => updateOrderStatus('completed')}
                      className="flex-1"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      주문 완료
                    </Button>
                  )}
                </>
              )}
              
              {/* 구매자 결제 취소 기능 - 결제 정보가 있는 경우 (주문 생성이나 결제 완료 상태일 때) */}
              {!isVendor && status === 'preparing' && payment && (
                <Button 
                  variant="outline" 
                  className="flex-1 mt-2 border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-50"
                  disabled
                >
                  <Loader2 className="mr-2 h-4 w-4" />
                  상품 준비중 (취소 불가)
                </Button>
              )}
              
              {!isVendor && (status === 'paid' || status === 'created') && payment && (payment.status === 'success' || payment.status === 'SUCCESS' || payment.status === 'COMPLETED') && (
                <AlertDialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      className="flex-1"
                    >
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      결제 취소
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>결제 취소</AlertDialogTitle>
                      <AlertDialogDescription>
                        정말로 이 주문의 결제를 취소하시겠습니까? 
                        취소 후에는 이 작업을 중단할 수 없습니다.                        
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={cancelPayment}
                        disabled={isCancelling}
                      >
                        {isCancelling ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            취소 중...
                          </>
                        ) : (
                          '결제 취소하기'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              
              {/* 취소된 결제에 대한 상태 표시 */}
              {status === 'cancelled' && payment && (payment.status === 'CANCELLED' || payment.status === 'cancelled') && (
                <Button 
                  variant="outline" 
                  className="flex-1 mt-2 border-gray-300 text-gray-600 bg-gray-50 hover:bg-gray-100"
                  disabled
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  결제 취소 완료
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* 구매자 및 수령인 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>배송 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-medium">구매자 정보</h3>
                <div className="text-sm mt-1 space-y-1">
                  <p><span className="font-medium">이름:</span> {buyerInfo.name}</p>
                  <p><span className="font-medium">연락처:</span> {buyerInfo.phone}</p>
                  {buyerInfo.email && <p><span className="font-medium">이메일:</span> {buyerInfo.email}</p>}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium">배송지 정보</h3>
                <div className="text-sm mt-1 space-y-1">
                  <p><span className="font-medium">수령인:</span> {recipientInfo.name}</p>
                  <p><span className="font-medium">연락처:</span> {recipientInfo.phone}</p>
                  <div className="flex items-start mt-1">
                    <MapPin className="h-4 w-4 mr-1 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <p>
                      {recipientInfo.address}
                      {recipientInfo.addressDetail && (
                        <span className="block mt-1 text-muted-foreground">
                          {recipientInfo.addressDetail}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}