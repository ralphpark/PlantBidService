import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ImageDown, Image as ImageIcon, CropIcon, ZoomInIcon, ZoomOutIcon, RotateCcwIcon, RotateCwIcon } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import Cropper from 'react-easy-crop';

// 크롭 결과 타입 정의
interface CropperResult {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageEditorProps {
  imageUrl?: string;
  onImageSave: (editedImageUrl: string) => void;
  aspectRatio?: number;
}

// 이미지에서 크롭된 영역을 추출하는 유틸리티 함수
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });

const getCroppedImage = async (
  imageSrc: string,
  pixelCrop: CropperResult,
  rotation = 0
): Promise<string> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return imageSrc;
  }

  // 최종 출력 크기를 고정 (정사각형)
  const outputSize = 512;
  canvas.width = outputSize;
  canvas.height = outputSize;

  // 배경색 적용 (흰색)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 회전 적용
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  
  if (rotation !== 0) {
    ctx.rotate((rotation * Math.PI) / 180);
  }

  // 크롭 영역을 기준으로 이미지 그리기
  // 크롭 영역의 중심이 캔버스 중심에 오도록 계산
  const scale = outputSize / Math.min(pixelCrop.width, pixelCrop.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const drawX = -(pixelCrop.x * scale + pixelCrop.width * scale / 2 - drawWidth / 2);
  const drawY = -(pixelCrop.y * scale + pixelCrop.height * scale / 2 - drawHeight / 2);

  ctx.drawImage(
    image,
    drawX - drawWidth / 2,
    drawY - drawHeight / 2,
    drawWidth,
    drawHeight
  );

  ctx.restore();

  // 최종 이미지를 데이터 URL로 변환
  return canvas.toDataURL('image/jpeg', 0.9);
};

export function ImageEditor({ imageUrl, onImageSave, aspectRatio = 1 }: ImageEditorProps) {
  const [open, setOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('crop');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropperResult | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 컴포넌트 마운트 시 초기 이미지 로드
  useEffect(() => {
    if (imageUrl) {
      setImageSrc(imageUrl);
    }
  }, [imageUrl]);
  
  // 파일 선택 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImageSrc(dataUrl);
      // 초기 상태 재설정
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
    };
    reader.readAsDataURL(file);
    setOpen(true);
  };
  
  // 크롭 완료 시 호출되는 콜백
  const onCropComplete = useCallback(
    (_: any, croppedAreaPixels: CropperResult) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );
  
  // 이미지 저장 핸들러
  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    
    try {
      console.log("[ImageEditor] 이미지 저장 시작");
      // 크롭, 회전된 이미지 생성
      const croppedImage = await getCroppedImage(
        imageSrc,
        croppedAreaPixels,
        rotation
      );
      
      // 이미지 편집이 끝나고 콜백 호출
      console.log("[ImageEditor] 콜백 함수 호출");
      onImageSave(croppedImage);
      
      // 이미지 편집 다이얼로그만 닫고, 제품 편집 다이얼로그는 유지
      console.log("[ImageEditor] 이미지 편집기 다이얼로그 닫기");
      setOpen(false);
    } catch (error) {
      console.error('이미지 저장 중 오류:', error);
    }
  };
  
  // 줌 값 변경 핸들러
  const handleZoomChange = (value: number[]) => {
    setZoom(value[0]);
  };
  
  // 회전 핸들러
  const handleRotate = (direction: 'cw' | 'ccw') => {
    setRotation((prev) => {
      if (direction === 'cw') {
        return (prev + 90) % 360;
      } else {
        return (prev - 90 + 360) % 360;
      }
    });
  };
  
  return (
    <div className="w-full">
      {/* 이미지 업로드 버튼 */}
      <div className="flex flex-col items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <div 
          className="relative w-full aspect-square border-2 border-dashed rounded-md border-gray-300 
                    flex flex-col items-center justify-center cursor-pointer hover:border-primary"
          onClick={() => fileInputRef.current?.click()}
        >
          {imageUrl ? (
            <div className="w-full h-full relative">
              <AspectRatio ratio={1}>
                <img
                  src={imageUrl}
                  alt="제품 이미지"
                  className="w-full h-full object-cover rounded-md"
                />
              </AspectRatio>
              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <span className="text-white font-medium">이미지 변경</span>
              </div>
            </div>
          ) : (
            <>
              <ImageIcon className="h-10 w-10 text-gray-400" />
              <span className="mt-2 text-sm text-gray-500">이미지를 업로드하려면 클릭하세요</span>
              <span className="mt-1 text-xs text-gray-400">또는 파일을 이곳에 드래그 앤 드롭하세요</span>
            </>
          )}
        </div>

        {/* 이미지 변경 후 저장하기 버튼 */}
        {imageUrl && (
          <Button 
            className="w-full mt-2"
            type="button" 
            onClick={() => setOpen(true)}
          >
            <ImageDown className="h-4 w-4 mr-2" />
            이미지 편집
          </Button>
        )}
      </div>

      {/* 이미지 편집 다이얼로그 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>이미지 편집</DialogTitle>
            <DialogDescription>
              이미지를 조정하고 크롭하세요
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="crop" value={activeTab} onValueChange={setActiveTab} className="p-4 pt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="crop"><CropIcon className="mr-2 h-4 w-4" /> 크롭 & 줌</TabsTrigger>
              <TabsTrigger value="rotate"><RotateCwIcon className="mr-2 h-4 w-4" /> 회전</TabsTrigger>
            </TabsList>
            
            <TabsContent value="crop" className="mt-4 space-y-4">
              <div className="relative h-[300px] w-full overflow-hidden rounded-md border">
                {imageSrc && (
                  <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    rotation={rotation}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    objectFit="horizontal-cover"
                    showGrid={true}
                    minZoom={0.1}
                    restrictPosition={false}
                    cropShape="rect"
                    classes={{
                      containerClassName: "w-full h-full",
                      cropAreaClassName: "border-2 border-white"
                    }}
                  />
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <ZoomOutIcon className="h-4 w-4 text-muted-foreground" />
                <Slider
                  value={[zoom]}
                  min={0.5}
                  max={5}
                  step={0.1}
                  onValueChange={handleZoomChange}
                />
                <ZoomInIcon className="h-4 w-4 text-muted-foreground" />
              </div>
            </TabsContent>
            
            <TabsContent value="rotate" className="mt-4 space-y-4">
              <div className="relative h-[300px] w-full overflow-hidden rounded-md border">
                {imageSrc && (
                  <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    rotation={rotation}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    objectFit="horizontal-cover"
                    showGrid={true}
                    minZoom={0.1}
                    restrictPosition={false}
                    cropShape="rect"
                    classes={{
                      containerClassName: "w-full h-full",
                      cropAreaClassName: "border-2 border-white"
                    }}
                  />
                )}
              </div>
              
              <div className="flex justify-center gap-4 pt-2">
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleRotate('ccw')}
                >
                  <RotateCcwIcon className="h-4 w-4 mr-2" />
                  왼쪽으로 회전
                </Button>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleRotate('cw')}
                >
                  <RotateCwIcon className="h-4 w-4 mr-2" />
                  오른쪽으로 회전
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="p-4 pt-0">
            <Button 
              type="button"
              variant="outline" 
              onClick={() => setOpen(false)}
            >
              취소
            </Button>
            <Button 
              type="button"
              onClick={handleSave}
            >
              <ImageDown className="h-4 w-4 mr-2" />
              저장하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}