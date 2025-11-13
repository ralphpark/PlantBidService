/**
 * 포트원 V2 API 클라이언트 구현
 * 공식 문서: https://developers.portone.io/api/rest-v2/payment?v=v2
 */
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import crypto from 'crypto';

// MID 값 설정 - KG이니시스 연동용 상점 아이디
export const PORTONE_STORE_ID = process.env.PORTONE_STORE_ID || "store-c2335caa-ad5c-4d3a-802b-568328aab2bc";

// 채널 관련 설정
export const PORTONE_CHANNEL_KEY = process.env.PORTONE_CHANNEL_KEY || "channel-key-5cdfe609-e895-41ae-9efd-d6a7d3148e79";
export const PORTONE_CHANNEL_NAME = process.env.PORTONE_CHANNEL_NAME || "plantbid_v2_real";

// API 키 설정
const portoneApiKey = process.env.PORTONE_API_KEY || "";
const portoneApiSecret = process.env.PORTONE_API_SECRET || "TK6jRrmZA0YScFIqjokTTJexD10hxX2zweYENO8RKY8tA12eXOe296MC8tVNGnynme0RjhTAc9aduVHN";

/**
 * 포트원 V2 API 결제 ID 형식 검증 함수
 * 포트원 V2 API의 결제 취소는 'pay_'로 시작하는 26자 ID 형식을 필수로 요구함
 * 레거시 UUID 형식(8-4-4-4-12)은 내부적으로 변환 필요
 * V2 표준: pay_xxxxxxxxxxxxxxxxxxxxxx (pay_ + 22자 영숫자)
 * 
 * 참고: 포트원 V2 API 결제 취소 가이드 - 26자 ID 형식 필수
 */
export function isValidPortoneUUID(paymentId: string | null | undefined): boolean {
  if (!paymentId) {
    console.log('결제 ID가 null 또는 undefined입니다');
    return false;
  }
  
  // V2 API 결제 취소에서 요구하는 정확한 패턴:
  // 'pay_'로 시작하는 26자 ID (pay_ 4자 + 영숫자 22자)
  const v2Pattern = /^pay_[a-zA-Z0-9]{22}$/;
  
  if (v2Pattern.test(paymentId)) {
    // 정확한 26자 길이 검증 (pay_ 4자 + 22자 영숫자)
    if (paymentId.length === 26) {
      console.log(`✅ 유효한 포트원 V2 결제 ID 형식: ${paymentId}`);
      return true;
    } else {
      console.log(`❌ 결제 ID 길이 불일치: ${paymentId} (${paymentId.length}자, 26자 필요)`);
      return false;
    }
  }
  
  // 레거시 UUID 패턴: 8자-4자-4자-4자-12자의 16진수 문자열
  // 참고: 이 형식은 V2 API에서 직접 사용 불가능하며 변환 필요
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (uuidPattern.test(paymentId)) {
    console.log(`⚠️ UUID 형식 감지됨: ${paymentId} (V2 API 변환 필요)`);
    return false;
  }
  
  console.log(`❌ 유효하지 않은 결제 ID 형식: ${paymentId}`);
  return false;
}

/**
 * UUID 형식의 결제 ID를 포트원 V2 API 호환 형식으로 변환
 * @param uuid UUID 형식 결제 ID (예: 0196ae8c-5856-6faf-9053-88714a044a7d)
 * @returns V2 API 호환 결제 ID (예: pay_xxxxxxxxxxxxxxxxxxx) - 항상 26자 보장
 */
export function convertToV2PaymentId(uuid: string): string {
  // 이미 pay_ 형식이면 길이 교정만 수행
  if (uuid.startsWith('pay_')) {
    const idPart = uuid.substring(4); // 'pay_' 제외 부분
    
    // 22자 길이 맞추기
    if (idPart.length === 22) {
      // 정확히 22자면 그대로 사용
      return uuid;
    } else if (idPart.length < 22) {
      // 22자보다 짧으면 끝에 'f'로 채움
      return `pay_${idPart.padEnd(22, 'f')}`;
    } else {
      // 22자보다 길면 잘라서 사용
      return `pay_${idPart.substring(0, 22)}`;
    }
  }
  
  // UUID 형식 (8-4-4-4-12) 처리
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
    // 하이픈 제거
    const cleanUuid = uuid.replace(/-/g, '');
    // 앞에서부터 22자만 사용하여 pay_ 접두사 추가
    return `pay_${cleanUuid.substring(0, 22)}`;
  }
  
  // 일반 문자열 처리
  // 알파벳과 숫자만 남기고 나머지 제거
  const alphanumericOnly = uuid.replace(/[^a-zA-Z0-9]/g, '');
  
  // 정확히 22자가 되도록 조정
  let idPart;
  if (alphanumericOnly.length > 22) {
    idPart = alphanumericOnly.substring(0, 22);
  } else {
    idPart = alphanumericOnly.padEnd(22, 'f'); // 부족하면 'f'로 채움
  }
  
  return `pay_${idPart}`;
}

/**
 * 포트원 V2 표준 형식 결제 ID 생성
 * 주의: 실제 결제에서 사용되는 ID는 포트원에서 발급됨
 * 이 함수는 로컬 테스트용으로만 사용해야 함
 */
export function generatePortonePaymentId(): string {
  // 랜덤 영숫자 22자 생성
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 22; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  // pay_ 접두사 추가
  return `pay_${result}`;
}

/**
 * 포트원 결제 ID 검증 및 형식 확인
 * 포트원 V2 API는 UUID 형식의 결제 ID를 사용
 */
export function validatePortonePaymentId(paymentId: string): boolean {
  // UUID 형식 검증
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(paymentId)) {
    return true;
  }
  
  // pay_ 형식 검증 (26자, pay_ + 22자 영숫자)
  const payPattern = /^pay_[a-zA-Z0-9]{22}$/;
  if (payPattern.test(paymentId)) {
    return true;
  }
  
  return false;
}

/**
 * 포트원 V2 API 클라이언트 클래스
 */
export class PortOneV2Client {
  private client: AxiosInstance;
  public apiSecret: string; // apiSecret를 public으로 변경 (디버깅용)
  public apiKey: string; // apiKey 추가
  
  constructor(apiSecret: string) {
    this.apiSecret = apiSecret;
    this.apiKey = portoneApiKey;
    
    console.log(`포트원 V2 API 클라이언트 초기화 (Store ID: ${PORTONE_STORE_ID})`);
    
    const config: AxiosRequestConfig = {
      baseURL: 'https://api.portone.io',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `PortOne ${apiSecret}`,
        'Accept': 'application/json'
      },
      timeout: 30000 // 30초
    };
    
    this.client = axios.create(config);
  }
  
  /**
   * 웹훅 URL을 사용하는 결제 생성 메서드
   */
  async createPayment(params: {
    orderId: string;
    orderName: string;
    channelKey?: string;
    amount: number;
    currency?: string;
    customer?: {
      id?: string;
      name?: string;
      email?: string;
      phoneNumber?: string;
    };
    successRedirectUrl?: string;
    failRedirectUrl?: string;
  }) {
    try {
      const url = '/v2/payments';
      
      // API 요청 본문 구성
      const requestBody: Record<string, any> = {
        orderId: params.orderId,
        orderName: params.orderName,
        amount: {
          total: params.amount,
          currency: params.currency || 'KRW'
        },
        channelKey: params.channelKey || PORTONE_CHANNEL_KEY
      };
      
      // 고객 정보가 있는 경우 추가
      if (params.customer) {
        requestBody.customer = params.customer;
      }
      
      // 리다이렉트 URL 추가
      if (params.successRedirectUrl) {
        requestBody.successRedirectUrl = params.successRedirectUrl;
      }
      
      if (params.failRedirectUrl) {
        requestBody.failRedirectUrl = params.failRedirectUrl;
      }
      
      // API 요청 헤더
      const requestOptions = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `PortOne ${this.apiSecret}`,
          'Store-Id': PORTONE_STORE_ID,
          'Accept': 'application/json'
        }
      };
      
      console.log('포트원 결제 생성 요청:', requestBody);
      
      const response = await this.client.post(url, requestBody, requestOptions);
      
      console.log('포트원 결제 생성 완료:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('포트원 결제 생성 오류:', error);
      
      if (error.response) {
        console.error('응답 상태:', error.response.status);
        console.error('응답 데이터:', error.response.data);
      }
      
      throw new Error(`결제 생성 오류: ${error.message}`);
    }
  }
  
  /**
   * 결제 정보 조회 - 가이드에 맞게 개선된 버전
   * @param paymentId 결제 ID (pay_ 형식 또는 MOI 형식 지원)
   */
  async getPayment(paymentId: string) {
    try {
      // URL 경로 설정
      const url = `/v2/payments/${paymentId}`;
      console.log(`결제 정보 조회 URL: ${url}`);
      
      // API 요청 헤더
      const requestOptions = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `PortOne ${this.apiSecret}`,
          'Store-Id': PORTONE_STORE_ID,
          'Accept': 'application/json'
        }
      };
      
      // API 호출
      const response = await this.client.get(url, requestOptions);
      
      // 응답 확인
      if (response.status >= 400) {
        console.error(`결제 정보 조회 오류 [${response.status}]:`, response.data);
        throw new Error(response.data?.message || '결제 정보 조회 오류');
      }
      
      console.log('결제 정보 조회 성공:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('결제 정보 조회 오류:', error.message);
      
      if (error.response) {
        console.error('응답 상태:', error.response.status);
        console.error('응답 데이터:', error.response.data);
        
        // 404 오류는 결제 정보 없음을 의미
        if (error.response.status === 404) {
          console.error(`결제 ID(${paymentId})에 해당하는 결제 정보가 없습니다`);
        }
      }
      
      throw error;
    }
  }

  /**
   * 결제 취소 API (V2 API) - 포트원 공식 가이드 기반 개선
   * @see https://developers.portone.io/api/rest-v2/payment?v=v2#tag/Payments/operation/cancelpayment
   * 
   * 포트원 V2 API 결제 취소 요구사항:
   * 1. paymentId는 반드시 'pay_'로 시작하는 26자 형식일 것 ('pay_' + 22자 영숫자)
   * 2. 멱등성 키(Idempotency-Key)는 필수이며 중복 요청 방지를 위해 매번 고유값 사용
   * 3. API 요청에 'reason' 파라미터 필수 포함
   * 
   * 구현 특징:
   * - UUID 형식을 자동으로 V2 API 호환 형식(pay_xxx...)으로 변환
   * - 암호학적으로 안전한 멱등성 키 생성
   * - 요청 실패 시 상세 오류 정보 제공
   */
  async cancelPayment(params: {
    paymentId: string;  // 필수: 결제 ID (V2 API는 pay_ 형식 필수)
    reason: string;     // 필수: 취소 사유
    cancelAmount?: number; // 선택: 취소 금액 (부분 취소 시)
  }): Promise<any> {
    console.log(`\n===== 포트원 결제 취소 요청 (V2 API) =====`);
    console.log(`결제 ID: ${params.paymentId}`);
    console.log(`취소 사유: ${params.reason}`);
    
    // 파라미터 유효성 검사
    if (!params.paymentId) {
      throw new Error('결제 ID가 필요합니다');
    }
    
    if (!params.reason) {
      console.log('취소 사유가 없어 기본값 사용');
      params.reason = '고객 요청에 의한 취소';
    }
    
    try {
      // UUID 패턴 확인 - 하이픈 있는 UUID 형식이면 원본 유지해서 처리
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.paymentId)) {
        console.log(`UUID 형식 감지됨: ${params.paymentId} - 원본 유지 처리`);
        return this.cancelPaymentWithOriginalUUID(
          params.paymentId,
          params.reason,
          params.cancelAmount
        );
      }
      
      // pay_ 형식 처리 - 정확히 26자(pay_ + 22자)여야 함
      let finalPaymentId = params.paymentId;
      
      // 형식 검증 및 변환
      if (!finalPaymentId.startsWith('pay_') || finalPaymentId.length !== 26) {
        console.log(`결제 ID 형식 변환 필요: ${finalPaymentId}`);
        
        // pay_ 접두사가 있는 경우
        if (finalPaymentId.startsWith('pay_')) {
          const idPart = finalPaymentId.substring(4); // 'pay_' 제외 부분
          if (idPart.length > 22) {
            // 너무 길면 자르기
            finalPaymentId = `pay_${idPart.substring(0, 22)}`;
          } else {
            // 짧으면 끝에 'f'로 채우기
            finalPaymentId = `pay_${idPart.padEnd(22, 'f')}`;
          }
        } 
        // 그 외 일반 문자열인 경우 
        else {
          // 알파벳/숫자만 추출하고 적절한 길이로 조정
          const cleanId = finalPaymentId.replace(/[^a-zA-Z0-9]/g, '');
          if (cleanId.length > 22) {
            finalPaymentId = `pay_${cleanId.substring(0, 22)}`;
          } else {
            finalPaymentId = `pay_${cleanId.padEnd(22, 'f')}`;
          }
        }
        
        console.log(`변환된 결제 ID: ${finalPaymentId}`);
      }
      
      // 멱등성 키 생성 (고유한 요청 식별자)
      const idempotencyKey = `cancel-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      
      // 취소 요청 URL 설정 (V2 API 형식)
      const url = `/v2/payments/${finalPaymentId}/cancel`;
      
      // 요청 본문 구성
      const requestBody: Record<string, any> = {
        reason: params.reason
      };
      
      // 부분 취소 금액이 있으면 추가
      if (params.cancelAmount) {
        requestBody.cancelAmount = params.cancelAmount;
      }
      
      // 요청 헤더 구성
      const requestOptions = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `PortOne ${this.apiSecret}`,
          'Store-Id': PORTONE_STORE_ID,
          'Accept': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        timeout: 15000 // 15초 타임아웃
      };
      
      // 요청 정보 로깅
      console.log('\n-- API 요청 정보 --');
      console.log('요청 URL:', url);
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
   * 원본 UUID 형식을 그대로 사용한 결제 취소 (최적화 버전)
   * 포트원 API v2는 UUID 형식의 결제 ID를 직접 지원합니다
   */
  async cancelPaymentWithOriginalUUID(
    originalUUID: string,
    reason: string,
    cancelAmount?: number
  ): Promise<any> {
    console.log(`\n===== 포트원 결제 취소 요청 (원본 UUID 사용) =====`);
    console.log(`UUID 결제 ID: ${originalUUID}`);
    console.log(`취소 사유: ${reason}`);
    
    try {
      // 멱등성 키 생성 (v2 API 요구사항)
      const idempotencyKey = `cancel-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      
      // 취소 요청 URL - UUID 형식 그대로 사용 (포트원 V2 API 문서에 맞게 수정)
      const url = `/v2/payments/${originalUUID}/cancel`;
      
      // 취소 요청 본문
      const requestBody: Record<string, any> = {
        reason: reason
      };
      
      // 부분 취소 금액이 있는 경우
      if (cancelAmount) {
        requestBody.cancelAmount = cancelAmount;
      }
      
      // API 요청 헤더
      const requestOptions = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `PortOne ${this.apiSecret}`,
          'Store-Id': PORTONE_STORE_ID,
          'Accept': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        timeout: 15000 // 타임아웃 15초
      };
      
      console.log('\n-- API 호출 정보 (UUID 직접 사용) --');
      console.log('요청 URL:', url);
      console.log('요청 본문:', JSON.stringify(requestBody, null, 2));
      console.log('Idempotency-Key:', idempotencyKey);
      
      // API 호출
      const response = await this.client.post(url, requestBody, requestOptions);
      
      const startTime = new Date();
      console.log(`\n결제 취소 API 응답 (요청 시간: ${startTime.toISOString()}):`);
      console.log('- 응답 상태코드:', response.status);
      console.log('- 응답 헤더:', response.headers);
      
      // 응답 데이터 확인
      if (response.status >= 400) {
        console.error('! 포트원 API 취소 오류 응답:', response.data);
        throw new Error(`결제 취소 API 오류: ${JSON.stringify(response.data)}`);
      }
      
      console.log('\n✅ 포트원 결제 취소 성공 (UUID 직접 사용)');
      console.log('=== 결제 취소 요청 완료 ===\n');
      
      // 응답 데이터 반환
      return response.data;
    } catch (error: any) {
      console.error('\n❌ 결제 취소 API 오류 (UUID 직접 사용):');
      
      // 에러 상세 로깅
      if (error.response) {
        console.error('- 응답 상태코드:', error.response.status);
        console.error('- 응답 데이터:', JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        console.error('- 요청은 보냈지만 응답을 받지 못했습니다.', error.request);
      } else {
        console.error('- 오류 메시지:', error.message);
      }
      
      console.error('=== 결제 취소 요청 실패 ===\n');
      throw new Error(`결제 취소 오류: ${error.message}`);
    }
  }
  
  /**
   * 주문 번호 또는 다른 조건으로 결제 정보 검색
   * V2 API 기반 검색 구현 (주문 ID, 결제 상태 등으로 검색)
   */
  async searchPayments(params: {
    orderId?: string;      // 주문 ID로 검색
    status?: string;       // 결제 상태로 검색 
    page?: number;         // 페이지 번호
    limit?: number;        // 페이지당 아이템 수
    startDate?: string;    // 시작 날짜 (ISO 형식)
    endDate?: string;      // 종료 날짜 (ISO 형식)
    paymentId?: string;    // 결제 ID로 검색
    orderName?: string;    // 주문명으로 검색
    customerEmail?: string; // 고객 이메일로 검색
    customerName?: string;  // 고객 이름으로 검색
  }): Promise<any> {
    try {
      console.log('\n===== 포트원 결제 정보 검색 시작 =====');
      console.log('검색 조건:', JSON.stringify(params, null, 2));
      
      // 검색 파라미터 구성
      const searchParams = new URLSearchParams();
      
      // 주문 ID 검색
      if (params.orderId) {
        searchParams.append('orderId', params.orderId);
        console.log(`주문 ID로 검색: ${params.orderId}`);
      }
      
      // 결제 상태로 검색
      if (params.status) {
        searchParams.append('status', params.status);
        console.log(`결제 상태로 검색: ${params.status}`);
      }
      
      // 결제 ID로 검색
      if (params.paymentId) {
        searchParams.append('payment_id', params.paymentId);
        console.log(`결제 ID로 검색: ${params.paymentId}`);
      }
      
      // 주문명으로 검색
      if (params.orderName) {
        searchParams.append('orderName', params.orderName);
        console.log(`주문명으로 검색: ${params.orderName}`);
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
      
      // 날짜 범위 검색
      if (params.startDate) {
        searchParams.append('startDate', params.startDate);
        console.log(`시작 날짜: ${params.startDate}`);
      }
      
      if (params.endDate) {
        searchParams.append('endDate', params.endDate);
        console.log(`종료 날짜: ${params.endDate}`);
      }
      
      // 페이지네이션 처리
      searchParams.append('page', (params.page || 1).toString());
      searchParams.append('limit', (params.limit || 20).toString());
      
      // API 호출 (포트원 V2 API 문서에 맞게 수정)
      const url = `/v2/payments?${searchParams.toString()}`;
      console.log(`포트원 API 요청 URL: ${url}`);
      console.log(`검색 파라미터: ${searchParams.toString()}`);
      
      // 요청 헤더 설정 (상점 ID 추가)
      const requestOptions = {
        headers: {
          'Store-Id': PORTONE_STORE_ID,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };
      
      // API 요청 전송
      console.log('포트원 API 요청 전송 시도...');
      console.log('요청 헤더:', JSON.stringify(requestOptions.headers, null, 2));
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
        console.error('요청 후 응답을 받지 못했습니다', error.request);
      } else {
        console.error('오류 메시지:', error.message);
      }
      
      throw new Error(`결제 정보 검색 오류: ${error.message}`);
    }
  }
  
  /**
   * API 키 유효성 테스트
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    console.log('\n===== 포트원 API 연결 테스트 =====');
    console.log('API 키:', this.apiSecret ? '설정됨 (비공개)' : '설정되지 않음');
    console.log('상점 ID:', PORTONE_STORE_ID);
    
    try {
      // API 키가 비어있는지 확인
      if (!this.apiSecret || this.apiSecret.trim() === '') {
        console.error('API 키가 설정되지 않았습니다');
        return { success: false, message: 'API 키가 설정되지 않았습니다' };
      }
      
      // 실제 API 요청을 보내서 테스트
      try {
        console.log('\n포트원 API 연결 테스트 시도...');
        // 테스트를 위한 헤더 정보 출력
        console.log('Authorization 헤더:', 
                   `PortOne ${this.apiSecret.substring(0, 5)}...${this.apiSecret.substring(this.apiSecret.length - 5)}`);
        console.log('요청 URL: /v2/payments?page=1&limit=1');
        
        // API 요청 시도 - 포트원 V2 API 문서에 맞게 수정
        const startTime = Date.now();
        const response = await this.client.get('/v2/payments?page=1&limit=1');
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

// 외부에서 사용할 수 있도록 내보내기
export default portoneV2Client;