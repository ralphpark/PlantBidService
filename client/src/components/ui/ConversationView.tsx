import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getVendorColorClasses } from "@/lib/utils";
import { PlantRecommendations } from './PlantRecommendations';
import { VendorRecommendations } from './VendorRecommendations';
import { MapLocationInfo } from './MapLocationInfo';
import { LocateIcon } from "lucide-react";

export function ConversationView({ 
  conversationId, 
  user,
  className = "" 
}: { 
  conversationId?: number; 
  user: { name?: string; role?: string };
  className?: string;
}) {
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // 마지막으로 로드된 메시지 ID 추적
  const lastMessageIdRef = useRef<string | null>(null);
  // 마지막 폴링 시간 추적
  const lastPollingTimeRef = useRef<number>(0);
  // 폴링이 진행 중인지 추적
  const isPollingRef = useRef<boolean>(false);

  // 대화 내용 가져오기
  const fetchConversation = useCallback(async () => {
    if (!conversationId) return;
    
    try {
      console.log(`대화 ID ${conversationId} 데이터 가져오기 시작`);
      
      // 재시도 로직 구현
      let response;
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries) {
        try {
          response = await fetch(`/api/conversations/${conversationId}`);
          if (response.ok) break; // 성공하면 루프 종료
          
          console.warn(`대화 데이터 가져오기 실패 (${retries + 1}/${maxRetries}): HTTP ${response.status}`);
          retries++;
          
          if (retries >= maxRetries) break;
          // 재시도 사이에 짧은 지연 시간 추가
          await new Promise(resolve => setTimeout(resolve, 800));
        } catch (fetchError) {
          console.error(`대화 데이터 페치 오류 (${retries + 1}/${maxRetries}):`, fetchError);
          retries++;
          if (retries >= maxRetries) throw fetchError;
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }
      
      if (!response || !response.ok) {
        const errorStatus = response ? response.status : 'unknown';
        throw new Error(`대화를 불러오는데 실패했습니다 (HTTP ${errorStatus})`);
      }
      
      const data = await response.json();
      if (data.messages && Array.isArray(data.messages)) {
        // 🚫 중복 입찰 메시지 필터링 로직 (최종 완전 해결)
        const validMessages = [];
        const vendorReviewSeen = new Set(); // 판매자별 검토 메시지 추적
        
        // 먼저 모든 판매자 검토 메시지를 찾아서 최고 품질만 선택
        const vendorReviewMessages = new Map();
        
        for (const msg of data.messages) {
          if (!msg || !msg.role) continue;
          
          // 판매자 검토 메시지 수집
          if (msg.role === 'vendor' && msg.vendorId) {
            const isReviewMessage = (
              (msg.content && (
                msg.content.includes('검토중입니다') ||
                msg.content.includes('상품이 추가되어 입찰을 검토중')
              )) ||
              msg.bidStatus === 'reviewing' ||
              ((!msg.content || msg.content.trim() === '') && msg.product)
            );
            
            if (isReviewMessage) {
              const vendorKey = `vendor_${msg.vendorId}`;
              
              // 텍스트가 있는 메시지를 우선적으로 선택
              if (!vendorReviewMessages.has(vendorKey)) {
                vendorReviewMessages.set(vendorKey, msg);
              } else {
                const existing = vendorReviewMessages.get(vendorKey);
                // 기존 메시지가 빈 메시지이고 새 메시지에 텍스트가 있으면 교체
                if ((!existing.content || existing.content.trim() === '') && 
                    (msg.content && msg.content.trim() !== '')) {
                  vendorReviewMessages.set(vendorKey, msg);
                }
              }
            }
          }
        }
        
        // 이제 메시지를 다시 순회하면서 필터링
        for (const msg of data.messages) {
          if (!msg || !msg.role) continue;
          
          // 판매자 메시지 처리
          if (msg.role === 'vendor' && msg.vendorId) {
            const vendorKey = `vendor_${msg.vendorId}`;
            
            const isReviewMessage = (
              (msg.content && (
                msg.content.includes('검토중입니다') ||
                msg.content.includes('상품이 추가되어 입찰을 검토중')
              )) ||
              msg.bidStatus === 'reviewing' ||
              ((!msg.content || msg.content.trim() === '') && msg.product)
            );
            
            if (isReviewMessage) {
              // 선택된 검토 메시지인지 확인
              const selectedReviewMsg = vendorReviewMessages.get(vendorKey);
              if (selectedReviewMsg === msg && !vendorReviewSeen.has(vendorKey)) {
                vendorReviewSeen.add(vendorKey);
                validMessages.push(msg);
                console.log(`✅ 판매자 ${msg.vendorId} 최종 검토 메시지 선택:`, msg.content || '상품 정보');
              } else {
                console.log(`🚫 판매자 ${msg.vendorId} 중복/낮은품질 검토 메시지 차단:`, msg.content || '빈 메시지');
              }
            } else {
              // 검토 메시지가 아닌 판매자 메시지는 표시
              validMessages.push(msg);
            }
          } else {
            // 판매자가 아닌 메시지는 모두 표시
            if (msg.content !== undefined && msg.content !== null) {
              validMessages.push(msg);
            }
          }
        }
        
        // 마지막 메시지 ID 확인 (필요하면 이 ID를 사용해 부분 업데이트 요청 가능)
        const latestMessage = validMessages[validMessages.length - 1];
        if (latestMessage) {
          const newLastMsgId = `${latestMessage.role}-${latestMessage.timestamp || latestMessage.createdAt}`;
          if (lastMessageIdRef.current === newLastMsgId) {
            console.log('새 메시지가 없습니다. 업데이트 생략');
            return;
          }
          lastMessageIdRef.current = newLastMsgId;
        }
        
        // 메시지 종류 분리 (디버깅용, 필요한 경우에만 로그)
        const messageCount = validMessages.length;
        if (messageCount > 0) {
          console.log(`총 ${messageCount}개 메시지 로드됨`);
          
          // 디버깅시에만 사용
          /*
          const aiMessages = validMessages.filter((msg: any) => msg.role === 'assistant');
          const userMessages = validMessages.filter((msg: any) => msg.role === 'user');
          const vendorMessages = validMessages.filter((msg: any) => 
            msg.role === 'vendor' && msg.vendorId
          );
          
          console.log('AI 메시지:', aiMessages.length);
          console.log('사용자 메시지:', userMessages.length);
          console.log('판매자 메시지:', vendorMessages.length);
          */
        }
        
        // 정제된 메시지로 대체
        data.messages = validMessages;
        
        // 모든 메시지 처리하기
        let processedMessages: any[] = [];
        
        // 판매자별 색상 캐시 (동일한 판매자 메시지에 일관된 색상 적용)
        const vendorColors: Record<number, string> = {};
        
        // 그룹화된 판매자 메시지를 처리
        for (const msg of data.messages) {
          // 메시지 병합 대신 모든 메시지 표시
          processedMessages.push(msg);
          
          // 판매자 메시지인 경우 색상 캐싱
          if (msg.role === 'vendor' && msg.vendorId) {
            if (!vendorColors[msg.vendorId]) {
              vendorColors[msg.vendorId] = msg.vendorColor || 'bg-blue-50';
            }
          }
        }
        
        // 메시지 설정
        setChatMessages(processedMessages);
      }
    } catch (error) {
      console.error("대화 로드 오류:", error);
      setWsConnected(false); // 연결 실패 상태로 설정
      toast({
        title: "대화 로드 실패",
        description: "대화 내용을 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    }
  }, [conversationId, toast]);
  
  // 메시지 전송 이벤트를 처리하는 함수
  const handleMessageSent = useCallback((event: CustomEvent) => {
    const eventDetail = event.detail as { conversationId: number };
    
    // 현재 대화에 대한 이벤트인지 확인
    if (conversationId && eventDetail.conversationId === conversationId) {
      console.log(`메시지 전송 이벤트 감지됨: 대화 ID ${conversationId} 새로고침`);
      fetchConversation();
    }
  }, [conversationId, fetchConversation]);
  
  // 주기적 새로고침을 위한 폴링 설정
  useEffect(() => {
    if (!conversationId) return;
    
    // 데이터 로드 시작
    setWsConnected(true);
    setWsError(null);
    lastMessageIdRef.current = null;
    
    console.log(`대화 ID ${conversationId} 데이터 로드 시작`);
    
    // 초기 로드
    fetchConversation();
    
    // 메시지 전송 이벤트 리스너 등록
    window.addEventListener('message-sent', handleMessageSent as EventListener);
    
    // 주기적 업데이트를 위한 인터벌 설정 (10초마다)
    const intervalId = setInterval(() => {
      // 이미 폴링 중이면 건너뛰기
      if (isPollingRef.current) {
        console.log('이전 폴링이 진행 중입니다. 이번 폴링은 생략합니다.');
        return;
      }
      
      // 마지막 폴링 시간 체크 (너무 짧은 간격으로 폴링 방지)
      const now = Date.now();
      const timeSinceLastPoll = now - lastPollingTimeRef.current;
      if (timeSinceLastPoll < 5000) { // 5초 미만이면 스킵
        console.log(`마지막 폴링 후 ${timeSinceLastPoll}ms 지남. 최소 간격은 5000ms`);
        return;
      }
      
      console.log(`대화 ${conversationId} 주기적 업데이트 실행`);
      isPollingRef.current = true;
      lastPollingTimeRef.current = now;
      
      fetchConversation().finally(() => {
        isPollingRef.current = false;
      });
    }, 10000);
    
    // 컴포넌트 언마운트 시 인터벌 정리
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('message-sent', handleMessageSent as EventListener);
      setWsConnected(false);
      isPollingRef.current = false;
    };
  }, [conversationId, fetchConversation, handleMessageSent]);
  
  // conversationId가 변경될 때 대화 내용 로드
  useEffect(() => {
    fetchConversation();
  }, [conversationId, fetchConversation]);
  
  // 채팅창 스크롤 자동 이동
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);
  
  // 메시지 입력 및 전송 기능 제거됨
  
  // 메시지 그룹화 처리
  const renderMessages = () => {
    console.log("메시지 렌더링:", chatMessages);
    
    // 메시지 수를 콘솔로 자세히 출력
    if (chatMessages && chatMessages.length) {
      console.log(`총 ${chatMessages.length}개 메시지 렌더링 중`);
      console.log(`첫 번째 메시지:`, chatMessages[0]);
      console.log(`마지막 메시지:`, chatMessages[chatMessages.length - 1]);
      
      // 메시지 역할 디버깅
      const productMessages = chatMessages.filter(msg => msg.product).length;
      console.log(`product 있는 메시지: ${productMessages}개`);
      if (productMessages > 0) {
        console.log(`제품 포함 메시지 예시:`, chatMessages.find(msg => msg.product));
      }
      
      const imageMessages = chatMessages.filter(msg => msg.referenceImages && msg.referenceImages.length > 0).length;
      console.log(`참조 이미지 있는 메시지: ${imageMessages}개`);
      
      // 메시지 역할 분석
      console.log(`사용자 역할:`, user.role);
      console.log(`메시지 역할 배열:`, chatMessages.map(msg => msg.role));
    }
    
    if (!chatMessages || !chatMessages.length) {
      return <div className="text-center text-gray-500 py-8">대화가 없습니다. 메시지를 보내보세요!</div>;
    }
    
    return chatMessages.map((msg, index) => {
      const isVendor = msg.role === 'vendor';
      const isPlantRecommendation = msg.role === 'assistant' && msg.recommendations && msg.recommendations.length > 0;
      const isVendorRecommendation = msg.role === 'assistant' && msg.vendors && msg.vendors.length > 0;
      const isLocationInfo = msg.role === 'assistant' && msg.locationInfo;
      
      // 판매자 색상 클래스 계산
      let vendorColorClass = 'bg-blue-50';
      if (isVendor && msg.vendorColor) {
        vendorColorClass = msg.vendorColor;
      }
      
      // 특정 메시지 유형 분기 처리 (식물/판매자 추천, 위치 정보 등)
      if (isPlantRecommendation) {
        // console.log("식물 추천 메시지:", msg);
        return (
          <div key={`msg-${index}`} className="my-2">
            <div className="bg-white rounded-lg p-3 shadow-sm mb-1">
              <div className="chat-message whitespace-pre-wrap break-words text-sm mb-2">{typeof msg.content === 'string' ? msg.content : ''}</div>
              <PlantRecommendations recommendations={msg.recommendations} />
            </div>
          </div>
        );
      }
      
      if (isVendorRecommendation) {
        // console.log("판매자 추천 메시지:", msg);
        return (
          <div key={`msg-${index}`} className="my-2">
            <div className="bg-white rounded-lg p-3 shadow-sm mb-1">
              <div className="chat-message whitespace-pre-wrap break-words text-sm mb-2">{typeof msg.content === 'string' ? msg.content : ''}</div>
              <VendorRecommendations vendors={msg.vendors} />
            </div>
          </div>
        );
      }
      
      if (isLocationInfo) {
        return (
          <div key={`msg-${index}`} className="my-2">
            <div className="bg-white rounded-lg p-3 shadow-sm mb-1">
              <div className="chat-message whitespace-pre-wrap break-words text-sm mb-2">{typeof msg.content === 'string' ? msg.content : ''}</div>
              <MapLocationInfo location={msg.locationInfo} />
            </div>
          </div>
        );
      }
      
      // 판매자 입찰 메시지인 경우 (상품 정보와 가격이 있는 경우)
      if (isVendor && msg.price && msg.product) {
        return (
          <div 
            key={`msg-${index}`} 
            className={`my-2 rounded-lg p-3 ${vendorColorClass} shadow-sm`}
          >
            <div className="flex items-center mb-2">
              <div className="font-semibold">
                {user.role === 'vendor'
                  ? (msg.vendorId === user.id ? '판매자(나)' : (msg.vendorName || '판매자'))
                  : (msg.vendorName || '판매자')
                }
              </div>
              <div className="ml-auto text-xs text-gray-500">
                {new Date(msg.timestamp).toLocaleString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
            <div className="chat-message whitespace-pre-wrap break-words text-sm mb-2">{msg.content}</div>
            
            <div className="bg-white rounded-lg p-3 mt-2">
              <div className="flex items-center">
                {msg.imageUrl && (
                  <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden mr-3">
                    <img 
                      src={msg.imageUrl} 
                      alt={msg.product.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-medium">{msg.product.name}</div>
                  <div className="flex justify-between items-baseline mt-1">
                    <div className="text-xs text-gray-500">제안가</div>
                    <div className="font-bold text-green-600">{Number(msg.price).toLocaleString()}원</div>
                  </div>
                </div>
              </div>
              
              {/* 참고 이미지 갤러리 (있는 경우) */}
              {msg.referenceImages && msg.referenceImages.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-gray-500 mb-1">참고 이미지</div>
                  <div className="flex overflow-x-auto space-x-2 pb-2">
                    {msg.referenceImages.map((img: string, imgIdx: number) => (
                      <div key={`ref-img-${imgIdx}`} className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                        <img 
                          src={img} 
                          alt={`참고 이미지 ${imgIdx + 1}`} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }
      
      // 일반 사용자/AI 메시지
      const bgColorClass = 
        msg.role === 'user' ? 'bg-primary/10' : 
        msg.role === 'assistant' ? 'bg-white' :
        vendorColorClass;
      
      // 메시지 내용 안전 처리 및 향상 로직
      let safeContent = typeof msg.content === 'string' ? msg.content : '';
      
      // 판매자 메시지가 비어있을 경우, 입찰 관련 정보를 추가
      if (msg.role === 'vendor' && (!safeContent || safeContent.trim() === '')) {
        if (msg.price) {
          // 가격이 문자열이나 숫자일 수 있으므로 안전하게 처리
          const price = typeof msg.price === 'string' ? parseFloat(msg.price) : msg.price;
          safeContent = `제안 가격: ${Number(price).toLocaleString()}원`;
          
          // 입찰 상태 추가
          if (msg.bidStatus === 'completed') {
            safeContent += '\n입찰이 완료되었습니다. 확인해 주세요.';
          } else if (msg.bidStatus === 'reviewing') {
            safeContent += '\n입찰내용을 검토중입니다.';
          }
        } else if (msg.bidStatus === 'reviewing') {
          safeContent = '입찰내용을 검토중입니다.';
        } else if (msg.bidStatus === 'completed') {
          safeContent = '입찰이 완료되었습니다. 확인해 주세요.';
        }
      }
      
      return (
        <div 
          key={`msg-${index}`} 
          className={`my-3 rounded-lg p-4 ${bgColorClass} shadow-sm break-words`}
        >
          <div className="flex items-center mb-2">
            <div className="font-semibold">
              {/* 메시지 역할에 따른 이름 표시 (수정됨) */}
              {(() => {
                // 판매자 대시보드에서 볼 때
                if (user.role === 'vendor') {
                  if (msg.role === 'user') return '고객';
                  if (msg.role === 'assistant') return 'AI 상담사';
                  if (msg.role === 'vendor') return (msg.vendorName || '판매자');
                  return '시스템';
                }
                // 일반 사용자 화면에서 볼 때
                else {
                  if (msg.role === 'user') return (user.name || '사용자');
                  if (msg.role === 'assistant') return 'AI 상담사';
                  if (msg.role === 'vendor') return (msg.vendorName || '판매자');
                  return '시스템';
                }
              })()}
            </div>
            <div className="ml-auto text-xs text-gray-500">
              {new Date(msg.timestamp).toLocaleString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
          <div className="chat-message-container whitespace-pre-wrap break-words text-sm">
            {safeContent}
            
            {/* 참조 이미지가 있는 경우 표시 */}
            {msg.role === 'vendor' && msg.referenceImages && Array.isArray(msg.referenceImages) && msg.referenceImages.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {msg.referenceImages.map((img: string, imgIndex: number) => (
                  <img 
                    key={`img-${imgIndex}`}
                    src={img} 
                    alt={`참조 이미지 ${imgIndex + 1}`}
                    className="w-24 h-24 object-cover rounded-md border border-gray-200"
                    onClick={() => window.open(img, '_blank')}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </div>
            )}
            
            {/* 제품 이미지가 있는 경우 표시 */}
            {msg.role === 'vendor' && msg.imageUrl && !msg.referenceImages && (
              <div className="mt-3">
                <img 
                  src={msg.imageUrl} 
                  alt="제품 이미지"
                  className="max-w-[200px] max-h-[200px] object-contain rounded-md border border-gray-200"
                  onClick={() => window.open(msg.imageUrl, '_blank')}
                  style={{ cursor: 'pointer' }}
                />
              </div>
            )}
          </div>
        </div>
      );
    });
  };
  
  return (
    <Card className={`flex flex-col h-full ${className}`}>
      <CardHeader className="p-4 border-b flex-shrink-0">
        <CardTitle className="text-lg">대화 내역</CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 overflow-auto flex-1 min-h-[450px]">
        <div className="w-full pr-4 overflow-y-auto h-full max-h-[calc(100%-1rem)]" id="chat-container">
          {wsConnected ? (
            <>
              {renderMessages()}
              <div ref={chatEndRef} />
            </>
          ) : (
            <Alert variant="destructive" className="mb-4">
              <WifiOff className="h-4 w-4 mr-2" />
              <AlertTitle>연결 오류</AlertTitle>
              <AlertDescription>
                {wsError || "실시간 채팅 연결이 해제되었습니다. 새로고침 해주세요."}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
      
      {/* 메시지 입력 영역 제거 */}
    </Card>
  );
}