/**
 * 포트원 MID 테스트를 위한 라우트
 */
import { Express, Request, Response } from 'express';
import { IStorage } from './storage';
import portOneV2Client, { PORTONE_STORE_ID, PORTONE_CHANNEL_KEY, PORTONE_CHANNEL_NAME, generatePortonePaymentId } from './portone-v2-client';

/**
 * MID 테스트 라우트 설정
 * 이 라우트는 테스트용으로만 사용됩니다.
 */
export function setupMidTestRoutes(app: Express, storage: IStorage) {
  /**
   * MID 테스트용 결제 생성 엔드포인트
   */
  app.post('/api_direct/payment/create-test', async (req: Request, res: Response) => {
    try {
      // 명시적으로 Content-Type을 JSON으로 설정
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      console.log('MID 테스트용 결제 생성 요청:', req.body);
      
      // 요청 데이터 추출
      const { 
        paymentId = generatePortonePaymentId(), 
        amount = 1000,
        productName = 'MID 테스트 상품',
        customerName = '테스터',
        merchantId = 'MOI3204387' // 기본값으로 고정된 MID 사용
      } = req.body;
      
      console.log(`결제 테스트 시작 - ID: ${paymentId}, MID: ${merchantId}, 금액: ${amount}원`);
      
      // 결제 생성 요청
      const response = await portOneV2Client.createPayment({
        orderId: paymentId,
        orderName: productName,
        amount: amount,
        channelKey: PORTONE_CHANNEL_KEY,
        pgProvider: 'INICIS',
        currency: 'KRW',
        payMethod: 'CARD',
        customer: {
          name: customerName,
          email: 'test@example.com',
          phoneNumber: '01012345678'
        },
        redirectUrl: {
          successUrl: `${req.protocol}://${req.get('host')}/payment-success`,
          failUrl: `${req.protocol}://${req.get('host')}/payment-fail`
        }
      });
      
      // URL 파라미터에 MID 추가
      if (response.checkoutUrl) {
        const url = new URL(response.checkoutUrl);
        url.searchParams.set('mid', merchantId);
        response.checkoutUrl = url.toString();
        
        console.log('생성된 결제 URL:', response.checkoutUrl);
        console.log('MID 파라미터 추가됨:', merchantId);
      }
      
      // 명시적으로 JSON 응답 반환
      return res.status(200).json({
        success: true,
        message: '테스트 결제가 생성되었습니다',
        checkoutUrl: response.checkoutUrl,
        merchantId: merchantId,
        paymentId: paymentId
      });
    } catch (error: any) {
      console.error('테스트 결제 생성 중 오류:', error.message || error);
      res.status(500).json({
        success: false,
        message: '테스트 결제 생성 중 오류가 발생했습니다',
        error: error.message || '알 수 없는 오류'
      });
    }
  });
}