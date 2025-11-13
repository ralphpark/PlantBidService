import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Leaf, MapPin, Search, ThumbsUp } from "lucide-react";

interface RecommendationOptionsProps {
  onSelectOption: (option: "ai" | "manual" | "region-store") => void;
}

export default function RecommendationOptions({ onSelectOption }: RecommendationOptionsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-3 mb-8">
      <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => onSelectOption("ai")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI 추천
          </CardTitle>
          <CardDescription>
            몇 가지 질문에 답하면 AI가 최적의 식물을 추천해 드립니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">1</div>
                <p className="text-sm">AI에게 환경과 선호도를 알려주세요</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">2</div>
                <p className="text-sm">5개 이상의 질문에 답하면 추천이 시작됩니다</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">3</div>
                <p className="text-sm">맞춤형 식물 추천 결과를 받아보세요</p>
              </div>
            </div>
            <Button className="w-full">
              <ThumbsUp className="h-4 w-4 mr-2" />
              AI 추천받기
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => onSelectOption("manual")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            직접 선택
          </CardTitle>
          <CardDescription>
            다양한 식물 목록에서 직접 원하는 식물을 검색하고 선택하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">1</div>
                <p className="text-sm">이름 또는 특성으로 식물을 검색하세요</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">2</div>
                <p className="text-sm">원하는 식물에 대한 정보를 확인하세요</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">3</div>
                <p className="text-sm">마음에 드는 식물을 선택하세요</p>
              </div>
            </div>
            <Button className="w-full">
              <Leaf className="h-4 w-4 mr-2" />
              직접 선택하기
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => onSelectOption("region-store")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            지역 상점
          </CardTitle>
          <CardDescription>
            내 주변 지역의 식물 상점에서 직접 구매할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">1</div>
                <p className="text-sm">지도에서 원하는 지역을 선택하세요</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">2</div>
                <p className="text-sm">해당 지역의 식물 상점을 확인하세요</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">3</div>
                <p className="text-sm">원하는 식물을 선택하고 주문하세요</p>
              </div>
            </div>
            <Button className="w-full">
              <MapPin className="h-4 w-4 mr-2" />
              지역 상점 찾기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}