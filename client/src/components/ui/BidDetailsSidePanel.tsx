import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label"; 
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { User, Phone, MessageSquare, Check, DollarSign, Calendar, Plus, Trash, ImagePlus, Loader2, AlertCircle, Leaf, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConversationViewReadOnly } from "@/components/ui/ConversationViewReadOnly";

// 입찰 상세 정보 사이드패널 컴포넌트
export function BidDetailsSidePanel({
  bid,
  onUpdateBid,
  products
}: {
  bid: any;
  onUpdateBid: (bidId: string, bidData: any, closePanel?: boolean) => void;
  products: any[];
}) {
  // 입찰 데이터 상태 관리
  const [price, setPrice] = useState(bid?.price?.toString() || "");
  const [bidMessage, setBidMessage] = useState(bid?.vendorMessage || "");
  // 선택된 상품들 초기화 (bid.selectedProduct가 있으면 그것도 포함)
  const [selectedProducts, setSelectedProducts] = useState<any[]>(() => {
    // 기존 선택된 상품들 배열
    const existingProducts = bid?.selectedProducts || [];
    
    // bid.selectedProduct가 있고 아직 포함되지 않았다면 추가
    if (bid?.selectedProduct && 
        !existingProducts.some((p: any) => p.id === bid.selectedProduct.id)) {
      return [...existingProducts, bid.selectedProduct];
    }
    
    return existingProducts;
  });
  
  // 선택된 상품 ID (단일)
  const [selectedProduct, setSelectedProduct] = useState<string>(() => {
    // selectedProductId가 있으면 그 값 사용
    if (bid?.selectedProductId) {
      return bid.selectedProductId.toString();
    }
    // selectedProduct 객체가 있으면 그 ID 사용
    else if (bid?.selectedProduct?.id) {
      return bid.selectedProduct.id.toString();
    }
    // 둘 다 없으면 빈 문자열
    return "";
  });
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [plantInfo, setPlantInfo] = useState<any>(null); // 식물 정보 추가
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState(bid?.status || "pending");
  const { toast } = useToast();
  
  // 입찰 정보 로드 및 상태 업데이트
  useEffect(() => {
    const loadBidDetails = async () => {
      if (!bid || !bid.id) return;
      
      setLoading(true);
      try {
        // 입찰 상세 정보 가져오기
        const response = await fetch(`/api/bids/${bid.id}`);
        if (response.ok) {
          const bidDetails = await response.json();
          console.log("[BidDetailsSidePanel] 입찰 상세 정보 로드:", bidDetails);
          
          // 입찰 기본 정보 설정
          setPrice(bidDetails.price?.toString() || "");
          setBidMessage(bidDetails.vendorMessage || "");
          
          // 상태 업데이트 (중요: 이 부분이 누락되면 UI가 업데이트되지 않음)
          setStatus(bidDetails.status || "pending");
          
          // 선택한 상품 업데이트
          if (bidDetails.selectedProducts && Array.isArray(bidDetails.selectedProducts)) {
            setSelectedProducts(bidDetails.selectedProducts);
          } else if (bidDetails.selectedProductIds && Array.isArray(bidDetails.selectedProductIds)) {
            // 선택된 상품 ID로 상품 정보 불러오기
            const selectedProds = products.filter(p => 
              bidDetails.selectedProductIds.includes(p.id.toString()) || 
              bidDetails.selectedProductIds.includes(p.id)
            );
            setSelectedProducts(selectedProds);
          }
          
          // 식물 정보 불러오기
          if (bidDetails.plantId) {
            try {
              const plantResponse = await fetch(`/api/plants/${bidDetails.plantId}`);
              if (plantResponse.ok) {
                const plantData = await plantResponse.json();
                setPlantInfo(plantData);
              }
            } catch (error) {
              console.error("식물 정보 로드 오류:", error);
            }
          }
        }
      } catch (error) {
        console.error("입찰 정보 로드 실패:", error);
        toast({
          title: "입찰 정보 로드 실패",
          description: "서버에서 입찰 세부 정보를 가져오는데 실패했습니다.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadBidDetails();
  }, [bid?.id, bid?.status, products, toast]); // bid.status 변경 시에도 다시 로드
  
  // 전화번호 형식 변환 (010-1234-5678)
  function formatPhoneNumber(phone: string): string {
    if (!phone) return "";
    return phone
      .replace(/[^0-9]/g, "")
      .replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
  }
  
  // 제품 추가 처리
  const handleAddProduct = async () => {
    // 이미 선택된 제품 중복 확인
    if (selectedProduct && !selectedProducts.some(p => p.id === selectedProduct)) {
      const productToAdd = products.find(p => p.id.toString() === selectedProduct);
      
      if (productToAdd) {
        const newProducts = [...selectedProducts, productToAdd];
        setSelectedProducts(newProducts);
        
        // 상품 추가 시 자동으로 상태를 "검토중"으로 변경
        const newStatus = 'reviewing';
        setStatus(newStatus);
        
        // 서버에 상태 변경 사항 저장 (bid 상태 및 선택된 제품 저장)
        try {
          const productIds = newProducts.map(p => p.id);
          
          // 서버에 입찰 상태와 선택된 제품 저장
          await onUpdateBid(bid.id.toString(), {
            status: newStatus,
            selectedProducts: newProducts,
            selectedProductIds: productIds
          }, false);
          
          // 대화 메시지 추가 (대화가 있는 경우에만)
          if (bid.conversationId) {
            // 판매자 정보 조회
            let vendorInfo = null;
            const vendorResponse = await fetch(`/api/vendors/${bid.vendorId}`);
            if (vendorResponse.ok) {
              vendorInfo = await vendorResponse.json();
              
              // vendorColor 처리
              const vendorColorValue = typeof vendorInfo?.color === 'object' 
                ? vendorInfo?.color?.bg || "bg-slate-50"
                : vendorInfo?.color || "bg-slate-50";
              
              // 상품 추가 메시지 생성
              const reviewMessage = {
                role: "vendor",
                content: `상품이 추가되어 입찰을 검토중입니다. 상품명: ${productToAdd.name}`,
                timestamp: new Date().toISOString(),
                bidStatus: newStatus,
                vendorId: bid.vendorId,
                vendorName: vendorInfo?.name || "판매자",
                vendorColor: vendorColorValue,
                storeName: vendorInfo?.storeName || "식물 가게",
              };
              
              // 메시지 전송
              const messageResponse = await fetch(`/api/conversations/${bid.conversationId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reviewMessage),
                credentials: 'include'
              });
              
              if (messageResponse.ok) {
                // 대화 창 새로고침 이벤트 발생
                const event = new CustomEvent('message-sent', { 
                  detail: { conversationId: bid.conversationId }
                });
                window.dispatchEvent(event);
              }
            }
          }
          
          toast({
            title: "검토중 상태로 변경됨",
            description: "상품이 추가되어 자동으로 입찰 상태가 '검토중'으로 변경되었습니다.",
            variant: "default"
          });
        } catch (error) {
          console.error("상태 변경 중 오류 발생:", error);
          toast({
            title: "상태 변경 실패",
            description: "상태를 변경하는 중 오류가 발생했습니다.",
            variant: "destructive"
          });
        }
      }
    }
    setSelectedProduct("");
  };
  
  // 제품 제거 처리
  const handleRemoveProduct = async (productId: string) => {
    // 제품 제거
    const updatedProducts = selectedProducts.filter(p => p.id.toString() !== productId);
    setSelectedProducts(updatedProducts);
    
    try {
      // 서버에 변경사항 저장
      const productIds = updatedProducts.map(p => p.id);
      
      // 상태 관리: 제품이 없으면 'pending', 있으면 현재 상태 유지
      let currentStatus = status;
      if (updatedProducts.length === 0 && status === 'reviewing') {
        currentStatus = 'pending';
        setStatus(currentStatus);
      }
      
      // 서버에 업데이트 요청
      await onUpdateBid(bid.id.toString(), {
        selectedProducts: updatedProducts,
        selectedProductIds: productIds,
        status: currentStatus
      }, false);
      
      // 제품을 모두 제거한 경우 메시지 추가
      if (updatedProducts.length === 0 && bid.conversationId) {
        // 판매자 정보 조회
        const vendorResponse = await fetch(`/api/vendors/${bid.vendorId}`);
        if (vendorResponse.ok) {
          const vendorInfo = await vendorResponse.json();
          
          // vendorColor 처리
          const vendorColorValue = typeof vendorInfo?.color === 'object' 
            ? vendorInfo?.color?.bg || "bg-slate-50"
            : vendorInfo?.color || "bg-slate-50";
          
          // 상품 제거 메시지 생성
          const message = {
            role: "vendor",
            content: "모든 상품이 제거되어 입찰 상태가 초기화되었습니다.",
            timestamp: new Date().toISOString(),
            bidStatus: currentStatus,
            vendorId: bid.vendorId,
            vendorName: vendorInfo?.name || "판매자",
            vendorColor: vendorColorValue,
            storeName: vendorInfo?.storeName || "식물 가게",
          };
          
          // 메시지 전송
          const messageResponse = await fetch(`/api/conversations/${bid.conversationId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message),
            credentials: 'include'
          });
          
          if (messageResponse.ok) {
            // 대화 창 새로고침 이벤트 발생
            const event = new CustomEvent('message-sent', { 
              detail: { conversationId: bid.conversationId }
            });
            window.dispatchEvent(event);
          }
        }
      }
      
      toast({
        title: "제품 제거 완료",
        description: updatedProducts.length === 0 
          ? "모든 제품이 제거되어 입찰 상태가 초기화되었습니다." 
          : "선택한 제품이 제거되었습니다.",
        variant: "default"
      });
    } catch (error) {
      console.error("제품 제거 중 오류 발생:", error);
      toast({
        title: "제품 제거 실패",
        description: "제품을 제거하는 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };
  
  // 입찰 수정 저장
  const handleSaveBid = async () => {
    // 가격 유효성 검증
    if (!price || isNaN(Number(price))) {
      toast({
        title: "가격 오류",
        description: "유효한 가격을 입력해주세요",
        variant: "destructive"
      });
      return;
    }
    
    // 상품 선택 유효성 검증 (상품이 하나 이상 선택되어야 함)
    if (selectedProducts.length === 0) {
      toast({
        title: "상품 선택 필요",
        description: "최소 하나의 상품을 선택해야 입찰을 완료할 수 있습니다",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // 선택된 제품들의 ID 배열 생성
      const productIds = selectedProducts.map(p => p.id);
      
      // 단일 상품이 선택된 경우, selectedProductId도 설정
      const selectedProductId = selectedProducts.length === 1 ? selectedProducts[0].id : null;
      
      // 이미지 배열 정리 (null 제거)
      const cleanedImages = bid.referenceImages ? 
        bid.referenceImages.filter((img: any) => img && typeof img === 'string') : [];
      
      // 입찰 완료 상태로 변경
      const newStatus = 'bidded';
      setStatus(newStatus);
      
      // 변경 내용 로깅
      console.log("[BidDetailsSidePanel] 입찰 정보 저장:", {
        bidId: bid.id,
        price: Number(price),
        message: bidMessage,
        status: newStatus, // 새 상태(bidded)로 설정
        selectedProducts,
        productIds,
        selectedProductId,
        images: cleanedImages
      });
      
      // 입찰 데이터 업데이트
      await onUpdateBid(bid.id.toString(), {
        price: Number(price),
        vendorMessage: bidMessage,
        status: newStatus, // 새 상태(bidded)로 설정
        selectedProducts,
        selectedProductIds: productIds,
        selectedProductId: selectedProductId, // 직접 selectedProductId 설정
        referenceImages: cleanedImages // 정리된 참고 사진 데이터 포함
      }, false); // 패널 닫지 않기
      
      // 대화 메시지 업데이트
      if (bid.conversationId) {
        try {
          // 현재 대화 내용 가져오기
          const convResponse = await fetch(`/api/conversations/${bid.conversationId}`);
          if (convResponse.ok) {
            const conversation = await convResponse.json();
            const currentMessages = conversation.messages || [];
            
            // 판매자 정보 조회
            let vendorInfo = null;
            const vendorResponse = await fetch(`/api/vendors/${bid.vendorId}`);
            if (vendorResponse.ok) {
              vendorInfo = await vendorResponse.json();
            }
            
            // 선택된 제품 정보 가져오기
            let productInfo = null;
            if (selectedProductId) {
              const selectedProduct = selectedProducts.find(p => p.id.toString() === selectedProductId);
              if (selectedProduct) {
                productInfo = {
                  id: selectedProduct.id,
                  name: selectedProduct.name,
                  description: selectedProduct.description,
                  price: selectedProduct.price,
                  imageUrl: selectedProduct.imageUrl
                };
              }
            }
            
            // 입찰 완료 메시지 생성
            const newMessage = {
              role: "vendor",
              content: bidMessage || "입찰이 완료되었습니다. 확인해 주세요.",
              timestamp: new Date(),
              vendorId: bid.vendorId,
              product: productInfo,
              price: Number(price),
              referenceImages: cleanedImages,
              imageUrl: cleanedImages && cleanedImages.length > 0 ? cleanedImages[0] : undefined,
              bidStatus: "completed", // 메시지에 입찰 상태 표시
              vendorName: vendorInfo?.name || "판매자", // 판매자 이름
              storeName: vendorInfo?.storeName || "식물 가게" // 상점 이름
            };
            
            // 메시지 업데이트
            await fetch(`/api/conversations/${bid.conversationId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messages: [...currentMessages, newMessage]
              })
            });
          }
        } catch (error) {
          console.error("메시지 전송 오류:", error);
          // 메시지 전송에 실패해도 입찰 정보는 업데이트됨
        }
      }
      
      toast({
        title: "입찰이 완료되었습니다",
        description: "고객에게 입찰 완료 알림이 전송되었습니다",
        variant: "default"
      });
    } catch (error) {
      console.error("Error updating bid:", error);
      toast({
        title: "입찰 완료 실패",
        description: "다시 시도해주세요",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">입찰 상세 정보</h2>
        <div className="text-sm text-muted-foreground">
          #{bid.id} - {bid.createdAt ? new Date(bid.createdAt).toLocaleString('ko-KR') : ''}
        </div>
      </div>
      
      <ScrollArea className="flex-1 pr-4 h-full">
        <div className="space-y-6">
          {/* 고객 정보 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-md flex items-center">
                <User className="mr-2 h-4 w-4" />
                고객 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-2">
                <div className="text-sm font-medium">이름:</div>
                <div className="text-sm">{bid.user?.name || "이름 정보 없음"}</div>
                
                <div className="text-sm font-medium">연락처:</div>
                <div className="text-sm">
                  {bid.user?.phone ? formatPhoneNumber(bid.user.phone) : "연락처 정보 없음"}
                </div>
                
                <div className="text-sm font-medium">위치:</div>
                <div className="text-sm">
                  {bid.customerInputAddress || bid.customer?.address || "위치 정보 없음"}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 식물 정보 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-md flex items-center">
                <MessageSquare className="mr-2 h-4 w-4" />
                요청 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-2">
                <div className="text-sm font-medium">식물:</div>
                <div className="text-sm">{bid.plant?.name || "식물 정보 없음"}</div>
                
                <div className="text-sm font-medium">요청 사항:</div>
                <div className="text-sm">{bid.userRequests || "요청 사항 없음"}</div>
                
                <div className="text-sm font-medium">리본 요청:</div>
                <div className="text-sm">{bid.ribbonRequest ? "예" : "아니요"}</div>
                
                {bid.ribbonRequest && bid.ribbonMessage && (
                  <>
                    <div className="text-sm font-medium">리본 메시지:</div>
                    <div className="text-sm">{bid.ribbonMessage}</div>
                  </>
                )}
                
                <div className="text-sm font-medium">희망 배송 시간:</div>
                <div className="text-sm">
                  {bid.deliveryTime || "지정 없음"}
                </div>
                
                <div className="text-sm font-medium">작성일:</div>
                <div className="text-sm">
                  {bid.createdAt
                    ? new Date(bid.createdAt).toLocaleString("ko-KR")
                    : "작성일 정보 없음"}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 대화 내용 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-md flex items-center">
                <MessageSquare className="mr-2 h-4 w-4" />
                대화 내역
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ConversationViewReadOnly 
                conversationId={bid.conversationId} 
                user={{ name: "판매자", role: "vendor", viewMode: "dashboard" }} 
                className="h-[550px] border rounded-md"
              />
            </CardContent>
          </Card>
          
          {/* 입찰 내용 입력 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-md flex items-center">
                <DollarSign className="mr-2 h-4 w-4" />
                판매자 입찰 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 제품 선택 및 추가 */}
              <div className="space-y-2">
                <Label htmlFor="product-select">상품 선택</Label>
                <div className="flex space-x-2">
                  <Select 
                    value={selectedProduct} 
                    onValueChange={setSelectedProduct}
                  >
                    <SelectTrigger id="product-select" className="flex-1">
                      <SelectValue placeholder="상품을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name} - {Number(product.price).toLocaleString()}원
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleAddProduct}
                    disabled={!selectedProduct}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    추가
                  </Button>
                </div>
              </div>

              {/* 선택된 제품 목록 */}
              <div className="space-y-2">
                <Label>선택된 상품</Label>
                {selectedProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    아직 선택된 상품이 없습니다.
                  </p>
                ) : (
                  <div className="space-y-2 border rounded-md p-3">
                    {selectedProducts.map((product, index) => (
                      <div key={`${product.id}-${index}`} className="flex items-center justify-between">
                        <div className="flex-1 text-sm">
                          <span className="font-medium">{product.name}</span>
                          <span className="text-muted-foreground"> • {Number(product.price).toLocaleString()}원</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveProduct(product.id.toString())}
                        >
                          <Trash className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 입찰 금액 */}
              <div className="space-y-2">
                <Label htmlFor="price">입찰 금액</Label>
                <Input
                  id="price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="금액을 입력하세요"
                />
              </div>

              {/* 판매자 메시지 */}
              <div className="space-y-2">
                <Label htmlFor="bid-message">메시지</Label>
                <Textarea 
                  id="bid-message"
                  value={bidMessage}
                  onChange={(e) => setBidMessage(e.target.value)}
                  placeholder="고객에게 전달할 메시지를 입력하세요"
                  rows={3}
                />
              </div>

              {/* 참고 사진 업로드 */}
              <div className="space-y-2">
                <Label>참고 사진 (최대 5장)</Label>
                <div className="flex flex-col space-y-2">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {bid.referenceImages && Array.isArray(bid.referenceImages) && 
                     bid.referenceImages.filter((img: any) => img && typeof img === 'string').map((image: string, index: number) => (
                      <div key={index} className="relative w-20 h-20">
                        <img 
                          src={image} 
                          alt={`참고사진 ${index+1}`} 
                          className="w-full h-full object-cover rounded-md" 
                        />
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="icon" 
                          className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                          onClick={() => {
                            // 유효한 이미지만 필터링
                            const validImages = (bid.referenceImages || []).filter((img: any) => img && typeof img === 'string');
                            
                            // 해당 인덱스의 이미지 제거
                            validImages.splice(index, 1);
                            
                            // 로컬 상태 업데이트
                            bid.referenceImages = validImages;
                            
                            // 패널 닫지 않고 업데이트
                            onUpdateBid(bid.id.toString(), { referenceImages: validImages }, false);
                          }}
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0) return;
                      
                      // 유효한 이미지만 카운트
                      const validImagesCount = bid.referenceImages ? 
                        bid.referenceImages.filter((img: any) => img && typeof img === 'string').length : 0;
                        
                      // 최대 파일 수 제한 (현재 + 새로 선택한 파일들이 5개를 넘지 않도록)
                      const availableSlots = 5 - validImagesCount;
                      if (availableSlots <= 0) {
                        toast({
                          title: "최대 5장까지 업로드 가능합니다",
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      // 최대 갯수까지만 처리
                      const filesToUpload = Array.from(files).slice(0, availableSlots);
                      
                      setUploading(true);
                      try {
                        const formData = new FormData();
                        
                        // 여러 이미지 추가
                        filesToUpload.forEach(file => {
                          formData.append('images', file);
                        });
                        
                        const response = await fetch('/api/uploads/image', {
                          method: 'POST',
                          body: formData,
                        });
                        
                        if (!response.ok) throw new Error('이미지 업로드에 실패했습니다');
                        
                        const result = await response.json();
                        
                        // 기존 이미지 배열에 새 이미지 추가
                        let imageUrls: string[] = [];
                        
                        if (result.images && Array.isArray(result.images)) {
                          imageUrls = result.images.map((img: any) => img.url);
                        } else if (result.url) {
                          imageUrls = [result.url]; // 단일 이미지 경우
                        }
                        
                        if (imageUrls.length === 0) throw new Error('이미지 URL을 가져올 수 없습니다');
                        
                        // 새 이미지 배열 생성 (기존 유효 이미지 + 새 이미지)
                        const existingValidImages = bid.referenceImages ? 
                          bid.referenceImages.filter((img: any) => img && typeof img === 'string') : [];
                          
                        const newImages = [...existingValidImages, ...imageUrls];
                        
                        // 로컬 상태 업데이트 (즉시 보이도록)
                        bid.referenceImages = newImages;
                        
                        // 서버에 입찰 정보 업데이트
                        await onUpdateBid(bid.id.toString(), {
                          referenceImages: newImages
                        }, false); // 확장 패널 닫지 않음
                        
                        toast({
                          title: "이미지 업로드 완료",
                          description: `${imageUrls.length}장의 참고 사진이 추가되었습니다.`
                        });
                      } catch (error) {
                        console.error("이미지 업로드 오류:", error);
                        toast({
                          title: "이미지 업로드 실패",
                          description: "다시 시도해주세요",
                          variant: "destructive"
                        });
                      } finally {
                        setUploading(false);
                        // 파일 입력 초기화
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }
                    }}
                  />
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || (bid.referenceImages && 
                                 bid.referenceImages.filter((img: any) => img && typeof img === 'string').length >= 5)}
                    className="w-full"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        업로드 중...
                      </>
                    ) : (
                      <>
                        <ImagePlus className="h-4 w-4 mr-2" />
                        사진 추가 (최대 5장, 일괄선택 가능)
                      </>
                    )}
                  </Button>
                </div>
              </div>



              {/* 저장 버튼 - 완료 또는 입찰된 경우 비활성화 */}
              <Button 
                onClick={(e) => {
                  // 입찰하기 버튼이고 상품이 선택되지 않은 경우
                  if (bid.status === 'reviewing' && selectedProducts.length === 0) {
                    e.preventDefault();
                    
                    // 팝업 메시지 표시
                    toast({
                      title: "식물을 선택해주세요",
                      description: "입찰하기 전에 최소 한 개 이상의 식물을 선택하셔야 합니다",
                      variant: "destructive"
                    });
                    return;
                  }
                  handleSaveBid();
                }} 
                className={`w-full ${bid.status === 'completed' || bid.status === 'bidded' ? 'opacity-50' : ''}`}
                disabled={bid.status === 'completed' || bid.status === 'bidded' || 
                        (bid.status === 'reviewing' && selectedProducts.length === 0)}
              >
                {bid.status === 'completed' ? '완료된 입찰' :
                 bid.status === 'bidded' ? '입찰 완료됨' : 
                 bid.status === 'reviewing' ? '입찰하기' : 
                 '입찰 정보 저장'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}