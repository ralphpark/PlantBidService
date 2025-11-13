import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Send, 
  FileText, 
  DollarSign, 
  TrendingUp,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function VendorCommission() {
  const [globalCommissionRate, setGlobalCommissionRate] = useState(10); // 기본 10%
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 결제 완료된 주문 데이터 가져오기 (payments API 사용)
  const { data: allPayments, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/payments');
      if (!response.ok) {
        throw new Error('결제 내역을 불러오지 못했습니다.');
      }
      return response.json();
    }
  });

  // 실제 결제 완료된 주문만 표시 (VendorPayments와 동일한 로직)
  const completedOrders = allPayments?.filter((payment: any) => {
    // VendorPayments와 동일한 완료 조건 적용
    return ['completed', 'COMPLETED', 'success'].includes(payment.status);
  }) || [];

  // 판매자 데이터 가져오기
  const { data: vendors, isLoading: vendorsLoading } = useQuery({
    queryKey: ['admin-vendors'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/vendors');
      if (!response.ok) {
        throw new Error('판매자 데이터를 불러오지 못했습니다.');
      }
      return response.json();
    }
  });

  // 수수료율 업데이트 mutation
  const updateCommissionRateMutation = useMutation({
    mutationFn: async (rate: number) => {
      const response = await apiRequest('PUT', '/api/admin/commission-rate', { rate });
      if (!response.ok) {
        throw new Error('수수료율 업데이트에 실패했습니다.');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "수수료율이 업데이트되었습니다",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "오류가 발생했습니다",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 세금계산서 발행 mutation
  const issueTaxInvoiceMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiRequest('POST', `/api/admin/issue-tax-invoice/${orderId}`);
      if (!response.ok) {
        throw new Error('세금계산서 발행에 실패했습니다.');
      }
      return response.json();
    },
    onSuccess: (data, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['completed-orders'] });
      toast({
        title: "세금계산서가 발행되었습니다",
        description: `주문 ${orderId}의 세금계산서가 성공적으로 발행되었습니다.`,
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "세금계산서 발행 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 송금 처리 mutation
  const processTransferMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiRequest('POST', `/api/admin/process-transfer/${orderId}`);
      if (!response.ok) {
        throw new Error('송금 처리에 실패했습니다.');
      }
      return response.json();
    },
    onSuccess: (data, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['completed-orders'] });
      toast({
        title: "송금이 완료되었습니다",
        description: `주문 ${orderId}의 송금이 성공적으로 처리되었습니다.`,
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "송금 처리 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 일괄 세금계산서 발행 mutation
  const bulkIssueTaxInvoiceMutation = useMutation({
    mutationFn: async () => {
      const pendingOrders = completedOrders?.filter((order: any) => !order.taxInvoiceIssued);
      const response = await apiRequest('POST', '/api/admin/bulk-issue-tax-invoice', {
        orderIds: pendingOrders?.map((order: any) => order.id)
      });
      if (!response.ok) {
        throw new Error('일괄 세금계산서 발행에 실패했습니다.');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['completed-orders'] });
      toast({
        title: "일괄 세금계산서 발행 완료",
        description: "모든 대상 주문의 세금계산서가 발행되었습니다.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "일괄 발행 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 일괄 송금 처리 mutation
  const bulkProcessTransferMutation = useMutation({
    mutationFn: async () => {
      const pendingOrders = completedOrders?.filter((order: any) => !order.transferCompleted);
      const response = await apiRequest('POST', '/api/admin/bulk-process-transfer', {
        orderIds: pendingOrders?.map((order: any) => order.id)
      });
      if (!response.ok) {
        throw new Error('일괄 송금 처리에 실패했습니다.');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['completed-orders'] });
      toast({
        title: "일괄 송금 처리 완료",
        description: "모든 대상 주문의 송금이 완료되었습니다.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "일괄 송금 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 수수료율 저장 핸들러
  const handleSaveCommissionRate = () => {
    updateCommissionRateMutation.mutate(globalCommissionRate);
  };

  // 금액 계산 함수
  const calculateAmounts = (totalAmount: number) => {
    const platformFee = Math.round(totalAmount * (globalCommissionRate / 100));
    const vendorAmount = totalAmount - platformFee;
    return { platformFee, vendorAmount };
  };

  // 통계 계산
  const statistics = React.useMemo(() => {
    if (!completedOrders) return { totalRevenue: 0, totalPlatformFee: 0, totalVendorAmount: 0 };
    
    let totalRevenue = 0;
    let totalPlatformFee = 0;
    let totalVendorAmount = 0;

    completedOrders.forEach((order: any) => {
      const amount = parseFloat(order.amount) || 0;
      const { platformFee, vendorAmount } = calculateAmounts(amount);
      
      totalRevenue += amount;
      totalPlatformFee += platformFee;
      totalVendorAmount += vendorAmount;
    });

    return { totalRevenue, totalPlatformFee, totalVendorAmount };
  }, [completedOrders, globalCommissionRate]);

  // 로딩 중 표시
  if (ordersLoading || vendorsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold">수수료 관리</h2>
        <div className="flex gap-2">
          <Button 
            onClick={() => bulkIssueTaxInvoiceMutation.mutate()}
            disabled={bulkIssueTaxInvoiceMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <FileText className="mr-2 h-4 w-4" />
            {bulkIssueTaxInvoiceMutation.isPending ? '발행 중...' : '일괄 세금계산서 발행'}
          </Button>
          <Button 
            onClick={() => bulkProcessTransferMutation.mutate()}
            disabled={bulkProcessTransferMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            <Send className="mr-2 h-4 w-4" />
            {bulkProcessTransferMutation.isPending ? '송금 중...' : '일괄 송금'}
          </Button>
        </div>
      </div>

      {/* 수수료율 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            수수료율 설정
          </CardTitle>
          <CardDescription>
            플랫폼 수수료율을 설정합니다. 판매자는 (100% - 수수료율)만큼 받게 됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label htmlFor="commission-rate">수수료율 (%)</Label>
            <Input
              id="commission-rate"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={globalCommissionRate}
              onChange={(e) => setGlobalCommissionRate(parseFloat(e.target.value) || 0)}
              className="w-32"
            />
            <Button 
              onClick={handleSaveCommissionRate}
              disabled={updateCommissionRateMutation.isPending}
            >
              {updateCommissionRateMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              예시: 수수료율 {globalCommissionRate}% 설정 시, 1,000원 주문에서 플랫폼 수수료 {Math.round(1000 * (globalCommissionRate / 100))}원, 판매자 수령액 {1000 - Math.round(1000 * (globalCommissionRate / 100))}원
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 매출액</p>
                <p className="text-2xl font-bold">{statistics.totalRevenue.toLocaleString()}원</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">플랫폼 수수료</p>
                <p className="text-2xl font-bold text-green-600">{statistics.totalPlatformFee.toLocaleString()}원</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">판매자 총 수령액</p>
                <p className="text-2xl font-bold text-purple-600">{statistics.totalVendorAmount.toLocaleString()}원</p>
              </div>
              <CreditCard className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 결제 완료 리스트 */}
      <Card>
        <CardHeader>
          <CardTitle>결제 완료 주문 목록</CardTitle>
          <CardDescription>
            결제가 완료된 주문들의 수수료 계산 및 세금계산서 발행, 송금 처리를 관리합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!completedOrders || completedOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-lg text-gray-500">결제 완료된 주문이 없습니다.</p>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>주문ID</TableHead>
                    <TableHead>판매자</TableHead>
                    <TableHead>결제금액</TableHead>
                    <TableHead>수수료 ({globalCommissionRate}%)</TableHead>
                    <TableHead>판매자 수령액</TableHead>
                    <TableHead>세금계산서</TableHead>
                    <TableHead>송금상태</TableHead>
                    <TableHead className="text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedOrders.map((order: any) => {
                    const vendor = vendors?.find((v: any) => v.id === order.vendorId);
                    const totalAmount = parseFloat(order.amount) || 0;
                    const { platformFee, vendorAmount } = calculateAmounts(totalAmount);
                    
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.orderId || order.id}</TableCell>
                        <TableCell>{vendor?.storeName || vendor?.name || '알 수 없음'}</TableCell>
                        <TableCell className="font-medium">{totalAmount.toLocaleString()}원</TableCell>
                        <TableCell className="text-green-600 font-medium">{platformFee.toLocaleString()}원</TableCell>
                        <TableCell className="text-blue-600 font-medium">{vendorAmount.toLocaleString()}원</TableCell>
                        <TableCell>
                          {order.taxInvoiceIssued ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              발행완료
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              미발행
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {order.transferCompleted ? (
                            <Badge variant="default" className="bg-blue-100 text-blue-800">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              송금완료
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              미송금
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              disabled={order.taxInvoiceIssued || issueTaxInvoiceMutation.isPending}
                              onClick={() => issueTaxInvoiceMutation.mutate(order.id)}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              disabled={order.transferCompleted || processTransferMutation.isPending}
                              onClick={() => processTransferMutation.mutate(order.id)}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}