import React, { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import SalesStats from '../admin/components/SalesStats';
import PlantsList from '../admin/components/PlantsList';
import VendorPayments from '../admin/components/VendorPayments';

import VendorCommission from '../admin/components/VendorCommission';

// 관리자 대시보드 메인 컴포넌트
export default function AdminDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('sales-stats');

  // 사용자가 관리자가 아니면 홈으로 리디렉션
  if (!user || user.role !== 'admin') {
    navigate('/');
    return null;
  }

  return (
    <div className="container mx-auto p-6">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">관리자 대시보드</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">관리자: {user.username}</span>
            <a href="/" className="text-sm text-blue-500 hover:text-blue-700">사이트로 돌아가기</a>
          </div>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8">
          <TabsTrigger value="sales-stats">매출 통계</TabsTrigger>
          <TabsTrigger value="plants-list">식물 관리</TabsTrigger>
          <TabsTrigger value="vendor-payments">판매자별 결제</TabsTrigger>
          <TabsTrigger value="vendor-commission">수수료 설정</TabsTrigger>
        </TabsList>

        <div className="p-4 bg-white rounded-lg shadow">
          <TabsContent value="sales-stats">
            <Card>
              <CardHeader>
                <CardTitle>매출 및 결제 통계</CardTitle>
                <CardDescription>전체 매출, 결제 현황 및 통계를 확인합니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <SalesStats />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plants-list">
            <Card>
              <CardHeader>
                <CardTitle>식물 목록 관리</CardTitle>
                <CardDescription>전체 식물 목록을 관리하고 정보를 수정합니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <PlantsList />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vendor-payments">
            <Card>
              <CardHeader>
                <CardTitle>판매자별 결제 내역</CardTitle>
                <CardDescription>판매자별 결제 및 주문 내역을 조회합니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <VendorPayments />
              </CardContent>
            </Card>
          </TabsContent>



          <TabsContent value="vendor-commission">
            <Card>
              <CardHeader>
                <CardTitle>수수료 설정</CardTitle>
                <CardDescription>판매자별 수수료 설정 및 정산 관리</CardDescription>
              </CardHeader>
              <CardContent>
                <VendorCommission />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}