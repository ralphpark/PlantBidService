/**
 * 포트원 결제 검색 유틸리티
 * 결제 취소 전 유효한 결제 ID를 찾기 위한 다양한 검색 방법 제공
 */
import axios from 'axios';
import crypto from 'crypto';

// 포트원 V2 API 설정
const API_SECRET = process.env.PORTONE_V2_API_SECRET || "Q5xc87z1Sxd5uPQDuz72O7pDGqy7XAC2b9EPO9PWFPvFT5jCy2er5Ap9IWHMP1iRVfcF54qE2nXx22J4";
const API_BASE_URL = 'https://api.portone.io';

/**
 * 결제 조회를 위한 다양한 형식의 결제 ID 생성
 * 데이터베이스에 저장된 ID를 포트원 API에서 인식할 수 있는 형식으로 변환
 */
export function generatePossiblePaymentIds(rawId: string): string[] {
  if (!rawId) return [];
  
  const candidates: string[] = [];
  
  // 1. 원본 ID
  candidates.push(rawId);
  
  // 2. pay_ 접두사가 있으면 그대로 사용, 없으면 추가
  if (!rawId.startsWith('pay_')) {
    candidates.push(`pay_${rawId}`);
  }
  
  // 3. 하이픈 제거
  const noHyphens = rawId.replace(/-/g, '');
  candidates.push(noHyphens);
  if (!noHyphens.startsWith('pay_')) {
    candidates.push(`pay_${noHyphens}`);
  }
  
  // 4. UUID 형태인 경우
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId)) {
    const uuidNoHyphens = rawId.replace(/-/g, '');
    candidates.push(uuidNoHyphens);
    candidates.push(`pay_${uuidNoHyphens.substring(0, 22)}`);
  }
  
  // 5. 짧은 형식
  if (rawId.length > 22) {
    candidates.push(`pay_${rawId.substring(0, 22)}`);
    candidates.push(`pay_${rawId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 22)}`);
  }
  
  // 6. txId 형식인 경우 (일부만 추출)
  if (rawId.startsWith('0')) {
    candidates.push(`pay_${rawId.substring(0, 22)}`);
  }
  
  // 중복 제거 및 반환
  return Array.from(new Set(candidates));
}

/**
 * 포트원 API를 통해 결제 ID의 존재 여부 확인
 * @param paymentId 확인할 결제 ID
 * @returns 유효성 여부 및 결제 정보
 */
export async function verifyPaymentId(paymentId: string): Promise<{
  valid: boolean;
  paymentInfo?: any;
  error?: any;
}> {
  try {
    console.log(`[포트원] 결제 ID 확인: ${paymentId}`);
    
    const response = await axios.get(`${API_BASE_URL}/payments/${paymentId}`, {
      headers: {
        'Authorization': `PortOne ${API_SECRET}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200) {
      console.log(`[포트원] 유효한 결제 ID 확인: ${paymentId}`);
      return {
        valid: true,
        paymentInfo: response.data
      };
    }
    
    return {
      valid: false,
      error: 'Unexpected response'
    };
  } catch (error: any) {
    console.error(`[포트원] 결제 ID 확인 실패 ${paymentId}:`, error.message);
    
    return {
      valid: false,
      error: error.response?.data || error.message
    };
  }
}

/**
 * 주문 ID로 결제 정보 검색
 * @param orderId 주문 ID
 * @returns 검색 결과
 */
export async function findPaymentByOrderId(orderId: string): Promise<{
  found: boolean;
  paymentId?: string;
  paymentInfo?: any;
  error?: any;
}> {
  try {
    console.log(`[포트원] 주문 ID로 결제 검색: ${orderId}`);
    
    const response = await axios.get(`${API_BASE_URL}/payments`, {
      params: {
        merchantId: 'MOI3204387',
        orderId: orderId,
        status: 'COMPLETE',
        limit: 10
      },
      headers: {
        'Authorization': `PortOne ${API_SECRET}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data && Array.isArray(response.data.payments) && response.data.payments.length > 0) {
      const payment = response.data.payments[0];
      console.log(`[포트원] 주문 ID ${orderId}로 결제 찾음:`, payment.paymentId);
      
      return {
        found: true,
        paymentId: payment.paymentId,
        paymentInfo: payment
      };
    }
    
    console.log(`[포트원] 주문 ID ${orderId}에 해당하는 결제 없음`);
    return {
      found: false,
      error: 'Payment not found'
    };
  } catch (error: any) {
    console.error(`[포트원] 주문으로 결제 검색 실패 ${orderId}:`, error.message);
    
    return {
      found: false,
      error: error.response?.data || error.message
    };
  }
}

/**
 * 여러 ID 형식을 시도하여 유효한 결제 ID 찾기
 * @param rawId 데이터베이스에 저장된 원본 ID
 * @returns 찾은 유효한 결제 ID 또는 null
 */
export async function findValidPaymentId(rawId: string): Promise<string | null> {
  // 1. 원본 ID로 직접 확인
  const directCheck = await verifyPaymentId(rawId);
  if (directCheck.valid) {
    return rawId;
  }
  
  // 2. 다양한 형식 생성 및 확인
  const candidates = generatePossiblePaymentIds(rawId);
  console.log(`[포트원] 가능한 결제 ID 형식 ${candidates.length}개 생성:`, candidates);
  
  for (const candidate of candidates) {
    const result = await verifyPaymentId(candidate);
    if (result.valid) {
      console.log(`[포트원] 유효한 결제 ID 찾음: ${candidate}`);
      return candidate;
    }
  }
  
  // 3. 주문 ID로 검색 시도
  const orderSearch = await findPaymentByOrderId(rawId);
  if (orderSearch.found && orderSearch.paymentId) {
    console.log(`[포트원] 주문 ID로 결제 ID 찾음: ${orderSearch.paymentId}`);
    return orderSearch.paymentId;
  }
  
  console.log(`[포트원] 모든 시도 후 유효한 결제 ID 찾지 못함: ${rawId}`);
  return null;
}

/**
 * 결제 취소 (검증된 결제 ID 사용)
 * @param paymentId 검증된 결제 ID
 * @param reason 취소 사유
 * @param amount 취소 금액 (부분 취소 시)
 * @returns 취소 결과
 */
export async function cancelVerifiedPayment(
  paymentId: string,
  reason: string,
  amount?: number
): Promise<{
  success: boolean;
  data?: any;
  error?: any;
}> {
  try {
    console.log(`[포트원] 검증된 결제 ID로 취소 시도: ${paymentId}`);
    
    // 멱등성 키 생성
    const idempotencyKey = crypto.randomUUID();
    
    // 요청 본문
    const requestBody: Record<string, any> = {
      reason: reason || '고객 요청에 의한 취소',
      mid: 'MOI3204387'
    };
    
    // 부분 취소인 경우 금액 추가
    if (amount && amount > 0) {
      requestBody.amount = amount;
    }
    
    // API 요청
    const response = await axios.post(
      `${API_BASE_URL}/payments/${paymentId}/cancel`,
      requestBody,
      {
        headers: {
          'Authorization': `PortOne ${API_SECRET}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Idempotency-Key': idempotencyKey
        }
      }
    );
    
    console.log(`[포트원] 결제 취소 성공: ${paymentId}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.error(`[포트원] 결제 취소 실패: ${paymentId}`, error.message);
    
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

/**
 * 통합 결제 취소 프로세스
 * 1. 유효한 결제 ID 검색
 * 2. 검증된 ID로 취소 시도
 */
export async function smartCancelPayment(
  paymentKey: string,
  reason: string,
  amount?: number
): Promise<{
  success: boolean;
  data?: any;
  error?: any;
  usedPaymentId?: string;
}> {
  // 1. 유효한 결제 ID 찾기
  const validPaymentId = await findValidPaymentId(paymentKey);
  
  if (!validPaymentId) {
    return {
      success: false,
      error: 'Valid payment ID not found'
    };
  }
  
  // 2. 검증된 ID로 취소
  const cancelResult = await cancelVerifiedPayment(validPaymentId, reason, amount);
  
  return {
    ...cancelResult,
    usedPaymentId: validPaymentId
  };
}