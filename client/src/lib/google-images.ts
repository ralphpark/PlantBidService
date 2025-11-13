/**
 * 구글 이미지 검색 API 클라이언트
 * 식물 이름을 기반으로 구글 이미지 검색 결과를 가져옵니다.
 */

interface GoogleImageResult {
  link: string;       // 원본 이미지 URL
  thumbnail: string;  // 썸네일 이미지 URL
  title: string;      // 이미지 제목
  source: string;     // 이미지 출처
  context: string;    // 이미지 원본 페이지 URL
}

interface GoogleImageSearchResponse {
  query: string;
  images: GoogleImageResult[];
}

/**
 * 식물 이름으로 구글 이미지 검색 결과를 가져옵니다.
 * @param plantName 검색할 식물 이름
 * @returns 이미지 검색 결과 배열
 */
export async function searchGoogleImages(plantName: string): Promise<GoogleImageResult[]> {
  try {
    // API 요청 URL 구성
    const url = `/api/google-images?query=${encodeURIComponent(plantName)}`;
    
    // API 호출
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('구글 이미지 검색 API 오류:', errorText);
      return [];
    }
    
    const data: GoogleImageSearchResponse = await response.json();
    
    return data.images || [];
  } catch (error) {
    console.error('구글 이미지 검색 중 오류 발생:', error);
    return [];
  }
}

/**
 * 대체 이미지 URL 생성 (API 호출 실패 시 사용)
 * @param plantName 식물 이름
 * @param index 이미지 인덱스
 * @returns 대체 이미지 URL
 */
export function getFallbackImageUrl(plantName: string, index: number = 0): string {
  // picsum.photos 사이트에서 랜덤 이미지를 가져옵니다
  return `https://picsum.photos/seed/${plantName.replace(/\s+/g, '')}-${index}/300`;
}

/**
 * 이미지 URL 검색 결과를 반환하거나 로딩/오류 시 대체 이미지를 제공합니다
 * @param plantName 식물 이름
 * @returns 이미지 URL 배열을 반환하는 Promise
 */
export async function getPlantImageUrls(plantName: string): Promise<string[]> {
  try {
    const results = await searchGoogleImages(plantName);
    
    if (results.length === 0) {
      // 결과가 없는 경우 대체 이미지 반환
      return [
        getFallbackImageUrl(plantName, 1),
        getFallbackImageUrl(plantName, 2),
        getFallbackImageUrl(plantName, 3),
        getFallbackImageUrl(plantName, 4)
      ];
    }
    
    // 4개의 이미지 URL 반환 (부족한 경우 대체 이미지 추가)
    const imageUrls = results.map(result => result.link);
    while (imageUrls.length < 4) {
      imageUrls.push(getFallbackImageUrl(plantName, imageUrls.length + 1));
    }
    
    return imageUrls.slice(0, 4); // 최대 4개까지만 반환
  } catch (error) {
    console.error('이미지 URL 가져오기 오류:', error);
    // 오류 발생 시 대체 이미지 반환
    return [
      getFallbackImageUrl(plantName, 1),
      getFallbackImageUrl(plantName, 2),
      getFallbackImageUrl(plantName, 3),
      getFallbackImageUrl(plantName, 4)
    ];
  }
}