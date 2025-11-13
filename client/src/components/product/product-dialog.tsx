import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Package, Upload, Check, ChevronsUpDown } from "lucide-react";
import { ImageEditor } from "./image-editor";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  category: string;
  onlineStoreVisible?: boolean;
  plantId?: number;
}

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (product: Partial<Product>) => void;
  product?: Product;
}

export default function ProductDialog({ open, onOpenChange, onSave, product }: ProductDialogProps) {
  const [name, setName] = useState("");
  const [selectedPlantId, setSelectedPlantId] = useState<string>("");
  const [plants, setPlants] = useState<any[]>([]);
  const [plantSearchOpen, setPlantSearchOpen] = useState(false);
  const [plantSearchValue, setPlantSearchValue] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [onlineStoreVisible, setOnlineStoreVisible] = useState(false);

  // 식물 목록 불러오기
  useEffect(() => {
    if (open && !product) {
      fetch('/api/plants')
        .then(response => response.json())
        .then(data => {
          setPlants(data || []);
        })
        .catch(error => {
          console.error('식물 목록 로딩 오류:', error);
        });
    }
  }, [open, product]);

  // 기존 제품 데이터 로딩
  useEffect(() => {
    if (product) {
      setName(product.name || "");
      setDescription(product.description || "");
      setPrice(product.price?.toString() || "");
      setStock(product.stock?.toString() || "");
      setCategory(product.category || "");
      setImageUrl(product.imageUrl || "");
      setOnlineStoreVisible(product.onlineStoreVisible || false);
      setSelectedPlantId(product.plantId?.toString() || "");
    } else {
      setName("");
      setDescription("");
      setPrice("");
      setStock("");
      setCategory("");
      setImageUrl("");
      setOnlineStoreVisible(false);
      setSelectedPlantId("");
      setPlantSearchValue("");
    }
  }, [product, open]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!name.trim()) {
      alert("상품명을 입력하세요.");
      return;
    }
    
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      alert("유효한 가격을 입력하세요.");
      return;
    }
    
    const productData: Partial<Product> = {
      name: name.trim(),
      description: description.trim(),
      price: Number(price),
      stock: Number(stock) || 0,
      category: category || "기타",
      imageUrl,
      onlineStoreVisible,
      plantId: selectedPlantId ? Number(selectedPlantId) : undefined
    };
    
    onSave(productData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{product ? "제품 수정" : "새 제품 등록"}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="space-y-6 py-4">
            {!product && (
              <div className="grid gap-2">
                <Label htmlFor="plant">식물 선택 <span className="text-red-500">*</span></Label>
                <Popover open={plantSearchOpen} onOpenChange={setPlantSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={plantSearchOpen}
                      className="w-full justify-between"
                    >
                      {plantSearchValue || "식물을 검색하여 선택하세요..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="식물명을 검색하세요..." />
                      <CommandList>
                        <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
                        <CommandGroup>
                          {plants.map((plant) => (
                            <CommandItem
                              key={plant.id}
                              value={plant.name}
                              onSelect={(currentValue) => {
                                setPlantSearchValue(currentValue);
                                setSelectedPlantId(plant.id.toString());
                                setName(plant.name);
                                setPlantSearchOpen(false);
                              }}
                            >
                              <Check
                                className={selectedPlantId === plant.id.toString() ? "mr-2 h-4 w-4 opacity-100" : "mr-2 h-4 w-4 opacity-0"}
                              />
                              {plant.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="name">상품명 <span className="text-red-500">*</span></Label>
              <Input
                id="name"
                placeholder="상품명을 입력하세요"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                placeholder="제품 설명을 입력하세요"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">가격 <span className="text-red-500">*</span></Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="가격을 입력하세요"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="stock">재고 수량</Label>
                <Input
                  id="stock"
                  type="number"
                  placeholder="재고 수량"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="category">카테고리</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="관엽식물">관엽식물</SelectItem>
                  <SelectItem value="다육식물">다육식물</SelectItem>
                  <SelectItem value="허브">허브</SelectItem>
                  <SelectItem value="화초">화초</SelectItem>
                  <SelectItem value="기타">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="onlineStore"
                checked={onlineStoreVisible}
                onCheckedChange={setOnlineStoreVisible}
              />
              <Label htmlFor="onlineStore">지역 상점 검색 노출</Label>
            </div>
            
            <div className="grid gap-2">
              <Label>제품 이미지</Label>
              <ImageEditor
                imageUrl={previewUrl || imageUrl}
                onImageSave={async (editedImageDataUrl) => {
                  console.log("[ProductDialog] 이미지 편집 완료, 업로드 시작");
                  setUploading(true);
                  try {
                    // DataURL을 Blob으로 변환
                    const response = await fetch(editedImageDataUrl);
                    const blob = await response.blob();
                    
                    const formData = new FormData();
                    formData.append("images", blob, "edited-image.jpg");
                    
                    console.log("[ProductDialog] 서버에 이미지 업로드 중...");
                    const uploadResponse = await fetch("/api/upload-image", {
                      method: "POST",
                      body: formData
                    });
                    
                    if (!uploadResponse.ok) {
                      throw new Error("이미지 업로드에 실패했습니다");
                    }
                    
                    const data = await uploadResponse.json();
                    console.log("[ProductDialog] 업로드 응답:", data);
                    
                    if (data.success && data.imageUrl) {
                      setImageUrl(data.imageUrl);
                      setPreviewUrl(""); // 미리보기 URL 초기화
                      alert("이미지가 업로드되었습니다.");
                    } else {
                      throw new Error("이미지 URL이 응답에 포함되지 않았습니다");
                    }
                  } catch (error) {
                    console.error("[ProductDialog] 이미지 처리 오류:", error);
                    alert("이미지 처리 중 오류가 발생했습니다.");
                  } finally {
                    setUploading(false);
                  }
                }}
                aspectRatio={1}
              />
              
              {uploading && (
                <div className="mt-2 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full animate-pulse bg-primary mr-2"></div>
                  <span className="text-sm text-muted-foreground">이미지 처리 중...</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex-shrink-0 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button onClick={handleSubmit}>
            {product ? "수정 완료" : "등록하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}