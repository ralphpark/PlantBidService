import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search, X, RefreshCw, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';

// Plant form validation schema
const plantSchema = z.object({
  name: z.string().min(1, '식물 이름을 입력해주세요.'),
  scientific_name: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  care_instructions: z.string().optional(),
  light_requirement: z.string().optional(),
  water_requirement: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', '하', '중', '상']).optional(),
  price_range: z.string().optional(),
  size: z.string().optional(),
  image_url: z.string().optional(),
  // 새로 추가된 환경 요구사항 필드들
  humidity: z.string().optional(),
  temperature: z.string().optional(),
  winter_temperature: z.string().optional(),
  // 식물 특성 필드들
  plant_type: z.string().optional(),
  color_feature: z.string().optional(),
  pet_safety: z.string().optional(),
  experience_level: z.string().optional(),
  has_thorns: z.boolean().optional(),
  // 잎 모양 필드들
  leaf_shape1: z.string().optional(),
  leaf_shape2: z.string().optional(),
  leaf_shape3: z.string().optional(),
  leaf_shape4: z.string().optional(),
});

type PlantFormValues = z.infer<typeof plantSchema>;

// XML 파싱 함수
const parseXMLData = (xmlString: string, type: string) => {
  try {
    if (!xmlString) return [];
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    
    console.log(`${type} XML 파싱 시작, XML 길이:`, xmlString.length);
    
    if (type === 'air-purifying') {
      console.log('🌿 XML 파싱 상세 분석 시작');
      console.log('🌿 XML 문서 첫 500자:', xmlString.substring(0, 500));
      
      const results = xmlDoc.getElementsByTagName('result');
      console.log(`🌿 공기정화식물 result 태그 개수: ${results.length}개`);
      
      // XML 파서 오류 확인
      const parseError = xmlDoc.getElementsByTagName('parsererror');
      if (parseError.length > 0) {
        console.log('🌿 XML 파싱 오류 발견:', parseError[0].textContent);
      }
      
      // resultCnt 확인
      const resultCnt = xmlDoc.getElementsByTagName('resultCnt')[0]?.textContent;
      console.log('🌿 resultCnt 값:', resultCnt);
      
      const parsedData = Array.from(results).map((result, index) => {
        const data = {
          idx: result.getElementsByTagName('idx')[0]?.textContent || '',
          title: result.getElementsByTagName('title')[0]?.textContent || '',
          regDate: result.getElementsByTagName('regDate')[0]?.textContent || '',
          publishOrg: result.getElementsByTagName('publishOrg')[0]?.textContent || '',
        };
        if (index < 3) console.log(`🌿 샘플 데이터 ${index + 1}:`, data);
        return data;
      });
      
      console.log('🌿 공기정화식물 최종 파싱 데이터:', parsedData.length);
      return parsedData;
    } else if (type === 'dry-garden') {
      const items = xmlDoc.getElementsByTagName('item');
      console.log(`건조에 강한 식물 파싱 결과: ${items.length}개`);
      const parsedData = Array.from(items).map(item => ({
        cntntsNo: item.getElementsByTagName('cntntsNo')[0]?.textContent || '',
        cntntsSj: item.getElementsByTagName('cntntsSj')[0]?.textContent || '',
        clNm: item.getElementsByTagName('clNm')[0]?.textContent || '',
        scnm: item.getElementsByTagName('scnm')[0]?.textContent?.replace(/<[^>]*>/g, '') || '',
        imgUrl1: item.getElementsByTagName('imgUrl1')[0]?.textContent || '',
        thumbImgUrl1: item.getElementsByTagName('thumbImgUrl1')[0]?.textContent || '',
      }));
      console.log('건조에 강한 식물 최종 데이터:', parsedData.length);
      return parsedData;
    } else if (type === 'indoor-garden') {
      const items = xmlDoc.getElementsByTagName('item');
      console.log(`실내정원용 식물 파싱 결과: ${items.length}개`);
      const parsedData = Array.from(items).map(item => {
        // 실내정원용 식물 API는 rtnThumbFileUrl에서 첫 번째 이미지 URL 추출
        const thumbUrls = item.getElementsByTagName('rtnThumbFileUrl')[0]?.textContent || '';
        const firstThumbUrl = thumbUrls.split('|')[0] || '';
        
        return {
          cntntsNo: item.getElementsByTagName('cntntsNo')[0]?.textContent || '',
          cntntsSj: item.getElementsByTagName('cntntsSj')[0]?.textContent || '',
          thumbImgUrl1: firstThumbUrl,
          // 실내정원용 식물 API에는 분류와 학명 정보가 제공되지 않음
          clNm: '실내정원용',
          scnm: '정보없음',
        };
      });
      console.log('실내정원용 식물 최종 데이터:', parsedData.length);
      return parsedData;
    }
    
    return [];
  } catch (error) {
    console.error('XML 파싱 오류:', error);
    return [];
  }
};

export default function PlantsList() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [externalSearchTerm, setExternalSearchTerm] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 페이지네이션 상태
  const [airPage, setAirPage] = useState(1);
  const [dryPage, setDryPage] = useState(1);
  const [indoorPage, setIndoorPage] = useState(1);
  const itemsPerPage = 300; // 모든 데이터를 한 번에 가져오도록 증가

  // 내부 식물 데이터 조회
  const { data: plants, isLoading } = useQuery({
    queryKey: ['/api/plants']
  });

  // 외부 API 데이터 조회 (XML 응답 처리) - 새로운 API 엔드포인트
  const { data: airPurifyingPlants, isLoading: isLoadingAir } = useQuery({
    queryKey: ['/api/admin/external-plants/air-purifying-64-data'],
    queryFn: async () => {
      const timestamp = Date.now();
      const response = await fetch(`/api/admin/external-plants/air-purifying-new-64?pageNo=1&numOfRows=64&pageUnit=64&pageIndex=1&force_new=true&_t=${timestamp}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const xmlData = await response.text();
      console.log('🔥 프론트엔드에서 받은 XML 길이:', xmlData.length);
      return xmlData;
    },
    staleTime: 5 * 60 * 1000, // 5분간 캐시
    gcTime: 10 * 60 * 1000 // 10분간 메모리 보관
  });

  const { data: dryGardenPlants, isLoading: isLoadingDry } = useQuery({
    queryKey: ['/api/admin/external-plants/dry-garden', dryPage, itemsPerPage],
    queryFn: async () => {
      const response = await fetch(`/api/admin/external-plants/dry-garden?pageNo=${dryPage}&numOfRows=${itemsPerPage}`);
      return await response.text();
    }
  });

  const { data: indoorGardenPlants, isLoading: isLoadingIndoor } = useQuery({
    queryKey: ['/api/admin/external-plants/indoor-garden', indoorPage, itemsPerPage],
    queryFn: async () => {
      const response = await fetch(`/api/admin/external-plants/indoor-garden?pageNo=${indoorPage}&numOfRows=${itemsPerPage}`);
      return await response.text();
    }
  });

  // 폼 설정
  const form = useForm<PlantFormValues>({
    resolver: zodResolver(plantSchema),
    defaultValues: {
      name: '',
      scientific_name: '',
      category: '',
      description: '',
      care_instructions: '',
      light_requirement: '',
      water_requirement: '',
      difficulty: undefined,
      price_range: '',
      size: '',
      image_url: '',
      // 새로 추가된 환경 요구사항 필드들
      humidity: '',
      temperature: '',
      winter_temperature: '',
      // 식물 특성 필드들
      plant_type: '',
      color_feature: '',
      pet_safety: '',
      experience_level: '',
      has_thorns: false,
      // 잎 모양 필드들
      leaf_shape1: '',
      leaf_shape2: '',
      leaf_shape3: '',
      leaf_shape4: '',
    },
  });

  // 식물 생성/수정 뮤테이션
  const mutation = useMutation({
    mutationFn: async (data: PlantFormValues) => {
      if (selectedPlant) {
        return apiRequest(`/api/plants/${selectedPlant.id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } else {
        return apiRequest('/api/plants', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plants'] });
      setIsEditDialogOpen(false);
      setSelectedPlant(null);
      form.reset();
      toast({
        title: selectedPlant ? '식물 정보가 수정되었습니다.' : '식물이 추가되었습니다.',
      });
    },
    onError: (error: any) => {
      toast({
        title: '오류가 발생했습니다.',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // 식물 삭제 뮤테이션
  const deleteMutation = useMutation({
    mutationFn: async (plantId: number) => {
      return apiRequest(`/api/plants/${plantId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plants'] });
      toast({
        title: '식물이 삭제되었습니다.',
      });
    },
    onError: (error: any) => {
      toast({
        title: '삭제 중 오류가 발생했습니다.',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // 중복 정리 뮤테이션
  const removeDuplicatesMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/plants/remove-duplicates');
    },
    onSuccess: async (response) => {
      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ['/api/plants'] });
      toast({
        title: '중복 정리 완료',
        description: result.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: '중복 정리 실패',
        description: '중복 정리 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });

  // 검색 필터링
  const filteredPlants = useMemo(() => {
    if (!plants || !Array.isArray(plants)) return [];
    return plants.filter((plant: any) =>
      plant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (plant.scientific_name && plant.scientific_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (plant.description && plant.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [plants, searchTerm]);

  // 외부 API 데이터 필터링
  const filterExternalData = (data: any[], term: string) => {
    if (!term) return data;
    return data.filter((item: any) =>
      (item.title && item.title.toLowerCase().includes(term.toLowerCase())) ||
      (item.cntntsSj && item.cntntsSj.toLowerCase().includes(term.toLowerCase()))
    );
  };

  const startEdit = (plant: any) => {
    setSelectedPlant(plant);
    form.reset({
      name: plant.name || '',
      scientific_name: plant.scientificName || plant.scientific_name || '',
      category: plant.category || '',
      description: plant.description || '',
      care_instructions: plant.careInstructions || plant.care_instructions || '',
      light_requirement: plant.light || plant.light_requirement || '',
      water_requirement: plant.waterNeeds || plant.water_requirement || '',
      difficulty: plant.difficulty || undefined,
      price_range: plant.priceRange || plant.price_range || '',
      size: plant.size || '',
      image_url: plant.imageUrl || plant.image_url || '',
      // 새로 추가된 환경 요구사항 필드들
      humidity: plant.humidity || '',
      temperature: plant.temperature || '',
      winter_temperature: plant.winterTemperature || plant.winter_temperature || '',
      // 식물 특성 필드들
      plant_type: plant.plantType || plant.plant_type || '',
      color_feature: plant.colorFeature || plant.color_feature || '',
      pet_safety: plant.petSafety || plant.pet_safety || '',
      experience_level: plant.experienceLevel || plant.experience_level || '',
      has_thorns: plant.hasThorns || plant.has_thorns || false,
      // 잎 모양 필드들
      leaf_shape1: plant.leafShape1 || plant.leaf_shape1 || '',
      leaf_shape2: plant.leafShape2 || plant.leaf_shape2 || '',
      leaf_shape3: plant.leafShape3 || plant.leaf_shape3 || '',
      leaf_shape4: plant.leafShape4 || plant.leaf_shape4 || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleDeletePlant = (plant: any) => {
    if (window.confirm('정말로 이 식물을 삭제하시겠습니까?')) {
      deleteMutation.mutate(plant.id);
    }
  };

  const onSubmit = (data: PlantFormValues) => {
    mutation.mutate(data);
  };

  // 엑셀 템플릿 다운로드
  const downloadTemplate = () => {
    const headers = [
      'name', 'imageUrl', 'scientificName', 'description', 'waterNeeds', 
      'light', 'humidity', 'temperature', 'winterTemperature', 'colorFeature',
      'plantType', 'hasThorns', 'leafShape1', 'leafShape2', 'leafShape3', 
      'leafShape4', 'experienceLevel', 'petSafety', 'size', 'difficulty',
      'priceRange', 'careInstructions', 'category'
    ];
    
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', '식물_데이터_템플릿.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "템플릿 다운로드 완료",
      description: "엑셀 템플릿이 다운로드되었습니다.",
    });
  };

  // 엑셀 파일 업로드
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/plants/upload-excel', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMsg = result.details || result.error || '파일 업로드에 실패했습니다.';
        throw new Error(errorMsg);
      }
      
      toast({
        title: "업로드 성공",
        description: `${result.success}개의 식물 데이터가 추가되었습니다.${result.error > 0 ? ` (${result.error}개 오류)` : ''}`,
      });

      // 오류가 있다면 추가 정보 표시
      if (result.errors && result.errors.length > 0) {
        console.log('업로드 오류 목록:', result.errors);
      }

      // 데이터 새로고침
      queryClient.invalidateQueries({ queryKey: ['/api/plants'] });
      
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : '파일 업로드 중 오류가 발생했습니다.';
      toast({
        title: "업로드 실패",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 중복 식물 정리
  const handleRemoveDuplicates = async () => {
    setIsRemoving(true);
    
    try {
      const response = await fetch('/api/plants/remove-duplicates', {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '중복 정리에 실패했습니다.');
      }
      
      toast({
        title: "중복 정리 완료",
        description: result.message,
      });

      // 데이터 새로고침
      queryClient.invalidateQueries({ queryKey: ['/api/plants'] });
      
    } catch (error) {
      console.error('Remove duplicates error:', error);
      const errorMessage = error instanceof Error ? error.message : '중복 정리 중 오류가 발생했습니다.';
      toast({
        title: "중복 정리 실패",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>식물 관리</CardTitle>
            <Button onClick={() => setIsEditDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              식물 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="internal" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="internal">내부 식물 목록</TabsTrigger>
              <TabsTrigger value="air-purifying">공기정화식물</TabsTrigger>
              <TabsTrigger value="dry-garden">건조에 강한 식물</TabsTrigger>
              <TabsTrigger value="indoor-garden">실내정원용 식물</TabsTrigger>
            </TabsList>

            {/* 내부 식물 목록 탭 */}
            <TabsContent value="internal" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">등록된 식물 목록</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{filteredPlants.length}개</Badge>
                  
                  {/* 엑셀 관리 버튼들 */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadTemplate}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    템플릿 다운로드
                  </Button>
                  
                  <div className="relative">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".xlsx,.xls"
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="flex items-center gap-2"
                    >
                      {isUploading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      엑셀 업로드
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeDuplicatesMutation.mutate()}
                      disabled={removeDuplicatesMutation.isPending}
                      className="flex items-center gap-2 text-orange-600 hover:text-orange-700"
                    >
                      {removeDuplicatesMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      중복 정리
                    </Button>
                  </div>
                </div>
              </div>

              {/* 검색 입력 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="식물명, 학명 또는 설명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* 식물 목록 테이블 */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead>학명</TableHead>
                      <TableHead>카테고리</TableHead>
                      <TableHead>난이도</TableHead>
                      <TableHead>크기</TableHead>
                      <TableHead>광조건</TableHead>
                      <TableHead>물주기</TableHead>
                      <TableHead>가격대</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center">
                          <RefreshCw className="h-4 w-4 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : filteredPlants && filteredPlants.length > 0 ? (
                      filteredPlants.map((plant: any) => (
                        <TableRow key={plant.id}>
                          <TableCell className="font-medium">{plant.name}</TableCell>
                          <TableCell className="text-sm text-gray-600">{plant.scientificName || plant.scientific_name || '-'}</TableCell>
                          <TableCell>{plant.category || '-'}</TableCell>
                          <TableCell>{plant.difficulty || '-'}</TableCell>
                          <TableCell>{plant.size || '-'}</TableCell>
                          <TableCell className="text-sm">{plant.light || plant.light_requirement || '-'}</TableCell>
                          <TableCell className="text-sm">{plant.waterNeeds || plant.water_needs || plant.water_requirement || '-'}</TableCell>
                          <TableCell>{plant.priceRange || plant.price_range || '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEdit(plant)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePlant(plant)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          {searchTerm ? '검색 결과가 없습니다.' : '등록된 식물이 없습니다.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* 공기정화식물 탭 */}
            <TabsContent value="air-purifying" className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">공기정화식물 데이터</h3>
                  <Badge variant="outline">농촌진흥청 국립원예특작과학원</Badge>
                </div>
                <Badge variant="outline">{filterExternalData(parseXMLData(airPurifyingPlants || '', 'air-purifying'), externalSearchTerm).length}개</Badge>
              </div>

              {/* 외부 API 검색 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="공기정화식물 검색..."
                  value={externalSearchTerm}
                  onChange={(e) => setExternalSearchTerm(e.target.value)}
                  className="pl-10 pr-10"
                />
                {externalSearchTerm && (
                  <button
                    onClick={() => setExternalSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* 공기정화식물 테이블 */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>식물명</TableHead>
                      <TableHead>등록일</TableHead>
                      <TableHead>출처</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingAir ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          <RefreshCw className="h-4 w-4 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : (
                      filterExternalData(parseXMLData(airPurifyingPlants || '', 'air-purifying'), externalSearchTerm).map((plant: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{plant.idx}</TableCell>
                          <TableCell className="font-medium">{plant.title}</TableCell>
                          <TableCell>{plant.regDate}</TableCell>
                          <TableCell className="text-sm text-gray-600">{plant.publishOrg}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* 건조에 강한 실내식물 탭 */}
            <TabsContent value="dry-garden" className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">건조에 강한 실내식물</h3>
                  <Badge variant="outline">농사로 포털</Badge>
                </div>
                <Badge variant="outline">{filterExternalData(parseXMLData(dryGardenPlants || '', 'dry-garden'), externalSearchTerm).length}개</Badge>
              </div>

              {/* 외부 API 검색 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="건조에 강한 식물 검색..."
                  value={externalSearchTerm}
                  onChange={(e) => setExternalSearchTerm(e.target.value)}
                  className="pl-10 pr-10"
                />
                {externalSearchTerm && (
                  <button
                    onClick={() => setExternalSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* 건조에 강한 식물 테이블 */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이미지</TableHead>
                      <TableHead>식물명</TableHead>
                      <TableHead>학명</TableHead>
                      <TableHead>분류</TableHead>
                      <TableHead>콘텐츠 번호</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingDry ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <RefreshCw className="h-4 w-4 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : (
                      filterExternalData(parseXMLData(dryGardenPlants || '', 'dry-garden'), externalSearchTerm).map((plant: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>
                            {plant.thumbImgUrl1 ? (
                              <img 
                                src={plant.thumbImgUrl1} 
                                alt={plant.cntntsSj}
                                className="w-12 h-12 object-cover rounded-md"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-200 rounded-md flex items-center justify-center text-xs text-gray-500">
                                No Image
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{plant.cntntsSj}</TableCell>
                          <TableCell className="text-sm text-gray-600">{plant.scnm || '-'}</TableCell>
                          <TableCell className="text-sm">{plant.clNm || '-'}</TableCell>
                          <TableCell className="text-sm text-gray-500">{plant.cntntsNo}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* 실내정원용 식물 탭 */}
            <TabsContent value="indoor-garden" className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">실내정원용 식물</h3>
                  <Badge variant="outline">농사로 포털</Badge>
                </div>
                <Badge variant="outline">{filterExternalData(parseXMLData(indoorGardenPlants || '', 'indoor-garden'), externalSearchTerm).length}개</Badge>
              </div>

              {/* 외부 API 검색 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="실내정원용 식물 검색..."
                  value={externalSearchTerm}
                  onChange={(e) => setExternalSearchTerm(e.target.value)}
                  className="pl-10 pr-10"
                />
                {externalSearchTerm && (
                  <button
                    onClick={() => setExternalSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* 실내정원용 식물 테이블 */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이미지</TableHead>
                      <TableHead>식물명</TableHead>
                      <TableHead>학명</TableHead>
                      <TableHead>분류</TableHead>
                      <TableHead>콘텐츠 번호</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingIndoor ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <RefreshCw className="h-4 w-4 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : (
                      filterExternalData(parseXMLData(indoorGardenPlants || '', 'indoor-garden'), externalSearchTerm).map((plant: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>
                            {plant.thumbImgUrl1 ? (
                              <img 
                                src={plant.thumbImgUrl1} 
                                alt={plant.cntntsSj}
                                className="w-12 h-12 object-cover rounded-md"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-200 rounded-md flex items-center justify-center text-xs text-gray-500">
                                No Image
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{plant.cntntsSj}</TableCell>
                          <TableCell className="text-sm text-gray-600">{plant.scnm || '-'}</TableCell>
                          <TableCell className="text-sm">{plant.clNm || '-'}</TableCell>
                          <TableCell className="text-sm text-gray-500">{plant.cntntsNo}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 식물 정보 수정/추가 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedPlant ? '식물 정보 수정' : '식물 정보 추가'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>식물 이름 *</FormLabel>
                      <FormControl>
                        <Input placeholder="식물 이름을 입력하세요" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="scientific_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>학명</FormLabel>
                      <FormControl>
                        <Input placeholder="학명을 입력하세요" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>카테고리</FormLabel>
                      <FormControl>
                        <Input placeholder="카테고리를 입력하세요" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="difficulty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>난이도</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="난이도를 선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="easy">쉬움</SelectItem>
                          <SelectItem value="medium">보통</SelectItem>
                          <SelectItem value="hard">어려움</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price_range"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>가격대</FormLabel>
                      <FormControl>
                        <Input placeholder="가격대를 입력하세요" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="size"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>크기</FormLabel>
                      <FormControl>
                        <Input placeholder="크기를 입력하세요" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 설명 */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>설명</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="식물에 대한 설명을 입력하세요"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 환경 요구사항 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-blue-700">🌞 환경 요구사항</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="light_requirement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>광조건</FormLabel>
                        <FormControl>
                          <Input placeholder="예: 반음지, 밝은 간접광" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="water_requirement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>물주기</FormLabel>
                        <FormControl>
                          <Input placeholder="예: 주 1-2회, 표면 건조시" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="humidity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>습도</FormLabel>
                        <FormControl>
                          <Input placeholder="예: 50-60%, 높은 습도" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="temperature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>온도</FormLabel>
                        <FormControl>
                          <Input placeholder="예: 18-25℃" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="winter_temperature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>겨울 온도</FormLabel>
                        <FormControl>
                          <Input placeholder="예: 15℃ 이상" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* 식물 특성 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-purple-700">🍃 식물 특성</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="plant_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>식물 타입</FormLabel>
                        <FormControl>
                          <Input placeholder="예: 관엽식물, 다육식물" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="color_feature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>색상 특징</FormLabel>
                        <FormControl>
                          <Input placeholder="예: 짙은 녹색, 무늬잎" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pet_safety"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>반려동물 안전성</FormLabel>
                        <FormControl>
                          <Input placeholder="예: 안전, 주의, 독성" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="experience_level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>경험 수준</FormLabel>
                        <FormControl>
                          <Input placeholder="예: 초보자, 중급자, 전문가" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <FormField
                    control={form.control}
                    name="has_thorns"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value || false}
                            onChange={(e) => field.onChange(e.target.checked)}
                            className="h-4 w-4"
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">가시 있음</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* 잎 모양 정보 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-green-600">🌿 잎 모양</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="leaf_shape1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>잎 모양 1</FormLabel>
                        <FormControl>
                          <Input placeholder="예: 타원형, 심장형" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="leaf_shape2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>잎 모양 2</FormLabel>
                        <FormControl>
                          <Input placeholder="추가 잎 모양 특징" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="leaf_shape3"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>잎 모양 3</FormLabel>
                        <FormControl>
                          <Input placeholder="추가 잎 모양 특징" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="leaf_shape4"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>잎 모양 4</FormLabel>
                        <FormControl>
                          <Input placeholder="추가 잎 모양 특징" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* 관리 방법 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-orange-700">⚙️ 관리 정보</h3>
                <FormField
                  control={form.control}
                  name="care_instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>상세 관리 방법</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="상세한 관리 방법을 입력하세요"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 이미지 URL */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-red-700">📷 이미지</h3>
                <FormField
                  control={form.control}
                  name="image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이미지 URL</FormLabel>
                      <FormControl>
                        <Input placeholder="이미지 URL을 입력하세요" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 버튼 */}
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedPlant(null);
                    form.reset();
                  }}
                >
                  취소
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? '저장 중...' : selectedPlant ? '수정' : '추가'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}