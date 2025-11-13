// 구글 이미지 검색 API를 사용하여 이미지를 가져오는 서비스
import axios from 'axios';
import { Request, Response } from 'express';

// 구글 API 사용을 위한 환경변수
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;

// 오류 메시지 상수
const ERROR_MISSING_API_KEY = '구글 API 키가 설정되지 않았습니다.';
const ERROR_MISSING_CSE_ID = '구글 커스텀 검색 엔진 ID가 설정되지 않았습니다.';
const ERROR_MISSING_QUERY = '검색어가 필요합니다.';

/**
 * 구글 이미지 검색 핸들러
 * 클라이언트에서 식물 이름을 보내면 구글 이미지 검색 결과를 JSON으로 반환합니다.
 */
export async function handleGoogleImageSearch(req: Request, res: Response) {
  try {
    // API 키와 CSE ID 확인
    if (!GOOGLE_API_KEY) {
      console.error(ERROR_MISSING_API_KEY);
      return res.status(500).json({ error: ERROR_MISSING_API_KEY });
    }

    if (!GOOGLE_CSE_ID) {
      console.error(ERROR_MISSING_CSE_ID);
      return res.status(500).json({ error: ERROR_MISSING_CSE_ID });
    }

    // 검색어 가져오기 - 문자열로 타입 캐스팅
    const query = req.query.query as string;
    
    if (!query) {
      return res.status(400).json({ error: ERROR_MISSING_QUERY });
    }

    // 검색어 디코딩 및 식물 키워드 추가
    const decodedQuery = decodeURIComponent(query);
    const searchQuery = `${decodedQuery} 식물`;
    console.log(`구글 이미지 검색 실행: "${searchQuery}"`);
    
    // 구글 커스텀 검색 API 호출
    const searchParams = {
      key: GOOGLE_API_KEY,
      cx: GOOGLE_CSE_ID,
      q: searchQuery,
      searchType: 'image',
      num: 8, // 더 많은 이미지 결과 요청
      imgSize: 'medium', // 중간 크기 이미지
      safe: 'active', // 안전한 검색 결과만
      gl: 'kr', // 한국 검색 결과 우선
      hl: 'ko' // 한국어 인터페이스
    };

    console.log('구글 API 요청 URL:', `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY.substring(0, 5)}...&cx=${GOOGLE_CSE_ID.substring(0, 5)}...&q=${encodeURIComponent(searchQuery)}&searchType=image&num=8`);
    
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', { params: searchParams });
    
    // 검색 결과가 없는 경우 처리
    if (!response.data.items || response.data.items.length === 0) {
      console.log('구글 검색 결과가 없습니다:', searchQuery);
      return res.json({ 
        query: searchQuery,
        images: [] 
      });
    }

    // 이미지 URL과 썸네일 URL만 추출
    const imageResults = response.data.items.map((item: any) => ({
      link: item.link, // 원본 이미지 URL
      thumbnail: item.image?.thumbnailLink || item.link, // 썸네일 이미지 URL
      title: item.title, // 이미지 제목
      source: item.displayLink || '', // 이미지 출처
      context: item.image?.contextLink || '' // 이미지 원본 페이지 URL
    }));

    console.log(`구글 이미지 검색 결과: ${imageResults.length}개 발견`);
    
    // 결과 반환
    res.json({
      query: searchQuery,
      images: imageResults
    });
    
  } catch (error: any) {
    console.error('구글 이미지 검색 오류:', error.message);
    // 상세 오류 정보 기록
    if (error.response) {
      console.error('구글 API 응답 오류:', {
        status: error.response.status,
        data: error.response.data
      });
    }
    
    res.status(500).json({ 
      error: '이미지 검색 중 오류가 발생했습니다.',
      details: error.message
    });
  }
}