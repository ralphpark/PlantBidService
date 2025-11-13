import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ChatTest() {
  const [messages, setMessages] = useState<string[]>([
    "안녕하세요! 이것은 테스트 메시지입니다.\n두 줄로 표시되어야 합니다.",
    "긴 메시지 테스트입니다. 이 메시지는 여러 줄에 걸쳐 표시되어야 합니다. 줄바꿈이 있는지 확인하기 위한 테스트입니다.\n이것은 두 번째 줄입니다.\n이것은 세 번째 줄입니다.",
    "이것은 세 번째 메시지입니다. 짧은 메시지입니다."
  ]);
  const [newMessage, setNewMessage] = useState("");

  const addMessage = () => {
    if (newMessage.trim()) {
      setMessages([...messages, newMessage]);
      setNewMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addMessage();
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">채팅 테스트 페이지</h1>
      
      <Card className="flex flex-col h-[700px]">
        <CardHeader className="p-4 border-b">
          <CardTitle className="text-lg">메시지 표시 테스트</CardTitle>
        </CardHeader>
        
        <CardContent className="flex-grow p-4 overflow-auto">
          <ScrollArea className="h-[580px] w-full pr-4">
            {messages.map((msg, index) => (
              <div 
                key={`msg-${index}`} 
                className="my-3 rounded-lg p-4 bg-white shadow-md"
              >
                <div className="flex items-center mb-2">
                  <div className="font-semibold">
                    테스트 사용자
                  </div>
                  <div className="ml-auto text-xs text-gray-500">
                    {new Date().toLocaleString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div className="text-sm chat-message leading-relaxed whitespace-pre-wrap">{msg}</div>
              </div>
            ))}
          </ScrollArea>
        </CardContent>
        
        <CardFooter className="p-4 border-t">
          <div className="flex w-full space-x-2">
            <Textarea
              placeholder="메시지를 입력하세요..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-grow"
            />
            <Button 
              onClick={addMessage} 
              disabled={!newMessage.trim()}
              className="self-end"
            >
              전송
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}