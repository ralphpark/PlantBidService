import { useState, useEffect, useRef, useMemo } from "react";
import { Redirect, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  Store, Bell, Settings, ShoppingBag, Package, MapPin, 
  ChevronRight, MessageSquare, Filter, Search, PlusCircle,
  Edit, Trash, MessageCircle, CheckCircle, Clock, LogOut,
  Upload, ImagePlus, Truck, AlertCircle, Send, User, Phone,
  Loader2, Globe2, MapPinOff, X, CreditCard
} from "lucide-react";
import LocationSettings from "@/components/location/location-settings";
import ProductDialog from "@/components/product/product-dialog";

// 주문 채팅 대화창 컴포넌트
function OrderChat({ order, onClose }: { order: any, onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // 대화 내용 가져오기
  useEffect(() => {
    const fetchConversation = async () => {
      if (!order.conversationId) return;
      
      try {
        const response = await fetch(`/api/conversations/${order.conversationId}`);
        if (!response.ok) throw new Error("대화를 불러오는데 실패했습니다");
        
        const data = await response.json();
        if (data.messages && Array.isArray(data.messages)) {
          setChatMessages(data.messages);
        }
      } catch (error) {
        console.error("대화 로드 오류:", error);
        toast({
          title: "대화 로드 실패",
          description: "대화 내용을 불러오는데 실패했습니다.",
          variant: "destructive"
        });
      }
    };
    
    fetchConversation();
  }, [order.conversationId, toast]);
  
  // 채팅창 스크롤 자동 이동
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);
  
  // 메시지 전송 처리
  const handleSendMessage = async () => {
    if (!message.trim() || loading || !order.conversationId) return;
    
    setLoading(true);
    try {
      // 현재 대화에 메시지 추가
      const newMessage = {
        role: "vendor",
        content: message,
        timestamp: new Date(),
      };
      
      // 기존 메시지 복사 후 새 메시지 추가
      const updatedMessages = [...chatMessages, newMessage];
      
      // 서버에 메시지 전송
      const response = await fetch(`/api/conversations/${order.conversationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: updatedMessages })
      });
      
      if (!response.ok) throw new Error("메시지 전송에 실패했습니다");
      
      // 상태 업데이트
      setChatMessages(updatedMessages);
      setMessage("");
      
      toast({
        title: "메시지가 전송되었습니다",
        description: "고객은 AI 챗봇 창에서 메시지를 확인할 수 있습니다."
      });
    } catch (error) {
      console.error("메시지 전송 오류:", error);
      toast({
        title: "메시지 전송 실패",
        description: "메시지를 전송하는데 실패했습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <MessageCircle className="mr-2 h-5 w-5" />
              고객 채팅
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                주문번호: {order.orderId}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            고객과의 채팅 내역입니다. 여기서 추가 메시지를 전송할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto p-4 border rounded-md mb-4">
          <ScrollArea className="h-full w-full pr-4">
            <div className="space-y-4">
              {chatMessages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.role === 'vendor' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] p-3 rounded-lg ${
                      msg.role === 'vendor' 
                        ? 'bg-primary text-primary-foreground' 
                        : msg.role === 'assistant'
                          ? 'bg-muted'
                          : 'bg-muted-foreground/10'
                    }`}
                  >
                    <div className="text-xs text-muted-foreground mb-1">
                      {msg.role === 'vendor' 
                        ? '판매자' 
                        : msg.role === 'assistant' 
                          ? 'AI 어시스턴트' 
                          : '고객'}
                    </div>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    <div className="text-xs text-muted-foreground mt-1 text-right">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>
        </div>
        
        <div className="flex items-center space-x-2">
          <Input
            placeholder="메시지를 입력하세요..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            disabled={loading}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!message.trim() || loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 주문 상태 타입
export type OrderStatus = 'pending' | 'reviewing' | 'preparing' | 'bidded' | 'accepted' | 'shipped' | 'completed' | 'rejected' | 'paid';

// 채팅 메시지 인터페이스
interface ChatMessage {
  role: 'user' | 'assistant' | 'vendor';
  content: string;
  timestamp: Date;
  recommendations?: any[];
  imageUrl?: string; // 참고 이미지 URL
  
  // 판매자 입찰 정보 (판매자 메시지인 경우)
  productInfo?: {
    name: string;
    description?: string;
    imageUrl?: string;
    price?: number | string;
  };
  // 다중 선택된 제품 정보
  products?: Array<{
    id: string | number;
    name: string;
    description?: string;
    imageUrl?: string;
    price?: number | string;
  }>;
  price?: number | string;
  referenceImages?: string[] | string;
  
  // 판매자 상점 정보
  vendorId?: number;
  vendorName?: string;
  vendorColor?: string;
  storeName?: string;
}

// 주문 인터페이스
interface Order {
  id: string;
  bidId?: number; // 실제 bid ID 참조
  customer: {
    name: string;
    phone: string;
    address: string;
    inputAddress?: string; // 고객이 직접 입력한 주소
    userId?: number; // 고객 ID 추가
    location?: {
      lat?: number;
      lng?: number;
    };
  };
  type: 'ai' | 'direct'; // AI 컨설팅 또는 직접 주문
  status: OrderStatus;
  date: Date;
  orderId?: string; // 포트원 결제 ID
  createdAt?: string; // 주문 생성 시간
  price?: number | string; // 주문 금액
  items?: {
    plantId: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  conversation?: {
    id?: number; // 대화 ID 추가
    messages?: ChatMessage[]; // 전체 대화 내용
    recommendations?: {
      plantId: string;
      name: string;
      imageUrl: string;
      description: string;
    }[];
  };
  notes?: string;
  bidAmount?: number;
  vendorMessage?: string;
  referenceImages?: string[]; // 참고 이미지 URL 배열
  selectedProductId?: number; // 판매자가 선택한 제품 ID
  selectedProducts?: Array<{
    id: string | number;
    name: string;
    price: number | string;
    quantity: number;
  }>; // 다중 선택된 제품 목록
  buyerInfo?: any; // 구매자 정보 (JSON string 또는 객체)
  plant?: {
    id?: number;
    name?: string;
    imageUrl?: string;
    description?: string;
    priceRange?: string;
  };
}

// 주문 상세 컴포넌트 인터페이스
interface OrderDetailsProps {
  order: Order;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onUpdateBid: (orderId: string, bidData: Partial<BidData>) => void;
  products: Product[];
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  category: string;
}

interface Notification {
  id: string;
  type: 'order' | 'message' | 'system';
  title: string;
  description: string;
  isRead: boolean;
  date: Date;
}

interface BidData {
  id: number;
  userId: number;
  vendorId: number;
  plantId: number;
  price: number;
  status: string;
  createdAt: string;
  additionalServices?: string | null;
  deliveryDate?: string | null;
  conversationId?: number; // 연결된 대화 ID
  selectedProductId?: number; // 선택한 제품 ID
  vendorMessage?: string; // 판매자 메시지
  referenceImages?: string[]; // 참고 이미지 URL 배열
  customerInputAddress?: string; // 고객이 직접 입력한 주소 (데이터베이스에 추가된 필드)
  selectedProducts?: Array<{
    id: string | number;
    name: string;
    price: number | string;
    quantity: number;
  }>; // 다중 선택된 제품 목록
  // 수정된 부분: user 필드 추가 (API 서버에서 추가로 제공되는 필드)
  user?: {
    id?: number;
    name?: string;
    username?: string;
    email?: string;
    phone?: string;
  };
  customer?: {
    id?: number;
    name?: string;
    email?: string;
    phone?: string; // 전화번호 추가
    address?: string; // 자동으로 검색된 주소
    inputAddress?: string; // 고객이 직접 입력한 주소
    location?: {
      lat: number;
      lng: number;
    };
  };
  plant?: {
    id?: number;
    name?: string;
    imageUrl?: string;
    description?: string;
    priceRange?: string;
  };
}

// 상태 배지 컴포넌트
function OrderStatusBadge({ status }: { status: string }) {
  let color = 'bg-muted text-muted-foreground';
  let text = '상태 정보 없음';
  
  switch (status) {
    case 'pending':
      color = 'bg-yellow-100 text-yellow-800';
      text = '대기 중';
      break;
    case 'reviewing':
      color = 'bg-blue-100 text-blue-800';
      text = '검토 중';
      break;
    case 'preparing':
      color = 'bg-orange-100 text-orange-800';
      text = '준비 중';
      break;
    case 'bidded':
      color = 'bg-purple-100 text-purple-800';
      text = '입찰됨';
      break;
    case 'accepted':
      color = 'bg-green-100 text-green-800';
      text = '승인됨';
      break;
    case 'shipped':
      color = 'bg-blue-100 text-blue-800';
      text = '배송 중';
      break;
    case 'completed':
      color = 'bg-green-100 text-green-800';
      text = '완료됨';
      break;
    case 'rejected':
      color = 'bg-red-100 text-red-800';
      text = '거부됨';
      break;
  }
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      {text}
    </span>
  );
}

// OrderDetails 컴포넌트
function OrderDetails({ order, onUpdateStatus, onUpdateBid, products }: OrderDetailsProps) {
  console.log("OrderDetails 렌더링:", order.id, "상태:", order.status, "금액:", order.bidAmount);
  
  // useState에서 상태 초기화할 때 order 객체를 직접 참조하지 않고 
  // 함수 형태로 최신 props를 사용하도록 수정
  const [bidAmount, setBidAmount] = useState<string>(() => order.bidAmount?.toString() || '');
  const [vendorMessage, setVendorMessage] = useState<string>(() => order.vendorMessage || '');
  const [selectedProductId, setSelectedProductId] = useState<string>(() => order.selectedProductId?.toString() || '');
  const [messageText, setMessageText] = useState<string>('');
  const [showChatHistory, setShowChatHistory] = useState<boolean>(true);
  const [referenceImages, setReferenceImages] = useState<string[]>(() => order.referenceImages || []);
  const [imageUploadOpen, setImageUploadOpen] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const { toast } = useToast();
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // order prop이 변경될 때마다 상태 업데이트
  useEffect(() => {
    console.log("입찰 정보 업데이트:", order.id, "금액:", order.bidAmount, "메시지:", order.vendorMessage);
    setBidAmount(order.bidAmount?.toString() || '');
    setVendorMessage(order.vendorMessage || '');
    setSelectedProductId(order.selectedProductId?.toString() || '');
    setReferenceImages(order.referenceImages || []);
  }, [order.id, order.bidAmount, order.vendorMessage, order.selectedProductId, order.referenceImages]);
  
  // 스크롤을 채팅의 맨 아래로 이동
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [order.conversation?.messages]);
  
  // 위치 정보로 주소 가져오기
  const [customerAddress, setCustomerAddress] = useState<string>(() => 
    order.customer?.address || ''
  );
  const [isLoadingAddress, setIsLoadingAddress] = useState<boolean>(false);
  
  // 고객 위치 정보를 사용하여 주소 조회
  useEffect(() => {
    // 고객 정보가 없는 경우 처리
    if (!order.customer) {
      console.log('고객 정보가 없습니다:', order.id);
      return;
    }
    
    console.log('주소 검색 useEffect 실행:', order.id, '위치 정보:', order.customer?.location);
    
    // 테스트를 위해 임시로 업데이트
    if (!order.customer.location) {
      console.log('테스트를 위해 임시 위치 정보 추가');
      order.customer.location = {
        lat: 37.5665, // 서울의 위도
        lng: 126.9780  // 서울의 경도
      };
    }
    
    // 고객 정보가 없는 경우 처리
    if (!order.customer) {
      console.log('고객 정보가 없습니다:', order.id);
      return;
    }
    
    // 고객이 직접 입력한 주소가 있으면 확인
    if (order.customer?.inputAddress) {
      console.log('고객이 직접 입력한 주소 발견:', order.customer.inputAddress);
      // 직접 입력한 주소가 있어도 좌표 기반 주소는 참조용으로 조회
    }
    
    // 이미 주소가 있는데 '정보 없음'가 아닌 경우 건너뜀
    // 정보 없음인 경우에는 좌표로 주소를 가져오도록 처리
    // 정보없음 또는 정보 없음의 두 가지 가능한 형태를 모두 검색하도록 함
    const isNoInfoAddress = !order.customer?.address || 
                           order.customer.address === '정보없음' || 
                           order.customer.address === '정보 없음';
    
    console.log('주소 검색 조건 체크:', 
      '주소 값:', order.customer?.address, 
      '고객 입력 주소:', order.customer?.inputAddress,
      '정보없음 여부:', isNoInfoAddress,
      '좌표 있는가:', !!order.customer?.location?.lat && !!order.customer?.location?.lng
    );
    
    // 좌표가 있으면 항상 좌표 기반 주소 검색 수행 (UI에서 구분해서 표시)
    if (order.customer?.location?.lat && order.customer?.location?.lng) {
      // 좌표 있음 - 주소 검색 진행
      console.log('좌표 기반 주소 검색 진행 - 좌표:', order.customer.location);
    } else {
      console.log('주소 검색 스킵 - 좌표 없음');
      return;
    }
    
    const fetchAddressByCoords = async () => {
      try {
        if (!order.customer || !order.customer.location) {
          console.log('고객 위치 정보가 없어 주소 검색을 건너뜁니다.');
          return;
        }
        
        setIsLoadingAddress(true);
        const { lat, lng } = order.customer.location;
        
        // Google Maps API를 통해 좌표로 주소 검색
        console.log(`지도 API 호출 - 좌표: ${lat}, ${lng}`);
        const response = await fetch(`/api/map/address-by-coords?lat=${lat}&lng=${lng}`);
        
        if (!response.ok) {
          console.error('주소 검색 API 응답 오류:', response.status, response.statusText);
          throw new Error('주소 조회에 실패했습니다');
        }
        
        const data = await response.json();
        console.log('주소 검색 응답 데이터:', data);
        
        if (data.success && data.results && data.results.length > 0) {
          // 첫 번째 결과의 주소 사용
          const address = data.results[0].formatted_address;
          setCustomerAddress(address);
          
          // 고객 정보가 있는지 다시 확인 후 업데이트
          if (order.customer) {
            // order 객체 자체도 업데이트 (UI 반영)
            order.customer.address = address;
          }
        }
      } catch (error) {
        console.error('주소 검색 오류:', error);
      } finally {
        setIsLoadingAddress(false);
      }
    };
    
    fetchAddressByCoords();
  }, [order.id, order.customer?.location?.lat, order.customer?.location?.lng]);
  
  
  // 연관된 상품 가져오기
  const getRelatedProducts = () => {
    if (!products || products.length === 0) return [];
    
    // 현재 모든 제품을 그대로 반환 (여러 제품 선택 가능하도록)
    return products;
  };
  
  // 메시지 전송 처리
  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    
    // 대화 ID 확인
    if (!order.conversation?.id) {
      toast({
        title: "대화 ID가 없습니다",
        description: "이 주문에 연결된 대화가 없습니다.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // 1. 대화 내용 가져오기
      const convResponse = await fetch(`/api/conversations/${order.conversation.id}`);
      if (!convResponse.ok) {
        throw new Error("대화 정보를 가져오는데 실패했습니다");
      }
      
      const convData = await convResponse.json();
      let messages = Array.isArray(convData.messages) 
        ? convData.messages 
        : (typeof convData.messages === 'string' 
          ? JSON.parse(convData.messages) 
          : []);
      
      // 2. 새 판매자 메시지 추가
      // 타입에 관계없이 제품 ID 비교
      const selectedProduct = selectedProductId 
        ? products.find(p => String(p.id) === String(selectedProductId)) 
        : null;
      
      console.log("메시지 전송 시 선택된 제품:", selectedProduct, "ID:", selectedProductId);
      
      const vendorMessage = {
        role: "vendor", // 중요: 판매자 역할 지정
        content: messageText,
        timestamp: new Date().toISOString(),
        
        // 상품 정보 추가 (사용 가능한 경우)
        ...(selectedProduct ? {
          productInfo: {
            name: selectedProduct.name,
            description: selectedProduct.description,
            imageUrl: selectedProduct.imageUrl,
            price: selectedProduct.price
          },
          price: selectedProduct.price
        } : {}),
        
        // 참조 이미지가 있는 경우 추가
        ...(referenceImages && referenceImages.length > 0 ? {
          referenceImages: referenceImages
        } : {})
      };
      
      messages.push(vendorMessage);
      
      // 3. 대화 업데이트
      const updateResponse = await fetch(`/api/conversations/${order.conversation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages })
      });
      
      if (!updateResponse.ok) {
        throw new Error("메시지 업데이트에 실패했습니다");
      }
      
      // 메시지가 전송되었음을 알림
      toast({
        title: "메시지가 전송되었습니다",
        description: "고객은 AI 챗봇 창에서 메시지를 확인할 수 있습니다.",
      });
      
      // 입력 필드 초기화
      setMessageText('');
      
      // 대화 목록 새로고침 (선택적)
      if (order.conversation && order.conversation.messages) {
        // 타입 문제를 해결하기 위해 적절한 타입으로 변환 (문자열로 비교)
        const selectedProduct = selectedProductId 
          ? products.find(p => String(p.id) === String(selectedProductId)) 
          : null;
          
        console.log("로컬 UI 업데이트 시 선택된 제품:", selectedProduct);
        
        const typedVendorMessage: ChatMessage = {
          role: "vendor",
          content: messageText,
          timestamp: new Date(),
          recommendations: [],
          
          // 상품 정보 추가 (사용 가능한 경우)
          ...(selectedProduct ? {
            productInfo: {
              name: selectedProduct.name,
              description: selectedProduct.description,
              imageUrl: selectedProduct.imageUrl,
              price: selectedProduct.price
            },
            price: selectedProduct.price
          } : {}),
          
          // 참조 이미지가 있는 경우 추가
          ...(referenceImages && referenceImages.length > 0 ? {
            referenceImages: referenceImages
          } : {})
        };
        const updatedMessages = [...order.conversation.messages, typedVendorMessage];
        order.conversation.messages = updatedMessages;
      }
    } catch (error) {
      console.error('메시지 전송 오류:', error);
      toast({
        title: "메시지 전송 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
        variant: "destructive"
      });
    }
  };
  
  // 입찰 확정 처리
  const handleConfirmBid = async () => {
    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      toast({
        title: "입찰 금액을 입력해주세요",
        description: "유효한 금액을 입력해야 입찰을 완료할 수 있습니다.",
        variant: "destructive"
      });
      return;
    }
    
    // 선택한 제품 검증
    if (!selectedProductId) {
      toast({
        title: "상품을 선택해주세요",
        description: "입찰에 포함할 상품을 선택해야 합니다.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // 입력값 로컬 변수에 저장 (초기화 전에 사용하기 위해)
      const messageToSend = vendorMessage;
      const imagesToReference = [...referenceImages]; // 배열 복사
      const bidAmountValue = parseFloat(bidAmount);
      const selectedProductIdValue = parseInt(selectedProductId);
      
      // 디버깅 로그
      console.log("입찰 확정 처리 중 - 선택된 제품 ID:", selectedProductId);
      
      // 선택된 제품 찾기
      const selectedProduct = products.find(p => String(p.id) === String(selectedProductId));
      
      if (!selectedProduct) {
        console.error("선택된 제품을 찾을 수 없음", "제품 ID:", selectedProductId);
        throw new Error("선택한 제품 정보를 찾을 수 없습니다.");
      }
      
      // 저장 전 현재 상태 백업
      const originalBidAmount = bidAmount;
      const originalVendorMessage = vendorMessage;
      const originalReferenceImages = [...referenceImages];
      const originalSelectedProductId = selectedProductId;
      
      // 입찰 데이터 업데이트
      const bidData: Partial<BidData> = {
        status: 'bidded',
        price: bidAmountValue,
        selectedProductId: selectedProductIdValue,
        vendorMessage: messageToSend,
        referenceImages: imagesToReference,
        // 선택된 제품 정보 포함
        selectedProducts: [{
          id: selectedProduct.id,
          name: selectedProduct.name,
          price: selectedProduct.price,
          quantity: 1 // 기본 수량
        }]
      };
      
      console.log("입찰 데이터:", bidData);
      
      // 입찰 정보 업데이트 (실제 API 호출)
      try {
        // API 호출로 입찰 정보 업데이트 (부모 컴포넌트의 함수 사용)
        await onUpdateBid(order.id, bidData);
        
        // 그 다음 상태 업데이트
        await onUpdateStatus(order.id, 'bidded');
        
        // 성공 메시지
        toast({
          title: "입찰이 완료되었습니다",
          description: "고객에게 입찰 정보가 전송되었습니다.",
        });
        
        // 필드를 초기화하지 않고 order 객체만 업데이트
        // order 객체 업데이트 (화면에 계속 표시되도록)
        if (order && order.conversation) {
          // 첫 번째 제품 정보 (기본 선택)
          // 선택된 제품 정보
          const selectedProductInfo = {
            id: selectedProduct.id,
            name: selectedProduct.name,
            description: selectedProduct.description,
            imageUrl: selectedProduct.imageUrl,
            price: selectedProduct.price
          };
          
          // 대화에 메시지 추가 (로컬 UI 업데이트)
          if (order.conversation.messages) {
            // 기존 메시지에 추가
            const newVendorMessage: ChatMessage = {
              role: 'vendor',
              content: messageToSend,
              timestamp: new Date(),
              productInfo: selectedProductInfo, // 선택한 제품 정보
              price: bidAmountValue,
              referenceImages: imagesToReference
            };
            
            // 직접 메시지 추가
            order.conversation.messages = [
              ...order.conversation.messages,
              newVendorMessage
            ];
          }
          
          // 주문 상태 업데이트 (로컬)
          // UI 유지를 위해 order 객체의 상태와 관련 정보 업데이트
          order.bidAmount = bidAmountValue;
          order.vendorMessage = messageToSend;
          order.referenceImages = imagesToReference;
          order.selectedProductId = selectedProductIdValue;
          order.status = 'bidded';
        }
      } catch (error) {
        console.error("입찰 정보 저장 오류:", error);
        
        // 오류 발생 시 이전 상태로 복원
        setBidAmount(originalBidAmount);
        setVendorMessage(originalVendorMessage);
        setReferenceImages(originalReferenceImages);
        setSelectedProductId(originalSelectedProductId);
        
        throw error;
      }
    } catch (error) {
      console.error("입찰 확정 오류:", error);
      toast({
        title: "입찰 확정 실패",
        description: "입찰 정보를 저장하는 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };
  
  // 제품이 선택되었을 때
  const handleProductSelected = (productId: string) => {
    setSelectedProductId(productId);
    
    // 제품을 선택하면 제품 정보와 함께 메시지 업데이트 (선택적)
    const selectedProduct = products.find(p => String(p.id) === String(productId));
    if (selectedProduct) {
      console.log("선택된 제품:", selectedProduct.name, "가격:", selectedProduct.price);
      // 기본값 설정
      if (!bidAmount || bidAmount === '0') {
        setBidAmount(selectedProduct.price.toString());
      }
      
      // 상품을 선택하면 자동으로 '검토중' 상태로 변경
      if (order.status === 'pending') {
        console.log("상품 선택으로 자동 상태 변경: 'pending' -> 'reviewing'");
        onUpdateStatus(order.id, 'reviewing');
      }
    }
  };
  
  // 참고 이미지 제거
  const handleRemoveReferenceImage = (index: number) => {
    const newImages = [...referenceImages];
    newImages.splice(index, 1);
    setReferenceImages(newImages);
  };
  
  // 이미지 업로드 처리
  const handleUploadImage = async () => {
    const fileInput = document.getElementById('imageFile') as HTMLInputElement;
    const files = fileInput.files;
    
    if (!files || files.length === 0) {
      toast({
        title: "파일을 선택해주세요",
        description: "업로드할 이미지 파일을 선택해주세요.",
        variant: "destructive"
      });
      return;
    }
    
    // 최대 이미지 개수 체크 (현재 + 새로 업로드할 파일)
    const totalImages = referenceImages.length + files.length;
    if (totalImages > 5) {
      toast({
        title: "이미지 개수 초과",
        description: `최대 5개의 이미지만 업로드 가능합니다. 현재 ${referenceImages.length}개가 있으며, ${5 - referenceImages.length}개를 더 업로드할 수 있습니다.`,
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsUploading(true);
      setUploadProgress(10); // 시작 진행률
      
      const uploadedUrls = [];
      
      // 순차적으로 각 파일 업로드
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // 파일 크기 체크 (5MB 제한)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "파일 크기 초과",
            description: `${file.name} 파일이 5MB를 초과합니다.`,
            variant: "destructive"
          });
          continue;
        }
        
        // 파일 유형 체크
        if (!file.type.startsWith('image/')) {
          toast({
            title: "유효하지 않은 파일 형식",
            description: `${file.name}은(는) 이미지 파일이 아닙니다.`,
            variant: "destructive"
          });
          continue;
        }
        
        // FormData 생성
        const formData = new FormData();
        formData.append('image', file);
        
        // 진행률 계산 (각 파일당 약 90% / 파일 수)
        const progressPerFile = 90 / files.length;
        setUploadProgress(10 + (progressPerFile * i)); // 한 파일 업로드 시작
        
        // 파일 업로드 요청
        const response = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`이미지 업로드 실패: ${errorText}`);
        }
        
        const data = await response.json();
        uploadedUrls.push(data.imageUrl);
        
        // 각 파일 업로드 완료 후 진행률 업데이트
        setUploadProgress(10 + (progressPerFile * (i + 1)));
      }
      
      // 업로드 완료
      setUploadProgress(100);
      
      // 성공적으로 업로드된 이미지 URL 추가
      if (uploadedUrls.length > 0) {
        setReferenceImages([...referenceImages, ...uploadedUrls]);
        
        toast({
          title: "이미지 업로드 완료",
          description: `${uploadedUrls.length}개의 이미지가 업로드되었습니다.`,
        });
        
        // 입력 필드 초기화 및 다이얼로그 닫기
        setImageUploadOpen(false);
        fileInput.value = '';
      }
    } catch (error) {
      console.error("이미지 업로드 오류:", error);
      toast({
        title: "이미지 업로드 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* 주문 정보 */}
      <div>
        <h3 className="text-lg font-medium mb-2">주문 정보</h3>
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="font-medium">주문 ID</div>
                <div className="text-sm">{order.id}</div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="font-medium">고객명</div>
                <div className="text-sm">{order.customer?.name || '고객 정보 없음'}</div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="font-medium">주문 상태</div>
                <OrderStatusBadge status={order.status} />
              </div>
              
              {/* 입찰 금액 표시 삭제 */}
              
              <div className="flex justify-between items-center">
                <div className="font-medium">주문 일시</div>
                <div className="text-sm">{order.date ? order.date.toLocaleString('ko-KR') : '날짜 정보 없음'}</div>
              </div>
              
              {/* 주문 상태 변경 버튼 그룹 */}
              <div className="pt-3 space-x-2 flex flex-wrap gap-2">
                {order.status === 'bidded' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onUpdateStatus(order.id, 'preparing')}
                  >
                    <Package className="mr-2 h-4 w-4" />
                    상품 준비 중
                  </Button>
                )}
                
                {(order.status === 'bidded' || order.status === 'preparing') && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onUpdateStatus(order.id, 'shipped')}
                  >
                    <Truck className="mr-2 h-4 w-4" />
                    배송 시작
                  </Button>
                )}
                
                {order.status === 'shipped' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onUpdateStatus(order.id, 'completed')}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    완료로 변경
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* 고객 정보 */}
      <div>
        <h3 className="text-lg font-medium mb-2">고객 정보</h3>
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div className="font-medium">{order.customer?.name || '고객 정보 없음'}</div>
              </div>
              
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>{order.customer?.phone || '전화번호 없음'}</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">배송지 주소</div>
                <div className="text-sm">
                  {/* 고객이 직접 입력한 주소가 있는 경우 */}
                  {/* 고객이 직접 입력한 주소 */}
                  {order.customer?.inputAddress && (
                    <div className="flex items-center gap-1 mb-2">
                      <span className="text-xs px-1 py-0.5 rounded bg-green-100 text-green-800">고객 입력</span>
                      <MapPin className="h-3 w-3 text-green-600" />
                      <span className="font-medium">{order.customer?.inputAddress}</span>
                    </div>
                  )}
                  
                  {/* 좌표 정보는 표시하지 않음 */}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* 요청 식물 정보 */}
      {order.plant && (
        <div>
          <h3 className="text-lg font-medium mb-2">요청 식물 정보</h3>
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="font-medium">{order.plant.name || '식물명 정보 없음'}</div>
                
                {order.plant.priceRange && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">가격대:</span> {order.plant.priceRange}
                  </div>
                )}
                
                {order.plant.description && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">식물 설명</div>
                    <div className="text-sm">{order.plant.description}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* 대화 내역 */}
      {order.conversation && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium">대화 내역</h3>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowChatHistory(!showChatHistory)}
            >
              {showChatHistory ? '접기' : '펼치기'}
            </Button>
          </div>
          
          {showChatHistory && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {/* 대화 로그 표시 */}
                  {order?.conversation?.messages?.length ? (
                    // 메시지가 있을 경우 표시
                    order.conversation.messages.map((msg: ChatMessage, idx: number) => (
                      <div 
                        key={idx} 
                        className={`flex ${msg.role === 'user' ? 'justify-end' : msg.role === 'vendor' ? 'justify-start' : 'justify-start'}`}
                      >
                        <div 
                          className={`rounded-lg p-3 max-w-[80%] ${
                            msg.role === 'user' 
                              ? 'bg-primary/10 text-foreground' 
                              : msg.role === 'vendor'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-muted'
                          }`}
                        >
                          {msg?.role === 'vendor' ? (
                            <div className="space-y-3">
                              {/* 판매자 메시지 - 구조화된 형식으로 표시 */}
                              {msg?.productInfo && (
                                <div className="bg-yellow-50 p-3 rounded-md">
                                  <div className="font-medium">
                                    {msg.productInfo.name}
                                  </div>
                                  
                                  {msg.productInfo.imageUrl && (
                                    <div className="mt-2 rounded-md overflow-hidden">
                                      <img 
                                        src={msg.productInfo.imageUrl} 
                                        alt={msg.productInfo.name || '상품 이미지'} 
                                        className="w-full max-h-48 object-contain"
                                      />
                                    </div>
                                  )}
                                  
                                  <div className="mt-2 text-gray-700 text-sm">
                                    <div><strong>입찰가격:</strong> {typeof msg.price === 'number' ? 
                                      `${msg.price.toLocaleString()}원(부가세, 배송비 포함)` : 
                                      (typeof msg.content === 'string' && msg.content.includes('입찰가격:')) ? 
                                        (msg.content.match(/입찰가격:\s*([0-9,]+)원/) ?
                                        msg.content.match(/입찰가격:\s*([0-9,]+)원/)[0] :
                                        '가격 정보 없음') :
                                      '가격 정보 없음'
                                    }</div>
                                  </div>
                                </div>
                              )}
                              
                              {/* 판매자 메시지 본문 */}
                              <div className="whitespace-pre-wrap">
                                {(() => {
                                  // 대화 내역이 없는 경우의 처리 개선
                                  if (!msg.content) {
                                    // 상점 이름이 있는 상태에서 콘텐츠가 없는 경우, 내용 없음으로 표시
                                    // 하드코딩된 메시지를 사용하지 않음
                                    return "메시지 내용 없음";
                                  }
                                  
                                  const content = typeof msg.content === 'string' ? 
                                    msg.content : 
                                    typeof msg.content === 'object' && msg.content !== null ?
                                      'content' in msg.content ? String(msg.content.content) :
                                      JSON.stringify(msg.content) :
                                    String(msg.content);
                                  
                                  // 입찰가격 부분은 이미 위에 표시했으므로 제외
                                  const contentWithoutPrice = content.replace(/입찰가격:\s*[0-9,]+원(\(부가세, 배송비 포함\))?/, '');
                                  // '추천 상품: xxx' 부분도 제외
                                  const cleanedContent = contentWithoutPrice.replace(/✓\s*추천\s*상품:\s*[^\n]+/, '');
                                  
                                  // \n 태그와 연속 줄바꿈을 처리
                                  return cleanedContent
                                    .replace(/\\n/g, '\n') // 이스케이프된 \n을 실제 줄바꿈으로 변환
                                    .replace(/\n\n/g, '\n') // 연속 줄바꿈을 하나로 정리
                                    .trim();
                                })()}
                              </div>
                              
                              {/* 참고 이미지가 있는 경우 표시 */}
                              {msg.referenceImages && (
                                Array.isArray(msg.referenceImages) ? 
                                msg.referenceImages.length > 0 : 
                                msg.referenceImages
                              ) && (
                                <div className="mt-3">
                                  <div className="font-medium mb-2">참고 이미지</div>
                                  {/* 타일 형태로 더 유려한 표시 - 이미지 개수에 따라 반응형 공간 배정 */}
                                  <div className={`grid ${(Array.isArray(msg.referenceImages) ? msg.referenceImages : [msg.referenceImages]).length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                                    {(Array.isArray(msg.referenceImages) ? 
                                      msg.referenceImages : 
                                      [msg.referenceImages]
                                    ).map((img, idx) => (
                                      <div key={idx} className="rounded-md overflow-hidden bg-gray-100 border border-gray-200">
                                        <img 
                                          src={img} 
                                          alt={`참고 이미지 ${idx + 1}`} 
                                          className="w-full h-32 object-contain"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-sm whitespace-pre-wrap">
                              {(() => {
                                // console.log("메시지 내용:", msg.content, "타입:", typeof msg.content);
                                
                                if (!msg.content) return "내용 없음";
                                
                                // 문자열이 아니면 객체나 다른 값인 경우
                                if (typeof msg.content !== 'string') {
                                  if (typeof msg.content === 'object' && msg.content !== null) {
                                    // JSON 객체인 경우 content 속성 추출
                                    const contentObj = msg.content as Record<string, any>;
                                    if (contentObj && contentObj.content) {
                                      return String(contentObj.content).replace(/\\n/g, '\n');
                                    } else {
                                      // 그렇지 않으면 전체 객체를 JSON 문자열로 변환
                                      return JSON.stringify(contentObj).replace(/\\n/g, '\n');
                                    }
                                  }
                                  // 문자열이나 객체가 아닌 경우 문자열로 변환
                                  return String(msg.content).replace(/\\n/g, '\n');
                                }
                                
                                // 일반 문자열 처리
                                const content = msg.content;
                                
                                try {
                                  // JSON 형식 문자열 처리
                                  if (content.startsWith('{') && content.includes('"content":')) {
                                    const parsed = JSON.parse(content);
                                    if (parsed.content) {
                                      return parsed.content.replace(/\\n/g, '\n');
                                    }
                                  }
                                  
                                  // recommendations 부분 제외
                                  if (content.includes('"recommendations":')) {
                                    return content.split('"recommendations":')[0]
                                      .replace(/{|"content":|"|}|,$/g, '')
                                      .trim()
                                      .replace(/\\n/g, '\n');
                                  }
                                  
                                  // 그 외에는 그대로 표시하되 줄바꿈 처리
                                  return content
                                    .replace(/\\n/g, '\n')
                                    .replace(/\n\n/g, '\n')
                                    .trim();
                                } catch (e) {
                                  // 오류 발생 시 원본 반환 (줄바꿈 처리 포함)
                                  return content
                                    .replace(/\\n/g, '\n')
                                    .replace(/\n\n/g, '\n')
                                    .trim();
                                }
                              })()}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1 text-right">
                            {msg?.timestamp ? new Date(msg.timestamp).toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit'}) : ''}
                            {msg?.role === 'vendor' && ' (판매자)'}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    // 메시지가 없을 경우 안내 메시지 표시
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>대화 내역이 없습니다.</p>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      
      {/* 판매자 선택 상품 */}
      <div>
        <h4 className="font-medium mb-2">판매자 상품 선택</h4>
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <Select 
                value={selectedProductId} 
                onValueChange={handleProductSelected}
              >
                <SelectTrigger>
                  <SelectValue placeholder="제공할 상품을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {getRelatedProducts().map(product => (
                    <SelectItem 
                      key={product.id} 
                      value={product.id.toString()}
                    >
                      {product.name} ({product.price.toLocaleString()}원)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedProductId && (
                <div className="bg-muted p-3 rounded">
                  {(() => {
                    // 문자열 타입의 selectedProductId를 숫자 또는 문자열로 비교할 수 있도록 변환
                    console.log("선택한 제품 ID:", selectedProductId, "타입:", typeof selectedProductId);
                    
                    // 타입에 관계없이 제품 ID 비교
                    const selected = products.find(p => 
                      String(p.id) === String(selectedProductId)
                    );
                    
                    console.log("찾은 제품:", selected);
                    return selected ? (
                      <div className="flex items-start gap-3">
                        {selected.imageUrl ? (
                          <div className="h-16 w-16 rounded-md overflow-hidden flex-shrink-0">
                            <img 
                              src={selected.imageUrl} 
                              alt={selected.name} 
                              className="h-full w-full object-cover" 
                            />
                          </div>
                        ) : (
                          <div className="h-16 w-16 rounded-md bg-background flex items-center justify-center flex-shrink-0">
                            <Package className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        
                        <div className="flex-1">
                          <div className="font-medium">{selected.name}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {selected.description}
                          </div>
                          <div className="flex justify-between mt-2">
                            <span className="text-sm">기본 가격:</span>
                            <span className="font-medium">{selected.price.toLocaleString()}원</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">재고:</span>
                            <span>{selected.stock}개</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">선택된 상품 정보를 불러올 수 없습니다.</p>
                    );
                  })()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* 입찰 금액 */}
      <div>
        <h4 className="font-medium mb-2">입찰 금액</h4>
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={bidAmount}
                  onChange={e => setBidAmount(e.target.value)}
                  placeholder="가격을 입력하세요"
                  className="flex-1"
                />
                <div className="text-sm font-medium">원</div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                * 최종 가격은 부가세 포함이며, 배송비는 별도입니다.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* 판매자 메시지 입력 */}
      <div>
        <h4 className="font-medium mb-2">판매자 메시지</h4>
        <Card>
          <CardContent className="p-4">
            <Textarea
              placeholder="고객에게 전달할 메시지를 입력하세요"
              value={vendorMessage}
              onChange={e => setVendorMessage(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>
      </div>
      
      {/* 참고 이미지 */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium">참고 이미지 (최대 5장)</h4>
          <Button 
            size="sm" 
            onClick={() => setImageUploadOpen(true)} 
            variant="outline"
            disabled={referenceImages.length >= 5}
          >
            <ImagePlus className="h-4 w-4 mr-2" />
            {referenceImages.length >= 5 ? '최대 개수 도달' : '이미지 추가'}
          </Button>
        </div>
        
        <Card>
          <CardContent className="p-4">
            {referenceImages.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {referenceImages.map((img, index) => (
                  <div key={index} className="relative group">
                    <div className="rounded-md overflow-hidden bg-muted" style={{ minHeight: "150px" }}>
                      <img 
                        src={img} 
                        alt={`참고 이미지 ${index + 1}`} 
                        className="w-full object-contain max-h-[250px]" 
                        style={{ margin: "0 auto", display: "block" }}
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-6 w-6 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveReferenceImage(index)}
                    >
                      <Trash className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ImagePlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>참고 이미지가 없습니다.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* 입찰하기 버튼 (pending 또는 preparing 상태인 경우에만 표시) */}
      {(order.status === 'pending' || order.status === 'preparing' || order.status === 'reviewing') && (
        <Button 
          className="w-full" 
          size="lg"
          onClick={handleConfirmBid}
        >
          입찰하기
        </Button>
      )}
      
      {/* 이미지 파일 업로드 다이얼로그 */}
      <Dialog open={imageUploadOpen} onOpenChange={setImageUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>이미지 파일 업로드</DialogTitle>
            <DialogDescription>
              참고용 이미지 파일을 업로드하세요. (최대 5MB)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Input 
                id="imageFile" 
                type="file"
                accept="image/*"
                multiple
                className="mt-2" 
              />
              <p className="text-xs text-muted-foreground mt-1">
                파일 여러 개를 한 번에 선택할 수 있습니다. (최대 5개)
              </p>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <Progress value={uploadProgress} className="w-full h-2 mt-2" />
              )}
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <Button variant="secondary" onClick={() => setImageUploadOpen(false)}>
                취소
              </Button>
              <Button 
                onClick={handleUploadImage}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    업로드 중...
                  </>
                ) : '업로드'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 제품 추가/수정 다이얼로그 컴포넌트
interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (product: Partial<Product>) => void;
  product?: Product;
}

export default function VendorDashboard() {
  const { user, logoutMutation } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // 인증 확인
  useEffect(() => {
    // 사용자가 없으면 로그인 페이지로 리다이렉트
    if (!user) {
      // 데이터 초기화 후 리다이렉트
      setProducts([]);
      setBids([]);
      setConversations({});
      setSelectedOrder(null);
      setSelectedRealOrder(null);
      setShowOrderChat(false);
      setLoading(false);
      setShowChatHistory(false); // 대화 표시 상태 초기화
      navigate('/auth');
    }
  }, [user, navigate]);
  
  // 상태 관리
  const [bids, setBids] = useState<BidData[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendorOrders, setVendorOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedRealOrder, setSelectedRealOrder] = useState<Order | null>(null);
  const [showOrderChat, setShowOrderChat] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("orders");
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [conversations, setConversations] = useState<Record<number, any>>({});
  const [showChatHistory, setShowChatHistory] = useState(true);
  
  // 로그아웃 처리
  const handleLogout = () => {
    // 로그아웃 전에 먼저 대시보드 상태 초기화
    setProducts([]);
    setBids([]);
    setConversations({});
    setSelectedOrder(null);
    setSelectedRealOrder(null);
    setShowOrderChat(false);
    setShowChatHistory(false);
    setLoading(false); // 데이터 로딩 표시 중지
    
    // 즉시 리다이렉트 먼저 수행
    navigate('/auth');
    
    // 서버에 로그아웃 요청 보내기
    logoutMutation.mutate(undefined, {
      onError: (error) => {
        console.error("로그아웃 오류:", error);
        toast({
          title: "로그아웃 실패",
          description: "로그아웃 중 오류가 발생했습니다. 다시 시도해주세요.",
          variant: "destructive"
        });
      }
    });
  };
  
  // 판매자 주문 데이터 로드
  const fetchVendorOrders = async () => {
    setLoadingOrders(true);
    try {
      const response = await fetch('/api/orders/vendor/me');
      if (!response.ok) {
        if (response.status === 401) {
          navigate('/auth');
          return;
        }
        throw new Error('판매자 주문 데이터를 불러오는데 실패했습니다');
      }
      
      const data = await response.json();
      console.log('판매자 주문 데이터:', data.length, '개');
      
      // 주문 데이터 정렬 (최신순)
      const sortedOrders = data.sort((a: any, b: any) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      setVendorOrders(sortedOrders);
    } catch (error) {
      console.error('판매자 주문 데이터 로드 오류:', error);
      toast({
        title: '주문 데이터 로드 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
        variant: 'destructive'
      });
    } finally {
      setLoadingOrders(false);
    }
  };
  
  // 탭 변경 시 데이터 로드
  useEffect(() => {
    if (user && activeTab === 'orders') {
      fetchVendorOrders();
    }
  }, [user, activeTab]);
  
  // 데이터 로드
  useEffect(() => {
    // 사용자가 없으면 데이터를 로드하지 않음
    if (!user) return;
    
    const loadData = async () => {
      setLoading(true);
      
      try {
        // 판매자 제품 목록 가져오기
        try {
          const productsResponse = await fetch('/api/products');
          if (!productsResponse.ok) {
            console.error("제품 정보 가져오기 실패:", productsResponse.status);
          } else {
            const productsData = await productsResponse.json();
            console.log("제품 데이터:", productsData.length, "개");
            setProducts(productsData);
          }
        } catch (productError) {
          // 제품 정보 가져오기 실패해도 다른 데이터는 계속 가져오도록 함
          console.error("제품 정보 가져오기 예외 발생:", productError);
          // 빈 배열로 초기화
          setProducts([]);
        }
        
        // 판매자 입찰 목록 가져오기 - 로그아웃 상태 확인
        // 사용자가 없으면 API 호출을 중단
        if (!user) {
          setLoading(false);
          return;
        }
        
        const bidsResponse = await fetch('/api/bids/vendor');
        // 401 응답은 로그아웃 상태이미로 오류가 아님
        if (bidsResponse.status === 401) {
          setLoading(false);
          navigate('/auth');
          return;
        }
        
        if (!bidsResponse.ok) {
          throw new Error("입찰 정보를 가져오는데 실패했습니다");
        }
        const bidsData = await bidsResponse.json();
        console.log("입찰 데이터:", bidsData.length, "개");
        setBids(bidsData);
        
        // 모든 입찰에서 대화 ID 추출
        const allConversationIds: number[] = bidsData
          .filter((bid: BidData) => bid.conversationId)
          .map((bid: BidData) => bid.conversationId!)
          .filter(id => id !== undefined && id !== null);
        
        // 중복 제거한 고유 대화 ID 목록 생성
        const uniqueConversationIds = [...new Set(allConversationIds)];
        console.log("고유 대화 ID 목록:", uniqueConversationIds);
        
        // 대화 ID와 입찰 ID 매핑 만들기
        const convBidMap: Record<number, number[]> = {};
        
        // 각 입찰마다 대화 ID를 추출하여 매핑
        bidsData.forEach((bid: BidData) => {
          if (bid.conversationId) {
            if (!convBidMap[bid.conversationId]) {
              convBidMap[bid.conversationId] = [];
            }
            convBidMap[bid.conversationId].push(bid.id);
          }
        });
        
        console.log("대화 ID와 입찰 ID 매핑:", convBidMap);
        
        // 각 대화 ID에 대한 대화 내용 가져오기
        const conversationsMap: Record<number, any> = {};
        const conversationPromises = uniqueConversationIds.map(async (convId) => {
          // 로그아웃 상태 재확인
          if (!user) {
            setLoading(false);
            return false;
          }
          
          const convResponse = await fetch(`/api/conversations/${convId}`);
          // 401 응답은 로그아웃 상태
          if (convResponse.status === 401) {
            return false;
          }
          
          if (convResponse.ok) {
            try {
              const convData = await convResponse.json();
              
              // 대화 데이터 검증 및 메시지 처리
              if (convData && convData.messages) {
                // 메시지가 문자열이면 파싱 (서버에서 문자열로 저장된 경우)
                if (typeof convData.messages === 'string') {
                  try {
                    convData.messages = JSON.parse(convData.messages);
                  } catch (e) {
                    console.error(`대화 ID ${convId}의 메시지 파싱 오류:`, e);
                    // 파싱 오류 시 빈 배열로 설정
                    convData.messages = [];
                  }
                }
                
                // 배열 확인
                if (!Array.isArray(convData.messages)) {
                  console.error(`대화 ID ${convId}의 메시지가 배열이 아님:`, convData.messages);
                  convData.messages = [];
                }
                
                // 대화 메시지 각각의 필드 유효성 검사 및 필요시 변환 작업 수행
                convData.messages = convData.messages.map((msg: any) => {
                  // 기본 형태 정의
                  const convertedMsg: ChatMessage = {
                    role: msg.role || 'user',
                    content: '',
                    timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
                  };
                  
                  // content 처리 - 문자열, 객체, JSON 문자열 등 다양한 형태 지원
                  if (msg.content) {
                    if (typeof msg.content === 'string') {
                      // 문자열인 경우 그대로 사용
                      convertedMsg.content = msg.content;
                    } else if (typeof msg.content === 'object' && msg.content !== null) {
                      // 객체인 경우, content 속성이 있으면 해당 값 사용
                      if ('content' in msg.content) {
                        convertedMsg.content = String(msg.content.content);
                      } else {
                        // 그렇지 않으면 전체 객체를 JSON 문자열로 변환
                        convertedMsg.content = JSON.stringify(msg.content);
                      }
                    } else {
                      // 그 외 타입은 문자열로 변환
                      convertedMsg.content = String(msg.content);
                    }
                  } else {
                    convertedMsg.content = '내용 없음';
                  }
                  
                  // 추가 속성들 복사
                  if (msg.recommendations) convertedMsg.recommendations = msg.recommendations;
                  if (msg.imageUrl) convertedMsg.imageUrl = msg.imageUrl;
                  if (msg.productInfo) convertedMsg.productInfo = msg.productInfo;
                  if (msg.referenceImages) convertedMsg.referenceImages = msg.referenceImages;
                  if (msg.price) convertedMsg.price = msg.price;
                  
                  // 판매자 정보 복사
                  if (msg.vendorId) convertedMsg.vendorId = msg.vendorId;
                  if (msg.vendorName) convertedMsg.vendorName = msg.vendorName;
                  if (msg.storeName) convertedMsg.storeName = msg.storeName;
                  if (msg.vendorColor) convertedMsg.vendorColor = msg.vendorColor;
                  
                  return convertedMsg;
                });
                
                console.log(`대화 ID ${convId} 메시지 데이터 전처리 완료:`, convData.messages.length, '개');
              } else {
                console.error(`대화 ID ${convId}에 메시지 필드가 없음`);
                convData.messages = [];
              }
              
              conversationsMap[Number(convId)] = convData;
              return true;
            } catch (e) {
              console.error(`대화 ID ${convId} 처리 중 오류:`, e);
              return false;
            }
          }
          return false;
        });
        
        // 병렬로 모든 대화 데이터 가져오기
        const results = await Promise.all(conversationPromises);
        const successCount = results.filter(Boolean).length;
        
        console.log(`가져온 대화 데이터 (${successCount}개 성공):`, conversationsMap);
        setConversations(conversationsMap);
        
        // 대화 ID에 해당하는 입찰 ID 들을 로깅
        Object.keys(convBidMap).forEach(convId => {
          console.log(`대화 ID ${convId}에 연결된 입찰 ID:`, convBidMap[convId]);
        });
        
        setLoading(false);
        console.log("판매자 대시보드: 데이터 로딩 완료");
        
        // 데이터 로드 완료 후 자동으로 첫 번째 주문 선택
        const orders = convertBidsToOrders();
        if (orders.length > 0) {
          console.log("자동으로 주문 선택:", orders[0].id);
          setSelectedOrder(orders[0]);
          
          // 대화 내역 표시
          console.log("대화 내역 표시 상태 설정");
          setShowChatHistory(true);
        }
      } catch (error) {
        console.error("데이터 로딩 오류:", error);
        setLoading(false);
        toast({
          title: "데이터 로딩 실패",
          description: "정보를 불러오는데 실패했습니다. 새로고침 해주세요.",
          variant: "destructive"
        });
      }
    };
    
    if (user) {
      loadData();
    }
  }, [user, toast]);
  
  // 입찰 상태 업데이트 처리
  const handleUpdateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    // 순수 ID 추출 (BID- 접두사가 있는 경우)
    const bidId = orderId.replace('BID-', '');
    
    // 상태 변경에 따른 추가 조치
    const handleStatusChange = (newStatus: OrderStatus) => {
      // 'preparing' 상태로 변경 시 안내 메시지 추가
      if (newStatus === 'preparing') {
        // 상태 변경에 대한 안내 메시지를 사용자에게 자동 전송
        if (selectedRealOrder && selectedRealOrder.conversation && selectedRealOrder.conversation.id) {
          const message = {
            role: 'vendor' as const,
            content: '주문하신 상품 준비를 시작했습니다. 판매자가 주문을 확인하고 상품을 준비 중이며, 준비가 완료되면 배송이 시작됩니다.',
            timestamp: new Date(),
          };
          
          // 대화 메시지 전송 API 호출
          fetch(`/api/conversations/${selectedRealOrder.conversation.id}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
          }).catch(err => console.error('준비 알림 메시지 전송 실패:', err));
        }
      }
    };
    
    // API 호출 (낙관적 업데이트)
    fetch(`/api/bids/${bidId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: newStatus })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error("상태 업데이트에 실패했습니다");
      }
      return response.json();
    })
    .then(updatedBid => {
      // 로컬 상태 업데이트
      setBids(prevBids => prevBids.map(bid => 
        bid.id === parseInt(bidId) ? { ...bid, status: newStatus } : bid
      ));
      
      // 선택된 주문 업데이트
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({
          ...selectedOrder,
          status: newStatus
        });
      }
      
      // 결제 완료된 주문 업데이트
      if (selectedRealOrder && selectedRealOrder.id === orderId) {
        setSelectedRealOrder({
          ...selectedRealOrder,
          status: newStatus
        });
        
        // 상태 변경에 따른 추가 조치 수행
        handleStatusChange(newStatus);
      }
      
      // 토스트 메시지 다국어 처리
      let statusKorean = newStatus as string;
      if (newStatus === 'preparing') statusKorean = '상품 준비 중';
      else if (newStatus === 'shipped') statusKorean = '배송 시작';
      else if (newStatus === 'completed') statusKorean = '배송 완료';
      
      toast({
        title: "상태 업데이트 완료",
        description: `주문이 "${statusKorean}" 상태로 변경되었습니다.`,
      });
    })
    .catch(error => {
      console.error("상태 업데이트 오류:", error);
      toast({
        title: "상태 업데이트 실패",
        description: "주문 상태 변경 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    });
  };
  
  // 입찰 정보 업데이트 처리
  const handleUpdateBid = (orderId: string, bidData: Partial<BidData>) => {
    // 순수 ID 추출
    const bidId = orderId.replace('BID-', '');
    
    console.log("입찰 업데이트 데이터:", bidData);
    
    // 선택한 상품 정보
    const selectedProduct = bidData.selectedProductId 
      ? products.find(p => parseInt(p.id.toString()) === bidData.selectedProductId)
      : null;
      
    console.log("선택한 상품 정보:", selectedProduct);
    
    // API 호출
    return fetch(`/api/bids/${bidId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bidData)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error("입찰 정보 업데이트에 실패했습니다");
      }
      return response.json();
    })
    .then(updatedBid => {
      // 로컬 상태 업데이트
      setBids(prevBids => prevBids.map(bid => 
        bid.id === parseInt(bidId) ? { ...bid, ...bidData } : bid
      ));
      
      // 선택된 주문 업데이트
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({
          ...selectedOrder,
          bidAmount: bidData.price,
          vendorMessage: bidData.vendorMessage,
          referenceImages: bidData.referenceImages,
          selectedProductId: bidData.selectedProductId,
          status: bidData.status as OrderStatus
        });
      }
      
      toast({
        title: "입찰 정보 업데이트 완료",
        description: "입찰 정보가 성공적으로 업데이트되었습니다.",
      });
      
      return updatedBid;
    });
  };
  
  // 제품 편집 처리
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductDialogOpen(true);
    console.log("[ProductDialog] open 상태 변경:", true, "product:", product);
  };
  
  // 제품 저장 처리
  const handleSaveProduct = async (productData: Partial<Product>) => {
    try {
      // 새 제품 또는 기존 제품 업데이트
      const isNewProduct = !editingProduct;
      const method = isNewProduct ? 'POST' : 'PUT';
      const url = isNewProduct ? '/api/products' : `/api/products/${editingProduct?.id}`;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData)
      });
      
      if (!response.ok) {
        throw new Error("제품 저장에 실패했습니다");
      }
      
      const savedProduct = await response.json();
      
      // 로컬 상태 업데이트
      if (isNewProduct) {
        setProducts(prev => [...prev, savedProduct]);
      } else {
        setProducts(prev => prev.map(p => 
          p.id === editingProduct?.id ? { ...p, ...savedProduct } : p
        ));
      }
      
      // 대화상자 닫기 및 상태 초기화
      setProductDialogOpen(false);
      setEditingProduct(null);
      
      toast({
        title: `제품 ${isNewProduct ? '추가' : '업데이트'} 완료`,
        description: `${savedProduct.name} 제품이 성공적으로 ${isNewProduct ? '추가' : '업데이트'}되었습니다.`,
      });
    } catch (error) {
      console.error("제품 저장 오류:", error);
      toast({
        title: "제품 저장 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
        variant: "destructive"
      });
    }
  };
  
  // 제품 삭제 처리
  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm("정말로 이 제품을 삭제하시겠습니까?")) {
      return;
    }
    
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error("제품 삭제에 실패했습니다");
      }
      
      // 로컬 상태 업데이트
      setProducts(prev => prev.filter(p => p.id !== productId));
      
      toast({
        title: "제품 삭제 완료",
        description: "제품이 성공적으로 삭제되었습니다.",
      });
    } catch (error) {
      console.error("제품 삭제 오류:", error);
      toast({
        title: "제품 삭제 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
        variant: "destructive"
      });
    }
  };
  
  // 판매자 주문 데이터 필터링
  const filteredOrders = useMemo(() => {
    if (!vendorOrders || vendorOrders.length === 0) return [];
    
    return vendorOrders.filter((order: any) => {
      // 검색어가 없으면 모든 주문 표시
      if (!searchTerm.trim()) return true;
      
      // 소문자로 변환하여 비교
      const term = searchTerm.toLowerCase();
      
      // 주문 ID, 고객 정보, 상태 등으로 검색
      return (
        (order.orderId && order.orderId.toLowerCase().includes(term)) ||
        (order.buyerInfo && JSON.stringify(order.buyerInfo).toLowerCase().includes(term)) ||
        (order.status && order.status.toLowerCase().includes(term)) ||
        (order.price && order.price.toString().includes(term))
      );
    });
  }, [vendorOrders, searchTerm]);
  
  // 입찰 데이터를 주문 객체로 변환
  const convertBidsToOrders = (): Order[] => {
    console.log("입찰 데이터를 주문으로 변환 - 총", bids?.length || 0, "개");
    
    // 없으면 빈 배열 반환
    if (!bids?.length) {
      console.log("유효하지 않은 입찰 데이터 - 빈 배열 사용");
      return [];
    }
    
    // 입찰을 주문으로 변환
    return bids.map(bid => {
      console.log("입찰 항목 변환 중:", bid.id, "상태:", bid.status);
      
      // 참조 이미지 처리
      let referenceImages: string[] = [];
      
      // bidAmount 기본값 처리
      let bidAmount = bid.price ?? null;
      
      // 참조 이미지는 문자열이거나 배열일 수 있음
      if (bid.referenceImages) {
        if (typeof bid.referenceImages === 'string') {
          try {
            // JSON 문자열을 객체로 파싱
            const parsedImages = JSON.parse(bid.referenceImages);
            if (Array.isArray(parsedImages)) {
              referenceImages = parsedImages;
            } else {
              referenceImages = [parsedImages.toString()];
            }
          } catch (e) {
            // 파싱 실패 시 문자열 그대로 배열에 추가
            referenceImages = [bid.referenceImages];
          }
        } else if (Array.isArray(bid.referenceImages)) {
          // 이미 배열인 경우 그대로 사용
          referenceImages = bid.referenceImages;
        }
      }
      
      console.log("참조 이미지:", referenceImages);
      
      // 대화 메시지 처리
      const conversationId = bid.conversationId || null;
      let conversationMessages: ChatMessage[] = [];
      
      // 기본 메시지는 빈 배열로 설정 (더이상 하드코딩된 메시지 사용하지 않음)
      const defaultMessages: ChatMessage[] = [];
      
      // 1. 대화 ID가 있는 경우 해당 대화 사용
      if (conversationId && conversations[conversationId] && 
          Array.isArray(conversations[conversationId].messages) && 
          conversations[conversationId].messages.length > 0) {
        const conv = conversations[conversationId];
        console.log(`입찰 ${bid.id}에 대한 대화 ${conversationId}의 메시지 사용:`, conv.messages.length, '개');
        conversationMessages = conv.messages;
      } 
      // 2. bid 객체에 직접 연결된 대화 객체 사용 (타입 안전하게 처리)
      else if (typeof bid === 'object' && bid !== null && 
               'conversation' in bid && 
               bid.conversation && 
               typeof bid.conversation === 'object' &&
               'messages' in bid.conversation && 
               Array.isArray(bid.conversation.messages) && 
               bid.conversation.messages.length > 0) {
        console.log(`입찰 ${bid.id}에 직접 연결된 대화 메시지 사용:`, (bid.conversation as any).messages.length, '개');
        conversationMessages = (bid.conversation as any).messages;
      }
      // 3. bid 객체에 직접 messages 배열이 있는 경우 (타입 안전하게 처리)
      else if (typeof bid === 'object' && bid !== null &&
               'messages' in bid && 
               Array.isArray((bid as any).messages) && 
               (bid as any).messages.length > 0) {
        console.log(`입찰 ${bid.id}에 직접 포함된 메시지 배열 사용:`, (bid as any).messages.length, '개');
        conversationMessages = (bid as any).messages;
      }
      // 4. 어떤 방법으로도 메시지를 찾을 수 없는 경우
      else {
        console.log(`입찰 ${bid.id}에 대한 유효한 대화 없음 - 대기 메시지 표시`);
        // 서버에서 데이터를 가져오는 중이라는 메시지 표시
        conversationMessages = [{
          role: 'user',
          content: '대화 내용을 가져오는 중입니다. 잠시 후 새로고침하거나 다시 로그인해주세요.',
          timestamp: new Date(bid.createdAt)
        }];
      }
      
      return {
        id: `BID-${bid.id}`,
        bidId: bid.id,
        customer: {
          // 사용자 이름 표시 우선순위: 
          // API 응답 또는 관련 객체에서 이름 가져오기
          name: String(bid.customer?.name || 
                bid.user?.name || 
                bid.user?.username || 
                // API 응답에서 직접 정보를 가져올 때 타입 오류 방지를 위해 변환
                (typeof bid === 'object' && 'username' in bid ? bid.username : '') || 
                '고객: ' + bid.userId),
          userId: bid.userId,
          // 전화번호 표시 우선순위
          phone: bid.customer?.phone || 
                 bid.user?.phone || 
                 '전화번호 없음',
          // 사용자가 직접 입력한 주소가 있으면 그것을 우선 표시, 없으면 좌표 기반 주소 표시
          address: bid.customerInputAddress || bid.customer?.address || '주소 정보 없음',
          // 입력 주소 통합 관리
          inputAddress: bid.customerInputAddress,
          location: {
            // 테스트용 임의 좌표가 아닌 실제 위치 정보 사용
            lat: bid.customer?.location?.lat || 37.5665,
            lng: bid.customer?.location?.lng || 126.9780
          }
        },
        type: bid.additionalServices?.includes('AI') ? 'ai' : 'direct',
        status: bid.status as OrderStatus,
        date: new Date(bid.createdAt),
        bidAmount: bidAmount,
        vendorMessage: bid.vendorMessage,
        referenceImages: referenceImages,
        selectedProductId: bid.selectedProductId,
        plant: bid.plant,
        conversation: {
          id: conversationId || 1,
          // 원본 대화 데이터를 사용하도록 수정
          messages: conversationMessages
        }
      };
    });
  };
  
  // 알림 목록을 입찰 데이터에서 생성
  const generateNotifications = (): Notification[] => {
    // 모든 입찰 중 읽지 않은 '대기 중' 상태의 입찰을 알림으로 변환
    if (!bids?.length) return [];
    
    return bids
      .filter(bid => bid.status === 'pending')
      .map(bid => ({
        id: `BN-${bid.id}`,
        type: 'order',
        title: '새로운 입찰 요청이 있습니다',
        description: `${bid.customer?.name || '고객'}님이 ${bid.plant?.name || '식물'} 구매를 문의했습니다.`,
        isRead: false,
        date: new Date(bid.createdAt)
      }));
  };

  // 필터링된 입찰 주문 목록
  const filteredBidOrders = convertBidsToOrders().filter(order => 
    (order.customer?.name && order.customer.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    order.id.includes(searchTerm)
  );
  
  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Store className="h-6 w-6" />
            <h1 className="text-xl font-bold">판매자 대시보드</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="ghost">
              <Bell className="h-5 w-5" />
              <span className="ml-1">{generateNotifications().filter(n => !n.isRead).length}</span>
            </Button>
            <Button size="sm" variant="ghost" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
              <span className="ml-1 hidden sm:inline">로그아웃</span>
            </Button>
            <div className="text-sm font-medium">{user?.username || '판매자'}</div>
          </div>
        </div>
      </header>
      
      {/* 메인 콘텐츠 */}
      <div className="container mx-auto px-4 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-6">
            <TabsList>
              <TabsTrigger value="orders" className="flex items-center">
                <ShoppingBag className="mr-2 h-4 w-4" />
                주문 관리
              </TabsTrigger>
              <TabsTrigger value="products" className="flex items-center">
                <Package className="mr-2 h-4 w-4" />
                제품 관리
              </TabsTrigger>
              <TabsTrigger value="location" className="flex items-center">
                <MapPin className="mr-2 h-4 w-4" />
                매장 위치
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center">
                <Bell className="mr-2 h-4 w-4" />
                알림
              </TabsTrigger>
            </TabsList>
            
            {activeTab === "products" && (
              <Button onClick={() => {
                // 새 제품 등록시 반드시 편집중인 제품 정보 초기화
                setEditingProduct(null);
                setProductDialogOpen(true);
              }}>
                <PlusCircle className="mr-2 h-4 w-4" />
                새 제품 등록
              </Button>
            )}
          </div>
          
          {/* 주문 관리 탭 */}
          <TabsContent value="orders" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <div className="mb-4 flex space-x-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="주문 검색..."
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
                
                <Tabs defaultValue="bids" className="mb-4">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="bids">입찰 중인 주문</TabsTrigger>
                    <TabsTrigger value="paid">결제 완료 주문</TabsTrigger>
                    <TabsTrigger value="preparing">준비 중인 주문</TabsTrigger>
                    <TabsTrigger value="completed">완료된 주문</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="bids" className="mt-4">
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-lg">입찰 주문 목록</CardTitle>
                      </CardHeader>
                      <ScrollArea className="h-[60vh]">
                        <CardContent className="p-0">
                          <div className="divide-y">
                            {filteredBidOrders.map((order) => (
                              <div 
                                key={order.id}
                                className={`p-4 cursor-pointer hover:bg-muted/50 ${selectedOrder?.id === order.id ? 'bg-muted' : ''}`}
                                onClick={() => setSelectedOrder(order)}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="font-medium">
                                    {order.customer?.name || '고객 정보 없음'}
                                    <span className="ml-2 text-xs text-muted-foreground">#{order.id}</span>
                                  </div>
                                  <OrderStatusBadge status={order.status} />
                                </div>
                                
                                <div className="text-sm text-muted-foreground mb-2">
                                  {order.date ? order.date.toLocaleDateString('ko-KR') : '날짜 정보 없음'}
                                  <span className="mx-2">•</span>
                                  {order.type === 'ai' ? 'AI 컨설팅' : '직접 주문'}
                                </div>
                                
                                <div className="flex justify-between items-center">
                                  <div className="text-sm">
                                    {order.plant?.name 
                                      ? `식물: ${order.plant.name}` 
                                      : order.type === 'ai' && order.conversation?.recommendations
                                        ? `추천 식물: ${order.conversation.recommendations.map(r => r.name).join(', ')}`
                                        : order.type === 'direct' && order.items
                                          ? `${order.items.length}개 상품`
                                          : '내용 없음'
                                    }
                                  </div>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </div>
                            ))}
                            
                            {filteredBidOrders.length === 0 && (
                              <div className="p-8 text-center text-muted-foreground">
                                입찰 주문이 없습니다.
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </ScrollArea>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="paid" className="mt-4">
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-lg">결제 완료된 주문 목록</CardTitle>
                        <CardDescription>
                          결제가 완료되어 상품 준비가 필요한 주문 목록입니다.
                        </CardDescription>
                      </CardHeader>
                      <ScrollArea className="h-[60vh]">
                        <CardContent className="p-0">
                          <div className="divide-y">
                            {loadingOrders ? (
                              <div className="flex justify-center items-center p-8">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                              </div>
                            ) : (
                              <>
                                {filteredOrders
                                  .filter((order: any) => order.status === 'paid')
                                  .map((order: any) => (
                                  <div 
                                    key={order.id}
                                    className={`p-4 cursor-pointer hover:bg-muted/50`}
                                    onClick={() => {
                                      // 결제 완료된 주문은 주문 상세 정보만 표시
                                      setSelectedRealOrder(order);
                                      setShowOrderChat(false); // 대화창은 기본적으로 닫아둠
                                      // 입찰 관련 모달은 열지 않음
                                      setSelectedOrder(null);
                                    }}
                                  >
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="font-medium">
                                        {order.buyerInfo ? (typeof order.buyerInfo === 'string' ? JSON.parse(order.buyerInfo).name : order.buyerInfo.name) : '이름 없음'}
                                        <span className="ml-2 text-xs text-muted-foreground">#{order.orderId}</span>
                                      </div>
                                      <OrderStatusBadge status={order.status} />
                                    </div>
                                    
                                    <div className="text-sm text-muted-foreground mb-2">
                                      {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                                      <span className="mx-2">•</span>
                                      {order.conversationId ? 'AI 컨설팅' : '직접 주문'}
                                    </div>
                                    
                                    <div className="flex justify-between items-center">
                                      <div className="text-sm">
                                        금액: {parseInt(order.price).toLocaleString()}원
                                      </div>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="ml-2"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleUpdateOrderStatus(order.id, 'preparing');
                                        }}
                                      >
                                        <Package className="mr-2 h-4 w-4" />
                                        준비 시작
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                                
                                {filteredOrders.filter((order: any) => order.status === 'paid').length === 0 && (
                                  <div className="p-8 text-center text-muted-foreground">
                                    결제 완료된 주문이 없습니다.
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </CardContent>
                      </ScrollArea>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="preparing" className="mt-4">
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-lg">상품 준비 중인 주문</CardTitle>
                        <CardDescription>
                          현재 준비 중인 상품 주문 목록입니다.
                        </CardDescription>
                      </CardHeader>
                      <ScrollArea className="h-[60vh]">
                        <CardContent className="p-0">
                          <div className="divide-y">
                            {loadingOrders ? (
                              <div className="flex justify-center items-center p-8">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                              </div>
                            ) : (
                              <>
                                {filteredOrders
                                  .filter((order: any) => order.status === 'preparing')
                                  .map((order: any) => (
                                  <div 
                                    key={order.id}
                                    className={`p-4 cursor-pointer hover:bg-muted/50`}
                                   onClick={() => {
                                      // 준비 중인 주문도 주문 상세 정보만 표시
                                      setSelectedRealOrder(order);
                                      setShowOrderChat(true);
                                      // 입찰 관련 모달은 열지 않음
                                      setSelectedOrder(null);
                                    }}>
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="font-medium">
                                        {order.buyerInfo ? (typeof order.buyerInfo === 'string' ? JSON.parse(order.buyerInfo).name : order.buyerInfo.name) : '이름 없음'}
                                        <span className="ml-2 text-xs text-muted-foreground">#{order.orderId}</span>
                                      </div>
                                      <OrderStatusBadge status="preparing" />
                                    </div>
                                    
                                    <div className="text-sm text-muted-foreground mb-2">
                                      {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                                      <span className="mx-2">•</span>
                                      {order.conversationId ? 'AI 컨설팅' : '직접 주문'}
                                    </div>
                                    
                                    <div className="flex justify-between items-center">
                                      <div className="text-sm">
                                        금액: {parseInt(order.price).toLocaleString()}원
                                      </div>
                                      <div className="flex gap-2">
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={() => {
                                            // 채팅 인터페이스 열기
                                            if (order.conversationId) {
                                              setSelectedOrder(order);
                                              setSelectedRealOrder(order);
                                              setShowOrderChat(true);
                                            } else {
                                              toast({
                                                title: "채팅을 열 수 없습니다",
                                                description: "이 주문에는 연결된 대화가 없습니다.",
                                                variant: "destructive"
                                              });
                                            }
                                          }}
                                        >
                                          <MessageCircle className="mr-2 h-4 w-4" />
                                          채팅
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={() => handleUpdateOrderStatus(order.id, 'shipped')}
                                        >
                                          <Truck className="mr-2 h-4 w-4" />
                                          배송 시작
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                
                                {filteredOrders.filter((order: any) => order.status === 'preparing').length === 0 && (
                                  <div className="p-8 text-center text-muted-foreground">
                                    준비 중인 주문이 없습니다.
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </CardContent>
                      </ScrollArea>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="completed" className="mt-4">
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-lg">완료된 주문 목록</CardTitle>
                        <CardDescription>
                          배송 중이거나 완료된 주문 목록입니다.
                        </CardDescription>
                      </CardHeader>
                      <ScrollArea className="h-[60vh]">
                        <CardContent className="p-0">
                          <div className="divide-y">
                            {loadingOrders ? (
                              <div className="flex justify-center items-center p-8">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                              </div>
                            ) : (
                              <>
                                {filteredOrders
                                  .filter((order: any) => order.status === 'shipped' || order.status === 'completed')
                                  .map((order: any) => (
                                  <div 
                                    key={order.id}
                                    className={`p-4 cursor-pointer hover:bg-muted/50`}
                                   onClick={() => {
                                      // 완료된 주문도 주문 상세 정보만 표시
                                      setSelectedRealOrder(order);
                                      setShowOrderChat(true);
                                      // 입찰 관련 모달은 열지 않음
                                      setSelectedOrder(null);
                                    }}>
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="font-medium">
                                        {order.buyerInfo ? (typeof order.buyerInfo === 'string' ? JSON.parse(order.buyerInfo).name : order.buyerInfo.name) : '이름 없음'}
                                        <span className="ml-2 text-xs text-muted-foreground">#{order.orderId}</span>
                                      </div>
                                      <OrderStatusBadge status={order.status} />
                                    </div>
                                    
                                    <div className="text-sm text-muted-foreground mb-2">
                                      {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                                      <span className="mx-2">•</span>
                                      {order.conversationId ? 'AI 컨설팅' : '직접 주문'}
                                    </div>
                                    
                                    <div className="flex justify-between items-center">
                                      <div className="text-sm">
                                        금액: {parseInt(order.price).toLocaleString()}원
                                      </div>
                                      {order.status === 'shipped' && (
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                                        >
                                          <CheckCircle className="mr-2 h-4 w-4" />
                                          배송 완료
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                
                                {filteredOrders.filter((order: any) => order.status === 'shipped' || order.status === 'completed').length === 0 && (
                                  <div className="p-8 text-center text-muted-foreground">
                                    완료된 주문이 없습니다.
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </CardContent>
                      </ScrollArea>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
              
              <div className="lg:col-span-2">
                {selectedOrder ? (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-lg">주문 상세</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <OrderDetails 
                        order={selectedOrder} 
                        onUpdateStatus={handleUpdateOrderStatus}
                        onUpdateBid={handleUpdateBid}
                        products={products}
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex h-full items-center justify-center bg-muted/30 rounded-lg p-8">
                    <div className="text-center">
                      <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                      <h3 className="mt-4 text-lg font-medium">주문을 선택하세요</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        왼쪽 목록에서 주문을 선택하면 상세 정보가 여기에 표시됩니다.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          {/* 제품 관리 탭 */}
          <TabsContent value="products" className="mt-6">
            {loading ? (
              <div className="flex justify-center items-center p-12">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 rounded-full animate-pulse bg-primary"></div>
                    <div className="w-4 h-4 rounded-full animate-pulse bg-primary"></div>
                    <div className="w-4 h-4 rounded-full animate-pulse bg-primary"></div>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">데이터를 불러오는 중...</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.length > 0 ? (
                  products.map(product => (
                    <Card key={product.id} className="overflow-hidden relative group">
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex space-x-1">
                        <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => handleEditProduct(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => handleDeleteProduct(product.id)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="h-48 bg-muted relative">
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Package className="h-12 w-12 text-muted-foreground opacity-30" />
                          </div>
                        )}
                      </div>
                      
                      <CardContent className="p-4">
                        <h3 className="font-medium mb-1">{product.name}</h3>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{product.description}</p>
                        
                        <div className="flex justify-between items-center">
                          <div className="text-sm font-medium">{product.price.toLocaleString()}원</div>
                          <div className="text-xs px-2 py-1 bg-muted rounded-full">
                            재고: {product.stock}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full flex items-center justify-center bg-muted/30 rounded-lg p-12">
                    <div className="text-center">
                      <Package className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                      <h3 className="mt-4 text-lg font-medium">제품이 없습니다</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        '새 제품 등록' 버튼을 눌러 제품을 추가하세요.
                      </p>
                      <Button className="mt-4" onClick={() => {
                        setEditingProduct(null);
                        setProductDialogOpen(true);
                      }}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        새 제품 등록
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          
          {/* 매장 위치 탭 */}
          <TabsContent value="location" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>매장 위치 설정</CardTitle>
                <CardDescription>
                  판매자 매장의 위치를 설정하고 관리합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LocationSettings />
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* 알림 탭 */}
          <TabsContent value="notifications" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>알림 센터</CardTitle>
                <CardDescription>
                  최근 수신된 알림 목록을 확인합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {generateNotifications().length > 0 ? (
                    generateNotifications().map(notification => (
                      <div 
                        key={notification.id} 
                        className={`p-4 border rounded-lg ${notification.isRead ? 'bg-background' : 'bg-muted/50'}`}
                      >
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium">
                            {notification.title}
                            {!notification.isRead && (
                              <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary/20 text-primary rounded">new</span>
                            )}
                          </h4>
                          <div className="text-xs text-muted-foreground">
                            {notification.date ? notification.date.toLocaleString('ko-KR') : '날짜 정보 없음'}
                          </div>
                        </div>
                        <p className="mt-1 text-sm">{notification.description}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Bell className="mx-auto h-12 w-12 opacity-50 mb-4" />
                      <p>새로운 알림이 없습니다.</p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button variant="outline" size="sm">
                  모든 알림 읽음 표시
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
        {/* 탭 내용은 여기에 유지됩니다 */}
      </div>
      
      {/* 제품 추가/수정 다이얼로그 */}
      <ProductDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        onSave={handleSaveProduct}
        product={editingProduct as Product || undefined}
      />

      {/* 주문 상세 정보 다이얼로그 - 이전 형태로 롤백 */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="주문 검색..."
                      className="pl-10 w-[200px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            
              {/* 여기부터 각 탭 별 내용 */}
              <TabsContent value="paid" className="pt-2">
                <div className="space-y-4">
                  {filteredOrders
                    .filter(order => order.status === 'paid')
                    .map(order => (
                      <Card 
                        key={order.id}
                        className={`cursor-pointer hover:border-primary transition-colors ${selectedRealOrder?.id === order.id ? 'border-primary' : ''}`}
                        onClick={() => handleOrderClick(order)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium">
                                {order.buyerInfo 
                                  ? (typeof order.buyerInfo === 'string' 
                                    ? JSON.parse(order.buyerInfo).name 
                                    : order.buyerInfo.name)
                                  : '구매자 정보 없음'}
                              </h3>
                              <p className="text-sm text-muted-foreground">주문 #{order.id || order.orderId}</p>
                            </div>
                            <OrderStatusBadge status={order.status} />
                          </div>
                          <div className="mt-2 text-sm">
                            <p className="text-muted-foreground">
                              {order.createdAt 
                                ? new Date(order.createdAt).toLocaleString('ko-KR') 
                                : '시간 정보 없음'}
                            </p>
                            <p className="font-medium mt-1">
                              {order.price 
                                ? (typeof order.price === 'number' 
                                   ? order.price.toLocaleString() 
                                   : parseInt(String(order.price)).toLocaleString()) + '원' 
                                : '금액 정보 없음'}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>
              
              <TabsContent value="preparing" className="pt-2">
                <div className="space-y-4">
                  {filteredOrders
                    .filter(order => order.status === 'preparing')
                    .map(order => (
                      <Card 
                        key={order.id}
                        className={`cursor-pointer hover:border-primary transition-colors ${selectedRealOrder?.id === order.id ? 'border-primary' : ''}`}
                        onClick={() => handleOrderClick(order)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium">
                                {order.buyerInfo 
                                  ? (typeof order.buyerInfo === 'string' 
                                    ? JSON.parse(order.buyerInfo).name 
                                    : order.buyerInfo.name)
                                  : '구매자 정보 없음'}
                              </h3>
                              <p className="text-sm text-muted-foreground">주문 #{order.id || order.orderId}</p>
                            </div>
                            <OrderStatusBadge status={order.status} />
                          </div>
                          <div className="mt-2 text-sm">
                            <p className="text-muted-foreground">
                              {order.createdAt 
                                ? new Date(order.createdAt).toLocaleString('ko-KR') 
                                : '시간 정보 없음'}
                            </p>
                            <p className="font-medium mt-1">
                              {order.price 
                                ? (typeof order.price === 'number' 
                                   ? order.price.toLocaleString() 
                                   : parseInt(String(order.price)).toLocaleString()) + '원' 
                                : '금액 정보 없음'}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>
              
              <TabsContent value="shipped" className="pt-2">
                <div className="space-y-4">
                  {filteredOrders
                    .filter(order => order.status === 'shipped')
                    .map(order => (
                      <Card 
                        key={order.id}
                        className={`cursor-pointer hover:border-primary transition-colors ${selectedRealOrder?.id === order.id ? 'border-primary' : ''}`}
                        onClick={() => handleOrderClick(order)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium">
                                {order.buyerInfo 
                                  ? (typeof order.buyerInfo === 'string' 
                                    ? JSON.parse(order.buyerInfo).name 
                                    : order.buyerInfo.name)
                                  : '구매자 정보 없음'}
                              </h3>
                              <p className="text-sm text-muted-foreground">주문 #{order.id || order.orderId}</p>
                            </div>
                            <OrderStatusBadge status={order.status} />
                          </div>
                          <div className="mt-2 text-sm">
                            <p className="text-muted-foreground">
                              {order.createdAt 
                                ? new Date(order.createdAt).toLocaleString('ko-KR') 
                                : '시간 정보 없음'}
                            </p>
                            <p className="font-medium mt-1">
                              {order.price 
                                ? (typeof order.price === 'number' 
                                   ? order.price.toLocaleString() 
                                   : parseInt(String(order.price)).toLocaleString()) + '원' 
                                : '금액 정보 없음'}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>
              
              <TabsContent value="completed" className="pt-2">
                <div className="space-y-4">
                  {filteredOrders
                    .filter(order => order.status === 'completed')
                    .map(order => (
                      <Card 
                        key={order.id}
                        className={`cursor-pointer hover:border-primary transition-colors ${selectedRealOrder?.id === order.id ? 'border-primary' : ''}`}
                        onClick={() => handleOrderClick(order)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium">
                                {order.buyerInfo 
                                  ? (typeof order.buyerInfo === 'string' 
                                    ? JSON.parse(order.buyerInfo).name 
                                    : order.buyerInfo.name)
                                  : '구매자 정보 없음'}
                              </h3>
                              <p className="text-sm text-muted-foreground">주문 #{order.id || order.orderId}</p>
                            </div>
                            <OrderStatusBadge status={order.status} />
                          </div>
                          <div className="mt-2 text-sm">
                            <p className="text-muted-foreground">
                              {order.createdAt 
                                ? new Date(order.createdAt).toLocaleString('ko-KR') 
                                : '시간 정보 없음'}
                            </p>
                            <p className="font-medium mt-1">
                              {order.price 
                                ? (typeof order.price === 'number' 
                                   ? order.price.toLocaleString() 
                                   : parseInt(String(order.price)).toLocaleString()) + '원' 
                                : '금액 정보 없음'}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>
              
              <TabsContent value="bids" className="pt-2">
                <div className="space-y-4">
                  {filteredBids
                    .filter(bid => bid.status === 'pending')
                    .map(bid => (
                      <Card 
                        key={bid.id}
                        className={`cursor-pointer hover:border-primary transition-colors ${selectedBid?.id === bid.id ? 'border-primary' : ''}`}
                        onClick={() => handleBidClick(bid)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium">
                                {bid.user?.name || '구매자 정보 없음'}
                              </h3>
                              <p className="text-sm text-muted-foreground">입찰 #{bid.id}</p>
                            </div>
                            <Badge variant={bid.status === 'pending' ? 'outline' : 'default'}>
                              {bid.status === 'pending' ? '입찰 요청' : '입찰 완료'}
                            </Badge>
                          </div>
                          <div className="mt-2 text-sm">
                            <p className="text-muted-foreground">
                              {bid.createdAt 
                                ? new Date(bid.createdAt).toLocaleString('ko-KR') 
                                : '시간 정보 없음'}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>
              
              <TabsContent value="products" className="pt-2">
                <div className="mb-4 flex justify-end">
                  <Button onClick={handleAddProduct}>
                    <Plus className="mr-2 h-4 w-4" />
                    새 상품 추가
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {products.map(product => (
                    <Card key={product.id} className="overflow-hidden">
                      <div className="aspect-[4/3] relative">
                        {product.imageUrl && (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="object-cover w-full h-full"
                          />
                        )}
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">{product.name}</h3>
                          <p className="font-medium">{product.price.toLocaleString()}원</p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {product.description}
                        </p>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Package className="mr-1 h-4 w-4" />
                            재고: {product.stock}개
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditProduct(product);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProduct(product.id);
                              }}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        
        {/* 주문 상세 정보 영역 (두 번째 이미지의 오른쪽 패널) */}
        {selectedRealOrder && !showOrderChat && (
          <div className="w-2/3 bg-card overflow-auto border-l">
            <div className="sticky top-0 z-10 bg-card border-b p-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold flex items-center">
                  주문 상세 정보
                  <span className="ml-3">
                    <OrderStatusBadge status={selectedRealOrder.status} />
                  </span>
                </h3>
                <p className="text-sm text-muted-foreground">
                  주문 ID: #{selectedRealOrder.id || selectedRealOrder.orderId}
                </p>
              </div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowOrderChat(true); // 채팅창 표시
                  }}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  대화 내역 보기
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedRealOrder(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                {/* 배송 정보 */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <Truck className="mr-2 h-4 w-4" />
                      배송 정보
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-1">
                    <dl className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2">
                      <dt className="text-sm font-medium">받는 사람:</dt>
                      <dd className="text-sm">
                        {selectedRealOrder.buyerInfo 
                          ? (typeof selectedRealOrder.buyerInfo === 'string' 
                            ? JSON.parse(selectedRealOrder.buyerInfo).name 
                            : selectedRealOrder.buyerInfo.name) 
                          : '이름 정보 없음'}
                      </dd>
                      
                      <dt className="text-sm font-medium">연락처:</dt>
                      <dd className="text-sm">
                        {selectedRealOrder.buyerInfo 
                          ? (typeof selectedRealOrder.buyerInfo === 'string' 
                            ? JSON.parse(selectedRealOrder.buyerInfo).phone 
                            : selectedRealOrder.buyerInfo.phone) 
                          : '연락처 정보 없음'}
                      </dd>
                      
                      <dt className="text-sm font-medium align-top">배송지 주소:</dt>
                      <dd className="text-sm break-all">
                        {selectedRealOrder.buyerInfo 
                          ? (typeof selectedRealOrder.buyerInfo === 'string' 
                            ? JSON.parse(selectedRealOrder.buyerInfo).address 
                            : selectedRealOrder.buyerInfo.address) 
                          : '주소 정보 없음'}
                      </dd>
                    </dl>
                  </CardContent>
                </Card>
                
                {/* 결제 정보 */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <CreditCard className="mr-2 h-4 w-4" />
                      결제 정보
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-1">
                    <dl className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2">
                      <dt className="text-sm font-medium">결제 시간:</dt>
                      <dd className="text-sm">
                        {selectedRealOrder.createdAt 
                          ? new Date(selectedRealOrder.createdAt).toLocaleString('ko-KR') 
                          : '시간 정보 없음'}
                      </dd>
                      
                      <dt className="text-sm font-medium">결제 금액:</dt>
                      <dd className="text-sm">
                        {selectedRealOrder.price 
                          ? (typeof selectedRealOrder.price === 'number' 
                             ? selectedRealOrder.price.toLocaleString() 
                             : parseInt(String(selectedRealOrder.price)).toLocaleString()) + '원' 
                          : '금액 정보 없음'}
                      </dd>
                      
                      <dt className="text-sm font-medium">주문 상태:</dt>
                      <dd className="text-sm">
                        <OrderStatusBadge status={selectedRealOrder.status} />
                      </dd>
                    </dl>
                  </CardContent>
                </Card>
                
                {/* 상품 정보 */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <Package className="mr-2 h-4 w-4" />
                      상품 정보
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-1">
                    {selectedRealOrder.plant && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium mb-1">{selectedRealOrder.plant.name || '식물명 정보 없음'}</h4>
                        {selectedRealOrder.plant.description && (
                          <p className="text-sm text-muted-foreground">{selectedRealOrder.plant.description}</p>
                        )}
                      </div>
                    )}
                    
                    {selectedRealOrder.selectedProducts && selectedRealOrder.selectedProducts.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">선택된 상품:</h4>
                        <ul className="list-disc pl-5 space-y-1">
                          {selectedRealOrder.selectedProducts.map((product, index) => (
                            <li key={index} className="text-sm">
                              {product.name} - {product.price}원 x {product.quantity}개
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* 요청사항 */}
                {selectedRealOrder.vendorMessage && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        구매자 요청사항
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-1">
                      <div className="p-3 bg-muted rounded-md text-sm">
                        {selectedRealOrder.vendorMessage}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              
              {/* 주문 상태 변경 버튼 */}
              <div className="flex items-center justify-center space-x-4 mt-8 pb-8">
                {selectedRealOrder.status === 'paid' && (
                  <Button
                    variant="default"
                    className="w-full max-w-sm"
                    onClick={() => handleUpdateOrderStatus(selectedRealOrder.id, 'preparing')}
                  >
                    <Package className="mr-2 h-4 w-4" />
                    상품 준비 중으로 변경
                  </Button>
                )}
                
                {selectedRealOrder.status === 'preparing' && (
                  <Button
                    variant="default"
                    className="w-full max-w-sm"
                    onClick={() => handleUpdateOrderStatus(selectedRealOrder.id, 'shipped')}
                  >
                    <Truck className="mr-2 h-4 w-4" />
                    배송 시작으로 변경
                  </Button>
                )}
                
                {selectedRealOrder.status === 'shipped' && (
                  <Button
                    variant="default"
                    className="w-full max-w-sm"
                    onClick={() => handleUpdateOrderStatus(selectedRealOrder.id, 'completed')}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    완료로 변경
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* 주문 채팅 대화창 */}
      {showOrderChat && selectedRealOrder && (
        <OrderChat 
          order={selectedRealOrder} 
          onClose={() => {
            setShowOrderChat(false);
            // 채팅을 닫아도 주문 상세 정보는 유지
          }} 
        />
      )}
    </div>
  );
}