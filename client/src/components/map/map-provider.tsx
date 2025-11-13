import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { LoadScriptProps, Libraries } from '@react-google-maps/api';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// 지도 라이브러리 정의 - 리렌더링마다 재생성되지 않도록 외부에 정의하고 상수로 유지
// 경고를 피하기 위해 전달되는 라이브러리 배열을 고정합니다
const LIBRARIES: Libraries = ['places', 'marker'];

// 구글 맵 스크립트가 이미 로드되었는지 추적하는 전역 상태
let isScriptLoaded = false;
let scriptLoading = false;

interface MapConfig {
  googleMapsApiKey: string;
}

interface MapContextType {
  isLoaded: boolean;
  loadError: Error | undefined;
  googleMapsApiKey: string;
}

const MapContext = createContext<MapContextType | null>(null);

// 수동으로 구글 맵 스크립트 로드하는 함수
function loadGoogleMapsScript(apiKey: string): Promise<void> {
  // 이미 로드 중이거나 완료되었다면 그대로 반환
  if (scriptLoading || isScriptLoaded || typeof window === 'undefined') {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    // 이미 스크립트가 있는지 확인
    const existingScript = document.getElementById('google-map-script');
    if (existingScript) {
      console.log('Google Maps script already exists');
      isScriptLoaded = true;
      resolve();
      return;
    }

    // 이미 window.google이 있는지 확인
    if (window.google && window.google.maps) {
      console.log('Google Maps API already loaded');
      isScriptLoaded = true;
      resolve();
      return;
    }

    scriptLoading = true; // 로드 시작 표시
    console.log('Loading Google Maps script');
    
    const script = document.createElement('script');
    script.id = 'google-map-script';
    script.type = 'text/javascript';
    // 최신 권장사항에 따라 loading=async 추가
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=Function.prototype&loading=async`;
    script.async = true;
    script.defer = true;
    
    // 로드 완료 이벤트
    script.onload = () => {
      console.log('Google Maps script loaded successfully');
      isScriptLoaded = true;
      scriptLoading = false;
      resolve();
    };
    
    // 오류 이벤트
    script.onerror = (error) => {
      console.error('Error loading Google Maps script:', error);
      isScriptLoaded = false;
      scriptLoading = false;
      reject(error);
    };

    document.head.appendChild(script);
  });
}

export function MapProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState<boolean>(isScriptLoaded);
  const [loadError, setLoadError] = useState<Error | undefined>(undefined);
  
  // 메모이제이션된 에러 처리 콜백
  const handleMapError = useCallback((error: Error) => {
    console.error('Error loading Google Maps:', error);
    setLoadError(error);
    toast({
      title: 'Google Maps 로드 실패',
      description: '지도를 불러오는데 실패했습니다.',
      variant: 'destructive',
    });
  }, [toast]);

  // Google Maps API 키 가져오기
  useEffect(() => {
    // 이미 로드되었으면 다시 로드하지 않음
    if (isScriptLoaded) {
      setIsLoaded(true);
      return;
    }
    
    const controller = new AbortController();
    
    const fetchApiKey = async () => {
      try {
        const response = await apiRequest('GET', '/api/map/config');
        
        // 컴포넌트가 언마운트되었으면 중단
        if (controller.signal.aborted) return;
        
        const data = await response.json() as MapConfig;
        setGoogleMapsApiKey(data.googleMapsApiKey);
        
        // API 키를 가져온 후 스크립트 로드
        await loadGoogleMapsScript(data.googleMapsApiKey);
        
        // 컴포넌트가 언마운트되었으면 중단
        if (controller.signal.aborted) return;
        
        setIsLoaded(true);
      } catch (error) {
        // 컴포넌트가 언마운트되었으면 중단
        if (controller.signal.aborted) return;
        
        handleMapError(error as Error);
      }
    };
    
    fetchApiKey();
    
    // 클린업 함수
    return () => {
      controller.abort();
    };
  }, [handleMapError]); // 메모이제이션된 handleMapError 함수를 의존성으로 추가

  // 컨텍스트 값을 메모이제이션하여 불필요한 리렌더링 방지
  const contextValue = useMemo(() => ({
    isLoaded,
    loadError,
    googleMapsApiKey
  }), [isLoaded, loadError, googleMapsApiKey]);

  return (
    <MapContext.Provider value={contextValue}>
      {children}
    </MapContext.Provider>
  );
}

// 전역에 타입 정의 추가
declare global {
  interface Window {
    initGoogleMaps?: () => void;
  }
}

export function useGoogleMaps() {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useGoogleMaps must be used within a MapProvider');
  }
  return {
    ...context,
    googleMapsApiKey: context.googleMapsApiKey || '',
  };
}