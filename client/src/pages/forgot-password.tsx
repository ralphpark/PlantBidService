import { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { ArrowLeft, Copy, CheckCircle2 } from "lucide-react";

const forgotPasswordSchema = z.object({
  username: z.string().min(3, "사용자명은 최소 3자 이상이어야 합니다"),
  email: z.string().email("유효한 이메일 주소를 입력해주세요"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [resetInfo, setResetInfo] = useState<{ resetUrl: string; token: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      username: "",
      email: "",
    },
  });

  const requestResetMutation = useMutation({
    mutationFn: async (data: { username: string; email: string }) => {
      const res = await apiRequest("POST", "/api/request-password-reset", data);
      return await res.json();
    },
    onSuccess: (data) => {
      // 토큰과 URL이 있으면 재설정 링크 표시
      if (data.token && data.resetUrl) {
        setResetInfo({ resetUrl: data.resetUrl, token: data.token });
        toast({
          title: "재설정 링크 생성 완료",
          description: "아래 링크로 비밀번호를 재설정할 수 있습니다.",
        });
      } else {
        // 토큰이 없으면 일반 메시지만 표시 (보안: 계정 존재 여부 노출 방지)
        toast({
          title: "요청 완료",
          description: data.message,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "요청 실패",
        description: error.message || "비밀번호 재설정 요청에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ForgotPasswordFormValues) => {
    requestResetMutation.mutate(data);
  };

  const copyToClipboard = () => {
    if (resetInfo) {
      const fullUrl = `${window.location.origin}${resetInfo.resetUrl}`;
      navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "복사 완료",
        description: "재설정 링크가 클립보드에 복사되었습니다.",
      });
    }
  };

  const navigateToReset = () => {
    if (resetInfo) {
      navigate(resetInfo.resetUrl);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/auth")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          <CardTitle className="text-2xl font-bold">비밀번호 찾기</CardTitle>
          <CardDescription>
            가입하신 사용자명과 이메일 주소를 입력하시면 비밀번호 재설정 링크를 생성해드립니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!resetInfo ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>사용자명</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="사용자명을 입력하세요"
                          {...field}
                          data-testid="input-username"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이메일</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          {...field}
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={requestResetMutation.isPending}
                  data-testid="button-submit-forgot-password"
                >
                  {requestResetMutation.isPending ? "처리 중..." : "재설정 링크 생성"}
                </Button>
              </form>
            </Form>
          ) : (
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  비밀번호 재설정 링크가 생성되었습니다. 아래 버튼을 클릭하여 비밀번호를 재설정하세요.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <p className="text-sm font-medium">재설정 링크:</p>
                <div className="flex gap-2">
                  <Input
                    value={`${window.location.origin}${resetInfo.resetUrl}`}
                    readOnly
                    className="flex-1 text-sm"
                    data-testid="input-reset-url"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                    data-testid="button-copy-url"
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={navigateToReset}
                data-testid="button-go-to-reset"
              >
                비밀번호 재설정하기
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setResetInfo(null);
                  form.reset();
                }}
                data-testid="button-reset-form"
              >
                다시 입력하기
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
