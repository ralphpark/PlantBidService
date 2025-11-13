import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useLocation } from 'wouter';
import { Loader2, Package, ShoppingBag, Truck, CheckCircle2, AlertCircle, ChevronRight, CreditCard, Leaf } from 'lucide-react';

/**
 * 주문 상태별 배지 색상
 */
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'created':
      return <Badge variant="outline">주문 생성</Badge>;
    case 'paid':
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600">결제 완료</Badge>;
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
 * 주문 내역 페이지
 */
export default function OrderHistoryPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('user');
  
  // 사용자 주문 내역 조회
  const { 
    data: userOrders, 
    isLoading: isUserOrdersLoading,
    isError: isUserOrdersError,
    error: userOrdersError 
  } = useQuery({
    queryKey: ['user-orders'],
    queryFn: async () => {
      const response = await fetch('/api/orders/user/me');
      if (!response.ok) {
        throw new Error('주문 내역을 불러오는데 실패했습니다.');
      }
      return response.json();
    },
    enabled: !!user
  });
  
  // 판매자인 경우 판매자 주문 내역 조회
  const { 
    data: vendorOrders, 
    isLoading: isVendorOrdersLoading,
    isError: isVendorOrdersError,
    error: vendorOrdersError 
  } = useQuery({
    queryKey: ['vendor-orders'],
    queryFn: async () => {
      const response = await fetch('/api/orders/vendor/me');
      if (!response.ok) {
        throw new Error('판매자 주문 내역을 불러오는데 실패했습니다.');
      }
      return response.json();
    },
    enabled: !!user && (user.role === 'vendor' || user.role === 'admin')
  });
  
  // 주문 상세 페이지로 이동
  const goToOrderDetail = (orderId: string) => {
    navigate(`/order-detail/${orderId}`);
  };
  
  // 에러 발생 시 토스트 메시지 표시
  useEffect(() => {
    if (isUserOrdersError) {
      toast({
        title: '주문 내역 로드 실패',
        description: userOrdersError instanceof Error ? userOrdersError.message : '주문 내역을 불러오는데 실패했습니다.',
        variant: 'destructive'
      });
    }
    
    if (isVendorOrdersError) {
      toast({
        title: '판매자 주문 내역 로드 실패',
        description: vendorOrdersError instanceof Error ? vendorOrdersError.message : '판매자 주문 내역을 불러오는데 실패했습니다.',
        variant: 'destructive'
      });
    }
  }, [isUserOrdersError, isVendorOrdersError, userOrdersError, vendorOrdersError, toast]);
  
  // 권한에 따라 활성 탭 초기 설정
  useEffect(() => {
    if (user && (user.role === 'vendor' || user.role === 'admin')) {
      setActiveTab('vendor');
    } else {
      setActiveTab('user');
    }
  }, [user]);
  
  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">주문 내역</h1>
          <p className="text-muted-foreground">주문 및 결제 내역을 확인하세요.</p>
        </div>
        
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="user">내 주문</TabsTrigger>
            {user && (user.role === 'vendor' || user.role === 'admin') && (
              <TabsTrigger value="vendor">판매 주문</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="user" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>내 주문 내역</CardTitle>
                <CardDescription>
                  주문한 상품의 내역과 상태를 확인할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isUserOrdersLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : userOrders && userOrders.length > 0 ? (
                  <div className="space-y-4">
                    {userOrders.map((order: any) => (
                      <div 
                        key={order.id} 
                        className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => goToOrderDetail(order.orderId)}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <ShoppingBag className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="font-medium">주문번호: {order.orderId}</span>
                          </div>
                          {order.productName && (
                            <div className="flex items-center mt-1">
                              <Leaf className="h-4 w-4 mr-2 text-green-500" />
                              <span className="text-sm font-medium">{order.productName}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-sm text-muted-foreground">
                              {new Date(order.createdAt).toLocaleDateString('ko-KR', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div>
                            <span className="text-sm font-medium">
                              {(parseFloat(order.price) || 0).toLocaleString()}원
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 mt-2 md:mt-0">
                          {getStatusBadge(order.status)}
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">주문 내역이 없습니다</h3>
                    <p className="text-sm text-muted-foreground mt-1">아직 주문한 상품이 없습니다.</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => navigate('/')}
                    >
                      상품 둘러보기
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {user && (user.role === 'vendor' || user.role === 'admin') && (
            <TabsContent value="vendor" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>판매 주문 내역</CardTitle>
                  <CardDescription>
                    내 상점에서 판매된 상품의 주문 내역입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isVendorOrdersLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : vendorOrders && vendorOrders.length > 0 ? (
                    <div className="space-y-4">
                      {vendorOrders.map((order: any) => (
                        <div 
                          key={order.id} 
                          className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => goToOrderDetail(order.orderId)}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center">
                              <Truck className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span className="font-medium">주문번호: {order.orderId}</span>
                            </div>
                            {order.productName && (
                              <div className="flex items-center mt-1">
                                <Leaf className="h-4 w-4 mr-2 text-green-500" />
                                <span className="text-sm font-medium">{order.productName}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-sm text-muted-foreground">
                                {new Date(order.createdAt).toLocaleDateString('ko-KR', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <div>
                              <span className="text-sm font-medium">
                                {(parseFloat(order.price) || 0).toLocaleString()}원
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 mt-2 md:mt-0">
                            {getStatusBadge(order.status)}
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium">판매 주문 내역이 없습니다</h3>
                      <p className="text-sm text-muted-foreground mt-1">아직 판매된 상품이 없습니다.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
