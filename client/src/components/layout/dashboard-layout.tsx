import React from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { Footer } from "./footer";
import { useAuth } from "@/hooks/use-auth";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAuth();
  
  // 사이드바는 로그인한 사용자에게만 보이도록
  const hasSidebar = !!user;
  
  // 모바일과 데스크탑 레이아웃 구분 처리
  return (
    <div className="flex flex-col min-h-screen">
      {hasSidebar ? (
        <>
          {/* 모바일에서는 헤더만 보이고, 데스크탑에서는 사이드바만 보임 */}
          <div className="md:hidden">
            <Header />
          </div>
          <Sidebar />
          <div className="md:ml-64 flex-1 flex flex-col px-4">
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </>
      ) : (
        <>
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </>
      )}
    </div>
  );
}