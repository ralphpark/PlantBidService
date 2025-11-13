import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 판매자 정보 캐시 - 캐시 시간 설정 (10분)
const CACHE_EXPIRY = 10 * 60 * 1000; // 10분
interface CacheEntry {
  data: any;
  timestamp: number;
}
const vendorCache = new Map<number, CacheEntry>();

// 고정 색상 테이블 - ID별로 동일한 색상 보장
const FIXED_COLORS = [
  { bg: "bg-slate-50", border: "border-slate-200" },
  { bg: "bg-gray-50", border: "border-gray-200" },
  { bg: "bg-zinc-50", border: "border-zinc-200" },
  { bg: "bg-neutral-50", border: "border-neutral-200" },
  { bg: "bg-stone-50", border: "border-stone-200" },
  { bg: "bg-red-50", border: "border-red-200" },
  { bg: "bg-orange-50", border: "border-orange-200" },
  { bg: "bg-amber-50", border: "border-amber-200" },
  { bg: "bg-yellow-50", border: "border-yellow-200" },
  { bg: "bg-lime-50", border: "border-lime-200" },
  { bg: "bg-green-50", border: "border-green-200" },
  { bg: "bg-emerald-50", border: "border-emerald-200" },
  { bg: "bg-teal-50", border: "border-teal-200" },
  { bg: "bg-cyan-50", border: "border-cyan-200" },
  { bg: "bg-sky-50", border: "border-sky-200" },
  { bg: "bg-blue-50", border: "border-blue-200" },
  { bg: "bg-indigo-50", border: "border-indigo-200" },
  { bg: "bg-violet-50", border: "border-violet-200" },
  { bg: "bg-purple-50", border: "border-purple-200" },
  { bg: "bg-fuchsia-50", border: "border-fuchsia-200" },
  { bg: "bg-pink-50", border: "border-pink-200" },
  { bg: "bg-rose-50", border: "border-rose-200" }
];

// 판매자 ID를 기반으로 항상 동일한 색상 반환
function getFixedColor(vendorId: number) {
  const safeId = Math.max(1, vendorId || 1); // 0이나 undefined인 경우 1로 처리
  const colorIndex = (safeId - 1) % FIXED_COLORS.length;
  return FIXED_COLORS[colorIndex];
}

// bg 클래스 이름을 실제 색상 코드로 변환
function convertBgClassToColor(bgClass: string): string {
  // 색상 매핑 테이블
  const colorMap: { [key: string]: string } = {
    'slate': '#64748b',
    'gray': '#71717a',
    'zinc': '#52525b',
    'neutral': '#525252',
    'stone': '#57534e',
    'red': '#ef4444',
    'orange': '#f97316',
    'amber': '#f59e0b',
    'yellow': '#eab308',
    'lime': '#84cc16',
    'green': '#22c55e',
    'emerald': '#10b981',
    'teal': '#14b8a6',
    'cyan': '#06b6d4',
    'sky': '#0ea5e9',
    'blue': '#3b82f6',
    'indigo': '#6366f1',
    'violet': '#8b5cf6',
    'purple': '#a855f7',
    'fuchsia': '#d946ef',
    'pink': '#ec4899',
    'rose': '#f43f5e'
  };
  
  // bg-[색상]-50 형식에서 색상 추출
  const match = bgClass?.match(/bg-([a-z]+)-\d+/);
  const colorName = match?.[1];
  
  return colorName && colorMap[colorName] ? colorMap[colorName] : '#6E56CF';
}

// 캐시 항목이 유효한지 확인 (만료 시간 이내인지)
function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_EXPIRY;
}

// 판매자 정보 가져오기 (캐싱 지원)
export async function getVendorInfo(vendorId: number) {
  console.log(`getVendorInfo 호출됨: vendorId=${vendorId}`);
  
  // vendorId가 없거나 0 이하면 기본값 반환
  if (!vendorId || vendorId <= 0) {
    console.warn(`유효하지 않은 vendorId: ${vendorId}, 기본값 사용`);
    return {
      id: 1,
      name: "판매자",
      description: "판매자",
      storeName: "판매자",
      vendorColor: '#6E56CF'
    };
  }
  
  // 로그아웃/로그인 시 캐싱 문제 방지를 위해 요청 시마다 새로 받아오게 변경
  // 캐시에 있고 유효하면 캐시에서 반환
  // if (vendorCache.has(vendorId)) {
  //   const cachedEntry = vendorCache.get(vendorId)!;
  //   if (isCacheValid(cachedEntry)) {
  //     console.log(`vendorId=${vendorId} 캐시에서 정보 검색:`, cachedEntry.data);
  //     // 색상 코드 사용을 위한 변환 작업
  //     if (cachedEntry.data.color && typeof cachedEntry.data.color === 'object' && cachedEntry.data.color.bg) {
  //       cachedEntry.data.vendorColor = convertBgClassToColor(cachedEntry.data.color.bg);
  //     } else if (!cachedEntry.data.vendorColor) {
  //       // 색상 정보가 없는 경우
  //       const colorObj = getFixedColor(vendorId);
  //       cachedEntry.data.vendorColor = convertBgClassToColor(colorObj.bg);
  //     }
  //     return cachedEntry.data;
  //   }
  //   // 만료된 경우 캐시에서 제거
  //   console.log(`vendorId=${vendorId} 캐시 만료, 재로드 필요`);
  //   vendorCache.delete(vendorId);
  // }
  
  try {
    console.log(`vendorId=${vendorId} API 요청 시작`);
    const response = await fetch(`/api/vendors/${vendorId}`);
    if (!response.ok) {
      console.warn(`판매자 정보를 찾을 수 없음: ${vendorId}`);
      
      // 기본 판매자 정보 생성 (ID를 기반으로 항상 동일한 색상 사용)
      const colorObj = getFixedColor(vendorId);
      const defaultVendorInfo = {
        id: vendorId,
        name: `판매자 ${vendorId}`,
        description: "판매자",
        storeName: `판매자 ${vendorId}`,
        color: colorObj,
        vendorColor: convertBgClassToColor(colorObj.bg)
      };
      
      // 기본값을 캐시에 저장
      vendorCache.set(vendorId, {
        data: defaultVendorInfo,
        timestamp: Date.now()
      });
      
      console.log(`vendorId=${vendorId} 기본 정보 생성:`, defaultVendorInfo);
      return defaultVendorInfo;
    }
    
    const vendorData = await response.json();
    console.log(`vendorId=${vendorId} API 응답 데이터:`, vendorData);
    
    // ID 확인 - 실제 ID와 다르면 조정 (특히 ID 4에 대해 검증)
    if (vendorData.id !== vendorId) {
      console.warn(`API에서 받은 ID가 요청 ID와 다릅니다: 요청=${vendorId}, 응답=${vendorData.id}`);
      // ID 수정
      vendorData.id = vendorId;
    }
    
    // region을 storeName으로 사용 (상호명이 없는 경우 region을 사용)
    if (!vendorData.storeName && vendorData.region) {
      vendorData.storeName = vendorData.region;
      console.log(`vendorId=${vendorId} region을 storeName으로 사용:`, vendorData.storeName);
    }
    
    // DB에 색상이 있으면 그것을 사용, 없으면 고정 색상 사용
    if (!vendorData.color) {
      vendorData.color = getFixedColor(vendorId);
      console.log(`vendorId=${vendorId} 고정 색상 할당:`, vendorData.color);
    }
    
    // 색상 코드 생성 - bg에서 hex로 변환
    if (vendorData.color && typeof vendorData.color === 'object' && vendorData.color.bg) {
      const hexColor = convertBgClassToColor(vendorData.color.bg);
      vendorData.vendorColor = hexColor;
      console.log(`vendorId=${vendorId} 색상 변환: ${vendorData.color.bg} -> ${hexColor}`);
    } else if (!vendorData.vendorColor) {
      // 색상 정보가 전혀 없는 경우
      const colorObj = getFixedColor(vendorId);
      vendorData.vendorColor = convertBgClassToColor(colorObj.bg);
      console.log(`vendorId=${vendorId} 기본 색상 할당: ${vendorData.vendorColor}`);
    }
    
    // storeName이 없는 경우 표시할 이름 설정
    if (!vendorData.storeName) {
      vendorData.storeName = vendorData.description || vendorData.name || `판매자 ${vendorId}`;
      console.log(`vendorId=${vendorId} storeName 대체값 설정:`, vendorData.storeName);
    }
    
    // 서버에서 받은 storeName을 그대로 사용
    console.log(`vendorId=${vendorId} 서버에서 받은 상호명: "${vendorData.storeName}"`);
    // 상호명이 없는 경우에만 기본값 설정
    if (!vendorData.storeName) {
      console.log(`vendorId=${vendorId} 상호명이 없어 기본값 설정`);
      vendorData.storeName = vendorData.description || vendorData.name || `판매자 ${vendorId}`;
    }
    
    // 캐시에 저장
    vendorCache.set(vendorId, {
      data: vendorData,
      timestamp: Date.now()
    });
    
    console.log(`판매자 ID ${vendorId}의 정보 로드 완료:`, vendorData);
    return vendorData;
  } catch (error) {
    console.error('판매자 정보 조회 오류:', error);
    
    // 에러 발생 시 기본 판매자 정보 생성
    const colorObj = getFixedColor(vendorId);
    const defaultVendorInfo = {
      id: vendorId,
      name: `판매자 ${vendorId}`,
      description: "판매자",
      storeName: `판매자 ${vendorId}`,
      color: colorObj,
      vendorColor: convertBgClassToColor(colorObj.bg)
    };
    
    // 서버에서 정보를 가져올 수 없는 경우 기본값 사용
    console.log(`vendorId=${vendorId} 서버에서 정보를 가져올 수 없어 기본값 사용`);
    // 기본 상호명은 "판매자 {ID}" 형식으로 사용
    
    // 기본값을 캐시에 저장
    vendorCache.set(vendorId, {
      data: defaultVendorInfo,
      timestamp: Date.now()
    });
    
    console.log(`vendorId=${vendorId} 오류 발생, 기본 정보 생성:`, defaultVendorInfo);
    return defaultVendorInfo;
  }
}

/**
 * vendorColor 유형을 안전하게 처리하는 유틸리티 함수
 * 
 * 세 가지 형식을 처리합니다:
 * 1. 문자열 CSS 클래스 (예: "bg-emerald-50")
 * 2. HEX 색상 문자열 (예: "#10b981")
 * 3. 객체 (예: { bg: "bg-emerald-50", border: "border-emerald-200" })
 */
export function getVendorColorClasses(vendorColor: any): {
  className: string;
  style?: Record<string, string>;
} {
  try {
    if (!vendorColor) {
      return { className: 'bg-muted/30 border border-muted' };
    }
    
    // Case 1: String CSS class (e.g., "bg-emerald-50")
    if (typeof vendorColor === 'string') {
      // CSS class (tailwind)
      if (vendorColor.startsWith('bg-')) {
        return { className: vendorColor };
      }
      // Hex color - handled separately via style
      else if (vendorColor.startsWith('#')) {
        return { 
          className: 'border border-muted', 
          style: { backgroundColor: `${vendorColor}20` } // 20은 hex로 약 12% 투명도
        };
      }
      // Unknown string format
      return { className: 'bg-muted/30 border border-muted' };
    }
    
    // Case 3: Object with bg property
    if (typeof vendorColor === 'object' && vendorColor !== null) {
      const bg = vendorColor.bg;
      const border = vendorColor.border;
      
      if (bg && typeof bg === 'string') {
        return { 
          className: `${bg} ${border || 'border border-muted'}`
        };
      }
    }
    
    // Default fallback
    return { className: 'bg-muted/30 border border-muted' };
  } catch (err) {
    console.error('Error processing vendorColor:', err, vendorColor);
    return { className: 'bg-muted/30 border border-muted' };
  }
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(later, wait);
  };
}

// 지오코딩 유틸리티 - 주소를 좌표(위도, 경도)로 변환
export async function geocodeAddress(address: string): Promise<{
  lat: number | null;
  lng: number | null;
}> {
  if (!address) {
    return { lat: null, lng: null };
  }

  try {
    // Google Maps API 설정 가져오기
    const configResponse = await fetch('/api/map/config');
    const { googleMapsApiKey } = await configResponse.json();
    
    if (!googleMapsApiKey) {
      console.error('Google Maps API 키가 없습니다');
      return { lat: null, lng: null };
    }
    
    // Google Maps Geocoding API 호출
    const geocodingApiUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleMapsApiKey}`;
    const response = await fetch(geocodingApiUrl);
    const data = await response.json();
    
    // 응답 확인 및 좌표 추출
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      console.log('지오코딩 결과:', location);
      return {
        lat: location.lat,
        lng: location.lng
      };
    } else {
      console.warn('지오코딩 실패:', data.status);
      return { lat: null, lng: null };
    }
  } catch (error) {
    console.error('지오코딩 오류:', error);
    return { lat: null, lng: null };
  }
}
