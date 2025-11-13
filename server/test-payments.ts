import { Express } from 'express';
import { IStorage } from './storage';

/**
 * 테스트용 결제 처리 API 설정 - SDK를 사용하지 않는 모의 결제 기능
 */
export function setupTestPayments(app: Express, storage: IStorage) {
  // 테스트 결제 처리 API
  app.post("/api/payments/test/:merchantUid", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }

    try {
      const { merchantUid } = req.params;
      const { 
        bidId,
        impUid,
        amount,
        custom_data,
        testMode
      } = req.body;
      
      console.log('테스트 결제 처리 요청 수신:', { merchantUid, bidId, amount });
      
      // 실제 금액 (테스트이므로 custom_data에서 가져옴)
      const realAmount = custom_data?.productAmount || amount;
      
      if (!bidId) {
        return res.status(400).json({ 
          success: false, 
          error: '입찰 ID가 필요합니다'
        });
      }
      
      // 입찰 정보 확인
      const bid = await storage.getBid(bidId);
      if (!bid) {
        return res.status(404).json({ 
          success: false, 
          error: '입찰 정보를 찾을 수 없습니다'
        });
      }
      
      // 테스트 결제 정보 생성
      const testImpUid = impUid || `imp_test_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // 테스트 결제 처리 - 입찰 상태 업데이트
      await storage.updateBid(bidId, { 
        status: 'paid',
        paymentId: 0 // 실제 결제 ID는 없음 (테스트)
      });
      
      // 이 부분에서 필요한 경우 테스트 결제 내역을 저장할 수 있음
      
      // 응답
      res.json({
        success: true,
        message: '테스트 결제가 성공적으로 처리되었습니다',
        bidId: bidId,
        impUid: testImpUid,
        merchantUid: merchantUid,
        amount: realAmount,
        testMode: true
      });
    } catch (error) {
      console.error('테스트 결제 처리 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : '테스트 결제 처리 중 오류가 발생했습니다'
      });
    }
  });
}