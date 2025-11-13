import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label"; 
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { User, Phone, MessageSquare, Check, DollarSign, Calendar, Plus, Trash, ImagePlus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConversationView } from "@/components/ui/ConversationView";

// 입찰 아코디언 디테일 컴포넌트
export function BidAccordionDetails({
  bid,
  onUpdateBid,
  products
}: {
  bid: any;
  onUpdateBid: (bidId: string, data: any) => void;
  products: any[];
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 입찰 정보 상태 관리
  const [bidMessage, setBidMessage] = useState(bid.vendorMessage || "");
  const [price, setPrice] = useState(bid.price?.toString() || "");
  
  // 선택된 상품들 초기화 (bid.selectedProduct가 있으면 그것도 포함)
  const [selectedProducts, setSelectedProducts] = useState<any[]>(() => {
    // 기존 선택된 상품들 배열
    const existingProducts = bid.selectedProducts || [];
    
    // bid.selectedProduct가 있고 아직 포함되지 않았다면 추가
    if (bid.selectedProduct && 
        !existingProducts.some((p: any) => p.id === bid.selectedProduct.id)) {
      return [...existingProducts, bid.selectedProduct];
    }
    
    return existingProducts;
  });
  
  // 선택된 상품 ID (단일)
  const [selectedProduct, setSelectedProduct] = useState<string | undefined>(() => {
    // selectedProductId가 있으면 그 값 사용
    if (bid.selectedProductId) {
      return bid.selectedProductId.toString();
    }
    // selectedProduct 객체가 있으면 그 ID 사용
    else if (bid.selectedProduct?.id) {
      return bid.selectedProduct.id.toString();
    }
    // 둘 다 없으면 undefined
    return undefined;
  });
  const [referenceImages, setReferenceImages] = useState<string[]>(
    bid.referenceImages || []
  );
  const [uploadingImage, setUploadingImage] = useState(false);

  // 이미지 업로드 처리
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingImage(true);
    
    try {
      const formData = new FormData();
      formData.append("image", files[0]);
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });
      
      if (!response.ok) {
        throw new Error("이미지 업로드에 실패했습니다");
      }
      
      const data = await response.json();
      setReferenceImages([...referenceImages, data.url]);
      
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      toast({
        title: "이미지 업로드 성공",
        description: "참고 이미지가 업로드되었습니다.",
      });
    } catch (error) {
      console.error("이미지 업로드 오류:", error);
      toast({
        title: "이미지 업로드 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
        variant: "destructive"
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // 제품 선택 처리
  const handleProductSelection = (productId: string) => {
    setSelectedProduct(productId);
    
    const product = products.find(p => p.id.toString() === productId);
    if (product) {
      // 이미 선택된 제품인지 확인
      const existingIndex = selectedProducts.findIndex(
        p => p.id.toString() === product.id.toString()
      );
      
      if (existingIndex === -1) {
        // 새로운 제품 추가
        setSelectedProducts([
          ...selectedProducts,
          {
            id: product.id,
            name: product.name,
            price: product.price,
            description: product.description,
            imageUrl: product.imageUrl,
            quantity: 1
          }
        ]);
      }
    }
  };

  // 선택된 제품 제거
  const removeSelectedProduct = (index: number) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };

  // 제품 수량 변경
  const updateProductQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return;
    
    const updatedProducts = [...selectedProducts];
    updatedProducts[index] = {
      ...updatedProducts[index],
      quantity
    };
    
    setSelectedProducts(updatedProducts);
  };

  // 참조 이미지 제거
  const removeReferenceImage = (index: number) => {
    setReferenceImages(referenceImages.filter((_, i) => i !== index));
  };

  // 입찰 제출 처리
  const handleSubmitBid = () => {
    if (!price) {
      toast({
        title: "가격을 입력하세요",
        description: "입찰을 제출하려면 가격을 입력해야 합니다.",
        variant: "destructive"
      });
      return;
    }

    if (selectedProducts.length === 0) {
      toast({
        title: "상품을 선택하세요",
        description: "입찰을 제출하려면 하나 이상의 상품을 선택해야 합니다.",
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
    <Card className="mt-4 border-t-0 rounded-t-none">
      <CardContent className="p-4 pt-6">
        <div className="space-y-6">
          {/* 고객 정보 섹션 */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">고객 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center text-sm">
                <User className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground mr-2">이름:</span>
                <span>{bid.user?.name || '이름 정보 없음'}</span>
              </div>
              <div className="flex items-center text-sm">
                <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground mr-2">연락처:</span>
                <span>{formatPhoneNumber(bid.user?.phone) || '연락처 정보 없음'}</span>
              </div>
            </div>
          </div>

          {/* 식물 정보 */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">식물 정보</h3>
            <div className="bg-muted/50 p-3 rounded-md">
              <h4 className="font-medium">{bid.plant?.name || "식물 이름 정보 없음"}</h4>
              <p className="text-sm text-muted-foreground mt-1">{bid.plantDescription || "식물 설명 정보 없음"}</p>
              {bid.plant?.imageUrl && (
                <div className="mt-3">
                  <img
                    src={bid.plant.imageUrl}
                    alt={bid.plant.name}
                    className="rounded-md w-full max-h-40 object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 입찰 메시지 */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">입찰 메시지</h3>
            <Textarea
              placeholder="고객에게 전달할 메시지를 입력하세요"
              value={bidMessage}
              onChange={(e) => setBidMessage(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {/* 가격 설정 */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">가격 설정</h3>
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
              <Input
                type="number"
                placeholder="가격을 입력하세요"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="max-w-[200px]"
              />
              <span className="ml-2 text-sm text-muted-foreground">원</span>
            </div>
          </div>

          {/* 제품 선택 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">제품 선택</h3>
              <div className="text-sm text-muted-foreground">
                총 가격: {totalPrice.toLocaleString()}원
              </div>
            </div>
            
            <Select
              value={selectedProduct}
              onValueChange={handleProductSelection}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="제품을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {products.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    등록된 제품이 없습니다
                  </div>
                ) : (
                  products.map((product) => (
                    <SelectItem
                      key={product.id}
                      value={product.id.toString()}
                    >
                      {product.name} - {Number(product.price).toLocaleString()}원
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            
            {selectedProducts.length > 0 && (
              <div className="space-y-2 mt-3">
                <h4 className="text-sm font-medium">선택된 제품</h4>
                {selectedProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between bg-muted/30 p-2 rounded-md">
                    <div className="flex items-center space-x-2">
                      {product.imageUrl && (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-8 h-8 rounded object-cover"
                        />
                      )}
                      <div>
                        <div className="font-medium text-sm">{product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {Number(product.price).toLocaleString()}원 x {product.quantity} = {(Number(product.price) * product.quantity).toLocaleString()}원
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => updateProductQuantity(index, product.quantity - 1)}
                          disabled={product.quantity <= 1}
                        >
                          <span className="text-lg">-</span>
                        </Button>
                        <span className="w-6 text-center">{product.quantity}</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => updateProductQuantity(index, product.quantity + 1)}
                        >
                          <span className="text-lg">+</span>
                        </Button>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeSelectedProduct(index)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 참고 이미지 */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">참고 이미지</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {referenceImages.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image}
                    alt={`참고 이미지 ${index + 1}`}
                    className="rounded-md w-full h-24 object-cover"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeReferenceImage(index)}
                  >
                    <Trash className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-md w-full h-24">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={uploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center p-2 h-auto text-muted-foreground"
                >
                  {uploadingImage ? (
                    <Loader2 className="h-5 w-5 animate-spin mb-1" />
                  ) : (
                    <ImagePlus className="h-5 w-5 mb-1" />
                  )}
                  <span className="text-xs">이미지 추가</span>
                </Button>
              </div>
            </div>
          </div>

          {/* 제출 버튼 */}
          <div className="flex justify-end pt-4">
            <Button
              type="button"
              onClick={handleSubmitBid}
              className="flex items-center gap-1"
            >
              <Check className="h-4 w-4" />
              입찰 제출하기
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}