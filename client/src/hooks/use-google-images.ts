// 구글 이미지 검색 결과를 가져오는 훅
import { useState, useEffect, useCallback } from 'react';

// 구글 이미지 검색 결과 인터페이스
export interface GoogleImage {
  link: string;
  thumbnail: string;
  title: string;
  source: string;
  context: string;
}

// 구글 이미지 검색 응답 인터페이스
export interface GoogleImagesResponse {
  query: string;
  images: GoogleImage[];
}

/**
 * 구글 이미지 검색 결과를 가져오는 커스텀 훅
 * @param term 검색어
 * @param enabled 검색 활성화 여부
 * @returns 로딩 상태, 이미지 URL 배열, 오류 상태
 */
export function useGoogleImages(term: string | null, enabled: boolean = true) {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<GoogleImage[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 이미지 URL만 추출한 배열 (편의를 위해)
  const imageUrls = images.map(img => img.link);

  // 이미지 검색 함수
  const fetchImages = useCallback(async (searchTerm: string) => {
    if (!searchTerm || !enabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`구글 이미지 검색 시작: "${searchTerm}"`);
      const response = await fetch(`/api/google-images?query=${encodeURIComponent(searchTerm)}`);
      
      if (!response.ok) {
        throw new Error(`이미지 검색 오류: ${response.status}`);
      }
      
      const data: GoogleImagesResponse = await response.json();
      console.log(`구글 이미지 검색 결과: ${data.images.length}개 발견`);
      
      setImages(data.images || []);
    } catch (err: any) {
      console.error('이미지 검색 실패:', err);
      setError(err.message || '이미지를 가져오는 중 오류가 발생했습니다');
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  // 검색어가 변경될 때 자동으로 검색 실행
  useEffect(() => {
    if (term && enabled) {
      fetchImages(term);
    } else {
      setImages([]);
    }
  }, [term, enabled, fetchImages]);

  // 수동으로 검색을 트리거하는 함수
  const refetch = useCallback(() => {
    if (term) {
      fetchImages(term);
    }
  }, [term, fetchImages]);

  return {
    loading,
    images,
    imageUrls,
    error,
    refetch
  };
}