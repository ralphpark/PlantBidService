/**
 * 결제 취소 컨트롤러
 * 포트원 V2 API를 사용한 결제 취소 처리 로직
 */
import { Request, Response } from 'express';
import { storage } from './storage';
import { smartCancelPayment } from './portone-payment-finder';

/**
 * 결제 취소 요청 처리
 * @param req Express 요청 객체
 * @param res Express 응답 객체
 */
export async function handleCancelPayment(req: Request, res: Response) {
  const { orderId, reason } = req.body;
  
  if (!orderId) {
    return res.status(400).json({
      success: false,
      error: '주문 ID가 필요합니다.'
    });
  }
  
  try {
    console.log(`\n===== 결제 취소 요청 처리 =====`);
    console.log(`주문 ID: ${orderId}`);
    console.log(`취소 사유: ${reason || '고객 요청에 의한 취소'}`);
    
    // 1. 주문 ID로 결제 정보 조회
    const payment = await storage.getPaymentByOrderId(orderId);
    
    if (!payment) {
      console.error(`[결제 취소] 결제 정보를 찾을 수 없음: ${orderId}`);
      return res.status(404).json({
        success: false,
        error: '주문에 대한 결제 정보를 찾을 수 없습니다.'
      });
    }
    
    // 2. 결제 상태 확인
    if (payment.status === 'CANCELLED') {
      console.log(`[결제 취소] 이미 취소된 결제: ${orderId}`);
      return res.status(200).json({
        success: true,
        message: '이미 취소된 결제입니다.',
        payment
      });
    }
    
    if (!payment.paymentKey) {
      console.error(`[결제 취소] 결제 키가 없음: ${orderId}`);
      return res.status(400).json({
        success: false,
        error: '결제 키가 없어 취소할 수 없습니다.'
      });
    }
    
    // 3. 스마트 결제 취소 함수 사용 - 다양한 ID 형식 시도
    console.log(`[결제 취소] 스마트 결제 취소 시도:`);
    console.log(`- 결제 키: ${payment.paymentKey}`);
    console.log(`- 주문 ID: ${payment.orderId}`);
    console.log(`- 상점 ID: ${payment.merchantId || 'MOI3204387'}`);
    
    // 3.1 paymentKey로 시도
    console.log(`[결제 취소] paymentKey로 취소 시도: ${payment.paymentKey}`);
    const cancelResultByKey = await smartCancelPayment(
      payment.paymentKey,
      reason || '고객 요청에 의한 취소'
    );
    
    // 3.2 성공했으면 결과 반환
    if (cancelResultByKey.success) {
      console.log(`[결제 취소] paymentKey로 취소 성공`);
      const updatedPayment = await storage.updatePayment(payment.id, {
        status: 'CANCELLED',
        cancelReason: reason || '고객 요청에 의한 취소',
        cancelledAt: new Date()
      });
      
      // 주문 상태 업데이트
      const order = await storage.getOrderByOrderId(orderId);
      if (order) {
        await storage.updateOrderStatus(order.id, 'cancelled');
      }
      
      return res.status(200).json({
        success: true,
        message: '결제가 성공적으로 취소되었습니다.',
        payment: updatedPayment,
        details: {
          usedPaymentId: cancelResultByKey.usedPaymentId
        }
      });
    }
    
    // 3.3 paymentKey로 실패한 경우 orderId로 시도
    console.log(`[결제 취소] paymentKey 취소 실패, orderId로 시도: ${payment.orderId}`);
    if (payment.orderId) {
      const cancelResultByOrder = await smartCancelPayment(
        payment.orderId,
        reason || '고객 요청에 의한 취소'
      );
      
      if (cancelResultByOrder.success) {
        console.log(`[결제 취소] orderId로 취소 성공`);
        const updatedPayment = await storage.updatePayment(payment.id, {
          status: 'CANCELLED', 
          cancelReason: reason || '고객 요청에 의한 취소',
          cancelledAt: new Date()
        });
        
        // 주문 상태 업데이트
        const order = await storage.getOrderByOrderId(orderId);
        if (order) {
          await storage.updateOrderStatus(order.id, 'cancelled');
        }
        
        return res.status(200).json({
          success: true,
          message: '결제가 성공적으로 취소되었습니다.',
          payment: updatedPayment,
          details: {
            usedPaymentId: cancelResultByOrder.usedPaymentId
          }
        });
      }
      
      // 두 방법 모두 실패한 경우
      console.error('[결제 취소] 모든 시도 실패');
      return res.status(500).json({
        success: false,
        error: `결제 취소 실패: 유효한 결제 ID를 찾을 수 없습니다.`,
        details: {
          keyError: cancelResultByKey.error,
          orderError: cancelResultByOrder.error
        }
      });
    } else {
      // orderId가 없는 경우
      console.error('[결제 취소] 취소 실패:', cancelResultByKey.error);
      return res.status(500).json({
        success: false, 
        error: `결제 취소 실패: ${cancelResultByKey.error}`,
        details: cancelResultByKey.error
      });
    }
  } catch (error: any) {
    console.error('[결제 취소] 오류 발생:', error.message || error);
    return res.status(500).json({
      success: false,
      error: `결제 취소 처리 중 오류가 발생했습니다: ${error.message || 'Unknown error'}`
    });
  }
}