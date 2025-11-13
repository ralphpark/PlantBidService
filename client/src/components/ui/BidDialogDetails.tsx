import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label"; 
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { User, Phone, MessageSquare, Check, DollarSign, Calendar, Plus, Trash, ImagePlus, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConversationView } from "@/components/ui/ConversationView";

// 입찰 상세 정보 사이드바
export function BidDetailsSidebar({
  bid,
  isOpen,
  onClose,
  onUpdateBid,
  products
}: {
  bid: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdateBid: (bidId: string, bidData: any) => void;
  products: any[];
}) {
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
  const [referenceImages, setReferenceImages] = useState<string[]>(
    bid?.referenceImages || []
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  if (!bid) return null;

  const handleAddProduct = () => {
    if (!selectedProduct) return;
    
    const product = products.find(p => p.id.toString() === selectedProduct);
    if (!product) return;
    
    // 이미 추가된 제품인지 확인
    const existingProductIndex = selectedProducts.findIndex(
      p => p.id.toString() === selectedProduct
    );
    
    if (existingProductIndex >= 0) {
      // 이미 추가된 제품의 수량 증가
      const updatedProducts = [...selectedProducts];
      updatedProducts[existingProductIndex].quantity += 1;
      setSelectedProducts(updatedProducts);
    } else {
      // 새로운 제품 추가
      setSelectedProducts([
        ...selectedProducts,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1
        }
      ]);
    }
    
    // 총 금액 업데이트
    const newTotal = selectedProducts.reduce(
      (total, item) => total + (Number(item.price) * item.quantity),
      Number(product.price)
    );
    setPrice(newTotal.toString());
  };

  const handleRemoveProduct = (index: number) => {
    const updatedProducts = [...selectedProducts];
    const removedItem = updatedProducts[index];
    
    updatedProducts.splice(index, 1);
    setSelectedProducts(updatedProducts);
    
    // 총 금액 업데이트
    const newTotal = updatedProducts.reduce(
      (total, item) => total + (Number(item.price) * item.quantity),
      0
    );
    setPrice(newTotal.toString());
  };

  const handleQuantityChange = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const updatedProducts = [...selectedProducts];
    updatedProducts[index].quantity = newQuantity;
    setSelectedProducts(updatedProducts);
    
    // 총 금액 업데이트
    const newTotal = updatedProducts.reduce(
      (total, item) => total + (Number(item.price) * item.quantity),
      0
    );
    setPrice(newTotal.toString());
  };

  // 이미지 선택 처리
  const handleImageSelection = (index: number) => {
    // 해당 인덱스에 파일 선택기 표시
    if (fileInputRef.current) {
      fileInputRef.current.click();
      // 현재 선택된 이미지 인덱스 저장 (업로드 후 처리를 위해)
      fileInputRef.current.dataset.index = index.toString();
    }
  };
  
  // 이미지 업로드 처리
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const indexStr = e.target.dataset.index;
    const index = indexStr ? parseInt(indexStr) : 0;
    
    if (index < 0 || index >= 5) return;
    
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      toast({
        title: "이미지 파일 선택 오류",
        description: "이미지 파일만 업로드할 수 있습니다.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setUploading(true);
      
      // FormData 생성
      const formData = new FormData();
      formData.append('image', file);
      
      // 이미지 업로드 API 호출
      const response = await fetch('/api/uploads/image', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error("이미지 업로드에 실패했습니다");
      
      const data = await response.json();
      
      // 새 이미지 URL을 상태에 추가
      const newImages = [...referenceImages];
      newImages[index] = data.imageUrl;
      setReferenceImages(newImages);
      
      toast({
        title: "이미지 업로드 성공",
        description: "참조 이미지가 추가되었습니다."
      });
      
    } catch (error) {
      console.error("이미지 업로드 오류:", error);
      toast({
        title: "이미지 업로드 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      
      // 파일 입력 초기화 (같은 파일 재선택 가능하도록)
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // 이미지 삭제 처리
  const handleRemoveImage = (index: number) => {
    const newImages = [...referenceImages];
    newImages[index] = '';
    setReferenceImages(newImages);
  };

  const handleSubmitBid = () => {
    if (!price || Number(price) <= 0) {
      toast({
        title: "금액을 확인해주세요",
        description: "유효한 금액을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    // 이미지 URL 배열에서 빈 값 제거
    const cleanedImages = referenceImages.filter(img => img);

    // 입찰 데이터 업데이트
    onUpdateBid(bid.id.toString(), {
      price: Number(price),
      vendorMessage: bidMessage,
      selectedProducts: selectedProducts,
      selectedProductId: selectedProduct ? Number(selectedProduct) : undefined,
      referenceImages: cleanedImages,
      status: "bidded"
    });
    
    // 다이얼로그 닫기
    onClose();
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return "";
    return phone.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
  };

  const totalPrice = selectedProducts.reduce(
    (total, item) => total + (Number(item.price) * item.quantity), 
    0
  );

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full max-w-3xl max-h-screen flex flex-col p-0 pt-6">
        <SheetHeader className="px-6">
          <SheetTitle className="text-xl">입찰 상세 정보</SheetTitle>
          <SheetDescription>
            입찰 #{bid.id} - {bid.plant?.name || ""}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-[calc(90vh-180px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              {/* 고객 정보 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    고객 정보
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2">
                    <div className="text-sm font-medium">이름:</div>
                    <div className="text-sm">{bid.user?.name || "이름 정보 없음"}</div>
                    
                    <div className="text-sm font-medium">연락처:</div>
                    <div className="text-sm">
                      {bid.user?.phone ? formatPhoneNumber(bid.user.phone) : "연락처 정보 없음"}
                    </div>
                    
                    <div className="text-sm font-medium">위치:</div>
                    <div className="text-sm">
                      {bid.customer?.address || "위치 정보 없음"}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 식물 정보 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    요청 정보
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2">
                    <div className="text-sm font-medium">식물:</div>
                    <div className="text-sm">{bid.plant?.name || "식물 정보 없음"}</div>
                    
                    <div className="text-sm font-medium">요청 사항:</div>
                    <div className="text-sm">{bid.vendorMessage || "요청 사항 없음"}</div>
                    
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
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    대화 내역
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ConversationView 
                    conversationId={bid.conversationId} 
                    user={{ name: "판매자", role: "vendor" }} 
                    className="h-[200px]"
                  />
                </CardContent>
              </Card>
              
              {/* 입찰 내용 입력 */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
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
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuantityChange(index, product.quantity - 1)}
                                disabled={product.quantity <= 1}
                              >
                                -
                              </Button>
                              <span className="w-8 text-center">{product.quantity}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuantityChange(index, product.quantity + 1)}
                              >
                                +
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveProduct(index)}
                              >
                                <Trash className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <div className="border-t pt-2 flex justify-between">
                          <span className="font-bold">총 금액:</span>
                          <span className="font-bold">{totalPrice.toLocaleString()}원</span>
                        </div>
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

                  {/* 참조 이미지 업로드 */}
                  <div className="space-y-2">
                    <Label>참조 이미지 (최대 5장)</Label>
                    <div className="grid grid-cols-5 gap-2 p-2 border rounded-md">
                      {Array(5).fill(0).map((_, index) => (
                        <div 
                          key={index} 
                          className="aspect-square bg-muted rounded-md flex flex-col items-center justify-center border border-dashed relative overflow-hidden group"
                          onClick={() => !uploading && handleImageSelection(index)}
                        >
                          {referenceImages[index] ? (
                            <>
                              <img 
                                src={referenceImages[index]} 
                                alt={`참조 이미지 ${index + 1}`} 
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveImage(index);
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </>
                          ) : uploading ? (
                            <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                          ) : (
                            <div className="flex flex-col items-center justify-center cursor-pointer">
                              <ImagePlus className="h-5 w-5 text-muted-foreground mb-1" />
                              <span className="text-xs text-muted-foreground">이미지 추가</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">* 이미지를 클릭하여 업로드하세요. 각 이미지는 최대 5MB 크기까지 가능합니다.</p>
                    
                    {/* 숨겨진 파일 입력 */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </div>

                  {/* 입찰 메시지 */}
                  <div className="space-y-2">
                    <Label htmlFor="bid-message">고객에게 전달할 메시지</Label>
                    <Textarea
                      id="bid-message"
                      value={bidMessage}
                      onChange={(e) => setBidMessage(e.target.value)}
                      placeholder="고객에게 전달할 메시지를 입력하세요"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>

        <SheetFooter className="border-t p-4 px-6 flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            취소
          </Button>
          <Button onClick={handleSubmitBid}>
            <Check className="mr-2 h-4 w-4" />
            입찰 제출
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}