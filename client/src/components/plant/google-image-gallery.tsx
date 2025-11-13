import React, { useState, useEffect } from 'react';
import { useGoogleImages } from '@/hooks/use-google-images';
import { Skeleton } from '@/components/ui/skeleton';

interface GoogleImageGalleryProps {
  plantName: string;
  className?: string;
}

/**
 * 구글 이미지 검색 결과를 보여주는 갤러리 컴포넌트
 * @param plantName 식물 이름
 * @param className 추가 CSS 클래스
 */
export function GoogleImageGallery({ plantName, className = '' }: GoogleImageGalleryProps) {
  const { loading, images, error } = useGoogleImages(plantName);
  const [loadedImages, setLoadedImages] = useState<string[]>([]);
  
  // 이미지 로드 상태 추적
  useEffect(() => {
    setLoadedImages([]); // 새 검색어가 들어오면 로드 상태 초기화
  }, [plantName]);
  
  // 이미지 로드 완료 처리
  const handleImageLoad = (url: string) => {
    setLoadedImages(prev => [...prev, url]);
  };
  
  // 이미지 로드 실패 처리
  const handleImageError = (url: string) => {
    console.log(`이미지 로드 실패: ${url}`);
    // 로드 실패한 이미지를 목록에서 제외
    setLoadedImages(prev => prev.filter(item => item !== url));
  };
  
  // 여러 이미지 중 첫 6개만 사용 (꽉 채우기 위해 6개로 변경)
  const displayImages = images.slice(0, 6).map(img => img.link);
  
  // 빈 이미지 공간 보정을 위한 배열
  const placeholderCount = Math.max(0, 6 - displayImages.length);
  const placeholders = Array(placeholderCount).fill(null);
  
  return (
    <div className={`w-full ${className}`}>
      <div className="grid grid-cols-3 gap-2">
        {loading ? (
          // 로딩 중 스켈레톤 UI
          <>
            {[1, 2, 3, 4, 5, 6].map(index => (
              <div key={`skeleton-${index}`} className="aspect-square">
                <Skeleton className="w-full h-full rounded-md" />
              </div>
            ))}
          </>
        ) : error ? (
          // 에러 표시
          <div className="col-span-3 p-4 text-center text-sm text-muted-foreground">
            이미지를 가져오지 못했습니다
          </div>
        ) : displayImages.length > 0 ? (
          // 이미지 갤러리
          <>
            {displayImages.map((url, index) => (
              <div key={`img-${index}`} className="aspect-square rounded-md overflow-hidden border border-muted relative">
                <img
                  src={url}
                  alt={`${plantName} 이미지 ${index + 1}`}
                  className="w-full h-full object-cover transition-opacity duration-200"
                  style={{ opacity: loadedImages.includes(url) ? 1 : 0 }}
                  onLoad={() => handleImageLoad(url)}
                  onError={() => handleImageError(url)}
                />
                {!loadedImages.includes(url) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  </div>
                )}
              </div>
            ))}
            
            {/* 이미지가 4개 미만인 경우 플레이스홀더 표시 */}
            {placeholders.map((_, index) => (
              <div key={`placeholder-${index}`} className="aspect-square bg-muted rounded-md" />
            ))}
          </>
        ) : (
          // 검색 결과 없음
          <div className="col-span-3 p-4 text-center text-sm text-muted-foreground">
            이미지 검색 결과가 없습니다
          </div>
        )}
      </div>
      
      {/* 구글 이미지 검색으로 연결되는 링크 */}
      <div className="flex justify-start mt-2">
        <a
          href={`https://www.google.com/search?q=${encodeURIComponent(plantName)}+식물&tbm=isch`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline"
        >
          이 이미지는 구글 이미지 검색결과입니다. 클릭하시면 더 많은 결과를 구글에서 볼 수 있습니다.
        </a>
      </div>
    </div>
  );
}