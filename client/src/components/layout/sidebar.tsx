import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Home, Flower2, MessageCircle, ShoppingBag, Settings, LogOut, User, Package, Store } from "lucide-react";
import { Logo } from "@/components/ui/logo";

export function Sidebar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    // 로그아웃 요청
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        // 로그아웃 후 추가 처리 - 페이지 리디렉션 보장
        setTimeout(() => {
          window.location.href = '/'; // 홈 페이지로 강제 이동
        }, 300);
      }
    });
  };

  if (!user) return null;

  const navItems = [
    { icon: Home, label: "홈", href: "/" },
    { icon: MessageCircle, label: "AI 상담", href: "/ai-consultation" },
    { icon: Package, label: "주문 내역", href: "/order-history" },
  ];

  // 판매자에게만 보이는 메뉴 항목
  const vendorNavItems = user.role === 'vendor' || user.role === 'admin' ? [
    { icon: Store, label: "판매자 대시보드", href: "/vendor-dashboard" },
  ] : [];

  return (
    <div className="hidden md:flex flex-col w-64 h-screen bg-white border-r shadow-sm fixed left-0 top-0">
      <div className="p-4 flex justify-center border-b">
        <Link href="/">
          <Logo className="h-12" />
        </Link>
      </div>
      
      <div className="p-4 border-b">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <User size={20} />
          </div>
          <div>
            <p className="font-medium">{user.username}</p>
            <p className="text-xs text-muted-foreground">
              {user.role === "user" ? "식물 애호가" : 
               user.role === "vendor" ? "지역 판매자" : 
               "관리자"}
            </p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <li key={item.href}>
                <Link href={item.href}>
                  <div
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2 rounded-md transition-colors cursor-pointer",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </div>
                </Link>
              </li>
            );
          })}

          {vendorNavItems.length > 0 && (
            <>
              <li className="pt-4">
                <div className="px-3 py-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    판매자 기능
                  </h3>
                </div>
              </li>
              {vendorNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                
                return (
                  <li key={item.href}>
                    <Link href={item.href}>
                      <div
                        className={cn(
                          "flex items-center space-x-3 px-3 py-2 rounded-md transition-colors cursor-pointer",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted"
                        )}
                      >
                        <Icon size={18} />
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </>
          )}
        </ul>
      </nav>
      
      <div className="p-4 border-t">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 px-3 py-2 w-full text-left rounded-md hover:bg-muted transition-colors"
        >
          <LogOut size={18} />
          <span>로그아웃</span>
        </button>
      </div>
    </div>
  );
}