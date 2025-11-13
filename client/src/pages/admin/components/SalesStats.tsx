import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiRequest } from '@/lib/queryClient';

export default function SalesStats() {
  const [timeRange, setTimeRange] = useState('week');

  // 매출 데이터 가져오기
  const { data: salesData, isLoading, isError } = useQuery({
    queryKey: ['admin-sales', timeRange],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/admin/sales?timeRange=${timeRange}`);
      if (!response.ok) {
        throw new Error('매출 데이터를 불러오지 못했습니다.');
      }
      const data = await response.json();
      
      // 데이터 확인
      console.log("서버에서 받은 원본 매출 데이터:", data);
      
      return data;
    }
  });

  // 대시보드 로딩 시 보여줄 컴포넌트
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // 에러 발생 시 표시할 컴포넌트
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-red-500 mb-4">데이터를 불러오는 중 오류가 발생했습니다.</p>
        <Button onClick={() => window.location.reload()}>새로고침</Button>
      </div>
    );
  }

  // 매출 데이터가 없는 경우
  if (!salesData) {
    return (
      <div className="text-center py-8">
        <p className="text-lg text-gray-500">매출 데이터가 없습니다.</p>
      </div>
    );
  }
  
  // 일별 매출 데이터 (순매출만 포함)
  // 실제 데이터 사용 및 디버깅
  const rawDailySales = salesData.dailySales || [];
  console.log("서버에서 받은 원본 데이터:", rawDailySales);
  
  // 서버에서 받은 데이터를 날짜순으로 정렬 (오름차순)
  const sortedDailySales = [...rawDailySales].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  console.log("정렬된 날짜 데이터:", sortedDailySales);
  
  // 서버에서 받은 원본 데이터 사용 (실제 데이터베이스 값)
  const dailySalesData = sortedDailySales.length > 0 ? sortedDailySales : [];
  
  // 서버로부터 받은 데이터 확인 (미결제 주문 포함 여부 등 디버깅)
  console.log("그래프에 사용될 데이터:", dailySalesData);
  
  // 개발용 - 데이터 확인
  console.log("매출 데이터:", {
    총매출: salesData.totalSales,
    취소금액: salesData.canceledSales,
    취소건수: salesData.canceledCount,
    순매출: salesData.netSales
  });
  
  // 매출 통계 표시
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold">매출 현황 대시보드</h2>
        
        <div className="flex flex-wrap gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="기간 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">최근 7일</SelectItem>
              <SelectItem value="month">최근 30일</SelectItem>
              <SelectItem value="quarter">최근 3개월</SelectItem>
              <SelectItem value="year">최근 1년</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 통계 카드 - 기존 레이아웃 제거, 새로운 레이아웃 적용 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 총 매출 */}
        <Card className="border-gray-200 bg-gray-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">총 매출 (Gross Revenue)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-800">{salesData.totalSales?.toLocaleString()}원</p>
            <p className={`text-sm ${parseFloat(salesData.salesGrowth) >= 0 ? 'text-green-500' : 'text-red-500'} mt-1`}>
              {parseFloat(salesData.salesGrowth) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(salesData.salesGrowth))}% 전기 대비
            </p>
          </CardContent>
        </Card>
        
        {/* 총 주문 수 */}
        <Card className="border-gray-200 bg-gray-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">총 주문 수</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-800">{salesData.totalOrders?.toLocaleString()}건</p>
            <p className={`text-sm ${parseFloat(salesData.orderGrowth) >= 0 ? 'text-green-500' : 'text-red-500'} mt-1`}>
              {parseFloat(salesData.orderGrowth) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(salesData.orderGrowth))}% 전기 대비
            </p>
          </CardContent>
        </Card>

        {/* 순매출 - 중요 정보이므로 앞에 배치 */}
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">순매출 (Net Revenue)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {typeof salesData.netSales === 'number' ? salesData.netSales.toLocaleString() : '0'}원
            </p>
            <p className="text-sm text-gray-500 mt-1">
              총매출 - 취소금액 = 순수익
            </p>
          </CardContent>
        </Card>
        
        {/* 취소 정보 */}
        <Card className="border-red-200 bg-red-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">취소 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <div>
                <p className="text-2xl font-bold text-red-500">
                  {typeof salesData.canceledSales === 'number' ? salesData.canceledSales.toLocaleString() : '0'}원
                </p>
                <p className="text-xs text-gray-500">
                  총매출의 {salesData.totalSales > 0 && salesData.canceledSales ? 
                    ((salesData.canceledSales / salesData.totalSales) * 100).toFixed(1) : '0'}%
                </p>
              </div>
              <div className="border-t pt-2 border-gray-200">
                <p className="text-lg font-bold text-red-500">
                  {typeof salesData.canceledCount === 'number' ? salesData.canceledCount.toLocaleString() : '0'}건
                </p>
                <p className="text-xs text-gray-500">
                  총주문의 {salesData.totalOrders > 0 && salesData.canceledCount ? 
                    ((salesData.canceledCount / salesData.totalOrders) * 100).toFixed(1) : '0'}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 미결제 주문 */}
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">미결제 주문</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <div>
                <p className="text-2xl font-bold text-amber-600">
                  {typeof salesData.pendingOrders === 'number' ? salesData.pendingOrders.toLocaleString() : '0'}건
                </p>
                <p className="text-xs text-gray-500">
                  총주문의 {salesData.totalOrders > 0 && salesData.pendingOrders ? 
                    ((salesData.pendingOrders / salesData.totalOrders) * 100).toFixed(1) : '0'}%
                </p>
              </div>
              {salesData.pendingAmount && (
                <div className="border-t pt-2 border-gray-200">
                  <p className="text-lg font-bold text-amber-600">
                    {typeof salesData.pendingAmount === 'number' ? salesData.pendingAmount.toLocaleString() : '0'}원
                  </p>
                  <p className="text-xs text-gray-500">잠재 매출액</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {salesData.dataFormat === 'monthly' 
              ? '월별 매출 추이' 
              : '일별 매출 추이'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailySalesData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => {
                    // 일별 데이터인 경우 'YYYY-MM-DD' 형식을 'MM/DD' 형식으로 변환
                    const parts = value.split('-');
                    if (parts.length === 3) {
                      return `${parts[1]}/${parts[2]}`;
                    }
                    return value;
                  }}
                />
                <YAxis 
                  domain={[0, 2500]}
                />
                <Tooltip 
                  formatter={(value) => `${Number(value).toLocaleString()}원`}
                />
                <Legend />
                <Bar 
                  dataKey="순매출액" 
                  name="순매출액" 
                  fill="#10b981" 
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <p>
              {salesData.timeRange === 'week' && '최근 7일 매출 집계'}
              {salesData.timeRange === 'month' && '최근 30일 매출 집계'}
              {salesData.timeRange === 'quarter' && '최근 3개월 매출 집계 (월별)'}
              {salesData.timeRange === 'year' && '최근 1년 매출 집계 (월별)'}
            </p>
            <p className="text-xs text-right">
              * 취소된 주문은 매출에서 차감되어 표시됨
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="vendor">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="vendor">판매자별 매출</TabsTrigger>
          <TabsTrigger value="product">제품별 매출</TabsTrigger>
        </TabsList>
        
        {/* 판매자별 매출 테이블 */}
        <TabsContent value="vendor" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>판매자별 매출</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>순위</TableHead>
                    <TableHead>판매자명</TableHead>
                    <TableHead>총 매출액</TableHead>
                    <TableHead>판매 건수</TableHead>
                    <TableHead>평균 주문가</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesData.vendorSales?.length > 0 ? (
                    salesData.vendorSales.map((vendor: { id: number; name: string; storeName?: string; sales: number; count: number }, index: number) => {
                      // 실제 데이터베이스의 상호명(storeName) 사용
                      // storeName이 있으면 우선 사용하고, 없으면 name 사용
                      const displayName = vendor.storeName || vendor.name;
                      
                      return (
                        <TableRow key={`vendor-${vendor.id || index}`}>
                          <TableCell className="text-center">
                            {index < 3 ? (
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full 
                                ${index === 0 ? 'bg-blue-100 text-blue-700' : 
                                  index === 1 ? 'bg-gray-200 text-gray-700' : 
                                  'bg-blue-50 text-blue-600'}`}>
                                {index + 1}
                              </span>
                            ) : (
                              index + 1
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{displayName}</TableCell>
                          <TableCell className="font-semibold text-blue-600">
                            {vendor.sales.toLocaleString()}원
                          </TableCell>
                          <TableCell>{vendor.count}건</TableCell>
                          <TableCell>
                            {vendor.count > 0 ? Math.round(vendor.sales / vendor.count).toLocaleString() : 0}원
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">판매자별 매출 데이터가 없습니다.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 제품별 매출 테이블 */}
        <TabsContent value="product" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>제품별 매출</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>순위</TableHead>
                    <TableHead>제품명</TableHead>
                    <TableHead>총 매출액</TableHead>
                    <TableHead>판매 건수</TableHead>
                    <TableHead>평균 판매가</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesData.categories?.length > 0 ? (
                    salesData.categories.map((product: { id: number; name: string; sales: number; count: number; isBidProduct?: boolean }, index: number) => {
                      // 제품 ID를 실제 이름으로 변환하는 함수 (확장된 매핑)
                      const getProductName = (id: number, name: string) => {
                        const productNameMap: Record<number, string> = {
                          6: "몬스테라 델리시오사",
                          12: "산세베리아",
                          5: "아레카 야자",
                          7: "필로덴드론",
                          8: "피토니아",
                          9: "칼라디움",
                          10: "스투키",
                          11: "행운목"
                        };
                        
                        return productNameMap[id] || name; // 매핑된 이름이 있으면 사용, 없으면 기존 이름 사용
                      };
                      
                      // ID를 실제 식물 이름으로 변환
                      const displayName = getProductName(product.id, product.name);
                      
                      const avgPrice = product.count > 0 
                        ? Math.round(product.sales / product.count)
                        : 0;

                      return (
                        <TableRow key={`product-${product.id || index}`}>
                          <TableCell className="text-center">
                            {index < 3 ? (
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full 
                                ${index === 0 ? 'bg-amber-100 text-amber-700' : 
                                  index === 1 ? 'bg-gray-200 text-gray-700' : 
                                  'bg-amber-50 text-amber-600'}`}>
                                {index + 1}
                              </span>
                            ) : (
                              index + 1
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {displayName}
                            {product.isBidProduct && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                입찰상품
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold text-green-600">
                            {product.sales.toLocaleString()}원
                          </TableCell>
                          <TableCell>{product.count}건</TableCell>
                          <TableCell>
                            {avgPrice.toLocaleString()}원
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">제품별 매출 데이터가 없습니다.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}