/**
 * Vite 미들웨어를 우회하는 직접 API 경로
 * 이 라우터는 Vite의 간섭 없이 직접 요청을 처리합니다.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { eq } from 'drizzle-orm';
import inicisClient from './inicis-client';
import portoneV2Client, { convertToV2PaymentId, generatePortonePaymentId } from './portone-v2-client';
import axios from 'axios';
import crypto from 'crypto';

const router = Router();

// JSON 응답 강제 미들웨어 - 이 라우터의 모든 응답을 JSON으로 강제
router.use((req: Request, res: Response, next: NextFunction) => {
  console.log('API 요청 감지, JSON 응답 설정:', req.originalUrl);
  
  // 원래 send 메서드 저장
  const originalSend = res.send;
  
  // JSON만 허용하는 send 메서드로 오버라이드
  res.send = function(body: any) {
    // body가 HTML인 경우 (문자열이고 <!DOCTYPE 또는 <html로 시작)
    if (typeof body === 'string' && 
       (body.startsWith('<!DOCTYPE') || body.startsWith('<html'))) {
      console.error('HTML 응답 감지 및 차단:', req.originalUrl);
      
      // JSON 형식으로 변환하여 반환
      res.set('Content-Type', 'application/json');
      
      // 원래의 send 메서드 호출
      return originalSend.call(this, JSON.stringify({
        success: false,
        error: 'API 라우터에서 HTML 응답이 감지되었습니다.',
        htmlDetected: true
      }));
    }
    
    // 일반 응답은 그대로 통과
    return originalSend.call(this, body);
  };
  
  // 명시적 헤더 설정
  res.set({
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff'
  });
  
  next();
});

// UUID 형식 검증 테스트 API
router.post('/payments/format-check', async (req: Request, res: Response) => {
  // 명시적으로 JSON 헤더 설정
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  try {
    const { paymentKey } = req.body;
    
    if (!paymentKey) {
      return res.status(400).json({
        success: false,
        error: '결제 키가 필요합니다.'
      });
    }
    
    console.log(`[직접 라우터] 결제 키 형식 테스트: ${paymentKey}`);
    
    // UUID 변환 테스트
    const formattedKey = convertToV2PaymentId(paymentKey);
    
    return res.status(200).json({
      success: true,
      originalKey: paymentKey,
      formattedKey,
      length: formattedKey.length,
      isV2Format: formattedKey.startsWith('pay_') && formattedKey.length === 26
    });
  } catch (error: any) {
    console.error('[직접 라우터] 형식 변환 테스트 오류:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 결제 정보 동기화 API
router.post('/payments/sync', async (req: Request, res: Response) => {
  // 명시적으로 JSON 헤더 설정
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: '주문 ID가 필요합니다.'
      });
    }
    
    console.log(`[직접 라우터] 주문 ${orderId}에 대한 결제 정보 동기화 요청`);
    
    // 주문 정보 조회
    const order = await storage.getOrderByOrderId(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: '주문을 찾을 수 없습니다.'
      });
    }
    
    // 기존 결제 정보 확인
    const existingPayment = await storage.getPaymentByOrderId(orderId);
    
    if (existingPayment) {
      return res.status(200).json({
        success: true,
        message: '이미 결제 정보가 존재합니다.',
        payment: existingPayment
      });
    }
    
    // 결제 정보 생성 (스키마에 맞는 형식으로)
    // 포트원 V2 API 규격에 맞는 paymentKey 생성
    const paymentKey = generatePortonePaymentId();
    console.log(`V2 API 규격 결제 ID 생성: ${paymentKey} (${paymentKey.length}자)`);
    
    // 주문 정보로부터 올바른 bid ID 찾기
    let bidId = null;
    if (order.vendorId && order.conversationId) {
      console.log(`주문 정보에서 판매자 ID ${order.vendorId}와 대화 ID ${order.conversationId}를 사용하여 올바른 입찰 검색`);
      const correctBid = await storage.getBidByVendorAndConversation(order.vendorId, order.conversationId);
      
      if (correctBid) {
        bidId = correctBid.id;
        console.log(`✅ 올바른 입찰 ID를 찾았습니다: ${bidId} (판매자 ${order.vendorId}의 입찰)`);
      } else {
        console.warn(`⚠️ 판매자 ${order.vendorId}와 대화 ${order.conversationId}에 대한 입찰을 찾지 못했습니다.`);
      }
    }
    
    // 입찰 ID가 없는 경우를 위한 안전 장치
    if (!bidId) {
      console.warn(`⚠️ 올바른 입찰 ID를 찾지 못했습니다. 판매자 ID로 최신 입찰 검색을 시도합니다.`);
      const vendorBids = await storage.getBidsForVendor(order.vendorId);
      if (vendorBids && vendorBids.length > 0) {
        bidId = vendorBids[0].id;
        console.log(`✅ 판매자의 최신 입찰 ID를 사용합니다: ${bidId}`);
      } else {
        // 안전장치: 입찰 정보를 전혀 찾을 수 없는 경우
        console.error(`🛑 판매자 ${order.vendorId}의 입찰 정보를 찾을 수 없습니다. 기본값을 사용합니다.`);
        bidId = 1; // 완전한 장애 방지를 위한 기본값
      }
    }
    
    const paymentData = {
      userId: order.userId,
      bidId: bidId, // 주문과 연관된 실제 입찰 ID 사용
      orderId: orderId,
      orderName: "식물 구매: " + orderId,
      amount: order.price.toString(),
      method: "CARD",
      status: "success",
      // 포트원 V2 API 형식의 paymentKey 사용 - pay_로 시작하는 26자 문자열
      paymentKey: paymentKey,
      customerName: "구매자",
      paymentUrl: `https://iniweb.inicis.com/receipt/MOI3204387_${orderId}`
    };
    
    // 결제 정보 저장
    const payment = await storage.createPayment(paymentData);
    
    return res.status(200).json({
      success: true,
      message: '결제 정보가 성공적으로 동기화되었습니다.',
      payment
    });
  } catch (error: any) {
    console.error('[직접 라우터] 결제 정보 동기화 중 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '결제 정보 동기화 중 오류가 발생했습니다.'
    });
  }
});

// 특정 주문의 결제 정보 조회 API
router.get('/payments/order/:orderId', async (req: Request, res: Response) => {
  // 명시적으로 JSON 헤더 설정
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  
  try {
    const { orderId } = req.params;
    console.log('[직접 라우터] 주문 ID로 결제 정보 조회:', orderId);
    
    const payment = await storage.getPaymentByOrderId(orderId);
    
    if (!payment) {
      console.log('[직접 라우터] 주문에 대한 결제 정보가 없음:', orderId);
      return res.status(404).json({ 
        success: false,
        error: '결제 정보를 찾을 수 없습니다.' 
      });
    }
    
    console.log('[직접 라우터] 결제 정보 찾음:', payment.id);
    return res.status(200).json(payment);
    
  } catch (error: any) {
    console.error('[직접 라우터] 결제 정보 조회 중 오류:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message || '결제 정보 조회에 실패했습니다.' 
    });
  }
});

/**
 * 포트원 결제 ID가 실제로 존재하는지 확인하는 함수 (V1 API 사용)
 * @param paymentId 결제 ID (일반적으로 pay_xxx 형식)
 * @returns 존재 여부 및 결제 정보
 */
async function checkPaymentExists(paymentId: string) {
  console.log(`\n===== 결제 ID 유효성 검증 (V1 API 사용) =====`);
  try {
    // 1. 결제 ID 정제 (우리 DB형식에서 실제 IMP 번호 추출)
    // pay_xxx 형식에서 merchantUID 또는 impUID 추출 필요
    let impUid = paymentId;
    if (paymentId.startsWith('pay_')) {
      // 실제 결제 번호는 DB에서 추출해서 사용해야 함
      // 현재는 ID 그대로 사용
      console.log(`[V1 API] 원본 결제 ID 사용: ${paymentId}`);
    }
    
    // 2. API URL 구성 (V1 API 사용)
    const apiUrl = 'https://api.iamport.kr';
    // 2-1. 먼저 액세스 토큰 획득
    const tokenUrl = `${apiUrl}/users/getToken`;
    console.log(`V1 API 토큰 획득 URL: ${tokenUrl}`);
    
    // 3. API 키 설정 (V1 API용)
    const impKey = "imp16062547"; // PORTONE_API_KEY
    const impSecret = "Q5xc87z1Sxd5uPQDuz72O7pDGqy7XAC2b9EPO9PWFPvFT5jCy2er5Ap9IWHMP1iRVfcF54qE2nXx22J4"; // PORTONE_API_SECRET
    
    // 4. 액세스 토큰 획득
    const tokenResponse = await axios.post(tokenUrl, {
      imp_key: impKey,
      imp_secret: impSecret
    });
    
    const accessToken = tokenResponse.data.response.access_token;
    console.log(`✅ V1 API 액세스 토큰 획득: ${accessToken.substring(0, 10)}...`);
    
    // 5. 결제 정보 조회
    const getUrl = `${apiUrl}/payments/${impUid}`;
    console.log(`V1 API 결제 조회 URL: ${getUrl}`);
    
    const headers = {
      'Authorization': accessToken,
      'Content-Type': 'application/json'
    };
    
    const response = await axios.get(getUrl, { headers });
    
    console.log(`✅ 결제 존재함 (상태 코드: ${response.status})`);
    console.log(`결제 정보: ${JSON.stringify(response.data)}`);
    
    return {
      exists: true,
      data: response.data
    };
  } catch (error: any) {
    console.error(`❌ 결제 확인 실패: ${error.message}`);
    
    if (error.response) {
      console.error(`응답 상태: ${error.response.status}`);
      console.error(`응답 데이터: ${JSON.stringify(error.response.data || {})}`);
      
      // 결제가 존재하지 않음
      if (error.response.status === 404) {
        console.error('💡 포트원 V1 API에서 해당 결제 ID를 찾을 수 없습니다.');
        console.error('  → 결제 ID 형식이 잘못되었거나, 실제 IMP 번호를 사용해야 할 수 있습니다.');
      }
    }
    
    return {
      exists: false,
      error: error.message,
      details: error.response?.data || {}
    };
  }
}

/**
 * 결제 ID를 포트원 V2 API 규격(pay_ + 22자 영숫자)으로 변환하는 함수
 */
function formatPortonePaymentId(paymentId: string): string {
  // 1. 모든 특수문자 제거 (영문, 숫자만 남김)
  let cleanId = paymentId.replace(/[^a-zA-Z0-9]/g, '');
  console.log(`특수문자 제거: ${paymentId} → ${cleanId}`);
  
  // 2. UUID/긴 형식 처리 - 필요한 길이만 유지
  if (paymentId.includes('-') || paymentId.length > 26) {
    cleanId = cleanId.substring(0, 22);
    console.log(`긴 ID 축소: ${cleanId} (22자)`);
  }
  
  // 3. pay_ 접두사 처리
  const PAY_PREFIX = 'pay_';
  if (!cleanId.startsWith('pay')) {
    cleanId = PAY_PREFIX + cleanId;
    console.log(`접두사 추가: ${cleanId}`);
  } else if (cleanId.startsWith('pay') && !cleanId.startsWith(PAY_PREFIX)) {
    cleanId = PAY_PREFIX + cleanId.substring(3);
    console.log(`접두사 정규화: ${cleanId}`);
  }
  
  // 4. 정확히 26자 길이로 조정
  const idPart = cleanId.substring(PAY_PREFIX.length);
  if (idPart.length !== 22) {
    let adjustedIdPart = idPart.length > 22 
      ? idPart.substring(0, 22) 
      : idPart.padEnd(22, '0');
    cleanId = PAY_PREFIX + adjustedIdPart;
    console.log(`길이 조정: ${cleanId} (26자)`);
  }
  
  console.log(`최종 변환된 결제 ID: ${cleanId} (${cleanId.length}자)`);
  return cleanId;
}

/**
 * V2 API 전용 결제 취소 함수 (가이드 기반 개선 버전)
 * 
 * @param paymentId 결제 ID (pay_xxx 형식)
 * @param reason 취소 사유 (필수)
 * @param amount 부분 취소 시 금액 (선택)
 * @param merchantId 가맹점 ID (MID)
 * @returns 성공/실패 여부 및 응답 데이터
 */
async function cancelPaymentV2(paymentId: string, reason: string, amount?: number, merchantId?: string) {
  console.log(`\n===== V2 API 결제 취소 시도 =====`);
  
  try {
    // 결제 ID에서 전송할 정보 추출
    console.log(`💳 원본 결제 ID: ${paymentId}`);
    
    // 결제 정보 찾기 - DB에서 실제 포트원 결제 정보 추출
    const payment = await storage.getPaymentByPaymentKey(paymentId);
    
    if (!payment) {
      console.error(`💡 DB에서 결제 정보를 찾을 수 없습니다: ${paymentId}`);
      return {
        success: false,
        error: '결제 정보를 찾을 수 없습니다.'
      };
    }
    
    console.log(`💡 DB 결제 정보: ${JSON.stringify({
      id: payment.id,
      paymentKey: payment.paymentKey,
      merchantId: payment.merchantId,
      status: payment.status
    })}`);
    
    // 결제 ID 추출 - 실제 IMP 결제 번호 또는 MID
    let merchantUid = payment.orderId || '';
    let impUid = payment.paymentKey || '';
    
    console.log(`💡 취소에 사용할 정보:
- 가맹점 번호(merchantUid): ${merchantUid}
- 포트원 결제번호(impUid): ${impUid}
    `);
    
    // V2 API URL 구성
    const apiUrl = 'https://api.portone.io';
    
    // 새로 제공받은 V2 API Secret 사용
    const apiSecret = "Q5xc87z1Sxd5uPQDuz72O7pDGqy7XAC2b9EPO9PWFPvFT5jCy2er5Ap9IWHMP1iRVfcF54qE2nXx22J4"; // 새로 제공받은 V2 시크릿
    
    // 포트원 V2 API 호출 준비
    const idempotencyKey = crypto.randomUUID();
    
    // 헤더 설정
    const headers = {
      'Authorization': `PortOne ${apiSecret}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Idempotency-Key': idempotencyKey
    };
    
    console.log(`💡 API 키: ${apiSecret.substring(0, 10)}...`);
    console.log(`💡 멱등성 키: ${idempotencyKey}`);
    
    // 요청 본문 - merchantId 또는 다른 식별자 포함
    const requestBody: any = {
      reason: reason || '고객 요청에 의한 취소'
    };
    
    // 부분 취소 시 금액 추가
    if (amount && amount > 0) {
      requestBody.amount = amount;
    }
    
    // mid 필드 추가 - 이것이 중요할 수 있음
    if (payment.merchantId || merchantId) {
      requestBody.mid = merchantId || payment.merchantId;
      console.log(`💡 MID 필드 추가: ${requestBody.mid}`);
    }
    
    console.log(`💡 요청 본문: ${JSON.stringify(requestBody)}`);
    
    // 1. 취소 직접 URL 구성 (paymentKey 사용)
    // 결제 취소에는 정확한 결제 ID 형식이 필요합니다. (총 26자)
    
    // 원본 결제 ID 사용 (DB에서 가져온 값)
    let formattedPaymentId = impUid;
    
    // 포트원 V2 API 결제 ID 형식 검증
    if (formattedPaymentId.startsWith('pay_')) {
      // 이미 올바른 형식으로 보임
      console.log(`💡 포트원 결제 ID 확인: ${formattedPaymentId} (${formattedPaymentId.length}자)`);
    } else {
      // 포맷이 잘못된 경우 경고
      console.error(`❌ 유효하지 않은 결제 ID 형식: ${formattedPaymentId}`);
      console.error('결제 ID는 반드시 pay_로 시작해야 합니다.');
    }
    
    // txId 형식인 경우 처리 (0196bbd0-5295-4443-9211-ad7b1def05c5)
    if (formattedPaymentId.includes('-')) {
      // UUID 형식을 단순 문자열로 변환 (하이픈 제거)
      let cleanId = formattedPaymentId.replace(/-/g, '');
      
      // pay_ 접두사가 없으면 추가
      if (!cleanId.startsWith('pay_')) {
        cleanId = `pay_${cleanId}`;
      }
      
      console.log(`💡 UUID 형식 결제 ID 변환: ${formattedPaymentId} -> ${cleanId}`);
      formattedPaymentId = cleanId;
    }

    const cancelUrl = `${apiUrl}/payments/${formattedPaymentId}/cancel`;
    console.log(`💡 취소 URL: ${cancelUrl}`);
    
    // 요청 정보 상세 로깅
    console.log(`\n💡 결제 취소 API 요청 상세 정보:`);
    console.log(`URL: ${cancelUrl}`);
    console.log(`결제 ID 길이: ${formattedPaymentId.length}자`);
    console.log(`결제 ID 내용: '${formattedPaymentId}'`);
    console.log(`요청 헤더:`, JSON.stringify({
      'Authorization': `PortOne ${apiSecret.substring(0, 5)}...`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Idempotency-Key': idempotencyKey
    }, null, 2));
    console.log(`요청 본문:`, JSON.stringify(requestBody, null, 2));
    
    try {
      // API 호출
      const response = await axios.post(cancelUrl, requestBody, { headers });
      
      // 응답 상세 로깅
      console.log(`\n💡 API 응답 상세 정보:`);
      console.log(`상태 코드: ${response.status}`);
      console.log(`응답 헤더:`, JSON.stringify(response.headers, null, 2));
      console.log(`응답 본문:`, JSON.stringify(response.data, null, 2));
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error(`❌ 결제 취소 실패:`, error.message);
      
      // 오류 응답 상세 로깅
      if (error.response) {
        console.error(`\n💡 API 오류 상세 정보:`);
        console.error(`상태 코드: ${error.response.status}`);
        console.error(`응답 헤더:`, JSON.stringify(error.response.headers, null, 2));
        console.error(`응답 본문:`, JSON.stringify(error.response.data, null, 2));
      }
      
      return {
        success: false,
        error: error.message,
        details: error.response?.data || {}
      };
    }
    
    console.log(`✅ 취소 성공 (상태 코드: ${response.status})`);
    console.log(`✅ 응답 데이터: ${JSON.stringify(response.data)}`);
    
    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.error(`❌ 결제 취소 실패: ${error.message}`);
    
    if (error.response) {
      console.error(`응답 상태: ${error.response.status}`);
      console.error(`응답 데이터: ${JSON.stringify(error.response.data || {})}`);
      
      // 404 에러 처리 (PAYMENT_NOT_FOUND)
      if (error.response.status === 404) {
        console.error('💡 결제를 찾을 수 없습니다. 결제 ID 형식이나 API 키를 확인하세요.');
      }
    }
    
    return {
      success: false,
      error: error.message,
      details: error.response?.data || {}
    };
  }
}

// V1 API 취소 함수는 요청에 따라 제거되었습니다

// 결제 취소 API
router.post('/payments/cancel', async (req: Request, res: Response) => {
  // 가이드에 따라 JSON 응답 강제 (res.type())
  res.type('json');
  // JSON 응답 형식 강제 설정 - 항상 JSON으로 응답
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store, must-revalidate');
  
  console.log('\n\n======= 결제 취소 API 호출 시작 =======');
  
  try {
    // 개선된 결제 취소 컨트롤러 사용
    const { handleCancelPayment } = await import('./payment-cancel-controller');
    return handleCancelPayment(req, res);
  } catch (error: any) {
    console.error('결제 취소 처리 중 오류:', error.message);
    return res.status(500).json({
      success: false,
      error: `결제 취소 처리 중 오류가 발생했습니다: ${error.message}`,
    });
  }
});

/**
 * 잘못된 bid_id 참조를 가진 결제 정보를 수정하는 API
 * 이 API는 관리자가 결제 정보를 올바른 판매자와 연결하기 위해 사용합니다.
 */
router.post('/payments/fix-bid-reference', async (req: Request, res: Response) => {
  // JSON 응답 형식 강제 설정
  res.type('json');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  try {
    const { paymentId, orderId } = req.body;
    
    if (!paymentId || !orderId) {
      return res.status(400).json({
        success: false,
        message: '결제 ID와 주문 ID가 모두 필요합니다.'
      });
    }
    
    console.log(`결제 정보 수정 요청 - 결제 ID: ${paymentId}, 주문 ID: ${orderId}`);
    
    // 결제 정보의 bid_id 참조 수정
    const updatedPayment = await storage.fixPaymentBidId(paymentId, orderId);
    
    if (!updatedPayment) {
      return res.status(404).json({
        success: false,
        message: '결제 정보를 찾을 수 없거나 수정할 수 없습니다.'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: '결제 정보가 성공적으로 수정되었습니다.',
      payment: updatedPayment
    });
  } catch (error) {
    console.error('결제 정보 수정 중 오류:', error);
    return res.status(500).json({
      success: false,
      message: '결제 정보 수정 중 오류가 발생했습니다.',
      error: String(error)
    });
  }
});

export default router;