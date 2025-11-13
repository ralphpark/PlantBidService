import React from 'react';
import { Redirect, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';

interface AdminRouteProps {
  component: React.ComponentType<any>;
  path?: string;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ component: Component, ...rest }) => {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">로딩 중...</div>;
  }

  // 사용자가 로그인하지 않았거나 관리자 권한이 없는 경우 로그인 페이지로 리디렉션
  if (!user || user.role !== 'admin') {
    return <Redirect to="/auth" />;
  }

  return <Component {...rest} />;
};