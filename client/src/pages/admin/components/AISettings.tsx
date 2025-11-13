import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, RotateCcw, Settings, MessageSquare, Brain } from 'lucide-react';

// AI 설정 스키마
const aiSettingsSchema = z.object({
  temperature: z.number().min(0).max(1).default(0.7),
  maxOutputTokens: z.number().min(100).max(8192).default(2048),
  topK: z.number().min(1).max(40).default(40),
  topP: z.number().min(0).max(1).default(0.95),
  enableTracing: z.boolean().default(false),
  systemPrompt: z.string().min(10, "시스템 프롬프트는 최소 10자 이상 입력해주세요").default("당신은 전문적인 식물 상담사입니다. 사용자의 질문에 친절하고 정확하게 답변해주세요."),
  plantRecommendationPrompt: z.string().min(10, "식물 추천 프롬프트는 최소 10자 이상 입력해주세요").default("사용자의 환경과 선호도를 고려하여 최적의 식물을 추천해주세요."),
  vendorCommunicationPrompt: z.string().min(10, "업체 소통 프롬프트는 최소 10자 이상 입력해주세요").default("업체와의 소통에서 전문적이고 친절한 톤을 유지해주세요."),
});

type AISettingsFormValues = z.infer<typeof aiSettingsSchema>;

export default function AISettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // AI 설정 불러오기
  const { data: aiSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['admin-ai-settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/ai-settings');
      if (!response.ok) {
        // 설정이 없으면 기본값 반환
        if (response.status === 404) {
          return aiSettingsSchema.parse({});
        }
        throw new Error('AI 설정을 불러오지 못했습니다.');
      }
      return response.json();
    }
  });

  // 폼 설정
  const form = useForm<AISettingsFormValues>({
    resolver: zodResolver(aiSettingsSchema),
    defaultValues: aiSettings || aiSettingsSchema.parse({}),
  });

  // 설정이 로드되면 폼에 반영
  React.useEffect(() => {
    if (aiSettings) {
      form.reset(aiSettings);
    }
  }, [aiSettings, form]);

  // AI 설정 저장 mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: AISettingsFormValues) => {
      const response = await apiRequest('PUT', '/api/admin/ai-settings', settings);
      if (!response.ok) {
        throw new Error('AI 설정 저장에 실패했습니다.');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ai-settings'] });
      toast({
        title: "설정이 저장되었습니다",
        description: "AI 설정이 성공적으로 업데이트되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "저장 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 기본값으로 재설정
  const resetToDefaults = () => {
    const defaults = aiSettingsSchema.parse({});
    form.reset(defaults);
    toast({
      title: "기본값으로 재설정",
      description: "모든 설정이 기본값으로 재설정되었습니다.",
    });
  };

  // 폼 제출
  const onSubmit = (data: AISettingsFormValues) => {
    updateSettingsMutation.mutate(data);
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">AI 설정을 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI 설정</h2>
          <p className="text-muted-foreground">
            인공지능 상담 기능의 동작을 조정할 수 있습니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={resetToDefaults}
            disabled={updateSettingsMutation.isPending}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            기본값 복원
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="model" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="model" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                모델 설정
              </TabsTrigger>
              <TabsTrigger value="prompts" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                프롬프트 설정
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                고급 설정
              </TabsTrigger>
            </TabsList>

            <TabsContent value="model" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Gemini AI 모델 설정</CardTitle>
                  <CardDescription>
                    AI 모델의 응답 스타일과 품질을 조정합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="temperature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Temperature: {field.value.toFixed(2)}
                        </FormLabel>
                        <FormControl>
                          <Slider
                            min={0}
                            max={1}
                            step={0.01}
                            value={[field.value]}
                            onValueChange={(value) => field.onChange(value[0])}
                            className="w-full"
                          />
                        </FormControl>
                        <FormDescription>
                          낮을수록 일관적이고 예측 가능한 응답, 높을수록 창의적이고 다양한 응답
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxOutputTokens"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>최대 출력 토큰</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={100}
                            max={8192}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          AI가 생성할 수 있는 최대 응답 길이 (100-8192)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="topK"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Top-K</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={40}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            단어 선택 범위 (1-40)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="topP"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Top-P</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={1}
                              step={0.01}
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            누적 확률 임계값 (0.0-1.0)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="prompts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>프롬프트 설정</CardTitle>
                  <CardDescription>
                    AI의 역할과 응답 스타일을 정의하는 프롬프트를 설정합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="systemPrompt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>시스템 프롬프트</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="AI의 기본 역할과 행동 방식을 정의해주세요..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          AI의 기본 역할과 전반적인 응답 스타일을 정의합니다.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="plantRecommendationPrompt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>식물 추천 프롬프트</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="식물 추천 시 고려사항과 응답 형식을 정의해주세요..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          식물 추천 기능에서 사용되는 특별한 지침입니다.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vendorCommunicationPrompt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>업체 소통 프롬프트</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="업체와의 소통에서 사용할 톤과 스타일을 정의해주세요..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          업체 입찰 및 소통 과정에서 사용되는 특별한 지침입니다.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>고급 설정</CardTitle>
                  <CardDescription>
                    디버깅 및 개발자를 위한 고급 옵션입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="enableTracing"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            AI 응답 추적 활성화
                          </FormLabel>
                          <FormDescription>
                            AI 응답 과정을 추적하여 디버깅에 도움이 되는 정보를 수집합니다.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updateSettingsMutation.isPending}
              className="min-w-[120px]"
            >
              {updateSettingsMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  설정 저장
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}