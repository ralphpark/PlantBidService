/**
 * 중요한 API 요청을 위한 직접 라우터
 * 이 파일은 express 내장 라우터 기능을 사용하여 미들웨어 간섭 없이 직접 API 요청을 처리합니다.
 */
import express, { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { IStorage } from './storage';
import portoneV2Client, { convertToV2PaymentId, isValidPortoneUUID } from './portone-v2-client';

/**
 * API 직접 라우터 설정
 * 이 라우터는 다른 미들웨어를 거치지 않고 직접 API 요청을 처리합니다.
 */
export function setupApiDirectRouter(app: express.Express, storage: IStorage): Router {
  const router = express.Router();

  // 명시적 JSON 헤더 설정
  router.use((req: Request, res: Response, next) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  // 결제 취소 API 구현 (MID 포함)
  router.post('/payments/cancel', async (req: Request, res: Response) => {
    try {
      const { orderId, reason, merchantId = 'MOI3204387' } = req.body;
      
      if (!orderId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: '주문 ID가 필요합니다'
        });
      }
      
      console.log(`\n===== 결제 취소 요청 (direct router) =====`);
      console.log(`주문 ID: ${orderId}`);
      console.log(`취소 사유: ${reason || '테스트 취소'}`);
      console.log(`상점 식별자(MID): ${merchantId}`);
      
      // 결제 정보 조회
      const payment = await storage.getPaymentByOrderId(orderId);
      
      if (!payment) {
        console.error(`주문 ID ${orderId}에 대한 결제 정보를 찾을 수 없습니다`);
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: '결제 정보를 찾을 수 없습니다'
        });
      }
      
      // 이미 취소된 결제인지 확인
      if (payment.status === 'CANCELLED') {
        console.log(`주문 ID ${orderId}는 이미 취소된 결제입니다`);
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: '이미 취소된 결제입니다'
        });
      }
      
      // 결제 취소 요청 (V2 API)
      console.log(`portoneV2Client를 사용하여 결제 취소 요청 - 주문 ID: ${orderId}, MID: ${merchantId}`);
      
      // 취소 멱등성 키 생성
      const idempotencyKey = `cancel-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      console.log(`Idempotency-Key: ${idempotencyKey}`);
      
      console.log(`⚠️ UUID 대신 주문 ID(pay_xxx) 사용`);
      console.log(`- UUID (paymentKey): ${payment.paymentKey}`);
      console.log(`- 주문 ID (orderId): ${orderId}`);
      
      const portoneResponse = await portoneV2Client.cancelPayment({
        paymentId: orderId, // 중요 변경: UUID가 아닌 주문 ID(pay_xxx) 사용
        reason: reason || '테스트 취소',
        merchantId: merchantId // 상점 식별자 추가
      });
      
      console.log('✅ 포트원 V2 API 취소 성공');
      
      // 데이터베이스 결제 정보 업데이트
      console.log('\n데이터베이스 결제 정보 업데이트');
      const canceledPayment = await storage.updatePayment(payment.id, {
        status: 'CANCELLED',
        cancelReason: reason || '테스트 취소',
        cancelledAt: new Date()
      });
      console.log('✓ 데이터베이스 결제 상태 업데이트 완료');
      
      // 응답 반환
      return res.status(StatusCodes.OK).json({
        success: true,
        message: '결제가 성공적으로 취소되었습니다',
        payment: canceledPayment,
        portoneResponse: '성공',
        merchantId: merchantId // 응답에 merchantId 포함
      });
    } catch (error: any) {
      console.error('결제 취소 중 오류:', error.message || error);
      
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error.message || '결제 취소 중 오류가 발생했습니다'
      });
    }
  });

  // 라우터 반환
  return router;
}