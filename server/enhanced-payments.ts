import { Express, Request, Response } from 'express';
import { IStorage } from './storage';

/**
 * 포트원(PortOne) 결제 취소 개선 API 입니다.
 * - 재시도 로직
 * - 상세 로그 샵
 * - 포트원 API 콜 성공 여부 확인
 */
export async function cancelPaymentWithRetry(
  payment: any, 
  orderId: string,
  reason: string,
  storage: IStorage,
  res: Response
) {
  try {
    // 포트원 V2 클라이언트 가져오기
    const portoneV2Client = await import('./portone-v2-client');
    const portoneClient = portoneV2Client.default;
    
    if (!payment.paymentKey) {
      throw new Error('취소할 결제 키가 없습니다.');
    }

    // API 요청 전 디버깅 정보 출력
    console.log('[결제 취소 API] 요청 세부정보:');
    console.log('- 결제 ID (UUID):', payment.id);
    console.log('- 결제 키:', payment.paymentKey);
    console.log('- 주문 ID:', orderId);
    console.log('- API 시크릿 키 길이:', portoneClient.apiSecret ? portoneClient.apiSecret.length : 0);
    console.log('- 취소 사유:', reason || '고객 요청에 의한 취소');
    
    // 재시도 관련 변수
    let portoneCallSuccess = false;
    let response: any = null;
    let attempts = 0;
    const maxAttempts = 3;
    const retryDelay = 1000; // 재시도 지연 시간(ms)
    
    // 유효한 포트원 결제 ID 검색 시도
    let portonePaymentId = payment.paymentKey;
    
    try {
      console.log('[결제 취소 API] 주문 ID로 유효한 포트원 결제 ID 검색 시도...');
      // 주문 ID로 결제 검색하여 올바른 ID 형식 찾기
      const searchResult = await portoneClient.searchPayments({ 
        orderId: orderId 
      });
      
      if (searchResult && searchResult.payments && searchResult.payments.length > 0) {
        const foundPayment = searchResult.payments[0];
        if (foundPayment.payment_id) {
          console.log('[결제 취소 API] 주문에서 포트원 결제 ID 찾음:', foundPayment.payment_id);
          // 검색된 ID가 pay_ 형식인지 확인
          if (foundPayment.payment_id.startsWith('pay_')) {
            console.log('[결제 취소 API] 유효한 pay_ 접두사 형식의 결제 ID 발견');
            portonePaymentId = foundPayment.payment_id;
          }
        }
      } else {
        console.log('[결제 취소 API] 주문으로 결제 정보 검색 실패: 결과 없음');
      }
    } catch (searchError) {
      console.error('[결제 취소 API] 결제 검색 오류:', searchError);
      console.log('[결제 취소 API] 원래 결제 ID 사용 계속');
    }
    
    // 재시도 로직 추가
    while (attempts < maxAttempts && !portoneCallSuccess) {
      attempts++;
      console.log(`[결제 취소 API] 시도 ${attempts}/${maxAttempts}`);
      console.log(`[결제 취소 API] 사용할 결제 ID: ${portonePaymentId}`);
      
      try {
        // 포트원 API 호출 (orderId 형식 사용 - pay_ 형식)
        response = await portoneClient.cancelPayment({
          paymentId: orderId, // 주문 ID 사용 (pay_ 형식)
          reason: reason || '고객 요청에 의한 취소'
        });
        
        // 성공 플래그 설정
        portoneCallSuccess = true;
        console.log(`[결제 취소 API] 시도 ${attempts} - 포트원 결제 취소 성공. 응답:`, JSON.stringify(response, null, 2));
        break;
      } catch (retryError: any) {
        console.error(`[결제 취소 API] 시도 ${attempts} - 실패:`, retryError?.message || retryError);
        
        // 마지막 시도가 아니면 재시도
        if (attempts < maxAttempts) {
          console.log(`[결제 취소 API] ${retryDelay}ms 후 재시도...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    if (!portoneCallSuccess) {
      console.warn('[결제 취소 API] 모든 시도 실패 후 DB 업데이트로 진행');
    }
    
    // 결제 정보 업데이트 - CANCELLED로 변경
    const updatedPayment = await storage.updatePayment(payment.id, {
      status: 'CANCELLED',
      updatedAt: new Date(),
      cancelReason: reason || '고객 요청에 의한 취소',
      cancelledAt: new Date()
    });
    
    // 주문 상태 업데이트
    const updatedOrder = await storage.updateOrderStatusByOrderId(orderId, 'cancelled');
    if (!updatedOrder) {
      console.error(`주문 ID ${orderId}의 상태를 변경하지 못했습니다.`);
    } else {
      console.log(`결제 취소 완료 - 주문 ID: ${orderId}, 결제 ID: ${payment.id}`);
    }

    // 업데이트된 결제 정보를 다시 가져와서 클라이언트에 전달
    const refreshedPayment = await storage.getPaymentByOrderId(orderId);
    
    // 응답 - 클라이언트에 원본 포트원 응답이 아닌 필요한 데이터만 전송
    return res.json({
      success: true,
      message: portoneCallSuccess 
        ? '결제가 성공적으로 취소되었습니다.' 
        : '결제가 취소되었지만 결제망에서 열람이 필요할 수 있습니다.',
      portoneCallSuccess,
      payment: refreshedPayment || updatedPayment,
      order: updatedOrder,
      timestamp: new Date().toISOString()
    });
  } catch (portoneError: any) {
    console.error('포트원 API 취소 오류:', portoneError?.message || portoneError);
    
    // 오류 객체 상세 출력
    if (portoneError.response) {
      console.error('포트원 API 오류 응답 상태:', portoneError.response.status);
      console.error('포트원 API 오류 응답 데이터:', JSON.stringify(portoneError.response.data, null, 2));
    } else if (portoneError.request) {
      console.error('포트원 API 요청은 전송되었으나 응답이 없음:', portoneError.request);
    }
    
    // DB에만 취소로 처리
    console.log('포트원 API 오류에도 불구하고 DB에는 취소 처리함');
    
    // 결제 정보 업데이트
    const updatedPayment = await storage.updatePayment(payment.id, {
      status: 'CANCELLED',
      updatedAt: new Date(),
      cancelReason: reason || '고객 요청에 의한 취소 (API 오류)',
      cancelledAt: new Date()
    });
    
    // 주문 상태 업데이트
    const updatedOrder = await storage.updateOrderStatusByOrderId(orderId, 'cancelled');
    
    // 업데이트된 결제 정보 다시 가져오기
    const refreshedPayment = await storage.getPaymentByOrderId(orderId);
    
    // API 오류 정보 추출
    let errorType = 'UNKNOWN_ERROR';
    let errorDetails = null;
    
    if (portoneError?.response?.data) {
      try {
        const errorData = portoneError.response.data;
        if (typeof errorData === 'string') {
          try {
            const parsedError = JSON.parse(errorData);
            errorType = parsedError.type || errorType;
            errorDetails = parsedError;
          } catch (e) {
            errorType = 'PARSE_ERROR';
            errorDetails = { raw: errorData };
          }
        } else {
          errorType = errorData.type || errorType;
          errorDetails = errorData;
        }
      } catch (e) {
        console.error('오류 데이터 파싱 실패:', e);
      }
    }
    
    // 테스트 환경 여부 확인
    const isTestEnvironment = process.env.NODE_ENV !== 'production' || !process.env.PORTONE_API_KEY;
    
    // 오류 응답 - 포트원 API 오류 응답 설정
    return res.json({
      success: true,
      message: '결제가 데이터베이스에서 취소되었지만, 포트원 API 호출은 실패했습니다.',
      apiCallSuccess: false,
      error: portoneError?.message || '포트원 API 오류',
      details: errorDetails,
      note: isTestEnvironment ? '테스트 환경에서는 이 오류가 예상됩니다. 데이터베이스 취소는 유효합니다.' : null,
      payment: refreshedPayment || updatedPayment,
      order: updatedOrder,
      timestamp: new Date().toISOString()
    });
  }
}
