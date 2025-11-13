import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search } from 'lucide-react';

// DaumPostcode 컴포넌트의 props 정의
interface DaumPostcodeProps {
  onComplete: (data: DaumPostcodeData) => void;
  buttonLabel?: string;
  dialogTitle?: string;
}

// Daum 우편번호 API로부터 받는 응답 데이터 타입
export interface DaumPostcodeData {
  address: string;        // 기본 주소
  addressType: string;    // 주소 타입
  buildingName: string;   // 건물명
  zonecode: string;       // 우편번호
  jibunAddress: string;   // 지번 주소
  roadAddress: string;    // 도로명 주소
  userSelectedType: string; // 사용자가 선택한 주소 타입
  bname: string;         // 법정동/법정리 이름
  apartment: string;     // 공동주택 여부
}

// 전역 window 객체에 daum 타입 선언
declare global {
  interface Window {
    daum: {
      Postcode: new (options: { 
        oncomplete: (data: DaumPostcodeData) => void;
        width?: string;
        height?: string;
      }) => { 
        open: () => void;
        embed: (container: HTMLElement) => void;
      }
    };
  }
}

export default function DaumPostcode({ 
  onComplete, 
  buttonLabel = "주소 검색", 
  dialogTitle = "주소 찾기"
}: DaumPostcodeProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const postcodeScriptRef = useRef<HTMLScriptElement | null>(null);
  const postcodeContainerRef = useRef<HTMLDivElement | null>(null);

  // 다음 우편번호 스크립트가 로드되었는지 확인
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Daum 스크립트가 이미 index.html에 포함되어 있으므로 추가 로드할 필요가 없음
    // 스크립트 로드 여부만 콘솔에 기록
    if (window.daum && window.daum.Postcode) {
      console.log('Daum Postcode script is already loaded');
    } else {
      console.warn('Daum Postcode script is not loaded. Please check the script tag in index.html');
    }
  }, []);

  // 우편번호 검색 다이얼로그가 열렸을 때 검색창 초기화
  useEffect(() => {
    if (!isOpen) return;
    
    // 스크립트 로딩 확인을 위한 타이머
    const checkScriptLoadedInterval = setInterval(() => {
      if (window.daum && window.daum.Postcode && postcodeContainerRef.current) {
        clearInterval(checkScriptLoadedInterval);
        
        try {
          const postcodeInstance = new window.daum.Postcode({
            oncomplete: (data: DaumPostcodeData) => {
              onComplete(data);
              setIsOpen(false);
            },
            width: '100%',
            height: '450px',
          });
          
          postcodeInstance.embed(postcodeContainerRef.current);
        } catch (error) {
          console.error("Daum postcode error:", error);
        }
      }
    }, 100);
    
    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      clearInterval(checkScriptLoadedInterval);
    };
  }, [isOpen, onComplete]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          type="button" 
          variant="outline" 
          className="flex items-center gap-1"
        >
          <Search className="h-4 w-4" />
          <span>{buttonLabel}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <div 
          ref={postcodeContainerRef} 
          className="w-full h-[450px] border rounded-md"
        />
      </DialogContent>
    </Dialog>
  );
}