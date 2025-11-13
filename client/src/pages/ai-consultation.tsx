import { useState, useEffect, useRef } from "react";
import { GoogleImageGallery } from "@/components/plant/google-image-gallery";
import { getVendorInfo } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useKoreanTime } from "@/lib/use-korean-time";
import { Redirect, useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TypingEffect } from "@/components/ui/typing-effect";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Loader2, Send, Bot, User, ExternalLink, X, Plus, MessageSquareText, Leaf, Search, Crosshair, MapPin, CheckCircle, Store, ShoppingCart, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { startNewAIConversation } from "@/lib/api-utils";
import GoogleMapWrapper from "@/components/map/google-map";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ConversationDrawer } from "@/components/conversation/conversation-drawer";
// 포트원 결제 컴포넌트들
import PortOneSDKV2Payment from "@/components/payment/portone-sdk-v2-payment";
import PortOneBrowserPayment from "@/components/payment/portone-browser-sdk-payment";

// 윈도우 전역 객체 타입은 포트원 결제 컴포넌트 파일에서 통합 관리합니다.

// 식물 추천 타입 정의
interface PlantRecommendation {
  name: string;
  description: string;
  careInstructions: string;
  priceRange: string;
  imageUrl?: string;
  searchTerm?: string; // 구글 이미지 검색용 검색어
  googleImages?: string[]; // 구글 이미지 검색 결과
}

// 상품 정보 타입 정의
interface ProductInfo {
  id?: number;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  vendorName?: string;
  storeName?: string;
  basePrice?: number; // 기본가
  bidPrice?: number; // 실제 입찰가
  vendorProfileImageUrl?: string;
  vendorId?: number;
  vendorColor?: string | { bg: string; border: string; };
}

// 채팅 메시지 타입 정의
interface ChatMessage {
  role: "user" | "assistant" | "vendor";
  content: string;
  timestamp: Date;
  recommendations?: PlantRecommendation[];
  imageUrl?: string; // 참고 이미지 URL
  referenceImages?: string[]; // 여러 참고 이미지 URL 배열
  product?: ProductInfo; // 상품 정보 (판매자 입찰 시) - 일부 레거시 레코드에서 사용
  productInfo?: ProductInfo; // 상품 정보 (판매자 입찰 시) - 새 레코드에서 사용
  price?: number; // 입찰 가격
  vendorId?: number; // 판매자 ID (판매자 메시지인 경우)
  vendorName?: string; // 판매자 이름 (판매자 메시지인 경우)
  storeName?: string; // 상점 이름 (판매자 메시지인 경우)
  vendorColor?: string | { bg: string; border: string; }; // 판매자 색상 (판매자 메시지인 경우) - 문자열 또는 객체 형태
  // 지역 상점 관련 정보
  locationInfo?: {
    address: string;
    lat: number;
    lng: number;
    radius: number;
  };
  vendors?: Array<{
    id: number;
    name: string;
    storeName?: string;
    address: string;
    distance?: number;
    lat?: number;
    lng?: number;
    products?: Array<any>;
  }>;
}

export default function AIConsultationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { formatTime } = useKoreanTime();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute("/ai-consultation");
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  // 초기 메시지로 대화를 시작합니다
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null);
  const [region, setRegion] = useState<string>("");
  const [isSelectingRegion, setIsSelectingRegion] = useState(false);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [currentPlantInfo, setCurrentPlantInfo] = useState<PlantRecommendation | null>(null);
  const [isCreatingNewConversation, setIsCreatingNewConversation] = useState(false);
  const [aiConnectionLost, setAiConnectionLost] = useState(false); // AI 연결 상태 추적
  
  // 이미지 업로드 관련 상태
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // 추가 상태들
  const [interactionMode, setInteractionMode] = useState<"initial" | "ai-recommendation" | "manual-selection" | "location-selection" | "bid-requested" | "region-store" | "ai-chat" | "payment-ready" | "payment-complete">("initial");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [hasLocalStoreResults, setHasLocalStoreResults] = useState(false);
  
  // 페이지 새로고침 후 지역 상점 상품 여부를 저장하기 위한 참조
  const storeResultsRef = useRef<boolean>(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    address: string;
    lat: number;
    lng: number;
    radius: number;
  } | null>(null);
  
  // 구매 대화상자 상태 관리
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [selectedBid, setSelectedBid] = useState<ChatMessage | null>(null);
  const [buyerInfo, setBuyerInfo] = useState({
    name: "",
    phone: "",
    address: "",
    addressDetail: "",
  });

  // 제품 상세 정보 모달
  const [productDetailOpen, setProductDetailOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{
    id?: number;
    name: string;
    price: number;
    description?: string;
    imageUrl?: string;
    vendorName?: string;
    storeName?: string;
    vendorId?: number;
  } | null>(null);
  // 모드 전환 제안 상태
  const [shouldSuggestModeChange, setShouldSuggestModeChange] = useState(false);
  const [recipientInfo, setRecipientInfo] = useState({
    name: "",
    phone: "",
    address: "",
    addressDetail: "",
    isSameAsBuyer: false
  });
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<null | {
    success: boolean;
    orderId?: string;
    message?: string;
  }>(null);

  // 사용자 요청사항 관련 상태
  const [userRequests, setUserRequests] = useState("");
  const [ribbonRequest, setRibbonRequest] = useState(false);
  const [ribbonMessage, setRibbonMessage] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [showRequestForm, setShowRequestForm] = useState(false);

  // 스크롤 자동 이동 제어를 위한 ref
  const shouldAutoScrollRef = useRef(false);

  // 스크롤을 조건부로 최신 메시지로 이동
  useEffect(() => {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer && shouldAutoScrollRef.current) {
      // setTimeout으로 약간 지연시켜 DOM이 완전히 업데이트된 후 스크롤하도록 함
      const timeoutId = setTimeout(() => {
        console.log('채팅창 스크롤 자동 이동');
        chatContainer.scrollTo({
          top: chatContainer.scrollHeight,
          behavior: 'smooth'
        });
        // 스크롤 후 플래그 리셋
        shouldAutoScrollRef.current = false;
      }, 100);
      
      // 클린업 함수
      return () => clearTimeout(timeoutId);
    }
  }, [messages]);

  // URL 파라미터에서 대화 ID와 결제 상태 파라미터 가져오기
  const searchParams = new URLSearchParams(window.location.search);
  const conversationIdParam = searchParams.get('conversation');
  const paymentStatus = searchParams.get('paymentStatus');
  const orderId = searchParams.get('orderId');
  
  // 결제 상태 확인 및 처리
  useEffect(() => {
    // URL에 결제 상태 파라미터가 있으면 처리
    if (paymentStatus) {
      const isSuccess = paymentStatus === 'success';
      
      // 결제 결과 상태 업데이트
      setPaymentResult({
        success: isSuccess,
        orderId: orderId || undefined,
        message: isSuccess ? '결제가 성공적으로 완료되었습니다. 이제 AI 상담을 통해 식물 관리 방법을 물어보세요.' 
                          : '결제 처리 중 문제가 발생했습니다.'
      });
      
      // 결제 성공 시 상태 전환
      if (isSuccess) {
        console.log('결제 완료 상태로 전환');
        setInteractionMode('payment-complete');
        
        // 5초 후에 결제 완료 메시지 비표시 (사용자 경험 개선)
        const timer = setTimeout(() => {
          // 결제 완료 메시지를 삭제하지만 모드는 유지 (사용자가 AI에게 관리 방법을 물어볼 수 있도록)
          // setPaymentResult(null);
        }, 5000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [paymentStatus, orderId]);

  // 페이지 로드 시 마지막 대화 가져오기 또는 특정 대화 가져오기
  useEffect(() => {
    const loadConversationOnMount = async () => {
      // 로그인한 사용자가 없으면 처리하지 않음
      if (!user) {
        console.log("사용자가 로그인하지 않아 대화를 가져오지 않음");
        return;
      }

      try {
        // URL에 대화 ID가 있으면 해당 대화를 로드
        if (conversationIdParam) {
          console.log(`페이지 로드 시 대화 ID: ${conversationIdParam} 가져오기`);
          const response = await fetch(`/api/conversations/${conversationIdParam}`, {
            credentials: 'include'
          });
          
          if (!response.ok) {
            console.error("대화 로드 실패:", response.status);
            return;
          }
          
          const conversation = await response.json();
          console.log("서버에서 받은 대화 데이터:", conversation);
          
          // showLastConversation 파라미터가 있으면 대화 내용을 바로 표시
          const showLastConversation = new URLSearchParams(window.location.search).get('showLastConversation');
          if (showLastConversation === 'true') {
            // 대화 내용 확장이 진행되면 오류가 발생할 수 있으므로 setTimeout으로 약간 지연
            setTimeout(() => {
              console.log('마지막 대화 표시 준비 중...');
              // 채팅창 스크롤을 마지막으로 이동
              const chatContainer = document.getElementById('chat-container');
              if (chatContainer) {
                console.log('채팅창 스크롤 이동');
                chatContainer.scrollTo({
                  top: chatContainer.scrollHeight,
                  behavior: 'smooth'
                });
              }
            }, 300);
          }
          
          // 상태 업데이트
          setConversationId(conversation.id);
          
          if (conversation.messages && conversation.messages.length > 0) {
            const mappedMessages = conversation.messages.map((msg: any) => {
              console.log('원본 메시지 데이터:', JSON.stringify(msg, null, 2));
              const message = {
                role: msg.role,
                content: msg.content,
                timestamp: new Date(msg.timestamp),
                recommendations: msg.recommendations || [],
                product: msg.product, // 상품 정보 (레거시)
                productInfo: msg.productInfo, // 상품 정보 (신규)
                price: msg.price, // 입찰 가격
                vendorId: msg.vendorId,
                vendorName: msg.vendorName,
                storeName: msg.storeName,
                vendorColor: msg.vendorColor,
                locationInfo: msg.locationInfo,
                vendors: msg.vendors
              };
              
              // 저장된 위치 정보가 있으면 복원
              if (msg.locationInfo) {
                console.log('저장된 위치 정보 발견:', msg.locationInfo);
                
                // 지역 선택 메시지인 경우 위치 정보 복원
                // 다양한 메시지 내용을 처리할 수 있도록 조건 확장
                if (msg.content && (
                    msg.content.includes('지역을 선택하시면 해당 지역의 상점에서 판매중인 식물') ||
                    msg.content.includes('지도에서 원하는 지역을 선택하시면') ||
                    msg.content.includes('선택하신 지역:') ||
                    msg.content.includes('부근의 등록된 상품을 확인하세요')
                )) {
                  // 위치 정보 및 상태 복원
                  setSelectedLocation(msg.locationInfo);
                  setRegion(msg.locationInfo.address);
                  setInteractionMode('region-store');
                  
                  // 이 지역에 전송된 메시지가 있으면 도 UI 복원
                  if (msg.content.includes('선택하신 지역:') || msg.content.includes('부근의 등록된 상품을 확인하세요')) {
                    // 저장된 상태 설정
                    setHasLocalStoreResults(true);
                  }
                  
                  // 저장된 판매자 목록이 있으면 검색 결과도 복원
                  if (msg.vendors && Array.isArray(msg.vendors) && msg.vendors.length > 0) {
                    console.log('저장된 판매자 정보 발견:', msg.vendors);
                    setSearchResults(msg.vendors);
                    setHasLocalStoreResults(true); // 이 플래그는 상품 UI를 표시하는데 중요
                    storeResultsRef.current = true; // useRef를 통한 내부 상태 유지
                  }
                }
              }
              
              // 판매자 메시지인 경우 판매자 정보 로드 후 가공 필요
              if (msg.role === 'vendor' && msg.vendorId) {
                // 판매자 정보 가져오기 비동기 함수
                getVendorInfo(msg.vendorId).then(vendorInfo => {
                  console.log(`판매자 ${msg.vendorId} 정보 로드:`, vendorInfo);
                  
                  // 메시지 목록에서 해당 메시지 찾기
                  setMessages(prevMessages => prevMessages.map(prevMsg => {
                    // 동일한 timestamp와 vendorId를 가진 메시지를 찾아서 업데이트
                    if (prevMsg.role === 'vendor' && 
                        prevMsg.vendorId === msg.vendorId && 
                        prevMsg.timestamp.getTime() === new Date(msg.timestamp).getTime()) {
                      return {
                        ...prevMsg,
                        // 판매자 정보 갱신
                        vendorName: vendorInfo.name || `판매자 ${msg.vendorId}`,
                        storeName: vendorInfo.storeName || vendorInfo.name || `판매자 ${msg.vendorId}`,
                        vendorColor: vendorInfo.color?.bg || '#6E56CF20'
                      };
                    }
                    return prevMsg;
                  }));
                }).catch(err => {
                  console.error(`판매자 ${msg.vendorId} 정보 로드 오류:`, err);
                });
              }
              
              return message;
            });
            console.log('변환된 메시지 데이터:', JSON.stringify(mappedMessages, null, 2));
            setMessages(mappedMessages);
            
            // 🔧 식물 선택 후 지도 표시 상태 복원 로직
            // 대화 마지막 부분에서 식물 선택 패턴을 감지하고 지도 모드 복원
            const lastMessages = mappedMessages.slice(-10); // 최근 10개 메시지만 확인
            let shouldShowMap = false;
            let selectedPlantName = null;
            
            // 식물 선택 메시지와 지역 선택 안내 메시지가 연속으로 있는지 확인
            for (let i = 0; i < lastMessages.length - 1; i++) {
              const currentMsg = lastMessages[i];
              const nextMsg = lastMessages[i + 1];
              
              // 사용자가 식물을 선택한 메시지인지 확인
              if (currentMsg.role === 'user' && currentMsg.content && 
                  (currentMsg.content.includes('을(를) 선택했습니다') || 
                   currentMsg.content.includes('를 선택했습니다'))) {
                
                // 다음 메시지가 지역 선택 안내 메시지인지 확인
                if (nextMsg.role === 'assistant' && nextMsg.content &&
                    (nextMsg.content.includes('지역을 선택해주세요') ||
                     nextMsg.content.includes('지도에서 위치를 선택하거나') ||
                     nextMsg.content.includes('해당 지역의 판매자들에게 입찰 요청이 전송됩니다'))) {
                  
                  shouldShowMap = true;
                  // 선택된 식물명 추출
                  const match = currentMsg.content.match(/"([^"]+)"을?\(를\) 선택했습니다/);
                  if (match) {
                    selectedPlantName = match[1];
                  }
                  console.log('🔧 식물 선택 후 지도 표시 상태 감지됨:', selectedPlantName);
                  break;
                }
              }
            }
            
            // 마지막 메시지들 중에 판매자 메시지나 지역 선택 완료가 없다면 지도 모드 복원
            const hasSubsequentMessages = lastMessages.some(msg => 
              msg.role === 'vendor' || 
              (msg.content && (msg.content.includes('선택하신 지역:') || 
                              msg.content.includes('부근의 등록된 상품을 확인하세요')))
            );
            
            if (shouldShowMap && !hasSubsequentMessages) {
              console.log('🔧 지도 표시 모드 복원:', selectedPlantName);
              setSelectedPlant(selectedPlantName);
              setInteractionMode('location-selection');
              setIsSelectingRegion(true);
            }
          }
        } else {
          // URL에 대화 ID가 없으면 마지막 대화를 가져와서 표시
          console.log("로그인 후 마지막 대화 가져오기 시도");
          
          // 전체 대화 목록 가져오기
          const conversationsResponse = await fetch("/api/conversations", {
            credentials: 'include'
          });
          
          if (!conversationsResponse.ok) {
            console.error("대화 목록 가져오기 실패:", conversationsResponse.status);
            // 오류 발생 시 초기 메시지 표시
            setInitialAssistantMessage();
            return;
          }
          
          const conversations = await conversationsResponse.json();
          
          if (conversations && conversations.length > 0) {
            // 마지막 대화(가장 최근에 수정된 대화) 가져오기
            const lastConversation = conversations[0]; // API가 정렬된 결과를 반환한다고 가정
            console.log(`마지막 대화 가져오기: ID ${lastConversation.id}`);
            
            // 마지막 대화 데이터 가져오기
            const response = await fetch(`/api/conversations/${lastConversation.id}`, {
              credentials: 'include'
            });
            
            if (response.ok) {
              const conversation = await response.json();
              console.log("마지막 대화 데이터:", conversation);
              
              // 상태 업데이트
              setConversationId(conversation.id);
              
              // URL 업데이트 (URL이 변경되어도 실제 페이지 이동은 없음)
              setLocation(`/ai-consultation?conversation=${conversation.id}&showLastConversation=true`);
              
              if (conversation.messages && conversation.messages.length > 0) {
                // 메시지 매핑
                const mappedMessages = conversation.messages.map((msg: any) => {
                  console.log('마지막 대화 원본 메시지:', JSON.stringify(msg, null, 2));
                  const message = {
                    role: msg.role,
                    content: msg.content,
                    timestamp: new Date(msg.timestamp),
                    recommendations: msg.recommendations || [],
                    product: msg.product, // 상품 정보 (레거시)
                    productInfo: msg.productInfo, // 상품 정보 (신규)
                    price: msg.price, // 입찰 가격
                    vendorId: msg.vendorId,
                    vendorName: msg.vendorName,
                    storeName: msg.storeName,
                    vendorColor: msg.vendorColor,
                    locationInfo: msg.locationInfo,
                    vendors: msg.vendors
                  };
                  
                  // 저장된 위치 정보가 있으면 복원
                  if (msg.locationInfo) {
                    console.log('마지막 대화 저장된 위치 정보 발견:', msg.locationInfo);
                    
                    // 지역 선택 메시지인 경우 위치 정보 복원
                    // 다양한 메시지 내용을 처리할 수 있도록 조건 확장
                    if (msg.content && (
                        msg.content.includes('지역을 선택하시면 해당 지역의 상점에서 판매중인 식물') ||
                        msg.content.includes('지도에서 원하는 지역을 선택하시면') ||
                        msg.content.includes('선택하신 지역:') ||
                        msg.content.includes('부근의 등록된 상품을 확인하세요')
                    )) {
                      // 위치 정보 및 상태 복원
                      setSelectedLocation(msg.locationInfo);
                      setRegion(msg.locationInfo.address);
                      setInteractionMode('region-store');
                      
                      // 이 지역에 전송된 메시지가 있으면 도 UI 복원
                      if (msg.content.includes('선택하신 지역:') || msg.content.includes('부근의 등록된 상품을 확인하세요')) {
                        // 저장된 상태 설정
                        setHasLocalStoreResults(true);
                      }
                      
                      // 저장된 판매자 목록이 있으면 검색 결과도 복원
                      if (msg.vendors && Array.isArray(msg.vendors) && msg.vendors.length > 0) {
                        console.log('마지막 대화 저장된 판매자 정보 발견:', msg.vendors);
                        setSearchResults(msg.vendors);
                        setHasLocalStoreResults(true); // 이 플래그는 상품 UI를 표시하는데 중요
                      }
                    }
                  }
                  
                  // 판매자 메시지인 경우 판매자 정보 로드 후 가공 필요
                  if (msg.role === 'vendor' && msg.vendorId) {
                    // 판매자 정보 가져오기 비동기 함수
                    getVendorInfo(msg.vendorId).then(vendorInfo => {
                      console.log(`마지막 대화 판매자 ${msg.vendorId} 정보 로드:`, vendorInfo);
                      
                      // 메시지 목록에서 해당 메시지 찾기
                      setMessages(prevMessages => prevMessages.map(prevMsg => {
                        // 동일한 timestamp와 vendorId를 가진 메시지를 찾아서 업데이트
                        if (prevMsg.role === 'vendor' && 
                            prevMsg.vendorId === msg.vendorId && 
                            prevMsg.timestamp.getTime() === new Date(msg.timestamp).getTime()) {
                          return {
                            ...prevMsg,
                            // 판매자 정보 갱신
                            vendorName: vendorInfo.name || `판매자 ${msg.vendorId}`,
                            storeName: vendorInfo.storeName || vendorInfo.name || `판매자 ${msg.vendorId}`,
                            vendorColor: vendorInfo.color?.bg || '#6E56CF20'
                          };
                        }
                        return prevMsg;
                      }));
                    }).catch(err => {
                      console.error(`판매자 ${msg.vendorId} 정보 로드 오류:`, err);
                    });
                  }
                  
                  return message;
                });
                console.log('마지막 대화 변환된 메시지:', JSON.stringify(mappedMessages, null, 2));
                
                setMessages(mappedMessages);
                
                // 채팅창 스크롤 이동
                setTimeout(() => {
                  const chatContainer = document.getElementById('chat-container');
                  if (chatContainer) {
                    console.log('마지막 대화 자동 스크롤 이동');
                    chatContainer.scrollTo({
                      top: chatContainer.scrollHeight,
                      behavior: 'smooth'
                    });
                  }
                }, 300);
                
                return; // 성공적으로 마지막 대화를 가져왔으므로 여기서 함수 종료
              }
            } else {
              console.error("마지막 대화 데이터 가져오기 실패:", response.status);
            }
          }
          
          // 마지막 대화가 없거나 가져오기 실패 시 초기 메시지 표시
          console.log("마지막 대화가 없거나 오류 발생, 초기 메시지 표시");
          setInitialAssistantMessage();
        }
      } catch (error) {
        console.error("대화 로드 중 예외 발생:", error);
        // 오류 발생 시 초기 메시지 표시
        setInitialAssistantMessage();
      }
    };
    
    // 초기 어시스턴트 메시지 설정 함수 추출
    const setInitialAssistantMessage = () => {
      console.log("초기 어시스턴트 메시지 설정");
      setConversationId(null);
      setSelectedMode(null);
      setInteractionMode("initial");
      
      // 대화형 UI의 첫 메시지 설정
      setMessages([
        {
          role: "assistant",
          content: "안녕하세요? 당신의 식물생활을 도울 인공지능 심다입니다. 식물 추천방식을 선택해주세요",
          timestamp: new Date()
        }
      ]);
    };
    
    // 페이지 로드 시 한 번만 실행 
    // user를 의존성에 추가하여 로그인 상태가 변경될 때마다 마지막 대화를 가져오도록 함
    loadConversationOnMount();
  }, [user, conversationIdParam]);
  
  // 대화 ID가 변경될 때마다 강제로 데이터를 다시 가져오기 위해 queryKey에 timestamp 추가
  const queryTimestamp = useRef(Date.now()).current;
  
  // URL에서 conversationId 변화 감지는 더 이상 필요 없음 (페이지가 새로고침 되므로)
  // 페이지 로드 시에만 대화 데이터를 한 번 가져옴
  
  // 특정 대화만 가져오기 (파라미터가 있을 때만)
  const { data: conversationData } = useQuery({
    queryKey: conversationIdParam ? 
      [`/api/conversations/${conversationIdParam}`, queryTimestamp] : 
      ["/api/none", queryTimestamp],
    queryFn: async () => {
      if (!user || !conversationIdParam) return null;
      try {
        const url = `/api/conversations/${conversationIdParam}`;
        console.log("Fetching specific conversation from:", url);
        const response = await fetch(url);
        if (!response.ok) {
          console.error("Failed to fetch conversation:", response.status);
          return null;
        }
        const data = await response.json();
        console.log("Fetched conversation data:", data);
        return data;
      } catch (error) {
        console.error("Failed to fetch conversation:", error);
        return null;
      }
    },
    enabled: !!user && !!conversationIdParam, // 파라미터가 있을 때만 실행
  });

  // 대화 내용 로드 - conversationData가 변경될 때만 실행
  useEffect(() => {
    if (conversationData) {
      setConversationId(conversationData.id);
      
      // 지역 상점 관련 정보 확인
      let foundLocationMessages = false;
      let foundVendorInformation = false;
      let locationInfo = null;
      let vendorsData = null;

      // 메시지를 가정 빠른 검색을 위해 역순으로 정렬
      const reversedMessages = [...conversationData.messages].reverse();
      
      // 지역 상점 데이터가 있는지 검색
      for (const msg of reversedMessages) {
        if (msg.locationInfo && msg.content && (
          msg.content.includes('선택하신 지역:') || 
          msg.content.includes('부근의 등록된 상품을 확인하세요')
        )) {
          console.log('QueryEffect 저장된 위치 정보 발견:', msg.locationInfo);
          foundLocationMessages = true;
          locationInfo = msg.locationInfo;
          
          // 판매자 정보도 있는지 확인
          if (msg.vendors && Array.isArray(msg.vendors) && msg.vendors.length > 0) {
            console.log('QueryEffect 저장된 판매자 정보 발견:', msg.vendors);
            foundVendorInformation = true;
            vendorsData = msg.vendors;
          }
          
          // 처음 발견된 지역 상점 정보를 사용
          break;
        }
      }
      
      // 지역 상점 데이터가 있으면 상태 변수 업데이트
      if (foundLocationMessages) {
        console.log('QueryEffect 지역 상점 모드 상태 복원');
        setInteractionMode('region-store');
        setSelectedLocation(locationInfo);
        setRegion(locationInfo.address);
      }
      
      // 판매자 정보가 있으면 상태 변수 업데이트
      if (foundVendorInformation) {
        console.log('QueryEffect 판매자 정보 상태 복원');
        setSearchResults(vendorsData);
        setHasLocalStoreResults(true);
      }
      
      if (conversationData.messages && conversationData.messages.length > 0) {
        // 판매자 메시지 중복 제거 로직 추가
        const processedMessages = conversationData.messages.filter((msg: any, index: number, array: any[]) => {
          // 판매자 메시지인 경우
          if (msg.role === 'vendor' && msg.product) {
            // 중복 메시지 제거 (동일한 시간에 동일한 상품 ID의 다른 메시지 제거)
            const isUnique = array.findIndex((m, i) => {
              return i > index && 
                     m.role === 'vendor' && 
                     m.product && 
                     m.product.id === msg.product.id && 
                     new Date(m.timestamp).getTime() - new Date(msg.timestamp).getTime() < 2000; // 2초 이내 메시지
            }) === -1;
            
            return isUnique;
          }
          return true; // vendor 메시지가 아니면 모두 표시
        });
        
        const resultMessages = processedMessages.map((msg: any) => {
          console.log('QueryEffect 원본 메시지:', JSON.stringify(msg, null, 2));
          
          const message = {
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            recommendations: msg.recommendations,
            product: msg.product,
            productInfo: msg.productInfo,
            price: msg.price,
            vendorId: msg.vendorId,
            referenceImages: msg.referenceImages,
            imageUrl: msg.imageUrl,
            vendorName: msg.vendorName,
            vendorColor: msg.vendorColor,
            storeName: msg.storeName,
            locationInfo: msg.locationInfo,
            vendors: msg.vendors
          };
          
          // 저장된 위치 정보가 있으면 복원
          if (msg.locationInfo) {
            console.log('QueryEffect 저장된 위치 정보 발견:', msg.locationInfo);
            
            // 지역 선택 메시지인 경우 위치 정보 복원
            // 다양한 메시지 내용을 처리할 수 있도록 조건 확장
            if (msg.content && (
                msg.content.includes('지역을 선택하시면 해당 지역의 상점에서 판매중인 식물') ||
                msg.content.includes('지도에서 원하는 지역을 선택하시면') ||
                msg.content.includes('선택하신 지역:') ||
                msg.content.includes('부근의 등록된 상품을 확인하세요')
            )) {
              // 위치 정보 및 상태 복원
              setSelectedLocation(msg.locationInfo);
              setRegion(msg.locationInfo.address);
              setInteractionMode('region-store');
              
              // 이 지역에 전송된 메시지가 있으면 도 UI 복원
              if (msg.content.includes('선택하신 지역:') || msg.content.includes('부근의 등록된 상품을 확인하세요')) {
                // 저장된 상태 설정
                setHasLocalStoreResults(true);
              }
              
              // 저장된 판매자 목록이 있으면 검색 결과도 복원
              if (msg.vendors && Array.isArray(msg.vendors) && msg.vendors.length > 0) {
                console.log('QueryEffect 저장된 판매자 정보 발견:', msg.vendors);
                setSearchResults(msg.vendors);
                setHasLocalStoreResults(true); // 이 플래그는 상품 UI를 표시하는데 중요
              }
            }
          }
          
          return message;
        });
        console.log('QueryEffect 변환된 메시지:', JSON.stringify(resultMessages, null, 2));
        setMessages(resultMessages);
      }
    }
  }, [conversationData]);
  
  // 새 대화 생성 후 상태 변경
  useEffect(() => {
    if (isCreatingNewConversation && !conversationId) {
      // AI 응답 요청 및 새 대화 생성
      const createNewConversation = async () => {
        try {
          const response = await apiRequest("POST", "/api/conversations");
          if (!response.ok) {
            throw new Error("Failed to create new conversation");
          }
          
          const data = await response.json();
          setConversationId(data.id);
          
          // URL 업데이트
          setLocation(`/ai-consultation?conversation=${data.id}`);
          
          // 쿼리 무효화
          queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
        } catch (error) {
          console.error("Error creating new conversation:", error);
          toast({
            title: "새 대화 생성 실패",
            description: "새 대화를 시작하는 중 오류가 발생했습니다.",
            variant: "destructive",
          });
        } finally {
          setIsCreatingNewConversation(false);
        }
      };
      
      createNewConversation();
    }
  }, [isCreatingNewConversation, conversationId]);

  // 현재 타이핑 중인 메시지 상태 관리
  const [typingMessage, setTypingMessage] = useState<ChatMessage | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  
  // 이미지 업로드 핸들러
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedImage(e.target.files[0]);
    }
  };
  
  // 이미지 업로드 처리
  const uploadImage = async () => {
    if (!selectedImage) return null;
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('image', selectedImage);
      
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('이미지 업로드에 실패했습니다.');
      }
      
      const data = await response.json();
      setUploadedImageUrl(data.imageUrl);
      return data.imageUrl;
    } catch (error) {
      console.error('이미지 업로드 중 오류 발생:', error);
      toast({
        title: '이미지 업로드 실패',
        description: '이미지를 업로드하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };
  
  // 이미지 업로드 취소
  const handleCancelImage = () => {
    setSelectedImage(null);
    setUploadedImageUrl(null);
  };
  
  // 입찰 선택 처리 함수 - 판매자의 입찰을 선택하고 구매 대화상자 열기
  const handleSelectBid = (message: ChatMessage) => {
    // product 또는 productInfo 필드에 입찰 데이터가 있는지 확인
    const productData = message.product || message.productInfo;
    if (!productData) {
      toast({
        title: "입찰 선택 불가",
        description: "상품 정보가 없습니다.",
        variant: "destructive",
      });
      return;
    }
    
    // 입찰가가 있는지 확인 (필드 이름이 다를 수 있음)
    const bidPrice = message.price; // 상품 자체에 bidPrice가 없고 메시지 객체에 price로 저장되어 있음
    if (!bidPrice) {
      toast({
        title: "입찰 선택 불가",
        description: "입찰가가 제시된 상품만 선택할 수 있습니다.",
        variant: "destructive",
      });
      return;
    }
    
    // 선택한 입찰 정보 저장 및 구매 대화상자 열기
    // product와 productInfo 모두 가격 정보를 확인
    const productPrice = message.product?.price || message.productInfo?.price;
    const messageWithPrice = {
      ...message,
      price: message.price || (productPrice ? Number(productPrice) : undefined)
    };
    setSelectedBid(messageWithPrice);
    setPurchaseDialogOpen(true);
  };
  
  // 주소 검색 팝업 관련
  const searchAddress = (isRecipient: boolean) => {
    // 카카오 주소 검색 API 호출 (window.daum.Postcode는 별도로 스크립트가 로드되어야 함)
    if (typeof window.daum !== 'undefined') {
      new window.daum.Postcode({
        oncomplete: (data: any) => {
          // 검색 결과에서 주소 추출
          const fullAddress = data.address;
          const extraAddress = data.buildingName ? ` (${data.buildingName})` : '';
          
          if (isRecipient) {
            setRecipientInfo(prev => ({
              ...prev,
              address: fullAddress + extraAddress
            }));
          } else {
            setBuyerInfo(prev => ({
              ...prev,
              address: fullAddress + extraAddress
            }));
          }
        }
      }).open();
    } else {
      toast({
        title: "주소 검색 불가",
        description: "주소 검색 기능을 사용할 수 없습니다.",
        variant: "destructive"
      });
    }
  };
  
  // 배송지 동일 처리
  const handleSameAsBuyer = (checked: boolean) => {
    if (checked) {
      setRecipientInfo({
        ...buyerInfo,
        isSameAsBuyer: true
      });
    } else {
      setRecipientInfo({
        name: "",
        phone: "",
        address: "",
        addressDetail: "",
        isSameAsBuyer: false
      });
    }
  };
  
  // 결제 처리 함수 (별도 페이지에서 처리하는 방식으로 변경)
  const handlePayment = async () => {
    if (!selectedBid) return;
    
    // 상품 정보 추출
    const productData = selectedBid.product || selectedBid.productInfo;
    if (!productData || !selectedBid.price) return;
    
    // 구매자 정보 검증
    if (!buyerInfo.name || !buyerInfo.phone || !buyerInfo.address) {
      toast({
        title: "구매자 정보 미입력",
        description: "구매자 정보를 모두 입력해주세요.",
        variant: "destructive"
      });
      return;
    }
    
    // 수령인 정보 검증
    if (!recipientInfo.name || !recipientInfo.phone || !recipientInfo.address) {
      toast({
        title: "수령인 정보 미입력",
        description: "수령인 정보를 모두 입력해주세요.",
        variant: "destructive"
      });
      return;
    }
    
    // 결제 처리 시작
    setIsPaymentProcessing(true);
    
    try {
      // 주문 생성 API 호출
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vendorId: selectedBid.vendorId,
          productId: productData.id,
          price: selectedBid.price,
          conversationId: conversationId,
          buyerInfo: buyerInfo,
          recipientInfo: recipientInfo
        })
      });
      
      if (!orderResponse.ok) {
        throw new Error("주문 생성에 실패했습니다.");
      }
      
      const orderData = await orderResponse.json();
      console.log('주문 생성 완료:', orderData);
      
      // 결제 모드로 전환 (결제 상태 전환 추적용)
      setInteractionMode("payment-ready");
      
      // 결제 페이지로 이동 (z-index 문제 회피)
      // URL 파라미터로 필요한 정보 전달, 결제 후 돌아올 때 필요한 상태 정보 추가
      const returnUrl = encodeURIComponent(`/ai-consultation?conversation=${conversationId}&paymentStatus=success&orderId=${orderData.orderId}`);
      const paymentPageUrl = `/payment-process?orderId=${orderData.orderId}&conversationId=${conversationId}&productName=${encodeURIComponent(productData.name)}&price=${selectedBid.price}&vendorId=${selectedBid.vendorId}&returnUrl=${returnUrl}`;
      
      console.log('결제 페이지로 이동. 반환 URL:', returnUrl);
      
      // 대화상자 닫고 결제 페이지로 이동
      setPurchaseDialogOpen(false);
      setIsPaymentProcessing(false);
      window.location.href = paymentPageUrl;
    } catch (error) {
      console.error('주문 생성 중 오류:', error);
      setPaymentResult({
        success: false,
        message: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다."
      });
      
      toast({
        title: "주문 생성 실패",
        description: error instanceof Error ? error.message : "주문 생성 중 오류가 발생했습니다.",
        variant: "destructive"
      });
      setIsPaymentProcessing(false);
    }
  };
  
  // 판매자에게 입찰 성공 알림 전송
  const notifyVendorSuccess = async (vendorId: number, orderId: string) => {
    try {
      await fetch('/api/vendors/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vendorId: vendorId,
          conversationId: conversationId,
          type: 'success',
          orderId: orderId,
          message: `입찰이 성공적으로 수락되었습니다. 주문번호: ${orderId}`
        })
      });
    } catch (error) {
      console.error("판매자 성공 알림 전송 중 오류:", error);
    }
  };
  
  // 다른 판매자들에게 입찰 실패 알림 전송
  const notifyOtherVendorsFailed = async (winnerVendorId: number) => {
    try {
      await fetch('/api/vendors/notify-others', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationId: conversationId,
          winnerVendorId: winnerVendorId,
          message: "다른 판매자의 입찰이 선택되었습니다."
        })
      });
    } catch (error) {
      console.error("다른 판매자 알림 전송 중 오류:", error);
    }
  };
  
  // 메시지 전송 처리
  const handleSendMessage = async () => {
    if (!input.trim() || isProcessing) return;
    
    // 메시지 입력값 저장 및 초기화
    const messageContent = input.trim();
    
    // 이전에 연결 끊김 상태였다면 초기화
    if (aiConnectionLost) {
      setAiConnectionLost(false);
    }
    
    // 현재 모드 상태 임시 저장
    const currentMode = interactionMode;
    
    // 바로 모드 전환하지 않고, 일단 현재 모드 유지하여 상품 목록이 사라지는 문제 방지
    // 메시지 전송 성공 후 모드 전환 예정
    setInput("");
    setIsProcessing(true);
    
    // 이미지가 선택되었지만 아직 업로드되지 않은 경우, 업로드 진행
    let imageUrl = uploadedImageUrl;
    if (selectedImage && !uploadedImageUrl) {
      imageUrl = await uploadImage();
    }
    
    // 먼저 사용자 메시지 바로 화면에 추가
    const userMessage: ChatMessage = {
      role: "user",
      content: messageContent,
      timestamp: new Date(),
      recommendations: [],
      imageUrl: imageUrl || undefined
    };
    
    // 사용자가 직접 메시지를 보낼 때만 스크롤 자동 이동 활성화
    shouldAutoScrollRef.current = true;
    setMessages(prevMessages => [...prevMessages, userMessage]);
    
    // 최근 판매자가 있는지 확인 - 이전 메시지 중 가장 최근 판매자 메시지 찾기
    // 판매자와 대화 중이면 AI가 아닌 판매자에게 메시지 전송
    const recentMessages = [...messages].reverse();
    const lastVendorMessage = recentMessages.find(msg => msg.role === 'vendor');
    const lastAIMessage = recentMessages.find(msg => msg.role === 'assistant');
    
    // 포장, 배송, 선물 관련 키워드가 있거나, 최근 메시지가 판매자 메시지인 경우
    // 판매자에게 메시지 직접 전송 (AI 응답 없음)
    const vendorKeywords = ['포장', '배송', '선물', '리본', 'ribbon', '배달', '언제', '가능'];
    const isVendorRelatedQuestion = vendorKeywords.some(keyword => messageContent.includes(keyword));
    const isRecentMessageFromVendor = lastVendorMessage && 
                                      (!lastAIMessage || new Date(lastVendorMessage.timestamp) > new Date(lastAIMessage.timestamp));
    
    if ((isVendorRelatedQuestion || isRecentMessageFromVendor) && lastVendorMessage?.vendorId) {
      try {
        console.log('판매자 관련 질문으로 판단됨. 판매자에게 직접 메시지 전송:', lastVendorMessage.vendorId);
        
        // 판매자에게 직접 메시지 전송
        const vendorResponse = await fetch(`/api/vendors/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            conversationId,
            vendorId: lastVendorMessage.vendorId,
            message: messageContent,
            imageUrl
          })
        });
        
        if (!vendorResponse.ok) {
          throw new Error('판매자 메시지 전송 실패');
        }
        
        // 판매자에게 전송 완료 메시지 표시
        toast({
          title: "메시지 전송 완료",
          description: `판매자에게 메시지를 전송했습니다. 판매자의 답변을 기다려주세요.`,
          variant: "default",
        });
        
        setIsProcessing(false);
        return; // AI 응답 처리 건너뛰기
      } catch (error) {
        console.error("판매자 메시지 전송 오류:", error);
        // 오류 시 AI에게 메시지 전송 계속 진행
      }
    }
    
    try {
      // 서버에 메시지 전송 (현재 모드 파라미터 전달)
      const response = await apiRequest("POST", "/api/ai/chat", {
        conversationId: conversationId,
        message: messageContent,
        userId: user?.id,
        imageUrl: imageUrl,
        mode: currentMode // 현재 모드 전달 (ai-chat으로 바로 바꾸지 않음)
      });
      
      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }
      
      // 모드는 그대로 유지하면서 AI 응답만 받도록 수정
      console.log(`사용자 메시지 처리 중. 현재 모드 유지: ${currentMode}`);
      
      const data = await response.json();
      
      // 대화 ID 없었으면 새로 설정
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }
      
      // 새 응답 메시지 객체 생성
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
        recommendations: data.recommendations || []
      };
      
      // 연결 상태 정상으로 표시
      setAiConnectionLost(false);
      
      // 타이핑 효과로 메시지 표시 시작
      setTypingMessage(assistantMessage);
      setIsTyping(true);
      
      // 응답 메시지 표시 완료 후 수행할 작업
      setTimeout(() => {
        // 실제 대화 내용 가져오기 (추천 정보가 포함된 전체 대화)
        const fetchFullConversation = async () => {
          try {
            const convResponse = await fetch(`/api/conversations/${data.conversationId || conversationId}`);
            if (!convResponse.ok) {
              throw new Error("Failed to fetch conversation");
            }
            
            const convData = await convResponse.json();
            
            // 전체 대화 메시지로 상태 업데이트
            if (convData && convData.messages) {
              // 모든 메시지에 대해 timestamp를 Date 객체로 변환하고, 
              // 서버 응답에 recommendatrions 배열이 있으면 그대로 사용
              // 메시지 중복 제거를 위한 맵
              const vendorProcessingMsgs = new Map();
              
              // 첫 번째 패스: 판매자 메시지 중 중복되는 내용 분류
              convData.messages.forEach((msg: any) => {
                if (msg.role === 'vendor') {
                  const msgKey = `${msg.vendorId}-${msg.content}`;
                  // 입찰 관련 메시지는 특별 처리
                  if (msg.content.includes('입찰') || msg.content.includes('상품이 추가')) {
                    if (!vendorProcessingMsgs.has(msgKey)) {
                      vendorProcessingMsgs.set(msgKey, {
                        msg,
                        count: 1,
                        lastTimestamp: msg.timestamp
                      });
                    } else {
                      const existing = vendorProcessingMsgs.get(msgKey);
                      // 가장 최신 타임스탬프 기록
                      if (new Date(msg.timestamp) > new Date(existing.lastTimestamp)) {
                        existing.lastTimestamp = msg.timestamp;
                      }
                      existing.count++;
                    }
                  }
                }
              });
              
              // 두 번째 패스: 중복 메시지 필터링
              const filteredMessages = convData.messages.filter((msg: any) => {
                // 판매자 메시지가 아니면 무조건 포함
                if (msg.role !== 'vendor') return true;
                
                // 상품 정보가 있는 메시지는 항상 포함 (최종 입찰)
                if (msg.product || msg.price) return true;
                
                // 주문 상태 업데이트 관련 메시지는 항상 포함 (상품 준비 시작, 배송 시작 등)
                if (msg.content && (
                  msg.content.includes('상품 준비') || 
                  msg.content.includes('배송') || 
                  msg.content.includes('주문') ||
                  msg.content.includes('취소') ||
                  msg.content.includes('완료')
                )) {
                  return true;
                }
                
                const msgKey = `${msg.vendorId}-${msg.content}`;
                // 입찰 관련 메시지는 타임스탬프가 가장 최신인 경우만 포함
                if (vendorProcessingMsgs.has(msgKey)) {
                  const entry = vendorProcessingMsgs.get(msgKey);
                  return msg.timestamp === entry.lastTimestamp;
                }
                
                // 기본적으로 모든 다른 메시지 포함
                return true;
              });
              
              // 필터링된 메시지로 업데이트
              const updatedMessages = filteredMessages.map((msg: any) => {
                const messageWithTimestamp = {
                  ...msg,
                  timestamp: new Date(msg.timestamp),
                  recommendations: msg.recommendations || []
                };
                
                return messageWithTimestamp;
              });
              
              // AI 응답 완료 시 스크롤 자동 이동 활성화
              shouldAutoScrollRef.current = true;
              
              // 디버깅: recommendations 데이터 확인
              updatedMessages.forEach((msg: ChatMessage, idx: number) => {
                if (msg.recommendations && msg.recommendations.length > 0) {
                  console.log(`메시지 #${idx}에 추천 데이터 ${msg.recommendations.length}개 있음:`, 
                    msg.recommendations.map((r: any) => r.name).join(', '));
                }
              });
              
              // plantRecommendations가 있으면 마지막 어시스턴트 메시지에 적용
              if (convData.plantRecommendations && convData.plantRecommendations.length > 0) {
                console.log("서버에서 받은 식물 추천 데이터:", convData.plantRecommendations.length, "개");
                
                // 마지막 어시스턴트 메시지 찾기
                const lastAssistantIndex = updatedMessages
                  .map((msg: ChatMessage, idx: number) => msg.role === 'assistant' ? idx : -1)
                  .filter((idx: number) => idx !== -1)
                  .pop();
                
                if (lastAssistantIndex !== undefined) {
                  console.log(`마지막 어시스턴트 메시지(${lastAssistantIndex})에 추천 데이터 추가`);
                  updatedMessages[lastAssistantIndex].recommendations = convData.plantRecommendations;
                }
              }
              
              // 대화 내용에 의한 상태 확인 및 설정
              console.log("QueryEffect 지역 상점 모드 상태 복원");

              // locationInfo가 있는 메시지 찾기
              const locationMessage = updatedMessages.find((msg: ChatMessage) => 
                msg.locationInfo && msg.locationInfo.lat && msg.locationInfo.lng
              );
              
              // vendors 정보가 있는 메시지 찾기
              const vendorsMessage = updatedMessages.find((msg: ChatMessage) => 
                msg.vendors && Array.isArray(msg.vendors) && msg.vendors.length > 0
              );
              
              console.log("QueryEffect 판매자 정보 상태 복원");
              
              // 지도 정보와 판매자 정보 복원
              if (locationMessage && locationMessage.locationInfo) {
                console.log("LocationInfo 발견:", locationMessage.locationInfo);
                setSelectedLocation(locationMessage.locationInfo);
                setRegion(locationMessage.locationInfo.address || '');
                
                // 지역 선택 UI 노출
                setIsSelectingRegion(true);
              }
              
              if (vendorsMessage && vendorsMessage.vendors) {
                console.log("판매자 정보 발견:", vendorsMessage.vendors.length, "개");
                setSearchResults(vendorsMessage.vendors);
                // 검색 결과 상태를 로컬에 저장
                if (storeResultsRef.current) {
                  storeResultsRef.current = vendorsMessage.vendors;
                  setHasLocalStoreResults(true);
                }
              }
              
              // 상호작용 모드 결정
              // 지역 관련 메시지 체크
              const hasRegionStoreMessage = updatedMessages.some((msg: ChatMessage) => 
                msg.content && (
                  msg.content.includes("지역 상점 구매를 선택하셨습니다") ||
                  msg.content.includes("지역 상점에서 구매하고 싶어요") ||
                  msg.content.includes("지도에서 원하는 지역을 선택하시면")
                )
              );

              // 입찰 요청 메시지 체크  
              const hasBidRequestMessage = updatedMessages.some((msg: ChatMessage) => 
                msg.content && msg.content.includes("입찰 요청을 보냈습니다")
              );
              
              // 지도/지역 정보가 있는지 확인
              const hasMapOrLocationInfo = locationMessage || vendorsMessage;
              
              console.log("대화 내용 확인: ", {
                hasRegionStoreMessage,
                hasBidRequestMessage,
                hasMapOrLocationInfo
              });
              
              // 위치 정보가 있는 경우 상태 적용
              if (locationMessage && locationMessage.locationInfo) {
                console.log("위치 정보가 있는 메시지 발견 - 지도 상태 활성화");
                // 위치 정보 상태 업데이트
                setSelectedLocation(locationMessage.locationInfo);
                setRegion(locationMessage.locationInfo.address || "");
                
                // 입찰 요청이 가능한 상태로
                if (!hasBidRequestMessage) {
                  setIsSelectingRegion(true);
                }
              }
              
              // 상호작용 모드 설정 로직
              if (hasRegionStoreMessage) {
                console.log("지역 상점 메시지 발견 - interactionMode를 region-store로 설정");
                setInteractionMode("region-store");
                setSelectedMode("region");
                
                // 입찰 요청까지 완료된 경우
                if (hasBidRequestMessage) {
                  console.log("입찰 요청 메시지 발견 - isSelectingRegion을 false로 설정");
                  setIsSelectingRegion(false); // 지도 UI 숨김
                }
                // 위치 정보는 있지만 입찰 요청은 아직인 경우
                else if (hasMapOrLocationInfo) {
                  console.log("위치 정보 발견 - isSelectingRegion을 true로 설정");
                  setIsSelectingRegion(true); // 지도 UI 표시
                }
              }
              
              setMessages(updatedMessages);
              
              // 콘솔에 대화 내용 로깅 (디버깅용)
              console.log("서버에서 가져온 전체 대화:", convData);
              console.log("플랜트 추천:", convData.plantRecommendations);
            }
          } catch (error) {
            console.error("Error fetching conversation:", error);
          } finally {
            // 타이핑 상태 종료
            setTypingMessage(null);
            setIsTyping(false);
            setIsProcessing(false);
          }
        };
        
        fetchFullConversation();
      }, 1000); // 타이핑이 끝난 후 1초 후에 대화 내용 업데이트
      
    } catch (error) {
      console.error("Error sending message:", error);
      
      // AI 연결 끊김 상태로 설정
      setAiConnectionLost(true);
      
      toast({
        title: "AI 연결 끊김",
        description: "메시지 전송 중 AI 연결이 끊어졌습니다. 판매자 메시지가 도착했을 수 있습니다.",
        variant: "destructive",
      });
      setIsProcessing(false);
      setIsTyping(false);
      setTypingMessage(null);
    }
  };

  // 식물 선택 처리
  const handleSelectPlant = async (plantName: string) => {
    setSelectedPlant(plantName);
    
    // 중요: 상호작용 모드를 위치 선택 모드로 변경
    setInteractionMode("location-selection");
    
    // 사용자 선택 메시지 생성
    const userMessage: ChatMessage = {
      role: "user",
      content: `"${plantName}"을(를) 선택했습니다.`,
      timestamp: new Date()
    };
    
    // 지역 선택 안내 메시지 생성 (locationInfo 포함)
    const assistantMessage: ChatMessage = {
      role: "assistant",
      content: "배송이나 선물을 위한 지역을 선택해주세요. 지도에서 위치를 선택하거나 검색해서 찾으세요. 해당 지역의 판매자들에게 입찰 요청이 전송됩니다.",
      timestamp: new Date(),
      locationInfo: selectedLocation || {
        lat: 37.5665, // 서울 중심부 기본 좌표
        lng: 126.9780,
        address: "서울특별시",
        isExact: false
      }
    };
    
    // 중요: 선택 및 지역 메시지를 서버에 영구 저장
    try {
      if (!conversationId) {
        console.error('대화 ID가 없어 식물 선택 메시지를 저장할 수 없습니다.');
        // 예외적으로 처리 - 클라이언트 상태만 업데이트
        setMessages(prev => [...prev, userMessage]);
        if (!isSelectingRegion) {
          setIsSelectingRegion(true);
          setTimeout(() => {
            setMessages(prev => [...prev, assistantMessage]);
          }, 100);
        }
        return;
      }
      
      // 현재 대화 정보 가져오기
      const convResponse = await fetch(`/api/conversations/${conversationId}`);
      if (!convResponse.ok) {
        console.error('대화 데이터를 가져오는 중 오류 발생:', convResponse.status);
        // 예외적으로 처리 - 클라이언트 상태만 업데이트
        setMessages(prev => [...prev, userMessage]);
        if (!isSelectingRegion) {
          setIsSelectingRegion(true);
          setTimeout(() => {
            setMessages(prev => [...prev, assistantMessage]);
          }, 100);
        }
        return;
      }
      
      const convData = await convResponse.json();
      
      // 기존 메시지 배열 가져오기
      let messages = Array.isArray(convData.messages) ? 
        convData.messages : 
        (typeof convData.messages === 'string' ? JSON.parse(convData.messages) : []);
      
      // 사용자 선택 메시지와 지역 안내 메시지 추가
      messages.push({
        role: 'user',
        content: userMessage.content,
        timestamp: new Date().toISOString()
      });
      
      messages.push({
        role: 'assistant',
        content: assistantMessage.content,
        timestamp: new Date().toISOString()
      });
      
      // 대화 업데이트
      const updateResponse = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      });
      
      if (!updateResponse.ok) {
        console.error('식물 선택 메시지 저장 실패:', updateResponse.status);
      } else {
        console.log('식물 선택 및 지역 안내 메시지가 서버에 영구적으로 저장되었습니다.');
      }
    } catch (error) {
      console.error('식물 선택 메시지 저장 중 오류:', error);
    }
    
    // 클라이언트 상태에 선택 메시지 추가
    setMessages(prev => [...prev, userMessage]);
    
    // 지역 선택 안내 및 지도 추가
    if (!isSelectingRegion) {
      setIsSelectingRegion(true);
      
      // 통합된 메시지 한 번만 추가
      setTimeout(() => {
        setMessages(prev => [...prev, assistantMessage]);
      }, 100);
    }
  };
  
  // 상세정보 보기 처리 (식물 선택과 분리)
  const handleViewDetails = (e: React.MouseEvent, plantAccordion: string) => {
    // 이벤트 버블링 방지
    e.stopPropagation();
  };
  
  // 식물 정보를 채팅 인터페이스에 직접 표시
  const handleShowPlantInfo = (plant: PlantRecommendation) => {
    // 현재 식물 정보 저장 (참조용)
    setCurrentPlantInfo(plant);
    
    // 새로운 식물 선택 시 이전 위치 정보 초기화하고 새로운 지도 생성
    setSelectedLocation(null);
    setInteractionMode("location-selection");
    
    // 사용자가 식물을 선택했다는 메시지 추가
    const userMessage: ChatMessage = {
      role: "user",
      content: `"${plant.name}"을(를) 선택했습니다.`,
      timestamp: new Date(),
    };
    
    // AI 응답 메시지 - 새로운 지도와 함께 위치 선택 요청
    const assistantMessage: ChatMessage = {
      role: "assistant",
      content: "배송이나 선물을 위한 지역을 선택해주세요. 지도에서 위치를 선택하거나 검색해서 찾으세요. 해당 지역의 판매자들에게 입찰 요청이 전송됩니다.",
      timestamp: new Date(),
    };
    
    // 메시지 목록에 추가
    setMessages(prevMessages => [...prevMessages, userMessage, assistantMessage]);
  };
  
  // 기능을 수행하지 않지만 이전 코드가 참조하는 경우를 대비하여 빈 함수로 유지
  const legacySelectBid = () => {};


  // 지역 선택 후 요청사항 입력 폼 표시
  const handleShowRequestForm = () => {
    console.log("handleShowRequestForm 호출됨");
    console.log("selectedPlant:", selectedPlant);
    console.log("region:", region);
    console.log("user:", user);
    
    if (!selectedPlant || !region.trim() || !user) {
      console.log("조건 확인 실패 - 폼을 표시하지 않음");
      toast({
        title: "정보 부족",
        description: "식물과 지역 정보가 필요합니다.",
        variant: "destructive",
      });
      return;
    }
    
    console.log("조건 확인 성공 - 요청사항 입력 폼을 표시합니다");
    setShowRequestForm(true);
  };

  // 입찰 요청 처리 (요청사항 포함)
  const handleRequestBids = async () => {
    setIsProcessing(true);
    setShowRequestForm(false);
    
    try {
      // 위치 기반 정보가 있으면 포함
      const requestData: any = {
        userId: user.id,
        plantName: selectedPlant,
        region: region,
        storeName: region, // storeName을 region으로 설정 (서버에서 필수로 요구)
        conversationId: conversationId,
        inputAddress: region, // 사용자가 입력한 지역 정보를 주소로 저장
        // 사용자 요청사항 추가
        userRequests: userRequests.trim() || null,
        ribbonRequest: ribbonRequest,
        ribbonMessage: ribbonRequest ? ribbonMessage.trim() || null : null,
        deliveryTime: deliveryTime.trim() || null
      };
      
      // 위치 정보가 있으면 추가
      if (selectedLocation) {
        requestData.lat = selectedLocation.lat;
        requestData.lng = selectedLocation.lng;
        requestData.radius = selectedLocation.radius;
      }
      
      const response = await apiRequest("POST", "/api/bids/request", requestData);
      
      if (!response.ok) {
        throw new Error("Failed to request bids");
      }
      
      const data = await response.json();
      
      // 입찰 요청 완료 메시지
      const successMessage = selectedLocation 
        ? `선택한 위치(${region}) 반경 ${selectedLocation.radius}km 이내의 판매자들에게 입찰 요청을 보냈습니다. 2시간 내에 입찰 결과를 알려드리겠습니다.`
        : `${region} 지역의 판매자들에게 입찰 요청을 보냈습니다. 2시간 내에 입찰 결과를 알려드리겠습니다.`;

      // 중요: 지역 설정 메시지를 서버에 영구 저장
      const saveLocationMessage = async () => {
        try {
          if (!conversationId) {
            console.error('대화 ID가 없어 지역 설정 메시지를 저장할 수 없습니다.');
            return;
          }
          
          // 현재 대화 내용 가져오기
          const convResponse = await fetch(`/api/conversations/${conversationId}`);
          if (!convResponse.ok) {
            console.error('대화 데이터를 가져오는 중 오류 발생:', convResponse.status);
            return;
          }
          
          const convData = await convResponse.json();
          
          // 기존 메시지 배열 가져오기
          let messages = Array.isArray(convData.messages) ? 
            convData.messages : 
            (typeof convData.messages === 'string' ? JSON.parse(convData.messages) : []);
          
          // 새 지역 설정 메시지 생성
          const locationMessageAssistant = {
            role: 'assistant',
            content: successMessage,
            timestamp: new Date().toISOString() // ISO 문자열로 저장
          };
          
          // 메시지 추가
          messages.push(locationMessageAssistant);
          
          // 대화 업데이트
          const updateResponse = await fetch(`/api/conversations/${conversationId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messages })
          });
          
          if (!updateResponse.ok) {
            console.error('지역 설정 메시지 저장 실패:', updateResponse.status);
          } else {
            console.log('지역 설정 메시지가 서버에 영구적으로 저장되었습니다.');
          }
        } catch (error) {
          console.error('지역 설정 메시지 저장 중 오류:', error);
        }
      };
      
      // 서버에 지역 설정 메시지 저장 함수 호출
      saveLocationMessage();
        
      // 1. 먼저 입찰 완료 메시지 추가 (클라이언트 상태)
      const bidCompletionMessage: ChatMessage = {
        role: "assistant",
        content: successMessage,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, bidCompletionMessage]);
      
      // 자동 스크롤
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
        // mode도 여기서 변경 - 지도 컨테이너 이후에 메시지가 표시되도록
        setInteractionMode("bid-requested");
      }, 300);
      
      toast({
        title: "입찰 요청 완료",
        description: "지역 판매자들에게 입찰 요청을 보냈습니다.",
      });
      
      // 입찰 요청 후에도 UI 유지 (Mode는 이미 위에서 변경됨)
    } catch (error) {
      console.error("Error requesting bids:", error);
      toast({
        title: "오류 발생",
        description: "입찰 요청 중 문제가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 로그인 상태 확인
  if (!user) {
    return <Redirect to="/auth" />;
  }

  return (
    <DashboardLayout>
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <div className="flex flex-col gap-2 mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">인공지능 식물 상담</h1>
            <div className="flex items-center gap-2">
              <ConversationDrawer />
              <Button
                onClick={async () => {
                  try {
                    // 새 대화 생성 중임을 표시
                    setIsCreatingNewConversation(true);
                    
                    // 서버에 새 대화 생성 요청
                    const response = await apiRequest("POST", "/api/conversations");
                    if (!response.ok) {
                      throw new Error("Failed to create new conversation");
                    }
                    
                    const data = await response.json();
                    
                    // 모든 상태 초기화
                    setSelectedMode(null);
                    setSelectedPlant(null);
                    setRegion("");
                    setInteractionMode("initial");
                    setSearchResults([]);
                    setSearchTerm("");
                    setIsSearching(false);
                    setIsSelectingRegion(false);
                    setSelectedLocation(null);
                    
                    // 새 대화 ID 설정
                    setConversationId(data.id);
                    
                    // 초기 메시지 설정
                    const initialMessage: ChatMessage = {
                      role: "assistant", 
                      content: "안녕하세요? 당신의 식물생활을 도울 인공지능 심다입니다. 식물 추천방식을 선택해주세요.", 
                      timestamp: new Date()
                    };
                    setMessages([initialMessage]);
                    
                    // URL 업데이트
                    setLocation(`/ai-consultation?conversation=${data.id}`);
                    
                    // 쿼리 무효화
                    queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
                    
                    // 로그
                    console.log("새 대화 생성 성공:", data.id);
                  } catch (error) {
                    console.error("새 대화 생성 실패:", error);
                    toast({
                      title: "새 대화 생성 실패",
                      description: "새 대화를 시작하는 중 오류가 발생했습니다.",
                      variant: "destructive",
                    });
                  } finally {
                    setIsCreatingNewConversation(false);
                  }
                }}
                disabled={isCreatingNewConversation}
                variant="outline"
                className="gap-1"
              >
                {isCreatingNewConversation ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                새 대화
              </Button>
            </div>
          </div>
          
          {conversationId && (
            <div className="flex items-center text-sm text-muted-foreground">
              <MessageSquareText className="h-4 w-4 mr-1.5" />
              <span>대화 #{conversationId}</span>
              {messages.length > 0 && (
                <>
                  <span className="mx-2">•</span>
                  <span>{messages.length}개 메시지</span>
                </>
              )}
            </div>
          )}
        </div>
        
        {/* 채팅 메시지 영역 */}
        <div 
          className="bg-background border rounded-lg p-4 mb-4 h-[calc(100vh-240px)] overflow-y-auto" 
          id="chat-container"
          ref={chatContainerRef}>
          
          {/* 대화 메시지 영역이 비어있거나, 새 대화인 경우 초기 대화형 UI 표시 */}
          {messages.length === 1 && messages[0].content.includes("안녕하세요? 당신의 식물생활을 도울 인공지능 심다입니다") && (
            <>
              {/* 초기 안내 메시지 */}
              <div className="flex justify-start mb-4">
                <div className="flex items-start max-w-[80%]">
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarImage src="" />
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex flex-col gap-1">
                    <Card className="p-3">
                      <CardContent className="p-0">
                        <p>{messages[0].content}</p>
                        
                        <div className="mt-4 flex flex-col gap-3">
                          <Button
                            onClick={async () => {
                              setSelectedMode("ai");
                              setInteractionMode("ai-recommendation");
                              
                              // 대화 시작 처리 시작
                              setIsProcessing(true);
                              // setIsCreatingNewConversation(true) 제거 - 이 부분이 중복 대화 생성의 원인
                              
                              try {
                                console.log("AI 추천 버튼 클릭: 대화 시작됨");
                                // 유틸리티 함수를 사용하여 새 대화 생성 요청
                                const data = await startNewAIConversation(user?.id!);
                                
                                // 서버에서 받은 응답으로 전체 대화 구성
                                if (data.conversationId) {
                                  console.log("대화 ID 설정:", data.conversationId);
                                  // 대화 ID 설정
                                  setConversationId(data.conversationId);
                                  
                                  // 대화 내용 추출
                                  if (data.messages && data.messages.length > 0) {
                                    console.log("새 메시지 적용:", data.messages.length, "개");
                                    // 서버에서 받은 메시지로 교체 (timestamps 변환 포함)
                                    const formattedMessages = data.messages.map((msg: any) => ({
                                      ...msg, 
                                      timestamp: new Date(msg.timestamp)
                                    }));
                                    
                                    console.log("변환된 메시지:", formattedMessages);
                                    setMessages(formattedMessages);
                                    
                                    // URL 업데이트 (새 대화 ID 반영)
                                    console.log("URL 업데이트");
                                    setLocation(`/ai-consultation?conversation=${data.conversationId}`);
                                  } else {
                                    console.log("서버에서 받은 메시지가 없음");
                                  }
                                } else {
                                  console.log("서버에서 대화 ID를 받지 못함");
                                }
                              } catch (error) {
                                console.error("Error starting conversation:", error);
                                toast({
                                  title: "오류 발생",
                                  description: "대화 시작 중 문제가 발생했습니다. 다시 시도해주세요.",
                                  variant: "destructive",
                                });
                              } finally {
                                setIsProcessing(false);
                                setIsCreatingNewConversation(false);
                              }
                            }}
                            variant="outline"
                            className="flex items-center justify-start h-auto py-2 px-3 gap-2 bg-muted hover:bg-muted/80"
                          >
                            <Bot className="h-5 w-5 text-primary" />
                            <div className="flex flex-col items-start">
                              <span className="font-medium">AI 추천</span>
                              <span className="text-xs text-muted-foreground">AI가 몇 가지 질문을 통해 당신에게 맞는 식물을 추천해 드립니다</span>
                            </div>
                          </Button>
                          
                          <Button
                            onClick={async () => {
                              setSelectedMode("manual");
                              setInteractionMode("manual-selection");
                              
                              // 사용자 메시지와 응답 생성
                              const userMessage: ChatMessage = {
                                role: "user",
                                content: "직접 선택으로 진행할게요.",
                                timestamp: new Date()
                              };
                              
                              const assistantMessage: ChatMessage = {
                                role: "assistant",
                                content: "식물을 직접 검색하여 선택하는 모드입니다. 아래에서 원하는 식물을 검색해보세요.",
                                timestamp: new Date()
                              };
                              
                              // 중요: 사용자 메시지를 서버에 저장
                              try {
                                if (!conversationId) {
                                  // 새 대화 생성 필요
                                  const response = await apiRequest("POST", "/api/conversations");
                                  if (!response.ok) {
                                    throw new Error("Failed to create new conversation");
                                  }
                                  
                                  const data = await response.json();
                                  setConversationId(data.id);
                                  
                                  // URL 업데이트
                                  setLocation(`/ai-consultation?conversation=${data.id}`);
                                }
                                
                                // 현재 대화 로드
                                const convId = conversationId || (await (await apiRequest("POST", "/api/conversations")).json()).id;
                                const convResponse = await fetch(`/api/conversations/${convId}`);
                                
                                if (!convResponse.ok) {
                                  throw new Error("Failed to load conversation");
                                }
                                
                                const convData = await convResponse.json();
                                
                                // 기존 메시지 배열 가져오기
                                let messages = Array.isArray(convData.messages) ? 
                                  convData.messages : 
                                  (typeof convData.messages === 'string' ? JSON.parse(convData.messages) : []);
                                
                                // 사용자와 어시스턴트 메시지 추가
                                messages.push({
                                  role: 'user',
                                  content: userMessage.content,
                                  timestamp: new Date().toISOString()
                                });
                                
                                messages.push({
                                  role: 'assistant',
                                  content: assistantMessage.content,
                                  timestamp: new Date().toISOString()
                                });
                                
                                // 대화 업데이트
                                const updateResponse = await fetch(`/api/conversations/${convId}`, {
                                  method: 'PATCH',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({ messages })
                                });
                                
                                if (!updateResponse.ok) {
                                  console.error('직접 선택 메시지 저장 실패:', updateResponse.status);
                                } else {
                                  console.log('직접 선택 메시지가 서버에 저장되었습니다.');
                                }
                              } catch (error) {
                                console.error('직접 선택 메시지 저장 중 오류:', error);
                              }
                              
                              // 클라이언트 상태 업데이트
                              setMessages([userMessage, assistantMessage]);
                              
                              console.log("직접 선택 버튼 클릭: 대화 상태 업데이트됨");
                            }}
                            variant="outline"
                            className="flex items-center justify-start h-auto py-2 px-3 gap-2 bg-muted hover:bg-muted/80"
                          >
                            <Search className="h-5 w-5 text-primary" />
                            <div className="flex flex-col items-start">
                              <span className="font-medium">직접 선택</span>
                              <span className="text-xs text-muted-foreground">원하는 식물을 직접 검색하고 선택할 수 있습니다</span>
                            </div>
                          </Button>
                          
                          <Button
                            onClick={async () => {
                              setSelectedMode("region");
                              setInteractionMode("region-store");
                              
                              // 사용자 메시지와 응답 생성
                              const userMessage: ChatMessage = {
                                role: "user" as const,
                                content: "지역 상점에서 구매하고 싶어요.",
                                timestamp: new Date()
                              };
                              
                              const assistantMessage: ChatMessage = {
                                role: "assistant" as const,
                                content: "지역 상점 구매를 선택하셨습니다. 아래 지도에서 원하는 지역을 선택하시면 해당 지역의 상점에서 판매중인 식물을 확인하실 수 있습니다.",
                                timestamp: new Date()
                              };
                              
                              // 중요: 사용자 메시지를 서버에 저장
                              try {
                                if (!conversationId) {
                                  // 새 대화 생성 필요
                                  const response = await apiRequest("POST", "/api/conversations");
                                  if (!response.ok) {
                                    throw new Error("Failed to create new conversation");
                                  }
                                  
                                  const data = await response.json();
                                  setConversationId(data.id);
                                  
                                  // URL 업데이트
                                  setLocation(`/ai-consultation?conversation=${data.id}`);
                                }
                                
                                // 현재 대화 로드
                                const convId = conversationId || (await (await apiRequest("POST", "/api/conversations")).json()).id;
                                const convResponse = await fetch(`/api/conversations/${convId}`);
                                
                                if (!convResponse.ok) {
                                  throw new Error("Failed to load conversation");
                                }
                                
                                const convData = await convResponse.json();
                                
                                // 기존 메시지 배열 가져오기
                                let messages = Array.isArray(convData.messages) ? 
                                  convData.messages : 
                                  (typeof convData.messages === 'string' ? JSON.parse(convData.messages) : []);
                                
                                // 사용자와 어시스턴트 메시지 추가
                                messages.push({
                                  role: 'user',
                                  content: userMessage.content,
                                  timestamp: new Date().toISOString()
                                });
                                
                                messages.push({
                                  role: 'assistant',
                                  content: assistantMessage.content,
                                  timestamp: new Date().toISOString()
                                });
                                
                                // 대화 업데이트
                                const updateResponse = await fetch(`/api/conversations/${convId}`, {
                                  method: 'PATCH',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({ messages })
                                });
                                
                                if (!updateResponse.ok) {
                                  console.error('지역 상점 메시지 저장 실패:', updateResponse.status);
                                } else {
                                  console.log('지역 상점 메시지가 서버에 저장되었습니다.');
                                }
                              } catch (error) {
                                console.error('지역 상점 메시지 저장 중 오류:', error);
                              }
                              
                              // 클라이언트 상태 업데이트
                              setMessages([userMessage, assistantMessage]);
                              
                              console.log("지역 상점 버튼 클릭: 대화 상태 업데이트됨");
                            }}
                            variant="outline"
                            className="flex items-center justify-start h-auto py-2 px-3 gap-2 bg-muted hover:bg-muted/80"
                          >
                            <MapPin className="h-5 w-5 text-primary" />
                            <div className="flex flex-col items-start">
                              <span className="font-medium">지역 상점</span>
                              <span className="text-xs text-muted-foreground">근처 지역의 상점에서 판매중인 식물을 찾아보세요</span>
                            </div>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* 타임스탬프 */}
                    <div className="text-xs text-muted-foreground text-left">
                      {formatTime(new Date())}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {/* 채팅 메시지 표시 - 대화가 시작된 경우 표시 */}
          {!(messages.length === 1 && messages[0].content.includes("안녕하세요? 당신의 식물생활을 도울 인공지능 심다입니다")) && messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex mb-4",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "flex max-w-[80%]",
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                {/* 아바타 */}
                <div className="flex-shrink-0 mx-2">
                  <Avatar>
                    <AvatarFallback>
                      {message.role === "user" 
                        ? <User size={18} /> 
                        : message.role === "vendor" 
                          ? <Store size={18} /> 
                          : <Bot size={18} />}
                    </AvatarFallback>
                    {message.role === "assistant" && (
                      <AvatarImage src="/assets/plant-bot-avatar.png" />
                    )}
                  </Avatar>
                </div>
                
                {/* 메시지 내용 */}
                <div>
                  <Card
                    className={cn(
                      "mb-1",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : message.role === "vendor"
                          ? typeof message.vendorColor === 'string' && message.vendorColor.startsWith('#') 
                            ? `border border-gray-200` 
                            : (typeof message.vendorColor === 'string' && !message.vendorColor.startsWith('#')) 
                              ? message.vendorColor 
                              : (message.vendorColor && typeof message.vendorColor === 'object')
                                ? (message.vendorColor && 
                                   typeof message.vendorColor === 'object' && 
                                   'bg' in message.vendorColor && 
                                   typeof (message.vendorColor as {bg: string}).bg === 'string')
                                  ? (message.vendorColor as {bg: string}).bg
                                  : "bg-white"
                                : "bg-white border border-gray-200"
                          : "bg-muted"
                    )}
                    style={message.role === "vendor" ? 
                      typeof message.vendorColor === 'string' && message.vendorColor.startsWith('#') ? 
                        { backgroundColor: `${message.vendorColor}20` } /* 20은 hex로 약 12% 투명도 */ 
                        : typeof message.vendorColor === 'object' && message.vendorColor && 'bg' in message.vendorColor && message.vendorColor.bg.startsWith('#') ?
                          { backgroundColor: `${message.vendorColor.bg}20` }
                          : undefined
                      : undefined}
                  >
                    <CardContent className="p-3">
                      {/* 메시지 내용 표시 */}
                      
                      <div className="whitespace-pre-wrap">
                        {/* JSON 포맷인 경우 포맷팅하여 표시 */}
                        {message.content && message.content.includes('"recommendations":') ? (
                          <>
                            {/* JSON이 포함된 메시지는 recommendations 부분을 제외하고 표시 */}
                            {message.content.split('"recommendations":')[0]
                              .replace(/{|"content":|"|}|,$/g, '')
                              .trim()}
                          </>
                        ) : (
                          message.role === 'assistant' && isTyping && typingMessage && 
                          typingMessage.timestamp.getTime() === message.timestamp.getTime() ? (
                            <TypingEffect 
                              text={message.content} 
                              speed={20}
                            />
                          ) : (
                            // 줄바꿈 코드를 실제 줄바꿈으로 변환하여 표시
                            <>
                              {/* 판매자 메시지는 아래 상품 카드 아래에서 로드 */}
                              {message.role === 'vendor' ? (
                                <>
                                  {/* 판매자 메시지는 아래에서 표시되므로 여기서는 생략 */}
                                </>
                              ) : (
                                /* 일반 메시지인 경우 줄바꿈 처리 */
                                message.content.replace(/\\n/g, '\n')
                              )}
                            </>
                          )
                        )}
                        
                        {/* 판매자 메시지에서 상품 정보 표시 - 새 디자인 */}
                        {message.role === "vendor" && (
                          <div className="mt-3">
                            <div className="flex flex-col items-start">
                              {/* 판매자 정보 헤더 - 상호명은 메시지 상단으로 이동했으므로 여기서는 삭제 */}
                              
                              {/* 상품 카드 - 새 디자인 - 상품이 있는 경우에만 표시 */}
                              {(message.product || message.productInfo) && (
                                <div className="bg-background rounded-lg overflow-hidden border w-full mb-3 shadow-sm hover:shadow-md transition-all duration-200">
                                  <div className="flex flex-col md:flex-row">
                                    {/* 이미지 영역 */}
                                    {(message.product?.imageUrl || message.productInfo?.imageUrl) && (
                                      <div className="md:w-1/3 overflow-hidden bg-muted">
                                        <img 
                                          src={message.product?.imageUrl || message.productInfo?.imageUrl} 
                                          alt={message.product?.name || message.productInfo?.name}
                                          className="w-full h-full object-cover aspect-square md:aspect-auto"
                                          onError={(e) => {
                                            console.log('상품 이미지 로드 오류:', message.product?.imageUrl || message.productInfo?.imageUrl);
                                            e.currentTarget.src = '/assets/plants/default-plant.png';
                                          }}
                                        />
                                      </div>
                                    )}
                                    
                                    {/* 상품 정보 영역 */}
                                    <div className="p-4 flex flex-col justify-between md:w-2/3">
                                      <div>
                                        {/* 상품명과 기본가 */}
                                        <div className="flex justify-between items-start mb-2">
                                          <h3 className="text-lg font-semibold">{message.product?.name || message.productInfo?.name}</h3>
                                          {(message.product?.basePrice || message.productInfo?.basePrice) && (
                                            <span className="line-through text-muted-foreground text-sm">
                                              {parseFloat(String(message.product?.basePrice || message.productInfo?.basePrice || 0)).toLocaleString()}원
                                            </span>
                                          )}
                                        </div>
                                        
                                        {/* 입찰가/판매가 표시 */}
                                        {message.price ? (
                                          <div className="font-bold text-xl text-primary mb-3">
                                            {typeof message.price === 'number' ? 
                                              message.price.toLocaleString() : 
                                              parseFloat(String(message.price || 0)).toLocaleString()}원
                                          </div>
                                        ) : (message.product?.price || message.productInfo?.price) ? (
                                          <div className="font-bold text-xl mb-3">
                                            {parseFloat(String(message.product?.price || message.productInfo?.price || 0)).toLocaleString()}원
                                          </div>
                                        ) : null}
                                        
                                        {/* 상품 설명 */}
                                        {(message.product?.description || message.productInfo?.description) && (
                                          <p className="text-sm text-muted-foreground mb-3">
                                            {message.product?.description || message.productInfo?.description}
                                          </p>
                                        )}
                                        
                                        {/* 판매자 상호 표시 (작게) */}
                                        <div className="flex items-center mb-3">
                                          <div 
                                            className="w-3 h-3 rounded-full mr-1.5" 
                                            style={typeof message.vendorColor === 'string' ? {backgroundColor: message.vendorColor} : {backgroundColor: '#6E56CF'}}
                                          ></div>
                                          <span className="text-xs text-muted-foreground">
                                            {message.storeName || message.vendorName || (message.vendorId ? `판매자 ${message.vendorId}` : '판매자')}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      {/* 구매 버튼 */}
                                      <Button 
                                        className={message.price ? "bg-primary hover:bg-primary/90" : ""}
                                        variant={message.price ? "default" : "outline"}
                                        onClick={() => handleSelectBid(message)}
                                        disabled={!message.price}
                                      >
                                        {message.price 
                                          ? "이 상품 구매하기" 
                                          : "입찰가 없음 (구매 불가)"}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* 판매자 메시지가 있는 경우 여기에 표시 - 배경색이 있는 메시지 */}
                              <div 
                                className="text-sm p-3 rounded-md w-full mb-3"
                                style={
                                  typeof message.vendorColor === 'string' ? 
                                    {backgroundColor: `${message.vendorColor}20`, border: `1px solid ${message.vendorColor}30`} : 
                                    {backgroundColor: '#6E56CF15', border: '1px solid #6E56CF30'}
                                }
                              >
                                <div className="flex items-center mb-2">
                                  <div 
                                    className="w-3 h-3 rounded-full mr-1.5" 
                                    style={
                                      typeof message.vendorColor === 'string' ? 
                                        {backgroundColor: message.vendorColor} : 
                                        message.vendorColor && typeof message.vendorColor === 'object' && 'bg' in message.vendorColor ?
                                          {backgroundColor: message.vendorColor.bg} :
                                          {backgroundColor: '#6E56CF'}
                                    }
                                  ></div>
                                  <span className="text-xs font-medium">
                                    {message.storeName || (message.vendorId ? `판매자 ${message.vendorId}` : '판매자')} 메시지:
                                  </span>
                                </div>
                                {/* 메시지 내용이 없는 경우 기본 메시지 표시 */}
                                {message.content ? 
                                  message.content.replace(/\\n/g, '\n').replace(/\n\n/g, '\n') : 
                                  `${message.storeName || message.vendorName || '판매자'}에서 입찰 내용을 검토 중입니다.`
                                }
                                
                                {/* 판매자 메시지에 이미지가 있으면 바로 아래에 표시 */}
                                {message.role === "vendor" && message.imageUrl && (
                                  <div className="mt-3">
                                    <div className="w-full max-w-[320px] h-auto rounded-md overflow-hidden border border-muted">
                                      <img 
                                        src={message.imageUrl} 
                                        alt="판매자 이미지" 
                                        className="w-full h-auto object-cover"
                                        onError={(e) => {
                                          console.log('판매자 이미지 로드 오류:', message.imageUrl);
                                          e.currentTarget.src = '/assets/plants/default-plant.png';
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}
                                
                                {/* 판매자 메시지에 여러 이미지가 있으면 표시 */}
                                {message.role === "vendor" && message.referenceImages && message.referenceImages.length > 0 && (
                                  <div className="mt-3">
                                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 max-w-[600px]">
                                      {message.referenceImages.map((imgUrl, index) => (
                                        <div key={index} className="relative aspect-square rounded-md overflow-hidden border border-muted hover:border-primary transition-colors">
                                          <img 
                                            src={imgUrl} 
                                            alt={`판매자 이미지 ${index + 1}`} 
                                            className="absolute inset-0 w-full h-full object-cover"
                                            onError={(e) => {
                                              console.log('판매자 이미지 로드 오류:', imgUrl);
                                              e.currentTarget.src = '/assets/plants/default-plant.png';
                                            }}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* 다른 메시지 타입의 참고 이미지가 있으면 표시 */}
                        {message.role !== "vendor" && (message.imageUrl || (message.referenceImages && message.referenceImages.length > 0)) && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="font-medium mb-2">참고 이미지:</div>
                            {/* 단일 이미지 처리 */}
                            {message.imageUrl && !message.referenceImages && (
                              <div className="w-full max-w-[320px] h-auto rounded-md overflow-hidden border border-muted">
                                <img 
                                  src={message.imageUrl} 
                                  alt="참고 이미지" 
                                  className="w-full h-auto object-cover"
                                  onError={(e) => {
                                    console.log('참고 이미지 로드 오류:', message.imageUrl);
                                    e.currentTarget.src = '/assets/plants/default-plant.png';
                                  }}
                                />
                              </div>
                            )}
                            
                            {/* 여러 이미지 타일 처리 */}
                            {message.referenceImages && message.referenceImages.length > 0 && (
                              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 max-w-[600px]">
                                {message.referenceImages.map((imgUrl, index) => (
                                  <div key={index} className="relative aspect-square rounded-md overflow-hidden border border-muted hover:border-primary transition-colors">
                                    <img 
                                      src={imgUrl} 
                                      alt={`참고 이미지 ${index + 1}`} 
                                      className="absolute inset-0 w-full h-full object-cover"
                                      onError={(e) => {
                                        console.log('참고 이미지 로드 오류:', imgUrl);
                                        e.currentTarget.src = '/assets/plants/default-plant.png';
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* 추천 식물이 있으면 별도로 표시 - 이미지 갤러리 포함 */}
                        {message.recommendations && message.recommendations.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="font-medium mb-2">🌿 추천 식물:</div>
                            <div className="space-y-6">
                              {message.recommendations.map((plant: PlantRecommendation, idx: number) => (
                                <div key={idx} className="bg-background/50 rounded-md p-3 shadow-sm">
                                  <div className="flex justify-between items-start">
                                    <h3 className="font-medium text-primary">{plant.name || `추천 식물 ${idx+1}`}</h3>
                                    <Badge variant="outline" className="ml-2">
                                      {plant.priceRange || "가격 정보 없음"}
                                    </Badge>
                                  </div>
                                  <p className="text-sm mt-1 mb-3 text-muted-foreground">{plant.description || "설명 정보가 없습니다."}</p>
                                  
                                  {/* 식물 이미지 갤러리 - 항상 표시 */}
                                  <div className="mb-3">
                                    <div className="mb-3">
                                      {/* 구글 이미지 검색 갤러리 컴포넌트 - 전체 너비 */}
                                      <div className="w-full">
                                        {/* GoogleImageGallery 컴포넌트 사용 */}
                                        <GoogleImageGallery plantName={plant.name} />
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {plant.careInstructions && (
                                    <div className="mt-2">
                                      <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">관리 방법</h4>
                                      <p className="text-sm">{plant.careInstructions}</p>
                                    </div>
                                  )}
                                  
                                  <div className="flex justify-end mt-4">
                                    <Button 
                                      size="sm"
                                      onClick={() => {
                                        handleSelectPlant(plant.name);
                                        setInteractionMode("location-selection");
                                      }}
                                      className="text-xs"
                                    >
                                      이 식물 선택하기
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* 입찰 요청 완료 후 버튼은 사용자 요청에 따라 삭제함 */}
                      
                      {/* 초기 선택 옵션 - 첫 메시지에만 표시 */}
                      {message.role === "assistant" && 
                       message.content.includes("식물 추천을 어떤 방식으로 진행할까요?") && 
                       interactionMode === "initial" && (
                        <div className="mt-4 space-y-3">
                          <h3 className="font-medium">추천 방식을 선택해주세요:</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <Button 
                              variant="outline"
                              className="flex flex-col items-center gap-2 p-4 h-auto"
                              onClick={async () => {
                                // 대화 상태와 처리 상태 설정
                                setInteractionMode("ai-recommendation");
                                setIsProcessing(true);
                                
                                console.log("기존 UI의 AI 추천 버튼 클릭: 새 대화 생성");
                                
                                try {
                                  // 유틸리티 함수를 사용하여 새 대화 생성 요청
                                  const data = await startNewAIConversation(user?.id!);
                                  
                                  // 이제 conversationId를 설정하고 해당 URL로 이동
                                  if (data.conversationId) {
                                    setConversationId(data.conversationId);
                                    
                                    // 대화 내용 추출
                                    if (data.messages && data.messages.length > 0) {
                                      // 서버에서 받은 메시지로 교체 (timestamps 변환 포함)
                                      setMessages(data.messages.map((msg: any) => ({
                                        ...msg,
                                        timestamp: new Date(msg.timestamp)
                                      })));
                                      
                                      // URL 업데이트 (새 대화 ID 반영)
                                      setLocation(`/ai-consultation?conversation=${data.conversationId}`);
                                    }
                                  }
                                } catch (error) {
                                  console.error("Error starting conversation:", error);
                                  toast({
                                    title: "오류 발생",
                                    description: "대화 시작 중 문제가 발생했습니다. 다시 시도해주세요.",
                                    variant: "destructive",
                                  });
                                } finally {
                                  setIsProcessing(false);
                                }
                              }}
                            >
                              <Bot className="h-8 w-8 text-primary mb-1" />
                              <span className="font-medium">AI 추천</span>
                              <span className="text-xs text-center text-muted-foreground">
                                질문에 답하고 AI가 맞춤 식물을 추천받기
                              </span>
                            </Button>
                            
                            <Button 
                              variant="outline"
                              className="flex flex-col items-center gap-2 p-4 h-auto"
                              onClick={async () => {
                                setInteractionMode("manual-selection");
                                
                                // 사용자 메시지 추가
                                const userMessage: ChatMessage = {
                                  role: "user",
                                  content: "직접 선택으로 진행할게요.",
                                  timestamp: new Date()
                                };
                                
                                // 어시스턴트 메시지 추가
                                const assistantMessage: ChatMessage = {
                                  role: "assistant",
                                  content: "알겠습니다. 식물 이름을 검색하여 선택하실 수 있습니다.",
                                  timestamp: new Date()
                                };
                                
                                setMessages(prev => [...prev, userMessage, assistantMessage]);
                              }}
                            >
                              <Search className="h-8 w-8 text-primary mb-1" />
                              <span className="font-medium">직접 선택</span>
                              <span className="text-xs text-center text-muted-foreground">
                                직접 식물을 검색하고 선택하기
                              </span>
                            </Button>
                            
                            <Button 
                              variant="outline"
                              className="flex flex-col items-center gap-2 p-4 h-auto"
                              onClick={async () => {
                                setInteractionMode("region-store");
                                
                                // 사용자 메시지 추가
                                const userMessage: ChatMessage = {
                                  role: "user" as "user",
                                  content: "지역 상점에서 구매할게요.",
                                  timestamp: new Date()
                                };
                                
                                // 어시스턴트 메시지 추가
                                const assistantMessage: ChatMessage = {
                                  role: "assistant" as "assistant",
                                  content: "지역 상점 구매를 선택하셨습니다. 원하시는 지역을 먼저 선택해주세요. 해당 지역 내 등록된 상품들을 보여드리겠습니다.",
                                  timestamp: new Date()
                                };
                                
                                setMessages(prev => [...prev, userMessage, assistantMessage]);
                              }}
                            >
                              <Store className="h-8 w-8 text-primary mb-1" />
                              <span className="font-medium">지역 상점</span>
                              <span className="text-xs text-center text-muted-foreground">
                                가까운 상점의 등록 상품 구매하기
                              </span>
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* 식물 검색 인터페이스 - 직접 선택 모드일 때 표시 */}
                      {message.role === "assistant" && 
                       (message.content.includes("식물 이름을 검색하여 선택하실 수 있습니다") || 
                        message.content.includes("직접 검색하여 선택하는 모드")) && 
                       interactionMode === "manual-selection" && (
                        <div className="mt-4 border rounded-md p-3 bg-background">
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
                              <Button 
                                onClick={async () => {
                                  setIsSearching(true);
                                  try {
                                    const url = searchTerm.trim() 
                                      ? `/api/plants/search?q=${encodeURIComponent(searchTerm)}` 
                                      : `/api/plants`;
                                    
                                    const response = await fetch(url);
                                    if (!response.ok) {
                                      throw new Error('식물 검색 실패');
                                    }
                                    
                                    const data = await response.json();
                                    setSearchResults(data);
                                  } catch (error) {
                                    console.error('Error searching plants:', error);
                                    toast({
                                      title: "검색 오류",
                                      description: "식물 검색 중 오류가 발생했습니다.",
                                      variant: "destructive",
                                    });
                                  } finally {
                                    setIsSearching(false);
                                  }
                                }}
                                disabled={isSearching}
                              >
                                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "검색"}
                              </Button>
                            </div>
                            
                            {isSearching ? (
                              <div className="grid grid-cols-2 gap-3">
                                {Array(4).fill(0).map((_, i) => (
                                  <div key={i} className="space-y-2">
                                    <Skeleton className="h-28 w-full rounded-md" />
                                    <Skeleton className="h-4 w-3/4" />
                                  </div>
                                ))}
                              </div>
                            ) : searchResults.length > 0 ? (
                              <div className="grid grid-cols-2 gap-3">
                                {searchResults.map((plant: any) => (
                                  <div
                                    key={plant.id}
                                    className="border rounded-md overflow-hidden cursor-pointer hover:border-primary transition-colors"
                                    onClick={() => {
                                      handleSelectPlant(plant.name);
                                      setInteractionMode("location-selection");
                                    }}
                                  >
                                    <div 
                                      className="h-28 bg-center bg-cover"
                                      style={{ backgroundImage: `url(${plant.imageUrl || '/assets/plants/default-plant.png'})` }}
                                    />
                                    <div className="p-2">
                                      <h3 className="font-medium text-sm truncate">{plant.name}</h3>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="py-4 text-center">
                                <p className="text-muted-foreground text-sm">검색어를 입력하고 검색 버튼을 눌러주세요</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* 구글 지도 - 지역 상점 선택 메시지 및 위치 정보가 있을 때 표시 */}
                      {message.role === "assistant" && 
                       interactionMode === "region-store" &&
                       (!hasLocalStoreResults || searchResults.length === 0) &&
                       !message.vendors && // 중요: 동일한 메시지에 판매자 정보가 없는 경우에만 지도 표시
                       (message.content?.includes("지도에서 원하는 지역을 선택하시면") || 
                        message.content?.includes("지역 상점 구매를 선택하셨습니다") ||
                        message.content?.includes("원하시는 지역을 먼저 선택해주세요") ||
                        message.content?.includes("지도에서 위치를 선택하거나")) && (
                          <div className="mt-4 bg-background rounded-md border mb-4">
                            <div className="p-4 space-y-4">
                              <Card className="w-full">
                                <CardContent className="p-3">
                                  <div id="region-store-map-container" className="rounded-md overflow-hidden w-full">
                                    <GoogleMapWrapper 
                                      height="320px"
                                      width="100%"
                                      showSearchBar={true}
                                      showRadiusControl={true}
                                      showLocationInfo={true}
                                      onLocationSelect={(location: { lat: number; lng: number; address: string; radius?: number }) => {
                                        setSelectedLocation({
                                          lat: location.lat,
                                          lng: location.lng,
                                          address: location.address,
                                          radius: location.radius || 5
                                        });
                                        setRegion(location.address);
                                      }}
                                    />
                                  </div>
                                
                                  {/* 지역 상점 상품 불러오기 버튼 */}
                                  <Button 
                                    onClick={async () => {
                                      if (!selectedLocation) {
                                        toast({
                                          title: "지역 선택 필요",
                                          description: "지도에서 지역을 선택해주세요.",
                                          variant: "destructive"
                                        });
                                        return;
                                      }
                                      
                                      setIsSearching(true);
                                      try {
                                        // 지역 내 상점 제품 API 호출 (임시 URL)
                                        const response = await fetch(`/api/map/nearby-vendors?lat=${selectedLocation.lat}&lng=${selectedLocation.lng}&radius=${selectedLocation.radius}`);
                                        
                                        if (!response.ok) {
                                          throw new Error('지역 상점 검색 실패');
                                        }
                                        
                                        const data = await response.json();
                                        
                                        // 지역 상점 정보 추가
                                        const assistantMessage: ChatMessage = {
                                          role: "assistant",
                                          content: `선택하신 지역: ${selectedLocation.address} 부근의 등록된 상품을 확인하세요. 온라인 상점 표시 가능으로 설정된 상품만 표시됩니다.`,
                                          timestamp: new Date(),
                                          locationInfo: selectedLocation, // 위치 정보 추가
                                          vendors: data.vendors || [] // 판매자 정보 추가
                                        };
                                        
                                        // 상태 업데이트
                                        setMessages(prev => [...prev, assistantMessage]);
                                        setSearchResults(data.vendors || []); // 검색 결과를 같은 상태로 저장 (조회용)
                                        
                                        // 처리 로그
                                        console.log("지역 상점 검색 결과:", data);
                                        console.log("서버에서 받은 판매자 정보:", data.vendors);
                                        if (data.vendors && data.vendors.length > 0) {
                                          console.log("첫 번째 판매자 정보:", data.vendors[0]);
                                          if (data.vendors[0].products) {
                                            console.log("첫 번째 판매자의 제품 수:", data.vendors[0].products.length);
                                            console.log("첫 번째 판매자의 제품 목록:", data.vendors[0].products);
                                          }
                                        }
                                        
                                        // 이 메시지를 대화에 저장
                                        if (conversationId) {
                                          try {
                                            // 현재 대화 가져오기
                                            const convResponse = await fetch(`/api/conversations/${conversationId}`);
                                            if (!convResponse.ok) {
                                              throw new Error('대화 정보를 가져오는데 실패했습니다.');
                                            }
                                            
                                            const convData = await convResponse.json();
                                            let currentMessages = Array.isArray(convData.messages) ?
                                              convData.messages :
                                              (typeof convData.messages === 'string' ? JSON.parse(convData.messages) : []);
                                            
                                            // 현재 메시지를 추가
                                            currentMessages.push({
                                              role: "assistant" as "assistant", // 여기서 두 역할 때문에 타입 지정이 필요
                                              content: assistantMessage.content,
                                              timestamp: assistantMessage.timestamp,
                                              locationInfo: selectedLocation,
                                              vendors: data.vendors || []
                                            });
                                            
                                            // 대화 업데이트
                                            const updateResponse = await fetch(`/api/conversations/${conversationId}`, {
                                              method: 'PATCH',
                                              headers: {
                                                'Content-Type': 'application/json',
                                              },
                                              body: JSON.stringify({ messages: currentMessages })
                                            });
                                            
                                            if (!updateResponse.ok) {
                                              console.error('판매자 정보 저장 실패:', updateResponse.status);
                                            } else {
                                              console.log('판매자 정보가 대화에 저장되었습니다.', data.vendors ? data.vendors.length : 0);
                                            }
                                          } catch (error) {
                                            console.error('판매자 정보 저장 중 오류:', error);
                                          }
                                        }
                                        
                                      } catch (error) {
                                        console.error('Error finding local stores:', error);
                                        toast({
                                          title: "검색 오류",
                                          description: "지역 상점 검색 중 오류가 발생했습니다.",
                                          variant: "destructive",
                                        });
                                      } finally {
                                        setIsSearching(false);
                                      }
                                    }}
                                    disabled={isSearching || !selectedLocation}
                                    className="w-full mt-4"
                                  >
                                    {isSearching ? (
                                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 지역 상점 검색 중...</>
                                    ) : (
                                      <><Store className="h-4 w-4 mr-2" /> 이 지역 상점 상품 조회하기</>
                                    )}
                                  </Button>
                                </CardContent>
                              </Card>
                            </div>
                          </div>
                      )}
                      
                      {/* 구글 지도 - 위치 선택 모드일 때 표시 */}
                      {message.role === "assistant" && 
                       (interactionMode === "location-selection" || interactionMode === "bid-requested") && 
                       (message.content?.includes("위치를 선택하거나 검색해서 찾으세요") || 
                        message.content?.includes("지역을 선택해주세요")) && (
                          <div className="mt-4 bg-background rounded-md border mb-4">
                            <div className="p-4 space-y-4">
                              {/* 선택된 식물 정보 */}
                              <div className="text-center p-2 bg-accent/20 rounded-md">
                                <p className="text-sm font-medium">선택된 식물: {selectedPlant}</p>
                              </div>
                              
                              <Card className="w-full">
                                <CardContent className="p-3">
                                  <div id="location-map-container" className="rounded-md overflow-hidden w-full">
                                    <GoogleMapWrapper 
                                      height="320px"
                                      width="100%"
                                      showSearchBar={interactionMode !== "bid-requested"}
                                      showRadiusControl={interactionMode !== "bid-requested"}
                                      showLocationInfo={true}
                                      initialLocation={selectedLocation}
                                      onLocationSelect={async (location: { lat: number; lng: number; address: string; radius?: number }) => {
                                        // 로컬 상태 업데이트
                                        const locationInfo = {
                                          lat: location.lat,
                                          lng: location.lng,
                                          address: location.address,
                                          radius: location.radius || 5
                                        };
                                        
                                        setSelectedLocation(locationInfo);
                                        setRegion(location.address);
                                        
                                        // 대화 메시지에 위치 정보 저장
                                        if (conversationId) {
                                          try {
                                            // 현재 대화 가져오기
                                            const convResponse = await fetch(`/api/conversations/${conversationId}`);
                                            if (!convResponse.ok) {
                                              throw new Error('대화 정보를 가져오는데 실패했습니다.');
                                            }
                                            
                                            const convData = await convResponse.json();
                                            let currentMessages = Array.isArray(convData.messages) ?
                                              convData.messages :
                                              (typeof convData.messages === 'string' ? JSON.parse(convData.messages) : []);
                                            
                                            // 지역 선택 메시지 찾기
                                            const regionMessageIndex = currentMessages.findIndex((msg: any) => 
                                              msg.role === 'assistant' && 
                                              msg.content && 
                                              msg.content.includes('지역을 선택하시면 해당 지역의 상점에서 판매중인 식물')
                                            );
                                            
                                            if (regionMessageIndex !== -1) {
                                              // 메시지에 위치 정보 추가
                                              currentMessages[regionMessageIndex] = {
                                                ...currentMessages[regionMessageIndex],
                                                locationInfo: locationInfo
                                              };
                                              
                                              // 대화 업데이트
                                              const updateResponse = await fetch(`/api/conversations/${conversationId}`, {
                                                method: 'PATCH',
                                                headers: {
                                                  'Content-Type': 'application/json',
                                                },
                                                body: JSON.stringify({ messages: currentMessages })
                                              });
                                              
                                              if (!updateResponse.ok) {
                                                console.error('위치 정보 저장 실패:', updateResponse.status);
                                              } else {
                                                console.log('위치 정보가 대화에 저장되었습니다.', locationInfo);
                                              }
                                            }
                                          } catch (error) {
                                            console.error('위치 정보 저장 중 오류:', error);
                                          }
                                        }
                                      }}
                                    />
                                  </div>
                                
                                {/* 입찰 요청 버튼 - 요청 완료 후(bid-requested 모드)에는 표시하지 않음 */}
                                {interactionMode !== "bid-requested" && (
                                  <Button 
                                    onClick={handleShowRequestForm}
                                    disabled={!selectedPlant || !region.trim()}
                                    className="w-full mt-4"
                                  >
                                    <MapPin className="h-4 w-4 mr-2" /> 입찰 요청하기
                                  </Button>
                                )}
                              </CardContent>
                            </Card>

                          </div>
                        </div>
                      )}
                      
                      {/* 지역 상점 제품 목록 표시 - 지역 선택 후 제품 검색 후 표시 */}
                      {message.role === "assistant" && 
                       interactionMode === "region-store" && 
                       ((message.content?.includes("등록된 상품을 확인하세요")) || message.vendors) && 
                       searchResults && searchResults.length > 0 && (
                        <div className="mt-4 border rounded-md p-3 bg-background">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-medium">지역 상점 제품 목록</h3>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs"
                                onClick={() => {
                                  // 지도 초기화 및 추가 작업
                                  setHasLocalStoreResults(false);
                                  setSelectedLocation(null);
                                  setSearchResults([]);
                                  setIsSelectingRegion(true);
                                  
                                  // 새로운 대화 메시지 추가
                                  const newAssistantMessage: ChatMessage = {
                                    role: "assistant",
                                    content: "아래 지도에서 원하는 지역을 선택하시면 해당 지역의 상점에서 판매중인 식물을 확인하실 수 있습니다.",
                                    timestamp: new Date()
                                  };
                                  
                                  // 최신 대화로 메시지 추가
                                  setMessages(prev => [...prev, newAssistantMessage]);
                                  
                                  // 메시지 끝으로 스크롤
                                  setTimeout(() => {
                                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                                  }, 100);
                                }}
                              >
                                <MapPin className="h-3 w-3 mr-1" /> 다른 지역 선택
                              </Button>
                            </div>
                            <div className="bg-accent/20 p-3 rounded-md mb-4">
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-medium">{selectedLocation?.address || "지역 정보 없음"}</p>
                                  <p className="text-xs text-muted-foreground">반경 {selectedLocation?.radius || 3}km 이내의 등록된 상품을 보여드립니다.</p>
                                  <div className="mt-1 flex items-center">
                                    <Store className="h-3 w-3 text-primary mr-1" />
                                    <span className="text-xs">{searchResults.length}개의 상점 / {searchResults.reduce((total, vendor) => total + (vendor.products?.length || 0), 0)}개의 상품</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* 전체 상품 목록을 크게 표시하는 가로 맞춤형 그리드 */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {/* 모든 판매자의 제품을 하나의 배열로 수집 */}
                              {searchResults.flatMap((vendor: any) => 
                                vendor.products && vendor.products.length > 0 
                                  ? vendor.products.map((product: any) => ({
                                      ...product,
                                      vendorName: vendor.name,
                                      storeName: vendor.storeName || (vendor.name ? `${vendor.name} 상점` : null),
                                      vendorId: vendor.id,
                                      vendorDistance: vendor.distance,
                                      vendorColor: vendor.color?.bg || '#6E56CF20'
                                    }))
                                  : []
                              )
                              // 필터링이 제거되었으므로 비어있지 않은 제품만 표시
                              .filter((product: any) => product)
                              .map((product: any, index: number) => (
                                <div 
                                  key={index} 
                                  className="flex flex-col border rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                                  onClick={() => {
                                    // 제품 상세 정보 모달 표시
                                    setSelectedProduct({
                                      id: product.id,
                                      name: product.name,
                                      price: Number(product.price),
                                      description: product.description,
                                      imageUrl: product.imageUrl,
                                      vendorName: product.vendorName,
                                      storeName: product.storeName,
                                      vendorId: product.vendorId
                                    });
                                    setProductDetailOpen(true);
                                  }}
                                >
                                  {/* 상품 이미지 (크게 표시) */}
                                  <div 
                                    className="w-full aspect-square bg-center bg-cover border-b"
                                    style={{ backgroundImage: `url(${product.imageUrl || '/assets/plants/default-plant.png'})` }}
                                  />
                                  
                                  {/* 상품 정보 */}
                                  <div className="p-3 flex-1 flex flex-col">
                                    <div className="flex items-center justify-between mb-1">
                                      <h4 className="font-medium">{product.name}</h4>
                                      <Badge variant="outline" className="text-xs">
                                        {product.vendorDistance ? `${product.vendorDistance.toFixed(1)}km` : ''}
                                      </Badge>
                                    </div>
                                    <p className="text-sm font-bold">₩{Number(product.price).toLocaleString()}</p>
                                    <p className="text-xs text-muted-foreground mt-1 truncate">{product.storeName || `상점 ${product.vendorId}`}</p>
                                    
                                    <div className="mt-auto pt-2">
                                      <Button 
                                        size="sm"
                                        className="w-full"
                                        variant="outline"
                                      >
                                        <Search className="h-3 w-3 mr-1" /> 제품 확인하기
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* 아래쪽 추천 식물 섹션은 삭제함 - 위쪽에 이미 표시되고 있음 */}
                    </CardContent>
                  </Card>
                  
                  {/* 타임스탬프 */}
                  <div
                    className={cn(
                      "text-xs text-muted-foreground",
                      message.role === "user" ? "text-right" : "text-left"
                    )}
                  >
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* 이제 지도는 채팅 메시지 내에서 직접 렌더링됩니다 */}
          
          {/* 메시지 로딩 표시 */}
          {isProcessing && !isSelectingRegion && (
            <div className="flex justify-start mb-4">
              <div className="bg-muted p-3 rounded-lg flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>응답 생성 중...</span>
              </div>
            </div>
          )}
          
          {/* 자동 스크롤을 위한 참조 */}
          <div ref={messagesEndRef} />
        </div>
        
        {/* 메시지 입력 영역 */}
        <div className="flex flex-col gap-2">
          {/* 참고 이미지 업로드 영역 (있는 경우만 표시) */}
          {(selectedImage || uploadedImageUrl) && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
              <div className="flex-1 flex items-center">
                {uploadedImageUrl ? (
                  <div className="relative w-16 h-16 overflow-hidden rounded-md">
                    <img 
                      src={uploadedImageUrl} 
                      alt="참고 이미지" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : selectedImage ? (
                  <div className="flex items-center text-sm">
                    <div className="bg-primary/10 text-primary rounded-full p-1 mr-2">
                      <img 
                        src={URL.createObjectURL(selectedImage)} 
                        alt="미리보기" 
                        className="w-14 h-14 object-cover rounded-md"
                      />
                    </div>
                    <span className="text-muted-foreground">{selectedImage.name}</span>
                  </div>
                ) : null}
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleCancelImage}
                className="text-destructive hover:text-destructive/80"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* AI 연결 끊김 알림 및 재연결 버튼 */}
          {aiConnectionLost && (
            <div className="mb-4 p-3 border border-orange-200 bg-orange-50 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span className="font-medium">AI 연결이 끊어졌습니다</span>
              </div>
              <p className="text-sm mb-3">판매자 메시지가 도착하여 AI와의 연결이 중단되었습니다. 대화를 계속하려면 재연결하세요.</p>
              <Button 
                variant="outline" 
                size="sm"
                className="bg-white hover:bg-orange-100 text-orange-700 border-orange-200"
                onClick={() => {
                  setAiConnectionLost(false);
                  toast({
                    title: "AI 연결 재시도",
                    description: "AI와의 연결을 다시 시도합니다. 메시지를 입력해보세요.",
                  });
                }}
              >
                AI 연결 재시도
              </Button>
            </div>
          )}
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Textarea
                placeholder={aiConnectionLost ? "AI 연결 재시도 후 메시지를 입력하세요..." : "메시지를 입력하세요..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="resize-none"
                disabled={isProcessing}
              />
              
              {/* 이미지 업로드 버튼 */}
              <label 
                htmlFor="image-upload" 
                className={`absolute bottom-2 right-2 p-1 rounded-full cursor-pointer ${
                  isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'
                }`}
              >
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  disabled={isProcessing}
                  className="hidden"
                />
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                  <circle cx="9" cy="9" r="2"/>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                </svg>
              </label>
            </div>
            
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isProcessing}
              className="flex-shrink-0"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 식물 정보 모달 */}
      <Dialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
        <DialogContent className="max-w-3xl w-[90vw] max-h-[80vh] h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex-1">{currentPlantInfo?.name}</DialogTitle>
            <DialogDescription className="sr-only">
              구글에서 "{currentPlantInfo?.name}" 식물 정보 보기
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col h-full overflow-auto">
            {currentPlantInfo && (
              <div className="space-y-4 p-3">
                <div className="text-lg font-medium">이미지 갤러리</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {/* 구글 이미지 직접 표시 - 5개의 샘플 이미지 */}
                  <img 
                    src={`https://source.unsplash.com/300x300/?${encodeURIComponent(currentPlantInfo.name)}&sig=1`}
                    className="w-full h-40 object-cover rounded-md shadow-sm hover:shadow-md transition-all"
                    alt={`${currentPlantInfo.name} 이미지 1`}
                    loading="lazy"
                  />
                  <img 
                    src={`https://source.unsplash.com/300x300/?${encodeURIComponent(currentPlantInfo.name)}&sig=2`}
                    className="w-full h-40 object-cover rounded-md shadow-sm hover:shadow-md transition-all"
                    alt={`${currentPlantInfo.name} 이미지 2`}
                    loading="lazy"
                  />
                  <img 
                    src={`https://source.unsplash.com/300x300/?${encodeURIComponent(currentPlantInfo.name)}&sig=3`}
                    className="w-full h-40 object-cover rounded-md shadow-sm hover:shadow-md transition-all"
                    alt={`${currentPlantInfo.name} 이미지 3`}
                    loading="lazy"
                  />
                  <img 
                    src={`https://source.unsplash.com/300x300/?${encodeURIComponent(currentPlantInfo.name)}&sig=4`}
                    className="w-full h-40 object-cover rounded-md shadow-sm hover:shadow-md transition-all"
                    alt={`${currentPlantInfo.name} 이미지 4`}
                    loading="lazy"
                  />
                  <img 
                    src={`https://source.unsplash.com/300x300/?${encodeURIComponent(currentPlantInfo.name)}&sig=5`}
                    className="w-full h-40 object-cover rounded-md shadow-sm hover:shadow-md transition-all"
                    alt={`${currentPlantInfo.name} 이미지 5`}
                    loading="lazy"
                  />
                </div>
                
                {/* 식물 정보 표시 */}
                <div className="mt-4">
                  <div className="text-lg font-medium">식물 정보</div>
                  <div className="mt-2 p-4 bg-muted rounded-md">
                    <div className="space-y-2">
                      <p className="text-sm">{currentPlantInfo.description}</p>
                      <div className="pt-2 border-t">
                        <p className="text-sm font-medium">키우는 방법</p>
                        <p className="text-sm">{currentPlantInfo.careInstructions}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {currentPlantInfo?.priceRange}
            </div>
            <Button
              onClick={() => {
                if (currentPlantInfo) {
                  window.open(`https://www.google.com/search?q=${encodeURIComponent(currentPlantInfo.name)}`, '_blank');
                }
              }}
              size="sm"
              variant="outline"
              className="flex items-center gap-1"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              새 창에서 열기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 제품 상세 정보 모달 */}
      <Dialog open={productDetailOpen} onOpenChange={setProductDetailOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>제품 상세 정보</DialogTitle>
            <DialogDescription>
              선택한 제품의 상세 정보입니다.
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4 mt-2">
              {/* 제품 이미지 */}
              <div className="w-full aspect-video bg-center bg-cover rounded-md mx-auto overflow-hidden border">
                <img 
                  src={selectedProduct.imageUrl || '/assets/plants/default-plant.png'}
                  alt={selectedProduct.name}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* 제품 정보 */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold">{selectedProduct.name}</h3>
                  <Badge variant="outline">
                    {selectedProduct.storeName || (selectedProduct.vendorName ? `${selectedProduct.vendorName} 상점` : `상점 ${selectedProduct.vendorId}`)}
                  </Badge>
                </div>

                <p className="text-2xl font-bold">₩{selectedProduct.price.toLocaleString()}</p>
                
                <div className="pt-2 border-t">
                  <h4 className="text-sm font-medium mb-1">제품 설명</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {selectedProduct.description || '제품 설명이 없습니다.'}
                  </p>
                </div>
              </div>
              
              {/* 구매하기 버튼 */}
              <div className="pt-4">
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => {
                    // 제품 구매 로직
                    const productInfo: ProductInfo = {
                      id: selectedProduct.id,
                      name: selectedProduct.name,
                      price: selectedProduct.price,
                      description: selectedProduct.description,
                      imageUrl: selectedProduct.imageUrl,
                      vendorName: selectedProduct.vendorName,
                      storeName: selectedProduct.storeName,
                      vendorId: selectedProduct.vendorId
                    };
                    
                    setSelectedBid({
                      role: "vendor" as "vendor",
                      content: `온라인 상점에서 직접 구매: ${selectedProduct.name}`,
                      timestamp: new Date(),
                      vendorId: selectedProduct.vendorId,
                      vendorName: selectedProduct.vendorName,
                      storeName: selectedProduct.storeName,
                      productInfo: productInfo,
                      price: selectedProduct.price // 가격 추가
                    });
                    
                    // 상세 모달 닫고 구매 창 열기
                    setProductDetailOpen(false);
                    setPurchaseDialogOpen(true);
                  }}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" /> 구매하기
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 구매 정보 입력 대화상자 */}
      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>구매 정보 입력</DialogTitle>
            <DialogDescription>
              상품을 구매하기 위한 정보를 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          
          {/* 선택한 상품 정보 */}
          {selectedBid && (
            <div className="mb-4 p-3 border rounded-md bg-muted/50">
              <div className="flex gap-3 items-center">
                {/* 상품 이미지 */}
                <div className="w-16 h-16 bg-background rounded-md overflow-hidden flex-shrink-0">
                  {selectedBid.imageUrl || (selectedBid.product?.imageUrl || selectedBid.productInfo?.imageUrl) ? (
                    <img 
                      src={selectedBid.imageUrl || (selectedBid.product?.imageUrl || selectedBid.productInfo?.imageUrl)}
                      alt="상품 이미지"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Leaf className="h-8 w-8 text-primary/30" />
                    </div>
                  )}
                </div>
                
                {/* 상품 정보 */}
                <div className="flex-1">
                  <h4 className="font-medium">
                    {(selectedBid.product?.name || selectedBid.productInfo?.name) || '상품명 없음'}
                  </h4>
                  <div className="text-sm text-muted-foreground mb-1">
                    {selectedBid.storeName || (selectedBid.vendorName ? `${selectedBid.vendorName} 상점` : `판매자 ${selectedBid.vendorId} 상점`)}
                  </div>
                  <div className="text-sm font-medium text-primary">
                    {typeof selectedBid.price === 'number' ? 
                      `₩${selectedBid.price.toLocaleString()}` : 
                      (selectedBid.price ? `₩${Number(selectedBid.price).toLocaleString()}` : '가격 정보 없음')}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 구매자 정보 입력 */}
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">구매자 정보</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="buyer-name" className="text-sm">이름</label>
                  <Input 
                    id="buyer-name" 
                    value={buyerInfo.name}
                    onChange={(e) => setBuyerInfo({...buyerInfo, name: e.target.value})}
                    placeholder="이름을 입력하세요"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="buyer-phone" className="text-sm">연락처</label>
                  <Input 
                    id="buyer-phone" 
                    value={buyerInfo.phone}
                    onChange={(e) => setBuyerInfo({...buyerInfo, phone: e.target.value})}
                    placeholder="연락처를 입력하세요"
                  />
                </div>
              </div>
              
              <div className="mt-3 space-y-1">
                <div className="flex justify-between">
                  <label htmlFor="buyer-address" className="text-sm">주소</label>
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline" 
                    className="text-xs px-2 h-6"
                    onClick={() => searchAddress(false)}
                  >
                    <Search className="mr-1 h-3 w-3" />
                    주소 검색
                  </Button>
                </div>
                <Input 
                  id="buyer-address" 
                  value={buyerInfo.address}
                  onChange={(e) => setBuyerInfo({...buyerInfo, address: e.target.value})}
                  placeholder="주소를 검색하세요"
                  readOnly
                />
              </div>
              
              <div className="mt-2 space-y-1">
                <label htmlFor="buyer-address-detail" className="text-sm">상세주소</label>
                <Input 
                  id="buyer-address-detail" 
                  value={buyerInfo.addressDetail}
                  onChange={(e) => setBuyerInfo({...buyerInfo, addressDetail: e.target.value})}
                  placeholder="동/호수 등 상세주소를 입력하세요"
                />
              </div>
            </div>
            
            {/* 수령인 정보 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">수령인 정보</h3>
                <div className="flex items-center space-x-2">
                  <label 
                    htmlFor="same-as-buyer" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    구매자와 동일
                  </label>
                  <input
                    type="checkbox"
                    id="same-as-buyer"
                    className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                    checked={recipientInfo.isSameAsBuyer}
                    onChange={(e) => handleSameAsBuyer(e.target.checked)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="recipient-name" className="text-sm">이름</label>
                  <Input 
                    id="recipient-name" 
                    value={recipientInfo.name}
                    onChange={(e) => setRecipientInfo({...recipientInfo, name: e.target.value})}
                    placeholder="수령인 이름을 입력하세요"
                    disabled={recipientInfo.isSameAsBuyer}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="recipient-phone" className="text-sm">연락처</label>
                  <Input 
                    id="recipient-phone" 
                    value={recipientInfo.phone}
                    onChange={(e) => setRecipientInfo({...recipientInfo, phone: e.target.value})}
                    placeholder="수령인 연락처를 입력하세요"
                    disabled={recipientInfo.isSameAsBuyer}
                  />
                </div>
              </div>
              
              <div className="mt-3 space-y-1">
                <div className="flex justify-between">
                  <label htmlFor="recipient-address" className="text-sm">주소</label>
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline" 
                    className="text-xs px-2 h-6"
                    onClick={() => searchAddress(true)}
                    disabled={recipientInfo.isSameAsBuyer}
                  >
                    <Search className="mr-1 h-3 w-3" />
                    주소 검색
                  </Button>
                </div>
                <Input 
                  id="recipient-address" 
                  value={recipientInfo.address}
                  onChange={(e) => setRecipientInfo({...recipientInfo, address: e.target.value})}
                  placeholder="주소를 검색하세요"
                  readOnly
                  disabled={recipientInfo.isSameAsBuyer}
                />
              </div>
              
              <div className="mt-2 space-y-1">
                <label htmlFor="recipient-address-detail" className="text-sm">상세주소</label>
                <Input 
                  id="recipient-address-detail" 
                  value={recipientInfo.addressDetail}
                  onChange={(e) => setRecipientInfo({...recipientInfo, addressDetail: e.target.value})}
                  placeholder="동/호수 등 상세주소를 입력하세요"
                  disabled={recipientInfo.isSameAsBuyer}
                />
              </div>
            </div>
          </div>
          
          {/* 결제 처리 버튼 */}
          <DialogFooter>
            <div className="w-full space-y-2">
              {paymentResult ? (
                <div className={`p-3 rounded border ${paymentResult.success ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'} text-center`}>
                  <div className={`font-medium ${paymentResult.success ? 'text-green-700' : 'text-red-700'} mb-1`}>
                    {paymentResult.success ? '결제 완료' : '결제 실패'}
                  </div>
                  <p className="text-sm">{paymentResult.message}</p>
                  {paymentResult.success && paymentResult.orderId && (
                    <div className="mt-2 text-sm">
                      주문번호: {paymentResult.orderId}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full">
                  {/* SDK V2 방식의 결제 버튼 - z-index 제약 문제 수정 */}
                  <button 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 rounded-md px-8 py-3 flex items-center justify-center text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                    onClick={handlePayment}
                    disabled={isPaymentProcessing}
                    style={{ position: 'relative', zIndex: 9999 }}
                  >
                    {isPaymentProcessing ? (
                      <>
                        <span className="mr-2 animate-spin">⌛</span>
                        결제 처리 중...
                      </>
                    ) : (
                      <>
                        <span className="mr-2">💳</span>
                        결제하기
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 요청사항 입력 폼 모달 */}
      <Dialog open={showRequestForm} onOpenChange={setShowRequestForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>입찰 요청사항</DialogTitle>
            <p className="text-sm text-muted-foreground">
              판매자에게 전달할 요청사항을 입력해주세요.
            </p>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 일반 요청사항 */}
            <div className="space-y-2">
              <Label htmlFor="user-requests">요청사항</Label>
              <Textarea
                id="user-requests"
                value={userRequests}
                onChange={(e) => setUserRequests(e.target.value)}
                placeholder="특별한 요청사항이 있으시면 입력해주세요 (예: 포장 방법, 배송 시 주의사항 등)"
                rows={3}
              />
            </div>

            {/* 리본 요청 */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="ribbon-request"
                  checked={ribbonRequest}
                  onChange={(e) => setRibbonRequest(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="ribbon-request">리본 포장 요청</Label>
              </div>
              
              {ribbonRequest && (
                <div className="ml-6">
                  <Label htmlFor="ribbon-message">리본 메시지</Label>
                  <Input
                    id="ribbon-message"
                    value={ribbonMessage}
                    onChange={(e) => setRibbonMessage(e.target.value)}
                    placeholder="리본에 적을 메시지를 입력해주세요"
                    className="mt-1"
                  />
                </div>
              )}
            </div>

            {/* 희망 배송시간 */}
            <div className="space-y-2">
              <Label htmlFor="delivery-time">희망 배송시간</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">날짜</Label>
                  <Input
                    type="date"
                    value={deliveryTime.split(' ')[0] || ''}
                    onChange={(e) => {
                      const time = deliveryTime.split(' ')[1] || '09:00';
                      setDeliveryTime(e.target.value ? `${e.target.value} ${time}` : '');
                    }}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">시간</Label>
                  <Select 
                    value={deliveryTime.split(' ')[1] || ''} 
                    onValueChange={(time) => {
                      const date = deliveryTime.split(' ')[0] || '';
                      setDeliveryTime(date ? `${date} ${time}` : `${new Date().toISOString().split('T')[0]} ${time}`);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="시간 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {hour}:00
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {deliveryTime && (
                <p className="text-xs text-muted-foreground">
                  선택된 시간: {deliveryTime ? new Date(`${deliveryTime}:00`).toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  }) : ''}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRequestForm(false)}
            >
              취소
            </Button>
            <Button
              onClick={handleRequestBids}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  요청 중...
                </>
              ) : (
                "입찰 요청하기"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}