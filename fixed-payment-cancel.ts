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
import axios from 'axios';
import crypto from 'crypto';

// 중요: 포트원 V2 API 필수 요구사항
// 결제 ID는 반드시 'pay_' + 22자 영숫자 = 총 26자 형식이어야 함
const API_BASE_URL = 'https://api.portone.io'; // 슬래시 없이 끝나도록 설정
const API_SECRET = "Q5xc87z1Sxd5uPQDuz72O7pDGqy7XAC2b9EPO9PWFPvFT5jCy2er5Ap9IWHMP1iRVfcF54qE2nXx22J4";
const MERCHANT_ID = "MOI3204387"; // 고정된 이니시스 상점 ID (MID)

// UUID를 포트원 V2 API 결제 ID 형식으로 변환
// 출력: 항상 'pay_'로 시작하는 26자 문자열 (pay_ + 22자)
export function convertToV2PaymentId(id: string): string {
  if (!id) {
    console.error('결제 ID가 비어있습니다');
    // 기본값으로 현재 시간 기반 ID 생성
    return `pay_${Date.now().toString(36).padEnd(22, '0')}`;
  }
  
  // 이미 올바른 형식이면 그대로 반환
  if (id.startsWith('pay_') && id.length === 26) {
    return id;
  }
  
  // 하이픈 제거
  let cleanId = id.replace(/-/g, '');
  
  // UUID 형식인 경우 처리 (32자)
  if (/^[0-9a-f]{32}$/i.test(cleanId)) {
    // 32자를 22자로 줄이는 알고리즘
    // 첫 8자(타임스탬프) + 중간 6자 + 마지막 8자(무작위)
    const start = cleanId.substring(0, 8);
    const middle = cleanId.substring(12, 18);
    const end = cleanId.substring(24);
    cleanId = start + middle + end;
  }
  
  // 'pay_' 접두사 없으면 추가
  if (!cleanId.startsWith('pay_')) {
    cleanId = 'pay_' + cleanId;
  }
  
  // 길이 확인 및 조정 (총 26자 필요)
  if (cleanId.length > 26) {
    // 넘치는 부분 자르기
    cleanId = cleanId.substring(0, 26);
  } else if (cleanId.length < 26) {
    // 부족한 부분 0으로 채우기
    cleanId = cleanId.padEnd(26, '0');
  }
  
  // 'pay_' 접두사 확인
  if (!cleanId.startsWith('pay_')) {
    // 접두사가 없으면서 이미 26자인 경우, 처음 4자를 'pay_'로 대체
    cleanId = 'pay_' + cleanId.substring(4);
  }
  
  return cleanId;
}

// 결제 취소 함수
export async function cancelPayment(params: {
  paymentKey: string;
  reason: string;
  amount?: number;
  merchantId?: string;
}): Promise<any> {
  try {
    console.log(`\n===== 포트원 결제 취소 요청 시작 =====`);
    console.log(`원본 결제 키: ${params.paymentKey}`);
    
    // 1. 결제 키 포맷 검증 및 변환
    const formattedPaymentId = convertToV2PaymentId(params.paymentKey);
    console.log(`변환된 결제 ID: ${formattedPaymentId} (${formattedPaymentId.length}자)`);
    
    if (formattedPaymentId.length !== 26 || !formattedPaymentId.startsWith('pay_')) {
      throw new Error(`결제 ID 형식이 유효하지 않습니다: ${formattedPaymentId}`);
    }
    
    // 2. 취소 URL 구성
    const cancelUrl = `${API_BASE_URL}/payments/${formattedPaymentId}/cancel`;
    console.log(`취소 API URL: ${cancelUrl}`);
    
    // 3. 멱등성 키 생성 (중복 요청 방지)
    const idempotencyKey = crypto.randomUUID();
    console.log(`멱등성 키: ${idempotencyKey}`);
    
    // 4. 요청 헤더 구성
    const headers = {
      'Authorization': `PortOne ${API_SECRET}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Idempotency-Key': idempotencyKey
    };
    
    // 5. 요청 본문 구성
    const requestBody: Record<string, any> = {
      reason: params.reason || '고객 요청에 의한 취소'
    };
    
    // 부분 취소 금액 추가 (있는 경우)
    if (params.amount && params.amount > 0) {
      requestBody.amount = params.amount;
    }
    
    // 상점 ID 추가 (MID) - 이니시스 필수
    const merchantId = params.merchantId || MERCHANT_ID;
    if (merchantId) {
      requestBody.mid = merchantId;
    }
    
    console.log(`요청 본문: ${JSON.stringify(requestBody, null, 2)}`);
    
    // 6. API 요청 실행
    const response = await axios.post(cancelUrl, requestBody, { headers });
    
    // 7. 응답 처리
    console.log(`응답 상태: ${response.status}`);
    if (response.status >= 200 && response.status < 300) {
      console.log(`✅ 결제 취소 성공`);
      return {
        success: true,
        data: response.data
      };
    } else {
      console.error(`❌ 예상치 못한 응답 상태: ${response.status}`);
      return {
        success: false,
        error: `예상치 못한 응답 상태: ${response.status}`,
        data: response.data
      };
    }
  } catch (error: any) {
    console.error(`❌ 결제 취소 오류: ${error.message}`);
    
    // 상세 오류 정보 추출
    let errorDetails: Record<string, any> = { message: error.message };
    
    if (error.response) {
      errorDetails = {
        ...errorDetails,
        status: error.response.status,
        data: error.response.data
      };
      console.error(`응답 상태: ${error.response.status}`);
      console.error(`응답 데이터: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    return {
      success: false,
      error: error.message,
      details: errorDetails
    };
  }
}