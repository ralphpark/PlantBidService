import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  refreshAuth: () => Promise<User | null>; // 인증 상태 수동 갱신 함수 추가
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
};

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  email: string;
  password: string;
  role: "user" | "vendor" | "admin";
  name?: string;
  phone?: string;
  region?: string;
  contactInfo?: string;
  bio?: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: user,
    error,
    isLoading,
    refetch,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: 1, // 인증 오류 시 한 번만 재시도
    refetchOnWindowFocus: true, // 창이 포커스를 얻을 때 세션 상태 확인
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: User) => {
      // Make sure we have a valid user object
      if (!user || typeof user !== 'object' || !user.id || !user.username) {
        console.error('Login returned invalid user data:', user);
        toast({
          title: "로그인 오류",
          description: "서버에서 유효하지 않은 사용자 데이터를 반환했습니다.",
          variant: "destructive",
        });
        return;
      }
      
      // Store user data in cache
      queryClient.setQueryData(["/api/user"], user);
      
      // Show success message
      toast({
        title: "로그인 성공",
        description: `${user.username}님, 환영합니다!`,
      });
      
      // Log successful login
      console.log(`User ${user.username} (ID: ${user.id}) logged in successfully`);
    },
    onError: (error: Error) => {
      console.error('Login error:', error);
      toast({
        title: "로그인 실패",
        description: error.message || "로그인에 실패했습니다. 사용자 이름과 비밀번호를 확인해주세요.",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const res = await apiRequest("POST", "/api/register", data);
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "회원가입 성공",
        description: `${user.username}님, 환영합니다!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "회원가입 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        const res = await apiRequest("POST", "/api/logout");
        return await res.json();
      } catch (err) {
        console.error('Error during logout API call:', err);
        // Even if the API call fails, we should still clear local state
        // This prevents the user from being stuck in a logged-in state when actually logged out
        return { success: false, error: err };
      }
    },
    onSuccess: (data) => {
      console.log('Logout response:', data);
      
      // 사용자 데이터 초기화
      queryClient.setQueryData(["/api/user"], null);
      
      // 관련 캐시 모두 초기화
      queryClient.clear();
      
      toast({
        title: "로그아웃 완료",
        description: "성공적으로 로그아웃되었습니다.",
      });
      
      // 페이지 새로고침 (세션 초기화 위해)
      setTimeout(() => {
        console.log('Redirecting to home page after logout');
        window.location.href = "/";
      }, 300);
    },
    onError: (error: Error) => {
      console.error('Logout error:', error);
      
      // Even in case of errors, clear the local user state
      queryClient.setQueryData(["/api/user"], null);
      queryClient.clear();
      
      toast({
        title: "로그아웃 오류",
        description: "로그아웃 중 오류가 발생했지만, 로컬 세션은 초기화되었습니다.",
        variant: "destructive",
      });
      
      // Still redirect to home page
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    },
  });

  // 인증 상태 수동 갱신 함수
  const refreshAuth = async (): Promise<User | null> => {
    try {
      console.log('Manually refreshing auth state...');
      const result = await refetch();
      
      if (result.error) {
        console.error('Error refreshing auth state:', result.error);
        return null;
      }
      
      if (!result.data) {
        console.log('No user data returned from auth refresh');
        return null;
      }
      
      console.log('Auth state refreshed successfully');
      return result.data as User | null;
    } catch (err) {
      console.error('Unexpected error during auth refresh:', err);
      return null;
    }
  };
  
  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        refreshAuth, // 새로 추가된 메서드
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}