import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * ⚠️ 포트원 V2 API 핵심 요구사항 ⚠️
 * 
 * 1. 결제 ID 형식: 반드시 'pay_' + 22자 영숫자 = 총 26자여야 함
 *    - 'pay_' 접두사(4자) + 22자 영숫자 조합(모든 함수에서 검증해야 함)
 *    - ID 길이 검증은 모든 변환 지점에서 이루어져야 함
 * 
 * 2. 멱등성 키(Idempotency-Key): 결제 취소 API 호출 시 필수
 *    - 취소 요청마다 고유한 값으로 생성 필요
 *    - 형식: 'cancel-' + 타임스탬프 + 랜덤 문자열
 * 
 * 3. API 엔드포인트 (최신 공식 가이드 기준)
 *    - 결제 조회: /payments/{paymentId}
 *    - 결제 취소: /payments/{paymentId}/cancel
 *    - 결제 검색: /payments?{searchParams}
 *    - 전체 URL 예시: https://api.portone.io/payments/{paymentId}
 * 
 * 4. 헤더 요구사항:
 *    - Authorization: 'PortOne ' + API Secret
 *    - Store-Id: 상점 ID
 *    - Content-Type: 'application/json'
 *    - Accept: 'application/json'
 */

// 환경 변수에서 포트원 API 키 및 시크릿 가져오기
const portoneApiKey = process.env.PORTONE_API_KEY || '';
// 새로운 API 키 직접 사용 (임시 테스트용)
const portoneApiSecret = "Q5xc87z1Sxd5uPQDuz72O7pDGqy7XAC2b9EPO9PWFPvFT5jCy2er5Ap9IWHMP1iRVfcF54qE2nXx22J4";

// 상점 및 채널 정보 (고정값 또는 환경 변수에서 가져옴)
export const PORTONE_STORE_ID = process.env.PORTONE_STORE_ID || "store-c2335caa-ad5c-4d3a-802b-568328aab2bc";
export const PORTONE_CHANNEL_KEY = process.env.PORTONE_CHANNEL_KEY || "channel-key-5cdfe609-e895-41ae-9efd-d6a7d3148e79";
export const PORTONE_CHANNEL_NAME = process.env.PORTONE_CHANNEL_NAME || "plantbid_v2_real";

// 중요: 고정된 이니시스 상점 식별자(MID)
// 포트원 대시보드에 표시되는 값으로 반드시 고정된 값 사용
export const MERCHANT_ID = "MOI3204387";

/**
 * 포트원 V2 API 결제 ID 형식 검증 함수
 * 포트원 V2 API의 결제 취소는 'pay_'로 시작하는 26자 ID 형식을 필수로 요구함
 * 레거시 UUID 형식(8-4-4-4-12)은 내부적으로 변환 필요
 * V2 표준: pay_xxxxxxxxxxxxxxxxxxxxxx (pay_ + 22자 영숫자)
 * 
 * 참고: 포트원 V2 API 결제 취소 가이드 - 26자 ID 형식 필수
 */
/**
 * 포트원 V2 표준 형식 결제 ID 생성
 * 포트원 가이드에 따른 암호학적으로 안전한 결제 ID 생성 방식 적용
 * 
 * @see https://developers.portone.io/api/rest-v2/payment?v=v2
 * 
 * 포트원 V2 API 문서에 따른 결제 ID 형식:
 * - 'pay_' 접두사(4자) + 22자 영숫자 조합 = 총 26자
 * - 암호학적으로 안전한 난수 생성 사용
 * 
 * 주의: 실제 결제에서 사용되는 ID는 포트원에서 발급됨
 * 이 함수는 테스트와 같은 목적으로만 사용해야 함
 */
export function generatePortonePaymentId(): string {
  const prefix = "pay_";
  
  // Node.js의 crypto 모듈 사용하여 암호학적으로 안전한 난수 생성
  // 공식 가이드에서 제공한 방식과 동일
  try {
    const randomBytes = crypto.randomBytes(16);
    const randomStr = randomBytes.toString('hex').slice(0, 22);
    
    // pay_ + 22자 = 총 26자 ID
    const id = prefix + randomStr;
    
    // 형식 검증 (반드시 26자이고 pay_ 형식이어야 함)
    const isValid = /^pay_[a-zA-Z0-9]{22}$/.test(id);
    console.log(`생성된 포트원 V2 형식 결제 ID: ${id} (유효함: ${isValid})`);
    
    if (!isValid) {
      console.error('⚠️ 생성된 결제 ID가 V2 API 규격에 맞지 않습니다!');
      // 규격 불일치 시 대체 방법으로 생성
      return prefix + '0'.repeat(22);
    }
    
    return id;
  } catch (error) {
    console.error('결제 ID 생성 오류:', error);
    // 오류 발생 시 대체 방법으로 생성
    const timestamp = Date.now().toString();
    const randomPart = Math.random().toString(36).substring(2, 10).repeat(3);
    const fallbackId = prefix + (timestamp + randomPart).replace(/[^a-zA-Z0-9]/g, '').substring(0, 22);
    console.log(`대체 방법으로 생성된 ID: ${fallbackId}`);
    return fallbackId;
  }
}

/**
 * 이니시스 상점 식별자(MID) 함수
 * 포트원 대시보드에 표시되는 상점 식별자는 MOI3204387로 고정되어야 함
 * 
 * @returns string 고정된 MOI 형식의 상점 식별자 
 */
export function getInicisStoreId(): string {
  // 고정된 상점 식별자(MID) 반환
  return "MOI3204387";
}

// 전역 상수로 고정된 MID 내보내기 - 다른 모듈에서 직접 참조용
export const FIXED_MID = "MOI3204387";

/**
 * 이니시스 상점 주문번호 생성 함수 (이전 버전과의 호환성을 위해 유지)
 * 주의: 이것은 상점 식별자(MID)가 아니라 주문번호입니다
 * 
 * @returns string MOI 형식의 상점 주문번호 (예: MOI2505100123)
 * @deprecated 이 함수는 주문번호 생성용이며, 상점 식별자(MID)로 사용하면 안됩니다
 */
export function generateInicisOrderNumber(): string {
  const today = new Date();
  // YY년MM월DD일 포맷 (예: 250510)
  const dateStr = today.getFullYear().toString().substring(2) + 
                 (today.getMonth() + 1).toString().padStart(2, '0') + 
                 today.getDate().toString().padStart(2, '0');
  // 4자리 랜덤 숫자
  const randomNumber = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  // MOI + 날짜 + 랜덤 숫자 (예: MOI2505100123)
  return `MOI${dateStr}${randomNumber}`;
}

export function isValidPortoneUUID(paymentId: string | null | undefined): boolean {
  if (!paymentId) return false;

  // 정확한 UUID 형식 (8-4-4-4-12)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  // V2 API ID 형식 (pay_ + 22자 영숫자)
  const v2Pattern = /^pay_[a-zA-Z0-9]{22}$/;
  
  // 두 패턴 중 하나라도 일치하면 유효함
  return uuidPattern.test(paymentId) || v2Pattern.test(paymentId);
}

/**
 * 결제 ID를 포트원 V2 API 호환 형식(pay_ + 22자 = 26자)으로 변환
 * 모든 형식의 ID를 처리할 수 있는 범용 컨버터
 * 
 * 지원하는 입력 형식:
 * 1. UUID: 0196ae8c-5856-6faf-9053-88714a044a7d
 * 2. pay_ 형식: pay_123456789012345678901 (길이가 26자가 아닌 경우 자동 조정)
 * 3. 일반 문자열: abc123, any_string_format 등
 * 
 * 출력: 항상 'pay_'로 시작하는 26자 문자열 (pay_ + 22자)
 * 
 * @param id 변환할 ID (UUID, pay_ 형식, 일반 문자열 등)
 * @returns 포트원 V2 API 호환 ID 형식 (pay_xxxxxxxxxxxxxxxxxxx) - 항상 26자 보장
 */
export function convertToV2PaymentId(id: string): string {
  // 입력이 없으면 임의 ID 생성
  if (!id) {
    console.error('결제 ID가 비어있습니다. 임의 ID 생성');
    const randomStr = Date.now().toString() + Math.random().toString(36).substring(2);
    return `pay_${randomStr.replace(/[^a-zA-Z0-9]/g, '').substring(0, 22).padEnd(22, '0')}`;
  }
  
  // 모든 ID를 일관된 규칙으로 처리

  // 이미 V2 형식이고 정확히 26자인 경우 그대로 반환
  if (id.startsWith('pay_') && id.length === 26) {
    console.log(`이미 포트원 V2 API 형식 (26자): ${id}`);
    return id;
  }

  // UUID 형식이면 하이픈 제거 후 pay_ 형식으로 변환
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    // UUID에서 하이픈 제거
    const cleanUuid = id.replace(/-/g, '');
    console.log(`UUID 하이픈 제거: ${id} → ${cleanUuid} (${cleanUuid.length}자)`);
    
    // ⚠️ 핵심 주의사항: 포트원 V2 API는 반드시 'pay_' + 22자 = 총 26자 형식 요구함
    // UUID는 하이픈 제외하면 32자인데, V2 API는 22자만 필요 (총 길이 26자)
    // 중요: UUID의 특성을 최대한 보존하면서 API 요구사항(26자)을 충족해야 함
    let baseId = cleanUuid;
    
    // 32자를 22자로 변환하는 방식 개선 (UUID 연속성 보존)
    // 포트원 V2 API의 결제 ID 포맷(pay_ + 22자)에 맞추기 위한 더 나은 알고리즘
    if (baseId.length > 22) {
      console.log(`원본 UUID(하이픈 제외): ${baseId} (${baseId.length}자)`);
      
      // ✅ 개선된 방법: UUID를 22자로 줄이되 최대한 연속성 보존
      // 1. 첫 8자(타임스탬프 부분)는 그대로 유지 - 시간 정보 보존
      // 2. 마지막 8자(무작위 부분)는 그대로 유지 - 무작위성 보존 
      // 3. 중간 부분에서 6자 선택하여 총 22자 구성 (8+6+8=22)
      const timestamp = baseId.substring(0, 8);     // 처음 8자 (타임스탬프)
      const randomEnd = baseId.substring(baseId.length - 8);  // 마지막 8자 (난수)
      const middleStart = 8;
      const middleLength = 6;
      const middle = baseId.substring(middleStart, middleStart + middleLength);  // 중간 6자
      
      baseId = timestamp + middle + randomEnd;
      console.log(`UUID 변환 개선: ${baseId} (${baseId.length}자, 시작8자+중간6자+끝8자)`);
      
      // 최종 길이 검증 - 반드시 22자여야 함
      if (baseId.length !== 22) {
        console.error(`⚠️ 심각: UUID 변환 후 길이가 22자가 아님: ${baseId.length}자`);
        // 강제로 22자 맞추기 (짧으면 채우고, 길면 자르기)
        baseId = baseId.substring(0, 22).padEnd(22, 'f');
      }
    } else if (baseId.length < 22) {
      // 혹시 모르는 짧은 UUID를 위한 처리
      const originalLength = baseId.length;
      baseId = baseId.padEnd(22, '0');
      console.log(`길이가 부족하여 0으로 채움: ${baseId} (${originalLength}자 → ${baseId.length}자)`);
    }
    
    // 총 길이 26자 (pay_ 4자 + UUID에서 추출한 22자)
    const v2PaymentId = `pay_${baseId}`;
    console.log(`최종 V2 형식 결제 ID: ${v2PaymentId} (${v2PaymentId.length}자)`);
    
    // 결과 검증
    if (v2PaymentId.length !== 26) {
      console.error(`⚠️ 심각: 변환된 결제 ID가 26자가 아닙니다: ${v2PaymentId} (${v2PaymentId.length}자)`);
      // 강제로 26자 맞추기
      return `pay_${baseId.substring(0, 22).padEnd(22, '0')}`;
    }
    
    return v2PaymentId;
  }
  
  // pay_ 형식이지만 길이가 맞지 않는 경우 (길이 교정)
  if (id.startsWith('pay_')) {
    if (id.length !== 26) {
      console.log(`pay_ 형식이지만 길이가 맞지 않음: ${id} (${id.length}자)`);
      
      // 길이 조정 (22자 부분만)
      let idPart = id.replace(/^pay_/i, '');
      
      if (idPart.length > 22) {
        // 고유성 보존을 위해 앞부분 11자 + 뒷부분 11자 사용
        const firstPart = idPart.substring(0, 11);
        const lastPart = idPart.substring(idPart.length - 11);
        idPart = firstPart + lastPart;
        console.log(`ID 부분 앞뒤 조합: ${idPart} (${idPart.length}자)`);
      } else if (idPart.length < 22) {
        const originalLength = idPart.length;
        idPart = idPart.padEnd(22, '0');
        console.log(`ID 부분 채움: ${idPart} (${originalLength}자 → ${idPart.length}자)`);
      }
      
      const formattedId = `pay_${idPart}`;
      console.log(`최종 수정된 결제 ID: ${formattedId} (${formattedId.length}자)`);
      
      // 마지막 검증
      if (formattedId.length !== 26) {
        console.error(`⚠️ 심각: 최종 결제 ID가 26자가 아닙니다: ${formattedId}`);
        return `pay_${idPart.substring(0, 22).padEnd(22, '0')}`;
      }
      
      return formattedId;
    }
    
    return id;
  }
  
  // 그 외 모든 경우 - 강제 변환 (알파벳과 숫자만 남기고 길이 조정)
  console.log(`일반 문자열을 결제 ID로 변환: ${id}`);
  
  // 알파벳과 숫자만 남기기
  let cleanId = id.replace(/[^a-zA-Z0-9]/g, '');
  
  // ⚠️ 중요: 포트원 V2 API는 반드시 'pay_' + 22자 = 총 26자 형식 요구함
  // 길이 조정 (정확히 22자 맞추기) - 고유성 유지를 위한 개선
  if (cleanId.length > 22) {
    // 앞부분 11자 + 뒷부분 11자 사용 전략 적용
    const firstPart = cleanId.substring(0, 11);
    const lastPart = cleanId.substring(cleanId.length - 11);
    cleanId = firstPart + lastPart;
    console.log(`일반 문자열 길이 조정 (앞뒤 조합): ${cleanId} (${cleanId.length}자)`);
    
    // 22자 검증 (무조건 맞아야 함)
    if (cleanId.length !== 22) {
      console.error(`⚠️ 심각: 일반 문자열 변환 후 길이가 22자가 아님: ${cleanId.length}자`);
      // 강제로 22자 맞추기
      cleanId = cleanId.substring(0, 22).padEnd(22, '0');
    }
  } else if (cleanId.length < 22) {
    const originalLength = cleanId.length;
    cleanId = cleanId.padEnd(22, '0');
    console.log(`일반 문자열 길이 조정 (채움): ${cleanId} (${originalLength}자 → 22자)`);
  }
  
  // pay_ 접두사 추가하여 26자 만들기
  const formattedId = `pay_${cleanId}`;
  console.log(`최종 변환된 결제 ID: ${formattedId} (${formattedId.length}자)`);
  
  // 최종 검증
  if (formattedId.length !== 26) {
    console.error(`⚠️ 치명적 오류: 결제 ID 길이가 여전히 26자가 아님: ${formattedId}`);
    // 강제 수정
    return `pay_${cleanId.substring(0, 22).padEnd(22, '0')}`;
  }
  
  return formattedId;
}



/**
 * 포트원 결제 ID 검증 및 형식 확인
 * 포트원 V2 API는 UUID 형식의 결제 ID를 사용
 */
export function validatePortonePaymentId(paymentId: string): boolean {
  if (!paymentId) {
    console.warn('결제 ID가 비어있습니다.');
    return false;
  }
  
  // UUID 형식 확인
  if (isValidPortoneUUID(paymentId)) {
    console.log(`유효한 포트원 UUID 형식 결제 ID: ${paymentId}`);
    return true;
  }
  
  console.warn(`유효하지 않은 포트원 결제 ID 형식: ${paymentId}`);
  return false;
}

// 초기화 시 기본 정보 로깅
console.log('[포트원 클라이언트 초기화]');
console.log('- 상점 ID (STORE_ID):', PORTONE_STORE_ID);
console.log('- 채널 키 (CHANNEL_KEY):', PORTONE_CHANNEL_KEY);
console.log('- 채널 이름 (CHANNEL_NAME):', PORTONE_CHANNEL_NAME);
console.log('- API 키 설정 여부:', !!portoneApiKey);
console.log('- API 시크릿 길이:', portoneApiSecret.length);
console.log('- API 시크릿 유형:', portoneApiSecret.startsWith('TK') ? 'V2 API 키' : '비표준 API 키');
console.log('- API 시크릿 첫 10자:', portoneApiSecret.substring(0, 10));

// 환경 변수 로딩 상태 확인
console.log('🔑 환경 변수 확인:');
console.log('- PORTONE_API_KEY 설정됨:', !!process.env.PORTONE_API_KEY);
console.log('- PORTONE_API_SECRET 설정됨:', !!process.env.PORTONE_API_SECRET);
console.log('- PORTONE_V2_API_SECRET 설정됨:', !!process.env.PORTONE_V2_API_SECRET);

/**
 * 포트원 V2 API 클라이언트 클래스
 */
export class PortOneV2Client {
  private client: AxiosInstance;
  public apiSecret: string; // apiSecret를 public으로 변경 (디버깅용)
  public apiKey: string; // apiKey 추가
  
  constructor(apiSecret: string) {
    this.apiSecret = apiSecret;
    this.apiKey = portoneApiKey || '';
    
    // 환경에 따른 API 엔드포인트 설정
    // 가이드에 따라 운영/테스트 환경 분리
    const isTestMode = process.env.NODE_ENV !== 'production';
    const apiBaseUrl = 'https://api.portone.io'; // V2 API 경로를 제거 (/v2/ 없이 호출)
    
    console.log(`포트원 API 모드: ${isTestMode ? '테스트 환경' : '운영 환경'}`);
    
    // 포트원 V2 API 클라이언트 초기화 (공식 문서 기준)
    const config: AxiosRequestConfig = {
      baseURL: apiBaseUrl, // V2 API의 기본 URL은 항상 https://api.portone.io
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `PortOne ${this.apiSecret}`,
        'X-Request-Id': `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, // 유니크 요청 ID 생성
        'Accept': 'application/json' // 명시적으로 JSON 응답 요구
      },
      validateStatus: (status) => status < 500, // 500 미만 상태 코드는 성공으로 처리
      timeout: 10000 // 타임아웃 10초로 연장
    };
    
    console.log('포트원 V2 API 기본 URL:', apiBaseUrl);
    
    this.client = axios.create(config);
    
    // 로그 출력
    console.log(`포트원 API 클라이언트 인스턴스 생성 (키: ${this.apiSecret.substring(0, 5)}...${this.apiSecret.substring(this.apiSecret.length - 5)})`);
    
    // 요청 로깅 인터셉터
    this.client.interceptors.request.use(
      config => {
        // 전체 URL 로깅 (baseURL + path)
        const fullUrl = `${config.baseURL}${config.url}`;
        console.log(`포트원 API 요청: ${config.method?.toUpperCase()} ${fullUrl}`);
        return config;
      },
      error => {
        console.error('포트원 API 요청 전송 오류:', error.message);
        return Promise.reject(error);
      }
    );
    
    // 응답 로깅 인터셉터
    this.client.interceptors.response.use(
      response => {
        // 전체 URL 표시
        const fullUrl = `${response.config.baseURL}${response.config.url}`;
        console.log(`포트원 API 응답 [${response.status}]:`, fullUrl, 
                  response.data ? 'Data 받음' : 'No data');
        // 응답 데이터에 error가 있는지 확인
        if (response.data && response.data.error) {
          console.error('포트원 API 응답에 오류가 포함되어 있습니다:', response.data.error);
        }
        return response;
      },
      error => {
        if (error.response) {
          console.error(`포트원 API 오류 [${error.response.status}]:`, 
                        error.response.data || error.message, 
                        '\n요청 URL:', error.config?.url,
                        '\n요청 방식:', error.config?.method);
          // 401 인증 오류 로깅 상세화
          if (error.response.status === 401) {
            console.error('포트원 API 인증 오류! API 키를 확인해주세요.', 
                         '\n사용 중인 키:', this.apiSecret.substring(0, 5) + '...' + this.apiSecret.substring(this.apiSecret.length - 5));
          }
        } else if (error.request) {
          console.error('포트원 API 요청 오류 (응답 없음):', 
                       error.message, 
                       '\n요청 URL:', error.config?.url,
                       '\n요청 방식:', error.config?.method);
        } else {
          console.error('포트원 API 오류:', error.message);
        }
        return Promise.reject(error);
      }
    );

    console.log('포트원 V2 API 클라이언트 초기화 완료');
  }

  /**
   * 웹훅 URL을 사용하는 결제 생성 메서드
   * 포트원 V2 API 규격에 맞는 결제 ID 생성 적용
   */
  async createPayment(params: {
    orderName: string;
    amount: number;
    orderId: string;
    channelKey?: string;
    pgProvider?: string;
    currency?: string;
    payMethod?: string;
    orderItems?: Array<{
      orderQuantity: number;
      orderItemName: string;
      productId: string;
      orderItemAmt: number;
    }>;
    redirectUrl?: {
      successUrl: string;
      failUrl: string;
    };
    customer?: {
      name?: string;
      phoneNumber?: string;
      email?: string;
    };
    orderMerchantData?: any;
  }) {
    try {
      console.log('포트원 V2 API 결제 생성 호출', params);
      
      // V2 API 규격에 맞는 결제 ID 생성 - 'pay_' + 22자 = 26자 형식
      const paymentId = generatePortonePaymentId();
      console.log(`V2 API 규격 결제 ID 생성: ${paymentId}`);
      
      // 이니시스 상점 주문번호(MID) 생성
      const merchantId = generateInicisOrderNumber();
      console.log(`이니시스 상점 주문번호(MID) 생성: ${merchantId}`);
      
      // 주문 ID와 V2 형식 결제 ID 및 상점 주문번호 매핑
      // 주문 ID는 가맹점에서 관리하는 ID, paymentId는 포트원 시스템에서 사용하는 ID
      console.log(`주문 정보 매핑: 주문ID ${params.orderId} ↔ 결제ID ${paymentId} ↔ 상점주문번호 ${merchantId}`);
      
      // 결제 처리를 위한 체크아웃 URL 생성
      // 포트원 V2 공식 문서 기준 체크아웃 URL 형식으로 설정
      // 고정된 상점 식별자 (MID) 설정
      const fixedMerchantId = "MOI3204387";
      
      const checkoutUrl = `https://checkout.portone.io/orders/${params.orderId}?${new URLSearchParams({
        channel_key: params.channelKey || PORTONE_CHANNEL_KEY, // 공통 상수 사용
        merchant_order_id: merchantId, // 이니시스 상점 주문번호는 동적 생성 값 유지 (MOI 형식)
        payment_id: paymentId, // V2 규격 결제 ID 추가 - 중요!
        amount: params.amount.toString(),
        order_name: params.orderName,
        pay_method: params.payMethod || 'CARD', // 결제 수단 (공식 문서에 따르면 필수)
        buyer_name: params.customer?.name || '',
        buyer_email: params.customer?.email || '',
        buyer_tel: params.customer?.phoneNumber || '',
        success_url: params.redirectUrl?.successUrl || '',
        fail_url: params.redirectUrl?.failUrl || '',
        terms_agreement: 'Y', // 약관 동의 자동 체크
        user_confirm_yn: 'Y', // 사용자 확인 플래그
        mid: fixedMerchantId, // 중요: 고정된 상점 식별자 사용
      }).toString()}`;

      console.log('포트원 체크아웃 URL 생성:', checkoutUrl);
      
      // 응답 형식: 체크아웃 URL, 주문 ID, 결제 ID 및 상점 주문번호 포함
      return {
        success: true,
        orderId: params.orderId,
        paymentId: paymentId, // V2 규격 결제 ID 반환 추가
        merchantId: merchantId, // 상점 주문번호 반환 추가
        checkoutUrl
      };
    } catch (error: any) {
      console.error('포트원 결제 생성 오류:', error);
      return {
        success: false,
        message: error.message || '결제 생성 중 오류가 발생했습니다',
        error
      };
    }
  }

  /**
   * 결제 정보 조회 - 가이드에 맞게 개선된 버전
   * @param paymentId 결제 ID (pay_ 형식 또는 MOI 형식 지원)
   */
  async getPayment(paymentId: string) {
    try {
      console.log(`\n======= 포트원 결제 정보 조회 시작 (PaymentID: ${paymentId}) =======`);
      
      // UUID에 하이픈이 포함되어 있고, pay_ 형식이 아닌 경우에만 변환
      if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentId) && 
        !paymentId.startsWith('pay_')
      ) {
        console.log(`UUID 형식 감지됨 - 원본 그대로 사용: ${paymentId}`);
      }
      // pay_ 형식이 아니고 MOI로 시작하는 경우 검색 API로 처리
      else if (paymentId.startsWith('MOI')) {
        console.log(`이니시스 주문번호(MOI) 형식 감지 - 결제 검색 API 사용: ${paymentId}`);
        
        try {
          // MOI 주문번호로 결제 정보 검색
          const searchResult = await this.searchPayments({ orderId: paymentId });
          
          if (searchResult && searchResult.payments && searchResult.payments.length > 0) {
            // 첫 번째 결제 정보 반환
            console.log(`MOI 번호로 결제 정보 발견: ${searchResult.payments[0].payment_id || 'ID 없음'}`);
            return searchResult.payments[0];
          } else {
            console.error(`MOI 번호 ${paymentId}로 결제 정보를 찾을 수 없습니다.`);
            return null;
          }
        } catch (searchError) {
          console.error('MOI 번호로 결제 검색 중 오류 발생:', searchError);
          throw new Error(`MOI 번호로 결제 검색 실패: ${paymentId}`);
        }
      }
      
      // 결제 정보 조회 URL 설정 (공식 가이드에 맞게 설정)
      const getPaymentUrl = `/payments/${paymentId}`;
      console.log(`결제 조회 API URL: ${getPaymentUrl}`);
      
      // API 요청 헤더 설정
      const requestOptions = {
        headers: {
          'Authorization': `PortOne ${this.apiSecret}`, // 인증 헤더 추가
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };
      
      // API 요청 전송
      console.log('결제 정보 조회 요청 전송...');
      // 중요: 헤더 상세 로깅
      console.log('요청 헤더:', JSON.stringify({ 
        Authorization: `PortOne ${this.apiSecret.substring(0, 5)}...${this.apiSecret.substring(this.apiSecret.length-5)}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }, null, 2));
      const response = await this.client.get(getPaymentUrl, requestOptions);
      
      // 응답 처리
      if (response.status === 200) {
        console.log('결제 정보 조회 성공');
        console.log('=== 결제 정보 조회 완료 ===\n');
        return response.data;
      } else {
        console.error(`결제 정보 조회 실패 (상태 코드: ${response.status})`);
        console.error('응답 데이터:', response.data || '데이터 없음');
        console.log('=== 결제 정보 조회 실패 ===\n');
        throw new Error(`결제 정보 조회 오류: 상태 코드 ${response.status}`);
      }
    } catch (error: any) {
      console.error('결제 정보 조회 API 오류:', error.message || '알 수 없는 오류');
      
      // 오류 상세 정보 로깅
      if (error.response) {
        console.error(`응답 상태 코드: ${error.response.status}`);
        console.error('응답 데이터:', error.response.data || '데이터 없음');
        
        // 404 오류는 결제 ID를 찾을 수 없음을 의미
        if (error.response.status === 404) {
          console.error(`결제 ID ${paymentId}가 존재하지 않습니다.`);
        }
      } else if (error.request) {
        console.error('API 서버에서 응답이 없습니다.');
      }
      
      console.log('=== 결제 정보 조회 오류 발생 ===\n');
      throw new Error(`결제 정보 조회 실패: ${error.message}`);
    }
  }

  /**
   * 결제 취소 API (V2 API) - 포트원 공식 가이드 기반 구현
   * @see https://developers.portone.io/api/rest-v2/payment?v=v2#tag/Payments/operation/cancelpayment
   * 
   * 포트원 V2 API 결제 취소 요구사항 (공식 가이드 기준):
   * 1. paymentId는 반드시 'pay_'로 시작하는 26자 형식이어야 함 ('pay_' + 22자 영숫자)
   * 2. 멱등성 키(Idempotency-Key)는 필수이며 중복 요청 방지를 위해 매번 고유값 사용
   * 3. API 요청에 'reason' 파라미터 필수 포함
   * 4. Authorization 헤더는 반드시 'PortOne {V2_SECRET}' 형식으로 설정
   */
  async cancelPayment(params: {
    paymentId: string;  // 필수: 결제 ID (V2 API는 pay_ 형식 필수)
    reason: string;     // 필수: 취소 사유
    cancelAmount?: number; // 선택: 취소 금액 (부분 취소 시)
    taxFree?: number;   // 선택: 면세 금액 (복합과세 시 필수)
    merchantId?: string; // 선택: 상점 식별자 (MID)
  }): Promise<any> {
    console.log(`\n===== 포트원 결제 취소 요청 (V2 API) =====`);
    console.log(`결제 ID (원본): ${params.paymentId}`);
    console.log(`취소 사유: ${params.reason}`);
    
    // 고정된 상점 식별자 사용 (포트원 가이드에 따라 MID는 PG사에서 발급한 가맹점 식별자)
    const merchantId = params.merchantId || MERCHANT_ID;
    console.log(`상점 식별자(MID): ${merchantId}`);
    
    // 파라미터 유효성 검사 (공식 문서 기준)
    if (!params.paymentId) {
      throw new Error('결제 ID가 필요합니다');
    }
    
    // 결제 ID에서 하이픈(-) 제거 (가이드 권장)
    let cleanPaymentId = params.paymentId.replace(/-/g, '');
    console.log(`결제 ID 하이픈 제거: ${params.paymentId} → ${cleanPaymentId}`);
    
    // 포트원 V2 API 규격 확인 - 반드시 pay_ 형식 ID 사용 필요
    if (!cleanPaymentId.startsWith('pay_')) {
      console.error('❌ 포트원 V2 API 취소는 pay_ 형식의 ID만 지원합니다. UUID 형식은 지원되지 않습니다.');
      console.error(`❌ 요청된 ID 형식: ${cleanPaymentId}`);
      console.error('💡 가이드: paymentId는 pay_로 시작하는 26자 형식이어야 합니다. (pay_ + 22자 영숫자)');
      
      // 가이드에 따라 명확한 오류 발생시키기 
      throw new Error('포트원 V2 API 취소 요청 실패: pay_ 형식의 결제 ID가 필요합니다');
    }
    
    // 길이 확인 - 22자로 조정 (하이픈 제거 후 길이가 달라질 수 있음)
    if (cleanPaymentId.length !== 26) {
      console.log(`⚠️ 결제 ID 길이 조정 필요 - 현재: ${cleanPaymentId.length}자, 필요: 26자`);
      
      // pay_ 접두사 추출 후 나머지 부분 추출
      const prefix = cleanPaymentId.substring(0, 4); // "pay_" 부분
      let idPart = cleanPaymentId.substring(4);
      
      // 길이 조정
      if (idPart.length > 22) {
        idPart = idPart.substring(0, 22);
        console.log(`ID 부분 축소: ${idPart} (22자로 조정)`);
      } else if (idPart.length < 22) {
        idPart = idPart.padEnd(22, '0');
        console.log(`ID 부분 확장: ${idPart} (0 패딩으로 22자로 조정)`);
      }
      
      // 최종 ID 생성
      cleanPaymentId = prefix + idPart;
      console.log(`최종 결제 ID: ${cleanPaymentId} (${cleanPaymentId.length}자)`);
    }
    
    // 취소 사유 확인 (필수 파라미터)
    if (!params.reason) {
      params.reason = '고객 요청에 의한 취소';
      console.log(`취소 사유 기본값 사용: ${params.reason}`);
    }
    
    try {
      // 공식 문서 기준 멱등성 키 생성 (UUID 사용 권장)
      const idempotencyKey = crypto.randomUUID();
      
      // 취소 요청 URL 설정 (공식 가이드에 따른 엔드포인트)
      // 최신 공식 가이드에 맞게 경로 설정
      // 올바른 형식: https://api.portone.io/payments/{paymentId}/cancel (문서 기준)
      // 하이픈이 제거된 cleanPaymentId 사용
      const url = `/payments/${cleanPaymentId}/cancel`;
      console.log(`취소 API 경로 (정제된 ID 사용): ${url}`);
      
      // 요청 본문 구성 - 포트원 공식 예제와 일치하도록 수정
      const requestBody: Record<string, any> = {
        reason: params.reason // 취소 사유는 필수 파라미터
      };
      
      // 부분 취소 금액이 있으면 추가 (예제 코드와 동일한 필드명 'amount' 사용)
      if (params.cancelAmount) {
        requestBody.amount = params.cancelAmount; // amount 필드명으로 통일 (cancelAmount 대신)
      }
      
      // 면세 금액이 있으면 추가 (복합과세 시 필요, 선택 파라미터)
      if (params.taxFree !== undefined) {
        requestBody.taxFree = params.taxFree;
      }
      
      // 가이드에 따른 헤더 구성
      const requestOptions = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `PortOne ${this.apiSecret}`, // 필수: 포트원 V2 시크릿으로 인증
          'Idempotency-Key': idempotencyKey, // 필수: 중복 요청 방지를 위한 고유 키
          'Accept': 'application/json' // 응답 형식 지정
        },
        timeout: 10000 // 타임아웃
      };
      
      // 요청 정보 로깅
      console.log('\n-- API 요청 정보 --');
      console.log('요청 URL:', url);
      console.log('전체 URL (baseURL 포함):', this.client.defaults.baseURL + url);
      console.log('요청 본문:', JSON.stringify(requestBody, null, 2));
      console.log('멱등성 키:', idempotencyKey);
      
      // API 호출 실행
      const response = await this.client.post(url, requestBody, requestOptions);
      
      console.log('응답 상태:', response.status);
      console.log('응답 헤더:', JSON.stringify(response.headers, null, 2));
      
      // 성공 응답 처리
      if (response.status < 400) {
        console.log('✅ 결제 취소 성공');
        return response.data;
      } 
      // 오류 응답 처리
      else {
        console.error('❌ 결제 취소 API 오류 응답:', response.data);
        throw new Error(`결제 취소 API 오류: ${JSON.stringify(response.data)}`);
      }
    } catch (error: any) {
      // 오류 상세 로깅
      console.error('❌ 결제 취소 처리 중 오류 발생:');
      
      if (error.response) {
        console.error('응답 상태:', error.response.status);
        console.error('응답 데이터:', JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        console.error('요청 전송 후 응답 없음 (타임아웃 가능성)');
      } else {
        console.error('오류 메시지:', error.message);
      }
      
      // 오류 전파
      throw new Error(`결제 취소 실패: ${error.message}`);
    }
  }

  /**
   * @deprecated - 포트원 V2 API는 UUID 형식을 더 이상 지원하지 않습니다.
   * 공식 가이드(https://developers.portone.io/api/rest-v2/payment?v=v2)에 따라
   * 반드시 `pay_`로 시작하는 26자 형식의 결제 ID를 사용해야 합니다.
   * 
   * 대신 기본 cancelPayment 메서드를 사용하세요.
   */
  async cancelPaymentWithOriginalUUID(
    originalUUID: string,
    reason: string,
    cancelAmount?: number,
    taxFree?: number
  ): Promise<any> {
    console.error('❌ 이 메서드는 더 이상 사용할 수 없습니다 (deprecated)');
    console.error('❌ 포트원 V2 API는 UUID 형식을 지원하지 않습니다');
    console.error('💡 대신 pay_ 형식의 결제 ID를 사용하는 cancelPayment() 메서드를 사용하세요');
    
    // V2 API 형식으로 변환 후 기본 취소 함수 호출
    try {
      // UUID를 pay_ 형식으로 변환 (불가능한 경우 오류 발생)
      if (!originalUUID.includes('-')) {
        throw new Error('유효한 UUID 형식이 아닙니다');
      }
      
      // 부분 취소 처리
      const cancelParams: any = {
        paymentId: convertToV2PaymentId(originalUUID), // UUID를 pay_ 형식으로 변환
        reason: reason || '고객 요청에 의한 취소'
      };
      
      // 추가 파라미터 설정
      if (cancelAmount) {
        cancelParams.cancelAmount = cancelAmount;
      }
      
      if (taxFree !== undefined) {
        cancelParams.taxFree = taxFree;
      }
      
      // 표준 취소 메서드 호출
      return await this.cancelPayment(cancelParams);
      
    } catch (error: any) {
      console.error('❌ UUID 변환 또는 취소 처리 중 오류 발생:', error.message);
      throw new Error(`UUID 결제 취소 실패: ${error.message}`);
    }
  }

  /**
   * 주문 번호 또는 다른 조건으로 결제 정보 검색
   * V2 API 기반 검색 구현 (주문 ID, 결제 상태 등으로 검색)
   */
  async searchPayments(params: {
    orderId?: string;        // 주문 ID로 검색
    status?: string;         // 결제 상태로 검색
    startDate?: string;      // 시작 날짜 (ISO 형식)
    endDate?: string;        // 종료 날짜 (ISO 형식)
    page?: number;           // 페이지 번호
    limit?: number;          // 페이지당 항목 수
    merchantId?: string;     // 판매자 ID
    paymentId?: string;      // 결제 ID
    productId?: string;      // 상품 ID
    customerEmail?: string;  // 고객 이메일
    customerName?: string;   // 고객 이름
    sort?: string;           // 정렬 옵션
  }) {
    console.log('\n=== 포트원 결제 정보 검색 시작 ===');
    console.log('검색 파라미터:', JSON.stringify(params, null, 2));
    
    try {
      // Authorization과 Store-Id 헤더 확인
      console.log('API 키 상태 확인:');
      console.log(`- API 키: ${this.apiSecret ? this.apiSecret.substring(0, 5) + '...' + this.apiSecret.substring(this.apiSecret.length - 5) : '없음'}`);
      console.log(`- 스토어 ID: ${PORTONE_STORE_ID || '없음'}`);
      
      // 검색 파라미터 구성
      const searchParams = new URLSearchParams();
      
      // 주문 ID로 검색
      if (params.orderId) {
        searchParams.append('orderId', params.orderId);
        console.log(`주문 ID로 검색: ${params.orderId}`);
      }
      
      // 상태로 검색
      if (params.status) {
        searchParams.append('status', params.status);
        console.log(`상태로 검색: ${params.status}`);
      }
      
      // 시작 날짜로 검색
      if (params.startDate) {
        searchParams.append('startDate', params.startDate);
        console.log(`시작 날짜로 검색: ${params.startDate}`);
      }
      
      // 종료 날짜로 검색
      if (params.endDate) {
        searchParams.append('endDate', params.endDate);
        console.log(`종료 날짜로 검색: ${params.endDate}`);
      }
      
      // 판매자 ID로 검색
      if (params.merchantId) {
        searchParams.append('merchantId', params.merchantId);
        console.log(`판매자 ID로 검색: ${params.merchantId}`);
      }
      
      // 결제 ID로 검색
      if (params.paymentId) {
        searchParams.append('paymentId', params.paymentId);
        console.log(`결제 ID로 검색: ${params.paymentId}`);
      }
      
      // 상품 ID로 검색
      if (params.productId) {
        searchParams.append('productId', params.productId);
        console.log(`상품 ID로 검색: ${params.productId}`);
      }
      
      // 고객 이메일로 검색
      if (params.customerEmail) {
        searchParams.append('customerEmail', params.customerEmail);
        console.log(`고객 이메일로 검색: ${params.customerEmail}`);
      }
      
      // 고객 이름으로 검색
      if (params.customerName) {
        searchParams.append('customerName', params.customerName);
        console.log(`고객 이름으로 검색: ${params.customerName}`);
      }
      
      // 정렬 옵션
      if (params.sort) {
        searchParams.append('sort', params.sort);
        console.log(`정렬 옵션: ${params.sort}`);
      }
      
      // 페이지네이션 처리
      searchParams.append('page', (params.page || 1).toString());
      searchParams.append('limit', (params.limit || 20).toString());
      
      // API 호출 (공식 가이드에 맞게 URL 설정)
      const url = `/payments?${searchParams.toString()}`;
      console.log(`포트원 API 요청 URL: ${url}`);
      console.log(`검색 파라미터: ${searchParams.toString()}`);
      
      // API 호출 헤더 설정 - 인증 헤더 명시적 포함
      const requestOptions = {
        headers: {
          'Authorization': `PortOne ${this.apiSecret}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };
      
      // 중요: 헤더 상세 로깅
      console.log('포트원 API 요청 전송 시도...');
      console.log('요청 헤더:', JSON.stringify({ 
        Authorization: `PortOne ${this.apiSecret.substring(0, 5)}...${this.apiSecret.substring(this.apiSecret.length-5)}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }, null, 2));
      const startTime = Date.now();
      const response = await this.client.get(url, requestOptions);
      const endTime = Date.now();
      console.log(`포트원 API 응답 받음 (소요시간: ${endTime - startTime}ms)`);
      console.log(`응답 상태 코드: ${response.status}`);
      
      // 응답 제대로 받았는지 확인
      if (response.status >= 400) {
        console.error(`포트원 API 오류 [${response.status}]:`, response.data);
        throw new Error(response.data?.message || '결제 정보 검색 오류');
      }
      
      // 응답 가울팅 정보 로깅
      if (response.data && response.data.payments) {
        console.log(`검색 결과: ${response.data.payments.length}개 결제 정보 발견`);
        if (response.data.payments.length > 0) {
          console.log('처음 발견한 결제 정보:', JSON.stringify(response.data.payments[0], null, 2));
        }
      } else {
        console.log('검색 결과: 결제 정보 없음');
      }
      
      console.log('=== PortOne API Search Complete ===\n');
      return response.data;
    } catch (error: any) {
      console.error('=== PortOne API Search Error ===');
      if (error.response) {
        console.error(`응답 상태 코드: ${error.response.status}`);
        console.error('오류 데이터:', JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        console.error('요청은 보냈지만 응답을 받지 못했습니다.', error.request);
      } else {
        console.error('오류 메시지:', error.message);
      }
      console.error('Error Object:', error);
      console.error('=== PortOne API Search Error Handled ===\n');
      
      throw new Error(`결제 정보 검색 오류: ${error.message || '알 수 없는 오류'}`);
    }
  }

  /**
   * API 키 유효성 테스트
   */
  async testConnection() {
    console.log('\n=== 포트원 API 연결 테스트 시작 ===');
    console.log('사용중인 API 키 형식 확인:');
    console.log(`- API 키 길이: ${this.apiSecret ? this.apiSecret.length : 0}`);
    console.log(`- API 키 시작 부분: ${this.apiSecret ? this.apiSecret.substring(0, 5) : '없음'}`);
    console.log(`- API 키 TK 시작 여부: ${this.apiSecret && this.apiSecret.startsWith('TK') ? '예' : '아니오'}`);
    
    try {
      if (!this.apiSecret || !this.apiSecret.startsWith('TK')) {
        console.log('API 키 형식 검사 실패: 형식이 유효하지 않음');
        console.log('=== 포트원 API 연결 테스트 완료 ===\n');
        return { success: false, message: 'API 키 형식이 유효하지 않음' };
      }
      
      // 실제 API 요청을 보내서 테스트
      try {
        console.log('\n포트원 API 연결 테스트 시도...');
        // 테스트를 위한 헤더 정보 출력
        console.log('Authorization 헤더:', 
                   `PortOne ${this.apiSecret.substring(0, 5)}...${this.apiSecret.substring(this.apiSecret.length - 5)}`);
        console.log('요청 URL: /payments?page=1&limit=1');
        
        // API 요청 시도 - 포트원 V2 API 문서에 맞게 수정
        const startTime = Date.now();
        const response = await this.client.get('/payments?page=1&limit=1', {
          headers: {
            'Store-Id': PORTONE_STORE_ID,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `PortOne ${this.apiSecret}` // 중요: 인증 헤더 추가
          }
        });
        const endTime = Date.now();
        
        console.log(`포트원 API 응답 받음 (소요시간: ${endTime - startTime}ms)`);
        console.log(`응답 상태 코드: ${response.status}`);
        console.log(`데이터 없음 코드: ${!response.data}`);
        console.log(`응답 데이터 표시:`, response.data ? JSON.stringify(response.data, null, 2) : '데이터 없음');
        
        if (response.status >= 200 && response.status < 300) {
          console.log('API 키 유효성 테스트 성공!');
          console.log('=== 포트원 API 연결 테스트 완료 ===\n');
          return { success: true, message: 'API 키 유효함, 연결 성공' };
        } else {
          console.error(`API 서버 연결 오류 [${response.status}]:`, response.data || '데이터 없음');
          console.log('=== 포트원 API 연결 테스트 완료 ===\n');
          return { success: false, message: `API 서버 연결 오류: ${response.status} ${response.data?.message || ''}` };
        }
      } catch (apiError: any) {
        console.error('=== 포트원 API 연결 테스트 오류 ===');
        if (apiError.response) {
          console.error(`응답 상태 코드: ${apiError.response.status}`);
          console.error('오류 데이터:', JSON.stringify(apiError.response.data, null, 2));
        } else if (apiError.request) {
          console.error('요청은 보냈지만 응답을 받지 못했습니다.', apiError.request);
        } else {
          console.error('오류 메시지:', apiError.message);
        }
        console.error('오류 객체:', apiError);
        console.log('=== 포트원 API 연결 테스트 완료 ===\n');
        return { success: false, message: `API 연결 테스트 오류: ${apiError.message}` };
      }
    } catch (error: any) {
      console.error('포트원 API 테스트 오류:', error.message);
      console.log('=== 포트원 API 연결 테스트 완료 ===\n');
      return { success: false, message: `테스트 오류: ${error.message}` };
    }
  }
}

// 클라이언트 인스턴스 생성
const portoneV2Client = new PortOneV2Client(portoneApiSecret);

export default portoneV2Client;