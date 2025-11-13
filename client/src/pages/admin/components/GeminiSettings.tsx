import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Trash2, Save } from 'lucide-react';

// AI 설정 스키마
const aiSettingsSchema = z.object({
  temperature: z.number().min(0).max(1),
  maxOutputTokens: z.number().min(100).max(8192),
  topK: z.number().min(1).max(40),
  topP: z.number().min(0).max(1),
  enableTracing: z.boolean().optional(),
  systemPrompt: z.string().min(10, "시스템 프롬프트는 최소 10자 이상 입력해주세요"),
  plantRecommendationPrompt: z.string().min(10, "추천 프롬프트는 최소 10자 이상 입력해주세요"),
  vendorCommunicationPrompt: z.string().min(10, "판매자 소통 프롬프트는 최소 10자 이상 입력해주세요"),
});

type AISettingsFormValues = z.infer<typeof aiSettingsSchema>;

// 예제 템플릿 스키마
const templateSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "템플릿 이름은 필수입니다"),
  content: z.string().min(10, "템플릿 내용은 최소 10자 이상 입력해주세요"),
  description: z.string().optional(),
  category: z.string().min(1, "카테고리는 필수입니다"),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

export default function GeminiSettings() {
  const [activeTab, setActiveTab] = useState('general');
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // AI 설정 불러오기
  const { data: aiSettings, isLoading: settingsLoading, isError: settingsError } = useQuery({
    queryKey: ['admin-ai-settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/ai-settings');
      if (!response.ok) {
        throw new Error('AI 설정을 불러오지 못했습니다.');
      }
      return response.json();
    }
  });

  // 응답 템플릿 불러오기
  const { data: templates, isLoading: templatesLoading, isError: templatesError } = useQuery({
    queryKey: ['admin-ai-templates'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/ai-templates');
      if (!response.ok) {
        throw new Error('AI 템플릿을 불러오지 못했습니다.');
      }
      return response.json();
    }
  });

  // AI 설정 폼
  const settingsForm = useForm<AISettingsFormValues>({
    resolver: zodResolver(aiSettingsSchema),
    defaultValues: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      topK: 40,
      topP: 0.95,
      enableTracing: false,
      systemPrompt: '',
      plantRecommendationPrompt: '',
      vendorCommunicationPrompt: '',
    }
  });

  // 템플릿 폼
  const templateForm = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      content: '',
      description: '',
      category: '',
    }
  });

  // 설정 로드되면 폼에 설정
  React.useEffect(() => {
    if (aiSettings) {
      settingsForm.reset({
        temperature: aiSettings.temperature || 0.7,
        maxOutputTokens: aiSettings.maxOutputTokens || 2048,
        topK: aiSettings.topK || 40,
        topP: aiSettings.topP || 0.95,
        enableTracing: aiSettings.enableTracing || false,
        systemPrompt: aiSettings.systemPrompt || '',
        plantRecommendationPrompt: aiSettings.plantRecommendationPrompt || '',
        vendorCommunicationPrompt: aiSettings.vendorCommunicationPrompt || '',
      });
    }
  }, [aiSettings, settingsForm]);

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
        title: "AI 설정이 저장되었습니다",
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

  // 템플릿 추가/수정 mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (templateData: TemplateFormValues) => {
      const url = templateData.id 
        ? `/api/admin/ai-templates/${templateData.id}` 
        : '/api/admin/ai-templates';
      const method = templateData.id ? 'PUT' : 'POST';
      
      const response = await apiRequest(method, url, templateData);
      if (!response.ok) {
        throw new Error('템플릿 저장에 실패했습니다.');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ai-templates'] });
      setIsTemplateDialogOpen(false);
      toast({
        title: selectedTemplate ? "템플릿이 수정되었습니다" : "새로운 템플릿이 추가되었습니다",
        variant: "default",
      });
      templateForm.reset();
    },
    onError: (error) => {
      toast({
        title: "오류가 발생했습니다",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 템플릿 삭제 mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const response = await apiRequest('DELETE', `/api/admin/ai-templates/${templateId}`);
      if (!response.ok) {
        throw new Error('템플릿 삭제에 실패했습니다.');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ai-templates'] });
      toast({
        title: "템플릿이 삭제되었습니다",
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

  // AI 설정 저장 핸들러
  const onSubmitSettings = (data: AISettingsFormValues) => {
    updateSettingsMutation.mutate(data);
  };

  // 템플릿 추가 버튼 핸들러
  const handleAddTemplate = () => {
    setSelectedTemplate(null);
    templateForm.reset({
      name: '',
      content: '',
      description: '',
      category: '',
    });
    setIsTemplateDialogOpen(true);
  };

  // 템플릿 수정 버튼 핸들러
  const handleEditTemplate = (template: any) => {
    setSelectedTemplate(template);
    templateForm.reset({
      id: template.id,
      name: template.name,
      content: template.content,
      description: template.description || '',
      category: template.category,
    });
    setIsTemplateDialogOpen(true);
  };

  // 템플릿 삭제 버튼 핸들러
  const handleDeleteTemplate = (templateId: number) => {
    if (confirm('정말로 이 템플릿을 삭제하시겠습니까?')) {
      deleteTemplateMutation.mutate(templateId);
    }
  };

  // 템플릿 저장 핸들러
  const onSubmitTemplate = (data: TemplateFormValues) => {
    updateTemplateMutation.mutate(data);
  };

  // 로딩 중 표시
  if (settingsLoading || templatesLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // 에러 발생 시 표시
  if (settingsError || templatesError) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-red-500 mb-4">데이터를 불러오는 중 오류가 발생했습니다.</p>
        <Button onClick={() => window.location.reload()}>새로고침</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">AI 설정</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="general">일반 설정</TabsTrigger>
          <TabsTrigger value="prompts">프롬프트 설정</TabsTrigger>
          <TabsTrigger value="templates">응답 템플릿</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gemini AI 모델 설정</CardTitle>
              <CardDescription>
                AI의 기본 동작 설정을 조정합니다. 이 설정은 모든 AI 응답에 영향을 줍니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...settingsForm}>
                <form onSubmit={settingsForm.handleSubmit(onSubmitSettings)} className="space-y-6">
                  <div className="space-y-4">
                    <FormField
                      control={settingsForm.control}
                      name="temperature"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between items-center">
                            <FormLabel>Temperature: {field.value.toFixed(2)}</FormLabel>
                            <span className="text-sm text-gray-500">
                              (0 = 결정적, 1 = 무작위)
                            </span>
                          </div>
                          <FormControl>
                            <Slider
                              min={0}
                              max={1}
                              step={0.01}
                              value={[field.value]}
                              onValueChange={(values) => field.onChange(values[0])}
                            />
                          </FormControl>
                          <FormDescription>
                            낮은 값은 보다 일관된 응답을, 높은 값은 보다 다양한 응답을 생성합니다.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={settingsForm.control}
                      name="maxOutputTokens"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between items-center">
                            <FormLabel>최대 출력 토큰: {field.value}</FormLabel>
                            <span className="text-sm text-gray-500">
                              (100 - 8192)
                            </span>
                          </div>
                          <FormControl>
                            <Slider
                              min={100}
                              max={8192}
                              step={100}
                              value={[field.value]}
                              onValueChange={(values) => field.onChange(values[0])}
                            />
                          </FormControl>
                          <FormDescription>
                            모델이 생성할 수 있는 최대 토큰 수를 제한합니다.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={settingsForm.control}
                      name="topK"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between items-center">
                            <FormLabel>Top-K: {field.value}</FormLabel>
                            <span className="text-sm text-gray-500">
                              (1 - 40)
                            </span>
                          </div>
                          <FormControl>
                            <Slider
                              min={1}
                              max={40}
                              step={1}
                              value={[field.value]}
                              onValueChange={(values) => field.onChange(values[0])}
                            />
                          </FormControl>
                          <FormDescription>
                            모델이 각 토큰에 대해 고려하는 최상위 확률 토큰의 수입니다.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={settingsForm.control}
                      name="topP"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between items-center">
                            <FormLabel>Top-P: {field.value.toFixed(2)}</FormLabel>
                            <span className="text-sm text-gray-500">
                              (0 - 1)
                            </span>
                          </div>
                          <FormControl>
                            <Slider
                              min={0}
                              max={1}
                              step={0.01}
                              value={[field.value]}
                              onValueChange={(values) => field.onChange(values[0])}
                            />
                          </FormControl>
                          <FormDescription>
                            모델이 고려하는 확률 질량의 상위 비율입니다.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={settingsForm.control}
                      name="enableTracing"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between p-4 border rounded-md">
                          <div className="space-y-0.5">
                            <FormLabel>AI 추적 활성화</FormLabel>
                            <FormDescription>
                              AI 응답에 대한 상세한 로그를 수집합니다. 디버깅에 유용합니다.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={updateSettingsMutation.isPending}
                    >
                      {updateSettingsMutation.isPending ? '저장 중...' : '변경사항 저장'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>시스템 프롬프트 설정</CardTitle>
              <CardDescription>
                AI의 기본 행동 방식과 역할을 정의하는 프롬프트를 설정합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...settingsForm}>
                <form onSubmit={settingsForm.handleSubmit(onSubmitSettings)} className="space-y-6">
                  <FormField
                    control={settingsForm.control}
                    name="systemPrompt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>기본 시스템 프롬프트</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="AI의 기본 행동 방식을 정의하는 프롬프트를 입력하세요." 
                            className="min-h-[200px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          모든 대화 세션의 시작에 적용되는 기본 AI 행동 지침입니다.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={settingsForm.control}
                    name="plantRecommendationPrompt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>식물 추천 프롬프트</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="식물 추천 시 AI가 사용할 프롬프트를 입력하세요." 
                            className="min-h-[200px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          식물 추천 기능에서 사용되는 특화된 프롬프트입니다.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={settingsForm.control}
                    name="vendorCommunicationPrompt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>판매자 소통 프롬프트</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="판매자와 고객 간 소통 중재 시 AI가 사용할 프롬프트를 입력하세요." 
                            className="min-h-[200px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          판매자와 고객 간 대화를 중재할 때 사용되는 특화된 프롬프트입니다.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={updateSettingsMutation.isPending}
                    >
                      {updateSettingsMutation.isPending ? '저장 중...' : '변경사항 저장'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI 응답 템플릿</CardTitle>
              <CardDescription>
                자주 사용되는 AI 응답 템플릿을 관리합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end mb-6">
                <Button onClick={handleAddTemplate}>
                  <PlusCircle className="mr-2 h-4 w-4" /> 템플릿 추가
                </Button>
              </div>
              
              {templates?.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-lg text-gray-500">등록된 템플릿이 없습니다.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates?.map((template: any) => (
                    <Card key={template.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleEditTemplate(template)}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <CardDescription>{template.description || '설명 없음'}</CardDescription>
                        <div className="text-xs text-gray-500 mt-1">카테고리: {template.category}</div>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <div className="bg-gray-50 p-3 rounded-md text-sm max-h-32 overflow-auto">
                          <pre className="whitespace-pre-wrap">{template.content}</pre>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 템플릿 추가/수정 다이얼로그 */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? '템플릿 수정' : '새 템플릿 추가'}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...templateForm}>
            <form onSubmit={templateForm.handleSubmit(onSubmitTemplate)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={templateForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>템플릿 이름 *</FormLabel>
                      <FormControl>
                        <Input placeholder="템플릿 이름" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={templateForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>카테고리 *</FormLabel>
                      <FormControl>
                        <Input placeholder="카테고리" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={templateForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>설명</FormLabel>
                    <FormControl>
                      <Input placeholder="템플릿 설명 (선택사항)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={templateForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>템플릿 내용 *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="템플릿 내용을 입력하세요." 
                        className="min-h-[200px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      변수는 {'{변수명}'} 형식으로 입력하세요. 예: {'{고객명}'}님 안녕하세요.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsTemplateDialogOpen(false)}
                >
                  취소
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateTemplateMutation.isPending}
                >
                  {updateTemplateMutation.isPending ? '저장 중...' : '저장'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}