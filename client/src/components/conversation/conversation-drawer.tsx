import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { MessageSquareText, Plus, RefreshCw, Loader2 } from "lucide-react";
import { useKoreanTime } from "@/lib/use-korean-time";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type ConversationPreview = {
  id: number;
  preview: string;
  messageCount: number;
  lastUpdated: string;
  hasRecommendations: boolean;
};

export function ConversationDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLocation, navigate] = useLocation();
  const { toast } = useToast();
  const { formatRelativeTime } = useKoreanTime();
  
  // URL 파라미터에서 대화 ID 추출
  const getConversationIdFromUrl = () => {
    if (!currentLocation) return null;
    const match = currentLocation.match(/conversation=(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  // 대화 목록 가져오기
  const { data: conversations, isLoading, refetch } = useQuery<ConversationPreview[]>({
    queryKey: ["/api/conversations"],
    queryFn: async () => {
      const response = await fetch("/api/conversations");
      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }
      return response.json();
    },
  });

  // 새 대화 생성 뮤테이션
  const createNewConversation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/conversations");
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      navigate(`/ai-consultation?conversation=${data.id}`);
      setIsOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "새 대화 생성 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 대화 링크 클릭 처리
  const handleConversationClick = (id: number) => {
    console.log("Navigating to conversation:", id);
    setIsOpen(false);
    
    // 완전히 새로운 페이지로 전환하고 캐시를 비우기 위해 랜덤 쿼리 파라미터 추가
    const randomParam = Math.random().toString(36).substring(7);
    // 마지막 대화를 표시하기 위한 쿼리 파라미터 추가
    const destination = `/ai-consultation?conversation=${id}&t=${randomParam}&showLastConversation=true`;
    
    // 현재 페이지를 완전히 새로 고침
    window.location.replace(destination);
  };

  // 새 대화 생성 처리
  const handleNewConversation = () => {
    createNewConversation.mutate();
  };

  // 목록 새로고침
  const handleRefresh = () => {
    refetch();
  };

  return (
    <Sheet onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="mr-1">
          <MessageSquareText className="h-5 w-5" />
          <span className="sr-only">대화 목록</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center justify-between">
            대화 기록
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={handleRefresh}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={handleNewConversation}
                disabled={createNewConversation.isPending}
              >
                {createNewConversation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </SheetTitle>
          <Separator />
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-120px)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-20">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : conversations && conversations.length > 0 ? (
            <div className="space-y-1 py-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="flex flex-col px-3 py-2 cursor-pointer rounded-md hover:bg-muted transition-colors"
                  onClick={() => handleConversationClick(conversation.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">
                      {conversation.hasRecommendations ? "🌱 " : ""}
                      대화 #{conversation.id}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(new Date(conversation.lastUpdated))}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {conversation.preview || "빈 대화"}
                  </p>
                  <div className="flex items-center mt-1 text-xs text-muted-foreground">
                    <MessageSquareText className="h-3 w-3 mr-1" />
                    <span>{conversation.messageCount}개 메시지</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-muted-foreground">
              <p className="text-sm">대화 기록이 없습니다.</p>
              <Button 
                variant="link" 
                size="sm"
                onClick={handleNewConversation}
                disabled={createNewConversation.isPending}
                className="mt-2"
              >
                {createNewConversation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                새 대화 시작하기
              </Button>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}