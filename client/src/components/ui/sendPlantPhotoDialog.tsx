import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ImagePlus, Send, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";

// 폼 스키마 정의
const sendPlantPhotoSchema = z.object({
  message: z.string().min(1, "메시지를 입력해주세요"),
  imageUrl: z.string().optional(),
});

type SendPlantPhotoFormValues = z.infer<typeof sendPlantPhotoSchema>;

interface SendPlantPhotoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (data: { message: string; imageUrl?: string }) => void;
  conversationId: number | null;
  orderId: number | string;
}

export function SendPlantPhotoDialog({
  open,
  onOpenChange,
  onSend,
  conversationId,
  orderId,
}: SendPlantPhotoDialogProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 다이얼로그가 열릴 때마다 폼 초기화
  const form = useForm<SendPlantPhotoFormValues>({
    resolver: zodResolver(sendPlantPhotoSchema),
    defaultValues: {
      message: "안녕하세요! 주문하신 상품 준비를 시작했습니다. 궁금한 점이 있으시면 알려주세요.",
      imageUrl: "",
    },
  });

  // 다이얼로그가 닫히면 폼 초기화
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset({
        message: "안녕하세요! 주문하신 상품 준비를 시작했습니다. 궁금한 점이 있으시면 알려주세요.",
        imageUrl: "",
      });
      setPreviewUrl(null);
    }
    onOpenChange(isOpen);
  };

  const isSubmitting = form.formState.isSubmitting;

  // 이미지 업로드 함수
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // 이미지 타입 확인
    if (!file.type.startsWith("image/")) {
      toast({
        title: "이미지만 업로드 가능합니다",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      // 파일 미리보기 URL 생성
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      // 이미지 업로드 API 호출
      const formData = new FormData();
      formData.append("images", file);  // 서버에서 기대하는 필드명으로 변경

      const response = await fetch("/api/uploads/image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("이미지 업로드에 실패했습니다");
      }

      const data = await response.json();
      
      // 서버 응답 구조에 맞게 이미지 URL 처리
      let imageUrl = "";
      if (data.images && data.images.length > 0) {
        imageUrl = data.images[0].url;  // 첫 번째 이미지의 URL 사용
      } else if (data.url) {
        imageUrl = data.url;  // 단일 이미지 URL 경우
      }
      
      form.setValue("imageUrl", imageUrl);
      
      toast({
        title: "이미지 업로드 완료",
        description: "식물 사진이 업로드되었습니다.",
      });
    } catch (error) {
      console.error("이미지 업로드 오류:", error);
      toast({
        title: "이미지 업로드 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // 폼 제출 핸들러
  const onSubmit = async (values: SendPlantPhotoFormValues) => {
    try {
      // 사진이 없는 경우 확인
      if (values.imageUrl === "") {
        // 사진 없이 메시지만 전송할 것인지 확인
        const shouldSendWithoutImage = window.confirm(
          "사진 없이 메시지만 전송하시겠습니까?"
        );
        
        if (!shouldSendWithoutImage) {
          return; // 사용자가 취소한 경우
        }
      }
      
      // 메시지 데이터 전송
      onSend({
        message: values.message,
        imageUrl: values.imageUrl || undefined,
      });
      
      // 성공 메시지
      toast({
        title: "메시지 전송 완료",
        description: "고객에게 메시지가 성공적으로 전송되었습니다.",
      });
      
      // 폼 초기화 및 다이얼로그 닫기
      form.reset();
      setPreviewUrl(null);
      handleOpenChange(false);
    } catch (error) {
      console.error("메시지 전송 오류:", error);
      toast({
        title: "메시지 전송 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>고객에게 메시지 전송</DialogTitle>
          <DialogDescription>
            주문 #{orderId}에 대한 상태 메시지와 식물 사진을 전송합니다.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>메시지</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="고객에게 보낼 메시지를 입력하세요"
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      식물의 상태와 준비 정보를 고객에게 알려주세요.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label htmlFor="plant-photo">식물 사진</Label>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("plant-photo")?.click()}
                    disabled={isUploading}
                    className="relative"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        업로드 중...
                      </>
                    ) : (
                      <>
                        <ImagePlus className="h-4 w-4 mr-2" />
                        사진 선택
                      </>
                    )}
                  </Button>
                  <Input
                    id="plant-photo"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                  <span className="text-sm text-muted-foreground">
                    {form.watch("imageUrl")
                      ? "사진이 업로드 되었습니다"
                      : "사진을 업로드해 주세요"}
                  </span>
                </div>

                {previewUrl && (
                  <div className="mt-4 rounded-md overflow-hidden border">
                    <img
                      src={previewUrl}
                      alt="식물 미리보기"
                      className="w-full max-h-[200px] object-contain"
                    />
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting || isUploading}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    전송 중...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    메시지 전송
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}