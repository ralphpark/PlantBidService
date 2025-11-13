import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { Search, Download, X, Eye } from 'lucide-react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';

export default function VendorPayments() {
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [viewOrderDetails, setViewOrderDetails] = useState<any>(null);

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

  // 결제 완료 내역 가져오기 (완료 상태만 필터링)
  const { data: payments, isLoading: paymentsLoading, isError } = useQuery({
    queryKey: ['admin-payments', selectedVendor, selectedStatus, dateRange],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/payments');
      if (!response.ok) {
        throw new Error('결제 내역을 불러오지 못했습니다.');
      }
      return response.json();
    },
    staleTime: 0, // 즉시 스테일로 처리
    gcTime: 0     // 가비지 컬렉션 시간 0으로 설정
  });

  // 모든 결제 내역 표시 (VendorPayments는 전체 리스트 표시)
  const completedPayments = payments || [];

  // 검색어로 추가 필터링
  const filteredPayments = completedPayments.filter((payment: any) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      (payment.orderId && payment.orderId.toLowerCase().includes(searchLower)) ||
      (payment.customerName && payment.customerName.toLowerCase().includes(searchLower)) ||
      (payment.productName && payment.productName.toLowerCase().includes(searchLower))
    );
  });

  // 결제 상태별 색상 구분
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'preparing':
        return 'bg-blue-100 text-blue-800';
      case 'shipping':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 결제 상태 한글 변환
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return '결제완료';
      case 'preparing':
        return '상품준비중';
      case 'shipping':
        return '배송중';
      case 'completed':
        return '배송완료';
      case 'cancelled':
        return '주문취소';
      case 'refunded':
        return '환불완료';
      default:
        return status;
    }
  };

  // CSV 다운로드 함수
  const downloadCSV = () => {
    if (!filteredPayments) return;
    
    // CSV 헤더
    let csvContent = "주문ID,주문일자,고객명,상품명,판매자,금액,상태\n";
    
    // 데이터 행 추가
    filteredPayments.forEach((payment: any) => {
      const row = [
        payment.orderId,
        new Date(payment.orderDate).toLocaleDateString(),
        payment.customerName,
        payment.productName,
        payment.vendorName,
        payment.amount,
        getStatusLabel(payment.status)
      ];
      
      // 쉼표가 포함된 필드는 따옴표로 묶음
      const formattedRow = row.map(cell => {
        if (cell && cell.toString().includes(',')) {
          return `"${cell}"`;
        }
        return cell;
      });
      
      csvContent += formattedRow.join(',') + "\n";
    });
    
    // CSV 파일 다운로드
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `payments_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 주문 상세 보기
  const handleViewOrder = (payment: any) => {
    setViewOrderDetails(payment);
  };

  // 로딩 중 표시
  if (paymentsLoading || vendorsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // 에러 발생 시 표시
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-red-500 mb-4">데이터를 불러오는 중 오류가 발생했습니다.</p>
        <Button onClick={() => window.location.reload()}>새로고침</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold">판매자별 결제 내역</h2>
        <Button variant="outline" onClick={downloadCSV}>
          <Download className="mr-2 h-4 w-4" /> CSV 다운로드
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">총 주문 건수</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{payments?.length || 0}건</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">완료 결제금액</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {payments
                ? payments
                    .filter((p: any) => ['completed', 'COMPLETED', 'success'].includes(p.status))
                    .reduce((sum: number, p: any) => sum + parseInt(p.displayAmount || p.amount || 0), 0)
                    .toLocaleString()
                : 0}원
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">완료된 주문</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {payments
                ? payments.filter((p: any) => ['completed', 'COMPLETED', 'success'].includes(p.status)).length
                : 0}건
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">취소/환불 주문</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {payments
                ? payments.filter((p: any) => ['cancelled', 'refunded', 'CANCELLED', 'FAILED'].includes(p.status)).length
                : 0}건
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">미결제/진행중</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {payments
                ? payments.filter((p: any) => 
                    !['completed', 'COMPLETED', 'success', 'cancelled', 'refunded', 'CANCELLED', 'FAILED'].includes(p.status)
                  ).length
                : 0}건
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full">
          <div>
            <label className="text-sm font-medium mb-1 block">판매자 선택</label>
            <Select value={selectedVendor} onValueChange={setSelectedVendor}>
              <SelectTrigger>
                <SelectValue placeholder="모든 판매자" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 판매자</SelectItem>
                {vendors?.map((vendor: any) => (
                  <SelectItem key={vendor.id} value={vendor.id.toString()}>
                    {vendor.storeName || vendor.name} (ID: {vendor.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1 block">주문 상태</label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="모든 상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 상태</SelectItem>
                <SelectItem value="paid">결제완료</SelectItem>
                <SelectItem value="preparing">상품준비중</SelectItem>
                <SelectItem value="shipping">배송중</SelectItem>
                <SelectItem value="completed">배송완료</SelectItem>
                <SelectItem value="cancelled">주문취소</SelectItem>
                <SelectItem value="refunded">환불완료</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1 block">시작일</label>
            <Input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1 block">종료일</label>
            <Input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            />
          </div>
        </div>
        
        <div className="w-full md:w-64">
          <label className="text-sm font-medium mb-1 block">검색</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="주문ID/고객/상품 검색..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            )}
          </div>
        </div>
      </div>

      {filteredPayments?.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-lg text-gray-500">표시할 결제 내역이 없습니다.</p>
        </div>
      ) : (
        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>주문ID</TableHead>
                <TableHead>주문일시</TableHead>
                <TableHead>고객명</TableHead>
                <TableHead>상품명</TableHead>
                <TableHead>판매자</TableHead>
                <TableHead>금액</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments?.map((payment: any) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.orderId}</TableCell>
                  <TableCell>{new Date(payment.orderDate).toLocaleString()}</TableCell>
                  <TableCell>{payment.customerName}</TableCell>
                  <TableCell>{payment.productName}</TableCell>
                  <TableCell>{payment.vendorName}</TableCell>
                  <TableCell>
                    {payment.displayAmount ? 
                      <>
                        {`${Number(payment.displayAmount).toLocaleString()}원`}
                        {payment.isZeroAmount && (
                          <span className="text-xs text-orange-500 ml-2">
                            (실제금액)
                          </span>
                        )}
                      </> : 
                      '0원'
                    }
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(payment.status)}>
                      {getStatusLabel(payment.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleViewOrder(payment)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 주문 상세 다이얼로그 */}
      <Dialog open={!!viewOrderDetails} onOpenChange={(open) => !open && setViewOrderDetails(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>주문 상세 정보</DialogTitle>
          </DialogHeader>
          
          {viewOrderDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">주문 ID</p>
                  <p className="font-medium">{viewOrderDetails.orderId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">주문 상태</p>
                  <Badge className={getStatusColor(viewOrderDetails.status)}>
                    {getStatusLabel(viewOrderDetails.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">주문일시</p>
                  <p>{new Date(viewOrderDetails.orderDate).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">금액</p>
                  <p className="font-medium">{parseInt(viewOrderDetails.amount).toLocaleString()}원</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">고객명</p>
                  <p>{viewOrderDetails.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">연락처</p>
                  <p>{viewOrderDetails.customerPhone || '-'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">배송 주소</p>
                  <p>{viewOrderDetails.shippingAddress || '-'}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <p className="font-medium mb-2">주문 상품 정보</p>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>상품명</TableHead>
                        <TableHead>가격</TableHead>
                        <TableHead>수량</TableHead>
                        <TableHead className="text-right">합계</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">{viewOrderDetails.productName}</TableCell>
                        <TableCell>{parseInt(viewOrderDetails.amount).toLocaleString()}원</TableCell>
                        <TableCell>1</TableCell>
                        <TableCell className="text-right">{parseInt(viewOrderDetails.amount).toLocaleString()}원</TableCell>
                      </TableRow>
                      {viewOrderDetails.additionalServices && (
                        <TableRow>
                          <TableCell className="font-medium">추가 서비스</TableCell>
                          <TableCell colSpan={2}>{viewOrderDetails.additionalServices}</TableCell>
                          <TableCell className="text-right">-</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              {viewOrderDetails.deliveryDate && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-500">배송 예정일</p>
                  <p>{new Date(viewOrderDetails.deliveryDate).toLocaleDateString()}</p>
                </div>
              )}
              
              {viewOrderDetails.notes && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-500">주문 메모</p>
                  <p>{viewOrderDetails.notes}</p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOrderDetails(null)}>
              닫기
            </Button>
            {/* 추가 기능을 확장할 수 있는 버튼들 */}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}