import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface PlantSearchProps {
  onSelectPlant: (plantName: string) => void;
}

export default function PlantSearch({ onSelectPlant }: PlantSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  
  // 식물 검색 쿼리
  const { data: plants, isLoading } = useQuery({
    queryKey: ['/api/plants/search', searchTerm],
    queryFn: async () => {
      // 빈 검색어면 전체 식물 목록 가져오기
      const url = searchTerm.trim() 
        ? `/api/plants/search?q=${encodeURIComponent(searchTerm)}` 
        : `/api/plants`;
      
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error('식물 검색 실패');
      }
      
      return res.json();
    },
    enabled: true // 항상 실행
  });

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="식물 이름 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          <div className="mt-2">
            <h3 className="text-sm font-medium mb-3">
              {plants?.length > 0 
                ? `검색 결과: ${plants.length}개` 
                : isLoading 
                  ? "검색 중..." 
                  : "검색 결과 없음"}
            </h3>
            
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array(8).fill(0).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-32 w-full rounded-md" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            ) : plants && plants.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {plants.map((plant: any) => (
                  <div
                    key={plant.id}
                    className="border rounded-md overflow-hidden cursor-pointer hover:border-primary transition-colors"
                    onClick={() => onSelectPlant(plant.name)}
                  >
                    <div 
                      className="h-32 bg-center bg-cover"
                      style={{ backgroundImage: `url(${plant.imageUrl || '/assets/plants/default-plant.png'})` }}
                    />
                    <div className="p-2">
                      <h3 className="font-medium text-sm truncate">{plant.name}</h3>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center bg-accent/20 rounded-md">
                <p className="text-muted-foreground">검색 결과가 없습니다.</p>
                <p className="text-sm text-muted-foreground mt-1">다른 검색어를 입력해 보세요.</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}