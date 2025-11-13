import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import RecommendationOptions from "@/components/plant/recommendation-options";
import PlantSearch from "@/components/plant/plant-search";
import GoogleMapWrapper from "@/components/map/google-map";
import { Leaf, Send, ChevronLeft } from "lucide-react";

export default function RecommendationWizard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<'select-option' | 'ai-consultation' | 'manual-selection' | 'location-selection' | 'region-store-selection'>('select-option');
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    address: string;
    lat: number;
    lng: number;
    radius: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 추천 옵션 선택 처리
  const handleSelectOption = (option: "ai" | "manual" | "region-store") => {
    if (option === "ai") {
      // AI 상담으로 이동
      setLocation('/ai-consultation');
    } else if (option === "manual") {
      // 수동 선택 모드로 전환
      setStep('manual-selection');
    } else if (option === "region-store") {
      // 지역 상점 찾기 - 위치 선택부터 시작
      setStep('region-store-selection');
    }
  };

  // 식물 선택 처리
  const handleSelectPlant = (plantName: string) => {
    setSelectedPlant(plantName);
    setStep('location-selection');
  };

  // 위치 선택 처리
  const handleLocationSelect = (location: { 
    address: string; 
    lat: number; 
    lng: number; 
  }) => {
    // NaverMap에서 제공하는 location에 radius 추가 (기본값 5)
    setSelectedLocation({
      ...location,
      radius: 5
    });
  };

  // 입찰 요청 제출
  const handleSubmitBidRequest = async () => {
    if (!user || !selectedPlant || !selectedLocation) {
      toast({
        title: "정보 부족",
        description: "식물과 위치 정보가 필요합니다.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiRequest("POST", "/api/bids/request", {
        plantName: selectedPlant,
        region: selectedLocation.address,
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        radius: selectedLocation.radius
      });

      if (!response.ok) {
        throw new Error("Failed to request bids");
      }

      const data = await response.json();

      toast({
        title: "견적 요청 완료",
        description: data.message || "지역 판매자들에게 견적 요청을 보냈습니다.",
      });

      // 성공 후 AI 상담 페이지로 이동
      setTimeout(() => {
        setLocation('/ai-consultation');
      }, 1500);
    } catch (error) {
      console.error("Error requesting bids:", error);
      toast({
        title: "오류 발생",
        description: "견적 요청 중 문제가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 지역 상점에서 위치 선택 후 식물 검색으로 이동
  const handleRegionLocationSelect = (location: { 
    address: string; 
    lat: number; 
    lng: number; 
  }) => {
    setSelectedLocation({
      ...location,
      radius: 5
    });
    setStep('manual-selection');
  };

  // 이전 단계로 이동
  const handleBack = () => {
    if (step === 'manual-selection') {
      // 지역 상점 플로우에서 왔다면 다시 지역 선택으로
      if (selectedLocation) {
        setStep('region-store-selection');
      } else {
        setStep('select-option');
      }
    } else if (step === 'location-selection') {
      setStep('manual-selection');
      setSelectedPlant(null);
    } else if (step === 'region-store-selection') {
      setStep('select-option');
      setSelectedLocation(null);
    }
  };

  // 로그인 상태 확인
  if (!user) {
    return <Redirect to="/auth" />;
  }

  return (
    <DashboardLayout>
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">맞춤 식물 추천</h1>
          </div>
          
          {step !== 'select-option' && (
            <Button
              variant="ghost"
              className="w-fit px-2"
              onClick={handleBack}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              이전으로
            </Button>
          )}
        </div>

        {/* 추천 방식 선택 */}
        {step === 'select-option' && (
          <RecommendationOptions onSelectOption={handleSelectOption} />
        )}

        {/* 지역 상점 - 위치 선택 */}
        {step === 'region-store-selection' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">지역 선택</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  식물을 구매하고 싶은 지역을 선택하세요. 해당 지역의 판매자들이 판매하는 식물을 확인할 수 있습니다.
                </p>
              </CardContent>
            </Card>
            
            <GoogleMapWrapper onLocationSelect={handleRegionLocationSelect} />
          </div>
        )}

        {/* 식물 검색 */}
        {step === 'manual-selection' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">식물 검색</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedLocation && (
                  <p className="text-muted-foreground mb-2">
                    선택된 지역: <span className="font-semibold text-foreground">{selectedLocation.address}</span>
                  </p>
                )}
                <p className="text-muted-foreground mb-4">
                  원하는 식물을 검색하여 선택하세요. 검색 결과에서 해당 식물을 클릭하면 다음 단계로 넘어갑니다.
                </p>
              </CardContent>
            </Card>
            
            <PlantSearch onSelectPlant={handleSelectPlant} />
          </div>
        )}

        {/* 지역 선택 */}
        {step === 'location-selection' && (
          <div className="space-y-6">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-xl">위치 선택</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  선택된 식물: <span className="font-semibold text-foreground">{selectedPlant}</span>
                </p>
                <p className="text-muted-foreground mb-4">
                  식물 배송이 필요한 위치와 반경을 선택하세요. 해당 지역의 판매자들에게 견적 요청이 전송됩니다.
                </p>
              </CardContent>
            </Card>
            
            <GoogleMapWrapper onLocationSelect={handleLocationSelect} />

            <div className="flex justify-end">
              <Button 
                onClick={handleSubmitBidRequest} 
                disabled={!selectedLocation || isSubmitting}
                className="gap-1.5"
              >
                <Leaf className="h-4 w-4" />
                견적 요청하기
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}