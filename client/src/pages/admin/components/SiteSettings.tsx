import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// 메인 페이지 설정 스키마
const homePageSchema = z.object({
  title: z.string().min(1, '제목은 필수입니다'),
  subtitle: z.string().min(1, '부제목은 필수입니다'),
  typingPhrases: z.array(z.string()).min(1, '문구는 최소 1개 이상 필요합니다'),
  buttonText1: z.string().min(1, '버튼 텍스트는 필수입니다'),
  buttonText2: z.string().min(1, '버튼 텍스트는 필수입니다'),
  feature1Title: z.string().min(1, '특징 제목은 필수입니다'),
  feature1Description: z.string().min(1, '특징 설명은 필수입니다'),
  feature2Title: z.string().min(1, '특징 제목은 필수입니다'),
  feature2Description: z.string().min(1, '특징 설명은 필수입니다'),
  feature3Title: z.string().min(1, '특징 제목은 필수입니다'),
  feature3Description: z.string().min(1, '특징 설명은 필수입니다'),
  ctaTitle: z.string().min(1, 'CTA 제목은 필수입니다'),
  ctaDescription: z.string().min(1, 'CTA 설명은 필수입니다'),
  ctaButtonText: z.string().min(1, 'CTA 버튼 텍스트는 필수입니다'),
});

type HomePageFormValues = z.infer<typeof homePageSchema>;

export default function SiteSettings() {
  const [activeTab, setActiveTab] = useState('home-page');
  const [typingPhraseInput, setTypingPhraseInput] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 사이트 설정 불러오기
  const { data: siteSettings, isLoading, isError } = useQuery({
    queryKey: ['admin-site-settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/site-settings');
      if (!response.ok) {
        throw new Error('사이트 설정을 불러오지 못했습니다.');
      }
      return response.json();
    }
  });

  // 폼 설정
  const form = useForm<HomePageFormValues>({
    resolver: zodResolver(homePageSchema),
    defaultValues: {
      title: '',
      subtitle: '',
      typingPhrases: [],
      buttonText1: '',
      buttonText2: '',
      feature1Title: '',
      feature1Description: '',
      feature2Title: '',
      feature2Description: '',
      feature3Title: '',
      feature3Description: '',
      ctaTitle: '',
      ctaDescription: '',
      ctaButtonText: '',
    }
  });

  // 사이트 설정이 로드되면 폼 초기값 설정
  useEffect(() => {
    if (siteSettings?.homePage) {
      try {
        // homePage가 문자열인 경우 JSON 파싱
        const homeSettings = typeof siteSettings.homePage === 'string' 
          ? JSON.parse(siteSettings.homePage) 
          : siteSettings.homePage;
        
        console.log('로드된 홈페이지 설정:', homeSettings);
        
        form.reset({
          title: homeSettings.title || '',
          subtitle: homeSettings.subtitle || '',
          typingPhrases: homeSettings.typingPhrases || [],
          buttonText1: homeSettings.buttonText1 || '',
          buttonText2: homeSettings.buttonText2 || '',
          feature1Title: homeSettings.feature1Title || '',
          feature1Description: homeSettings.feature1Description || '',
          feature2Title: homeSettings.feature2Title || '',
          feature2Description: homeSettings.feature2Description || '',
          feature3Title: homeSettings.feature3Title || '',
          feature3Description: homeSettings.feature3Description || '',
          ctaTitle: homeSettings.ctaTitle || '',
          ctaDescription: homeSettings.ctaDescription || '',
          ctaButtonText: homeSettings.ctaButtonText || '',
        });
      } catch (error) {
        console.error('홈페이지 설정 파싱 오류:', error);
      }
    }
  }, [siteSettings, form]);

  // 사이트 설정 저장 mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      console.log('클라이언트에서 전송할 데이터:', settings);
      
      const response = await apiRequest('PUT', '/api/admin/site-settings', settings);
      
      console.log('서버 응답 상태:', response.status);
      console.log('서버 응답 헤더:', response.headers.get('content-type'));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('서버 오류 응답:', errorText);
        throw new Error(`사이트 설정 저장에 실패했습니다: ${response.status}`);
      }
      
      // 응답 텍스트를 먼저 확인
      const responseText = await response.text();
      console.log('서버 응답 원본 텍스트:', responseText);
      
      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON 파싱 오류:', parseError);
        console.error('파싱 실패한 텍스트:', responseText);
        throw new Error('서버 응답을 파싱할 수 없습니다');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-site-settings'] });
      toast({
        title: "설정이 저장되었습니다",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error('Mutation 오류:', error);
      toast({
        title: "오류가 발생했습니다",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 폼 제출 핸들러
  const onSubmit = (data: HomePageFormValues) => {
    updateSettingsMutation.mutate({
      homePage: data
    });
  };

  // 타이핑 문구 추가 핸들러
  const addTypingPhrase = () => {
    if (!typingPhraseInput.trim()) return;
    
    const currentPhrases = form.getValues('typingPhrases') || [];
    form.setValue('typingPhrases', [...currentPhrases, typingPhraseInput.trim()]);
    setTypingPhraseInput('');
  };

  // 타이핑 문구 삭제 핸들러
  const removeTypingPhrase = (index: number) => {
    const currentPhrases = form.getValues('typingPhrases') || [];
    form.setValue('typingPhrases', currentPhrases.filter((_, i) => i !== index));
  };

  // 타이핑 문구 편집 시작
  const startEditingPhrase = (index: number, currentText: string) => {
    setEditingIndex(index);
    setEditingText(currentText);
  };

  // 타이핑 문구 편집 완료
  const saveEditingPhrase = (index: number) => {
    if (editingText.trim()) {
      const currentPhrases = form.getValues('typingPhrases') || [];
      const updatedPhrases = [...currentPhrases];
      updatedPhrases[index] = editingText.trim();
      form.setValue('typingPhrases', updatedPhrases);
    }
    setEditingIndex(null);
    setEditingText('');
  };

  // 타이핑 문구 편집 취소
  const cancelEditingPhrase = () => {
    setEditingIndex(null);
    setEditingText('');
  };

  // 로딩 중 표시
  if (isLoading) {
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">사이트 관리</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="home-page">홈페이지 설정</TabsTrigger>
          <TabsTrigger value="header-footer">헤더/푸터 설정</TabsTrigger>
          <TabsTrigger value="seo">SEO 설정</TabsTrigger>
        </TabsList>

        <TabsContent value="home-page" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>메인 페이지 설정</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">히어로 섹션</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>메인 제목</FormLabel>
                            <FormControl>
                              <Input placeholder="메인 제목" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="subtitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>부제목</FormLabel>
                            <FormControl>
                              <Input placeholder="부제목" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="border p-4 rounded-md">
                      <FormLabel className="block mb-2">타이핑 효과 문구</FormLabel>
                      <div className="flex gap-2 mb-4">
                        <Input 
                          placeholder="새 문구 입력" 
                          value={typingPhraseInput}
                          onChange={(e) => setTypingPhraseInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTypingPhrase())}
                        />
                        <Button type="button" onClick={addTypingPhrase}>추가</Button>
                      </div>
                      
                      <div className="space-y-2">
                        {form.watch('typingPhrases')?.map((phrase, index) => (
                          <div key={index} className="flex items-center justify-between border p-2 rounded">
                            {editingIndex === index ? (
                              <div className="flex items-center gap-2 flex-1">
                                <Input
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      saveEditingPhrase(index);
                                    } else if (e.key === 'Escape') {
                                      cancelEditingPhrase();
                                    }
                                  }}
                                  className="flex-1"
                                  autoFocus
                                />
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => saveEditingPhrase(index)}
                                >
                                  저장
                                </Button>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={cancelEditingPhrase}
                                >
                                  취소
                                </Button>
                              </div>
                            ) : (
                              <>
                                <span className="flex-1">{phrase}</span>
                                <div className="flex gap-1">
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => startEditingPhrase(index, phrase)}
                                  >
                                    수정
                                  </Button>
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => removeTypingPhrase(index)}
                                  >
                                    삭제
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {form.formState.errors.typingPhrases && (
                        <p className="text-sm text-red-500 mt-2">{form.formState.errors.typingPhrases.message}</p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="buttonText1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>첫 번째 버튼 텍스트</FormLabel>
                            <FormControl>
                              <Input placeholder="첫 번째 버튼 텍스트" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="buttonText2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>두 번째 버튼 텍스트</FormLabel>
                            <FormControl>
                              <Input placeholder="두 번째 버튼 텍스트" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4 border-t pt-6">
                    <h3 className="text-lg font-semibold">특징 섹션</h3>
                    
                    <div className="space-y-6">
                      <div className="border p-4 rounded-md">
                        <h4 className="text-base font-medium mb-3">특징 1</h4>
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="feature1Title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>제목</FormLabel>
                                <FormControl>
                                  <Input placeholder="특징 1 제목" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="feature1Description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>설명</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="특징 1 설명" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      <div className="border p-4 rounded-md">
                        <h4 className="text-base font-medium mb-3">특징 2</h4>
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="feature2Title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>제목</FormLabel>
                                <FormControl>
                                  <Input placeholder="특징 2 제목" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="feature2Description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>설명</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="특징 2 설명" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      <div className="border p-4 rounded-md">
                        <h4 className="text-base font-medium mb-3">특징 3</h4>
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="feature3Title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>제목</FormLabel>
                                <FormControl>
                                  <Input placeholder="특징 3 제목" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="feature3Description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>설명</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="특징 3 설명" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4 border-t pt-6">
                    <h3 className="text-lg font-semibold">CTA 섹션</h3>
                    
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="ctaTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CTA 제목</FormLabel>
                            <FormControl>
                              <Input placeholder="CTA 제목" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="ctaDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CTA 설명</FormLabel>
                            <FormControl>
                              <Textarea placeholder="CTA 설명" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="ctaButtonText"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CTA 버튼 텍스트</FormLabel>
                            <FormControl>
                              <Input placeholder="CTA 버튼 텍스트" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
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

        <TabsContent value="header-footer">
          <Card>
            <CardHeader>
              <CardTitle>헤더/푸터 설정</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-gray-500">헤더/푸터 설정 기능은 개발 중입니다.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo">
          <Card>
            <CardHeader>
              <CardTitle>SEO 설정</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-gray-500">SEO 설정 기능은 개발 중입니다.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}