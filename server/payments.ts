import { Express, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { IStorage } from './storage';
import axios from 'axios';
import { cancelPaymentWithRetry } from './enhanced-payments';

/**
 * 인증 상태로부터 사용자 정보를 안전하게 가져오는 함수
 */
function getUserFromRequest(req: Request) {
  // 일반 인증 확인
  if (req.isAuthenticated() && req.user) {
    return req.user;
  }
  
  // Express 세션에서 특정 프로퍼티 확인
  if (req.session && req.session.passport && req.session.passport.user) {
    return { id: req.session.passport.user };
  }
  
  return null;
}

/**
 * 경로별 헤더 설정
 */
function setJsonHeaders(res: Response) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res;
}

/**
 * 포트원(PortOne) 관련 API 엔드포인트 설정
 */
export function setupPaymentRoutes(app: Express, storage: IStorage) {
  // 포트원 API 설정
  // 사용자가 제공한 최신 포트원 V2 API 라이브 키 사용
  const PORTONE_SECRET_KEY = process.env.PORTONE_SECRET_KEY || 'TK6jRrmZA0YScFIqjokTTJexD10hxX2zweYENO8RKY8tA12eXOe296MC8tVNGnynme0RjhTAc9aduVHN';
  const PORTONE_API_URL = 'https://api.portone.io/v2';
  const PORTONE_SUCCESS_URL = process.env.PORTONE_SUCCESS_URL || '/api/payments/success-redirect';
  const PORTONE_FAIL_URL = process.env.PORTONE_FAIL_URL || '/api/payments/fail-redirect';
  
  // KG이니시스 설정
  const INICIS_CHANNEL_KEY = 'channel-key-5cdfe609-e895-41ae-9efd-d6a7d3148e79';
  const INICIS_MID = 'MOI3204387';
  const INICIS_SIGN_KEY = 'OC8zNmtrMXdXQ0hUL1E4R0dONzF3QT09';
  const INICIS_API_KEY = 'S1clN44uzgLhgsVi';
  const INICIS_API_IV = 'nmHNqbyRYxTePR==';
  const INICIS_HASH_KEY = 'BEAFB1B74BB086E749E8989F5108C067';
  
  // 시크릿 키가 설정되었는지 확인
  console.log(`포트원 시크릿 키 설정 여부: ${!!process.env.PORTONE_SECRET_KEY}, 길이: ${process.env.PORTONE_SECRET_KEY?.length || 0}`);

  // API 클라이언트 구성
  const portOneClient = axios.create({
    baseURL: PORTONE_API_URL,
    headers: {
      'Authorization': `Basic ${Buffer.from(PORTONE_SECRET_KEY + ':').toString('base64')}`,
      'Content-Type': 'application/json'
    }
  });

  // 결제 준비 API
  app.post("/api/payments/prepare", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }

    const { bidId, customerEmail, customerName, customerMobilePhone, price: clientPrice } = req.body;

    try {
      // 입찰 정보 가져오기
      const bid = await storage.getBid(bidId);
      if (!bid) {
        return res.status(404).json({ error: "입찰 정보를 찾을 수 없습니다" });
      }

      // 이미 지불된 입찰인지 확인
      if (bid.status === 'paid' || bid.status === 'shipping' || bid.status === 'completed') {
        return res.status(400).json({ error: "이미 결제가 완료된 입찰입니다" });
      }

      // 결제 준비를 위한 주문 ID 생성
      const orderId = `${bidId}_${nanoid(10)}`;
      
      // 상품 정보 설정
      let orderName = '심다 식물';
      
      // 클라이언트에서 전송한 제품명을 우선적으로 사용
      if (req.body.productName) {
        console.log(`클라이언트에서 전송한 제품명 사용: ${req.body.productName}`);
        orderName = req.body.productName;
      }
      // 클라이언트에서 전송한 제품 ID를 기반으로 제품명 조회
      else if (req.body.selectedProductId) {
        console.log(`클라이언트에서 전송한 선택 제품 ID 사용: ${req.body.selectedProductId}`);
        const product = await storage.getProduct(req.body.selectedProductId);
        if (product) {
          orderName = product.name;
          console.log(`선택된 제품 ID ${req.body.selectedProductId}의 이름: ${orderName}`);
        }
      }
      // 기존 방식: bid.selectedProductId 사용
      else if (bid.selectedProductId) {
        console.log(`입찰의 선택 제품 ID 사용: ${bid.selectedProductId}`);
        const product = await storage.getProduct(bid.selectedProductId);
        if (product) {
          orderName = product.name;
          console.log(`입찰에 저장된 제품 ID ${bid.selectedProductId}의 이름: ${orderName}`);
        }
      }
      
      // 판매자 정보
      const vendor = await storage.getVendor(bid.vendorId);
      if (vendor) {
        console.log(`판매자 정보 조회: ID=${bid.vendorId}, 상호=${vendor.storeName}`);
        orderName = `${vendor.storeName} - ${orderName}`;
      }
      console.log(`최종 주문명: ${orderName}`);

      // 결제 금액 처리
      let amount = 0;
      
      // 0. 클라이언트에서 전송한 가격 정보가 있는 경우 무조건 우선 사용
      if (clientPrice !== undefined && clientPrice !== null) {
        amount = typeof clientPrice === 'string' ? parseFloat(clientPrice) : Number(clientPrice);
        console.log(`클라이언트에서 전송한 가격 정보 사용: ${amount}, 원래 값: ${clientPrice}`);
        
        // 입력값이 유효하면 DB의 입찰 가격도 업데이트 (선택적)
        if (!isNaN(amount) && amount > 0) {
          try {
            await storage.updateBid(bid.id, { price: amount.toString() });
            console.log(`입찰 ID ${bid.id}의 가격을 ${amount}원으로 업데이트했습니다.`);
          } catch (updateError) {
            console.error('입찰 가격 업데이트 중 오류:', updateError);
          }
        }
      }
      
      // 클라이언트 가격이 유효하지 않은 경우에만 서버에서 가격 추출 시도
      if (isNaN(amount) || amount <= 0) {
        // 입찰 메시지에서 정확한 가격 추출 시도
        try {
          // 1. 먼저 bid.price 값을 확인
          if (bid.price !== undefined && bid.price !== null) {
            amount = typeof bid.price === 'string' ? parseFloat(bid.price) : Number(bid.price);
          }
          
          // 2. 잘못된 값이거나 0인 경우 conversation에서 vendorId가 같은 메시지 찾기
          if (isNaN(amount) || amount <= 0) {
            // 대화 가져오기
            const conversation = bid.conversationId ? await storage.getConversation(bid.conversationId) : null;
            if (conversation && conversation.messages) {
              // 판매자 메시지 중 vendorId가 같은 메시지 찾기
              const vendorMessages = conversation.messages.filter(
                (msg: any) => msg.role === 'vendor' && msg.vendorId === bid.vendorId
              );
              
              // 가격 정보가 있는 메시지 찾기
              for (const msg of vendorMessages) {
                if (msg.price) {
                  amount = typeof msg.price === 'string' ? parseFloat(msg.price) : Number(msg.price);
                  console.log(`대화에서 추출한 가격: ${amount}, 원래 값: ${msg.price}`);
                  break;
                }
                
                // 메시지 내용에서 가격 추출 시도
                if (msg.content && typeof msg.content === 'string') {
                  const priceMatch = msg.content.match(/입찰가격:\s*([0-9,]+)원/);
                  if (priceMatch && priceMatch[1]) {
                    amount = parseFloat(priceMatch[1].replace(/,/g, ''));
                    console.log(`메시지 텍스트에서 추출한 가격: ${amount}, 원본: ${priceMatch[1]}`);
                    break;
                  }
                }
              }
            }
          }
        } catch (extractionError) {
          console.error('가격 추출 중 오류:', extractionError);
        }
      }
      
      // 유효한 가격인지 확인
      if (isNaN(amount) || amount <= 0) {
        amount = 300000; // 기본값으로 300,000원 설정 (비상용)
        console.warn(`유효한 가격을 찾을 수 없어 기본값 설정: ${amount}원`);
      }
      
      // 입찰 가격 로깅 (디버깅용)
      console.log(`결제 준비 - 입찰 ID: ${bidId}, 금액: ${amount}, 원래 형식: ${typeof bid.price}, 원래 값: ${bid.price}`);
      
      // V2 API 형식에 맞는 결제 ID 생성
      const portoneV2Client = await import('./portone-v2-client');
      const portonePaymentId = portoneV2Client.generatePortonePaymentId();
      console.log('생성된 포트원 V2 형식 결제 ID:', portonePaymentId);

      // 결제 정보 생성 (V2 API 상태 코드 적용)
      const payment = await storage.createPayment({
        userId: req.user.id,
        bidId: bid.id,
        amount: amount.toString(),
        status: 'READY', // 대문자 상태 코드 사용 (V2 API 기준)
        orderId,
        orderName,
        paymentKey: portonePaymentId, // V2 형식의 결제 ID 저장
        customerName: customerName || req.user.username || '고객',
        customerEmail: customerEmail || req.user.email || '',
        customerMobilePhone: customerMobilePhone || '',
      });

      // 응답 전에 실제 금액 확인 및 로깅
      const responseAmount = payment.amount;
      console.log(`결제 API 응답 전 최종 금액 확인: ${responseAmount}, 원 입찰가: ${bid.price}`);
      
      // clientKey 생성 또는 가져오기 (포트원 V2에서는 secretKey로부터 생성)
      // 사용자가 제공한 최신 클라이언트 키 사용
      const clientKey = 'test_ck_lpP2YxJ4K877JAdv7KX8RGZwXLOb'; // 업데이트된 테스트 키
      
      // 실제 API 키를 우선적으로 사용
      if (process.env.PORTONE_SECRET_KEY) {
        // V2 API에서는 clientKey가 별도로 없으므로 로그만 남김
        console.log('포트원 실제 시크릿 키를 사용합니다.');
      } else {
        console.log('포트원 테스트 키를 사용합니다.');
      }

      // 응답
      res.json({
        success: true,
        paymentId: payment.id,
        clientKey: clientKey, // V2에서는 clientKey 별도로 없음, 테스트용으로 유지
        customerKey: req.user.id.toString(),
        orderId: payment.orderId,
        orderName: payment.orderName,
        amount: responseAmount, // 실제 입찰가를 사용
        successUrl: `${req.protocol}://${req.get('host')}${PORTONE_SUCCESS_URL}`,
        failUrl: `${req.protocol}://${req.get('host')}${PORTONE_FAIL_URL}`,
      });
    } catch (error) {
      console.error("결제 준비 중 오류:", error);
      res.status(500).json({ error: "결제 준비에 실패했습니다" });
    }
  });

  // 결제 승인 API
  app.post("/api/payments/approve", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }

    const { paymentKey, orderId, amount } = req.body;

    try {
      // 결제 정보 확인
      const payment = await storage.getPaymentByOrderId(orderId);
      if (!payment) {
        return res.status(404).json({ error: "결제 정보를 찾을 수 없습니다" });
      }

      // 결제 금액 확인
      if (payment.amount.toString() !== amount.toString()) {
        return res.status(400).json({ error: "결제 금액이 일치하지 않습니다" });
      }

      // 포트원 API 호출
      const response = await portOneClient.post('/payments/confirm', {
        paymentKey,
        orderId,
        amount
      });

      // 결제 정보 업데이트 (V2 API 상태 형식 사용)
      const updatedPayment = await storage.updatePayment(payment.id, {
        status: 'COMPLETED', // V2 API 상태 코드: 'success' → 'COMPLETED'
        paymentKey,
        method: response.data.method,
        requestedAt: new Date(response.data.requestedAt),
        approvedAt: new Date(response.data.approvedAt),
        receipt: response.data
      });

      // 입찰 상태 업데이트
      const bid = await storage.updateBid(payment.bidId, {
        status: 'completed', // 상태 코드 일관성 유지
        paymentId: payment.id
      });

      // 응답
      res.json({
        success: true,
        payment: updatedPayment,
        bid
      });
    } catch (error: any) {
      console.error("결제 승인 중 오류:", error);
      
      // 토스페이먼츠 API 에러인 경우 자세한 메시지 반환
      if (error.response && error.response.data) {
        return res.status(error.response.status).json(error.response.data);
      }
      
      res.status(500).json({ error: "결제 승인에 실패했습니다" });
    }
  });

  // 결제 취소 API - 공통 로직을 사용하는 함수
  async function handlePaymentCancel(req: Request, res: Response) {
    // 헤더 설정 및 인증 오류 처리 강화
    setJsonHeaders(res);
    
    // 세션 디버깅 정보 출력
    console.log('쿽키 정보:', req.headers.cookie ? '있음' : '없음');
    console.log('세션 정보:', req.session ? '있음' : '없음');
    console.log('사용자 정보:', req.user ? `ID: ${req.user.id}, 이름: ${req.user.username}` : '없음');
    
    // 인증 여부 확인 및 실패 시 오류 반환
    if (!req.isAuthenticated()) {
      console.error('인증 요청 실패: 사용자가 로그인되지 않았습니다.');
      return res.status(401).json({ 
        success: false, 
        error: '로그인이 필요합니다',
        authenticated: false
      });
    }
    
    // 유효한 사용자, 인증 성공 로그
    console.log('인증 성공:', req.user.username);

    const { orderId, reason } = req.body;
    console.log('결제 취소 요청 받음. 주문 ID:', orderId, '취소 사유:', reason);

    try {
      // 결제 정보 확인
      const payment = await storage.getPaymentByOrderId(orderId);
      if (!payment) {
        console.error('결제 정보 찾기 실패. 주문 ID:', orderId);
        return res.status(404).json({ 
          success: false, 
          error: "결제 정보를 찾을 수 없습니다", 
          orderId 
        });
      }

      // 이미 취소된 결제인지 확인
      if (payment.status === 'CANCELLED') {
        console.log('이미 취소된 결제. 결제 ID:', payment.id, '주문 ID:', orderId);
        return res.status(400).json({ 
          success: false, 
          error: "이미 취소된 결제입니다", 
          payment 
        });
      }

      // KG이니시스 관리자에 대한 취소 호출
      try {
        console.log('포트원 V2 결제 취소 API 호출 시도. 결제 키:', payment.paymentKey);
        
        // 포트원 V2 클라이언트 가져오기
        const portoneV2Client = await import('./portone-v2-client');
        const portoneClient = portoneV2Client.default;
        
        if (!payment.paymentKey) {
          throw new Error('취소할 결제 키가 없습니다.');
        }

        // API 요청 전 디버깅 정보 출력
        console.log('결제 취소 API 요청 세부정보:');
        console.log('- 결제 키:', payment.paymentKey);
        console.log('- API 시크릿 키 길이:', portoneClient.apiSecret ? portoneClient.apiSecret.length : 0);
        console.log('- API 시크릿 키 시작부분:', portoneClient.apiSecret ? `${portoneClient.apiSecret.substring(0, 5)}...` : '없음');
        console.log('- 취소 사유:', reason || '고객 요청에 의한 취소');
        
        // 포트원 API로 결제 취소 요청
        console.log('포트원 V2 API 엔드포인트 URL:', `/payments/${payment.paymentKey}/cancel`);
        const response = await portoneClient.cancelPayment({
          paymentId: payment.paymentKey,
          reason: reason || '고객 요청에 의한 취소'
        });

        console.log('포트원 결제 취소 성공. 응답:', JSON.stringify(response, null, 2));
        
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
          message: '결제가 성공적으로 취소되었습니다.',
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
        
        // 결제 키 유형 확인
        if (payment.paymentKey) {
          console.log('결제 키 유형 확인:', payment.paymentKey.startsWith('imp_') ? 'IMP 형식' : '기타 형식');
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
        
        // 오류 응답 - 포트원 API 오류 응답 설정
        return res.json({
          success: true,
          message: '결제가 취소되었지만 결제망에서 열람이 필요할 수 있습니다.',
          error: portoneError?.message || '포트원 API 오류',
          payment: refreshedPayment || updatedPayment,
          order: updatedOrder,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error('결제 취소 중 오류:', error?.message || error);
      
      return res.status(500).json({ 
        success: false, 
        error: error?.message || '결제 취소에 실패했습니다', 
        orderId,
        timestamp: new Date().toISOString()
      });
    }
  }

  // 원래 결제 취소 API - 개선된 로직 적용
  app.post("/api/payments/cancel", async (req, res) => {
    // 헤더 설정 및 로그 추가
    setJsonHeaders(res);
    console.log('결제 취소 API 요청 받음 (기존 경로) - 개선된 버전');
    
    // 로그인 상태 예외 처리를 강화
    if (!req.isAuthenticated()) {
      console.error('[Original API] 인증되지 않은 사용자가 결제 취소 기능에 접근했습니다.');
      return res.status(401).json({
        success: false,
        error: '로그인이 필요합니다.',
        authenticated: false
      });
    }
    
    // 공통 함수 호출 전 세션 정보 로깅
    const session = req.session;
    console.log('세션 ID:', session?.id);
    console.log('로그인 사용자 ID:', req.user?.id);

    try {
      const { orderId, reason } = req.body;
      console.log('[기존 취소 API] 요청 정보:', { orderId, reason });
      
      if (!orderId) {
        return res.status(400).json({
          success: false,
          error: '주문 ID가 필요합니다'
        });
      }
      
      // 결제 정보 확인
      const payment = await storage.getPaymentByOrderId(orderId);
      
      if (!payment) {
        console.error('결제 정보 찾기 실패. 주문 ID:', orderId);
        return res.status(404).json({ 
          success: false, 
          error: "결제 정보를 찾을 수 없습니다", 
          orderId 
        });
      }
      
      // 이미 취소된 결제인지 확인
      if (payment.status === 'CANCELLED') {
        console.log('이미 취소된 결제. 결제 ID:', payment.id, '주문 ID:', orderId);
        return res.status(400).json({ 
          success: false, 
          error: "이미 취소된 결제입니다", 
          payment 
        });
      }
      
      // 개선된 취소 함수 사용
      console.log('[기존 취소 API] 개선된 결제 취소 함수 사용');
      return await cancelPaymentWithRetry(payment, orderId, reason || '고객 요청에 의한 취소', storage, res);
    } catch (error: any) {
      console.error('결제 취소 중 오류:', error.message || error);
      return res.status(500).json({
        success: false,
        error: error.message || '결제 취소 중 오류가 발생했습니다',
        timestamp: new Date().toISOString()
      });
    }
  });

  // 결제 취소 API (공개) - 인증이 필요 없는 경로
  app.post("/api/payments/public/cancel", async (req, res) => {
    // 헤더 설정 축중 강화
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    const { orderId, reason, userId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: '주문 ID가 필요합니다'
      });
    }
    
    // 로그 추가
    console.log('[공개 취소 API] 결제 취소 요청 받음. 주문 ID:', orderId);
    
    try {
      // 결제 정보 확인
      const payment = await storage.getPaymentByOrderId(orderId);
      
      if (!payment) {
        console.error('결제 정보 찾기 실패. 주문 ID:', orderId);
        return res.status(404).json({ 
          success: false, 
          error: "결제 정보를 찾을 수 없습니다", 
          orderId 
        });
      }
      
      // 이미 취소된 결제인지 확인
      if (payment.status === 'CANCELLED') {
        console.log('이미 취소된 결제. 결제 ID:', payment.id, '주문 ID:', orderId);
        return res.status(400).json({ 
          success: false, 
          error: "이미 취소된 결제입니다", 
          payment 
        });
      }

      // 향상된 콤포넌트를 사용하여 KG이니시스 취소
      console.log('[공개 취소 API] 개선된 결제 취소 기능 사용');
      
      // 개선된 취소 함수 호출
      return await cancelPaymentWithRetry(payment, orderId, reason || '고객 요청에 의한 취소', storage, res);
      } catch (portoneError: any) {
        console.error('포트원 API 취소 오류:', portoneError?.message || portoneError);
        
        // 오류 객체 상세 출력
        if (portoneError.response) {
          console.error('포트원 API 오류 응답 상태:', portoneError.response.status);
          console.error('포트원 API 오류 응답 데이터:', JSON.stringify(portoneError.response.data, null, 2));
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
        
        // 오류 응답 - 포트원 API 오류 응답 설정
        return res.json({
          success: true,
          message: '결제가 취소되었지만 결제망에서 열람이 필요할 수 있습니다.',
          error: portoneError?.message || '포트원 API 오류',
          payment: refreshedPayment || updatedPayment,
          order: updatedOrder,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error('결제 취소 중 오류:', error?.message || error);
      
      return res.status(500).json({ 
        success: false, 
        error: error?.message || '결제 취소에 실패했습니다', 
        orderId,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // 결제 취소 API (V2) - 긴급 수정 (추가 경로)
  app.post("/api/payments/v2/cancel", async (req, res) => {
    // 헤더 설정 및 인증 오류 처리 강화
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    // 세션 디버깅 정보 출력
    console.log('쿽키 정보:', req.headers.cookie ? '있음' : '없음');
    console.log('세션 정보:', req.session ? '있음' : '없음');
    console.log('사용자 정보:', req.user ? `ID: ${req.user.id}, 이름: ${req.user.username}` : '없음');
    
    // 인증 여부 확인 및 실패 시 오류 반환
    if (!req.isAuthenticated()) {
      console.error('인증 요청 실패: 사용자가 로그인되지 않았습니다.');
      return res.status(401).json({ 
        success: false, 
        error: '로그인이 필요합니다',
        authenticated: false
      });
    }
    
    // 유효한 사용자, 인증 성공 로그
    console.log('인증 성공:', req.user.username);

    const { orderId, reason } = req.body;
    console.log('결제 취소 요청 받음. 주문 ID:', orderId, '취소 사유:', reason);

    try {
      // 결제 정보 확인
      const payment = await storage.getPaymentByOrderId(orderId);
      if (!payment) {
        console.error('결제 정보 찾기 실패. 주문 ID:', orderId);
        return res.status(404).json({ 
          success: false, 
          error: "결제 정보를 찾을 수 없습니다", 
          orderId 
        });
      }

      // 이미 취소된 결제인지 확인
      if (payment.status === 'CANCELLED') {
        console.log('이미 취소된 결제. 결제 ID:', payment.id, '주문 ID:', orderId);
        return res.status(400).json({ 
          success: false, 
          error: "이미 취소된 결제입니다", 
          payment 
        });
      }

      // KG이니시스 관리자에 대한 취소 호출
      try {
        console.log('포트원 V2 결제 취소 API 호출 시도. 결제 키:', payment.paymentKey);
        
        // 포트원 V2 클라이언트 가져오기
        const portoneV2Client = await import('./portone-v2-client');
        const portoneClient = portoneV2Client.default;
        
        if (!payment.paymentKey) {
          throw new Error('취소할 결제 키가 없습니다.');
        }

        // API 요청 전 디버깅 정보 출력
        console.log('결제 취소 API 요청 세부정보:');
        console.log('- 결제 키:', payment.paymentKey);
        console.log('- API 시크릿 키 길이:', portoneClient.apiSecret ? portoneClient.apiSecret.length : 0);
        console.log('- API 시크릿 키 시작부분:', portoneClient.apiSecret ? `${portoneClient.apiSecret.substring(0, 5)}...` : '없음');
        console.log('- 취소 사유:', reason || '고객 요청에 의한 취소');
        
        // 포트원 API로 결제 취소 요청
        console.log('포트원 V2 API 엔드포인트 URL:', `/payments/${payment.paymentKey}/cancel`);
        const response = await portoneClient.cancelPayment({
          paymentId: payment.paymentKey,
          reason: reason || '고객 요청에 의한 취소'
        });

        console.log('포트원 결제 취소 성공. 응답:', JSON.stringify(response, null, 2));
        
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
          message: '결제가 성공적으로 취소되었습니다.',
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
        
        // 결제 키 유형 확인
        if (payment.paymentKey) {
          console.log('결제 키 유형 확인:', payment.paymentKey.startsWith('imp_') ? 'IMP 형식' : '기타 형식');
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
        
        // 오류 응답 - 포트원 API 오류 응답 설정
        return res.json({
          success: true,
          message: '결제가 취소되었지만 결제망에서 열람이 필요할 수 있습니다.',
          error: portoneError?.message || '포트원 API 오류',
          payment: refreshedPayment || updatedPayment,
          order: updatedOrder,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error('결제 취소 중 오류:', error?.message || error);
      
      return res.status(500).json({ 
        success: false, 
        error: error?.message || '결제 취소에 실패했습니다', 
        orderId,
        timestamp: new Date().toISOString()
      });
    }
  });

  // 결제 정보 조회 API (public-test와 같은 특수 라우트와 충돌하지 않도록 정규식 사용)
  app.get("/api/payments/:id([0-9]+)", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }

    try {
      const paymentId = parseInt(req.params.id);
      const payment = await storage.getPayment(paymentId);

      if (!payment) {
        return res.status(404).json({ error: "결제 정보를 찾을 수 없습니다" });
      }

      // 권한 확인 (본인 결제 또는 관리자만 조회 가능)
      if (payment.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: "권한이 없습니다" });
      }

      res.json(payment);
    } catch (error: any) {
      console.error("결제 정보 조회 중 오류:", error);
      res.status(500).json({ error: "결제 정보 조회에 실패했습니다" });
    }
  });

  // 사용자의 결제 목록 조회 API
  app.get("/api/payments/user/:userId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }

    try {
      const userId = parseInt(req.params.userId);

      // 권한 확인 (본인 결제 또는 관리자만 조회 가능)
      if (userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: "권한이 없습니다" });
      }

      const payments = await storage.getPaymentsForUser(userId);
      res.json(payments);
    } catch (error: any) {
      console.error("사용자 결제 목록 조회 중 오류:", error);
      res.status(500).json({ error: "사용자 결제 목록 조회에 실패했습니다" });
    }
  });

  // 서버를 통한 결제 처리 API (클라이언트 SDK를 사용하는 방식과 서버 API 방식 지원)
  app.post("/api/payments/process/:orderId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }

    const { orderId } = req.params;
    const { 
      impUid,                 // 포트원 결제 고유 ID
      merchantUid,            // 판매자 주문번호
      status,                 // 결제 상태
      bidId,                  // 입찰 ID
      product_name,           // 상품명
      amount,                 // 금액
      buyer_email,            // 구매자 이메일
      buyer_name,             // 구매자 이름
      buyer_tel,              // 구매자 전화번호
      buyer_addr,             // 구매자 주소
      buyer_postcode,         // 구매자 우편번호
      pg,                     // PG 제공자
      payMethod,              // 결제 수단
      custom_data             // 추가 데이터 (테스트 모드에서 원래 금액 정보)
    } = req.body;
    
    console.log('결제 처리 API 호출 데이터:', req.body);
    
    // 포트원 테스트 모드에서 지급 시작 (모빌리언스/KCP 테스트용 - 100원 고정금액)
    if (pg === 'mobilians' && custom_data && custom_data.productAmount) {
      try {
        console.log('테스트 결제 처리 - 통과: ', { 
          bidId,
          productAmount: custom_data.productAmount,
          originalName: custom_data.originalName,
          testAmount: amount  // 100원 고정금액 (테스트용)
        });
        
        // 변경: 입찰 ID가 있는 경우 처리
        if (bidId) {
          const bid = await storage.getBid(bidId);
          if (!bid) {
            return res.status(404).json({
              success: false, 
              error: '입찰 정보를 찾을 수 없습니다.'
            });
          }
          
          // 테스트용 결제이류도 입찰 성공으로 처리
          await storage.updateBid(bidId, { status: 'paid' });
          
          // 테스트 결제인경우 imp_uid 생성
          const testImpUid = `imp_test_${new Date().getTime()}_${Math.floor(Math.random() * 1000)}`;
          
          return res.json({
            success: true,
            message: '테스트 모드에서 결제가 완료되었습니다.',
            bidId: bidId,
            impUid: testImpUid,
            merchantUid: orderId,
            amount: custom_data.productAmount, // 월래 상품 금액
            testMode: true
          });
        }
        
        // 주문번호로 처리되는 경우
        return res.json({
          success: true,
          message: '테스트 모드에서 결제가 완료되었습니다.',
          impUid: `imp_test_${new Date().getTime()}`,
          merchantUid: orderId,
          amount: custom_data.productAmount || 0,
          testMode: true
        });
      } catch (error) {
        console.error('테스트 결제 처리 오류:', error);
        return res.status(500).json({ 
          success: false, 
          error: '테스트 결제 처리 중 오류가 발생했습니다.' 
        });
      }
    }

    // 일반 결제 처리
    try {
      // IMP 결제 ID가 있으면 결제 처리
      if (impUid && merchantUid) {
        console.log('포트원 결제 정보 처리:', { impUid, merchantUid, status });
        
        // 입찰 ID가 있는 경우 처리
        if (bidId) {
          const bid = await storage.getBid(bidId);
          if (!bid) {
            return res.status(404).json({
              success: false, 
              error: '입찰 정보를 찾을 수 없습니다.'
            });
          }
          
          // 입찰 상태 업데이트
          await storage.updateBid(bidId, { status: 'paid' });
          
          return res.json({
            success: true,
            message: '결제가 성공적으로 처리되었습니다.',
            bidId: bidId,
            impUid: impUid,
            merchantUid: merchantUid
          });
        }
        
        // 주문이 있는 경우 결제 정보 업데이트
        return res.json({
          success: true,
          message: '결제가 성공적으로 처리되었습니다.',
          impUid: impUid,
          merchantUid: merchantUid
        });
      }
      
      // 아래에서부터는 기존 서버 API 방식 방식으로 처리
      // 주문 정보 확인
      const order = await storage.getOrderByOrderId(orderId);
      if (!order) {
        return res.status(404).json({ error: "주문 정보를 찾을 수 없습니다." });
      }

      // 상품 정보 확인
      const product = await storage.getProduct(order.productId);
      if (!product) {
        return res.status(404).json({ error: "상품 정보를 찾을 수 없습니다." });
      }

      // 도메인 정보 가져오기
      const host = req.get('host') || 'localhost:5000';
      const protocol = req.protocol || 'http';
      const baseUrl = `${protocol}://${host}`;
      
      // 콜백 URL 설정
      const successUrl = `${baseUrl}/api/payments/success?orderId=${orderId}`;
      const failUrl = `${baseUrl}/api/payments/fail?orderId=${orderId}`;
      
      // 포트원 V2 API를 통해 결제 시작
      try {
        // 이미 초기화된 클라이언트 사용
        const portoneV2Client = await import('./portone-v2-client');
        const portoneClient = portoneV2Client.default;

        // 결제 정보 생성
        const paymentData = await portoneClient.createPayment({
          orderName: product_name || product.name,
          orderId: orderId, // 중요: orderId 매개변수 반드시 추가
          channelKey: 'channel-key-5cdfe609-e895-41ae-9efd-d6a7d3148e79', // 플랜트비드 V2 채널
          amount: parseInt(amount as string),
          currency: 'KRW',
          orderItems: [{
            orderQuantity: 1,
            orderItemName: product_name || product.name,
            productId: product.id.toString(),
            orderItemAmt: parseInt(amount as string)
          }],
          redirectUrl: {
            successUrl,
            failUrl
          },
          // 특수 PG 설정 - 스크린샷에서 가져온 실제 정보
          pgProvider: 'inicis',  // 이니시스 PG
          // 고객 정보
          customer: {
            name: buyer_name || req.user?.username || '',
            email: buyer_email || req.user?.email || '',
            phoneNumber: buyer_tel || ''
          },
          orderMerchantData: {
            merchantUserId: req.user?.id?.toString() || '0',
            orderId: orderId
          },
          payMethod: 'CARD' // 이니시스에서 지원하는 결제 방법
        });

        // 결제 ID 저장
        if (paymentData && paymentData.payment && paymentData.payment.id) {
          await storage.updatePaymentByOrderId(orderId, {
            paymentKey: paymentData.payment.id,
            paymentUrl: paymentData.payment.checkout_url
          });

          // 결제 URL 반환 (포트원 V2 API 응답 구조 적용)
          res.json({
            success: true,
            orderId,
            paymentId: paymentData.payment?.id || '',
            checkoutUrl: paymentData.payment?.checkout_url || ''
          });
        } else {
          throw new Error('결제 정보 생성에 실패했습니다.');
        }
      } catch (apiError: any) {
        console.error('포트원 API 호출 오류:', apiError);
        res.status(500).json({
          success: false,
          error: apiError.message || '결제 처리 중 오류가 발생했습니다.' 
        });
      }
    } catch (error: any) {
      console.error('결제 처리 API 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '결제 처리를 시작하는 중 오류가 발생했습니다.'
      });
    }
  });

  // 결제 성공 리디렉션 처리
  app.get('/api/payments/success', async (req, res) => {
    const { orderId, paymentId } = req.query;
    
    try {
      if (!orderId) {
        return res.status(400).send('주문 ID가 없습니다.');
      }
      
      // DB에 결제 성공 상태 업데이트
      await storage.updatePaymentByOrderId(orderId as string, {
        status: 'success',
        paymentKey: paymentId as string || ''
      });
      
      // 성공 페이지로 리디렉션
      res.send(`
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>결제 성공</title>
            <style>
              body {
                font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background-color: #f5f5f5;
                color: #333;
              }
              .card {
                background: white;
                padding: 2rem;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 80%;
              }
              h1 {
                color: #4CAF50;
                margin-bottom: 1rem;
              }
              p {
                margin: 0.5rem 0;
                line-height: 1.5;
              }
              .order-id {
                font-size: 0.9rem;
                color: #666;
                margin-top: 1rem;
              }
              .button {
                margin-top: 1.5rem;
                padding: 0.75rem 1.5rem;
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                text-decoration: none;
                font-weight: bold;
              }
              .button:hover {
                background-color: #45a049;
              }
            </style>
            <script>
              // 3초 후 마스터 페이지로 이동
              setTimeout(function() {
                window.opener ? window.opener.postMessage('payment_success', '*') : window.location.href = '/';
                setTimeout(function() {
                  // 팝업이면 창 닫기
                  if (window.opener) {
                    window.close();
                  }
                }, 1000);
              }, 3000);
            </script>
          </head>
          <body>
            <div class="card">
              <h1>결제가 성공적으로 완료되었습니다!</h1>
              <p>주문이 정상적으로 처리되었습니다.</p>
              <p>개인 회원 페이지에서 주문 내역을 확인하실 수 있습니다.</p>
              <p class="order-id">주문번호: ${orderId}</p>
              <a href="/" class="button">홈으로 이동</a>
            </div>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error('결제 성공 처리 오류:', error);
      res.status(500).send('결제 성공 처리 중 오류가 발생했습니다.');
    }
  });

  // 결제 실패 리디렉션 처리
  app.get('/api/payments/fail', async (req, res) => {
    const { orderId, message } = req.query;
    
    try {
      if (orderId) {
        // DB에 결제 실패 상태 업데이트
        await storage.updatePaymentByOrderId(orderId as string, {
          status: 'failed',
          failReason: message as string || '결제 취소 또는 실패'
        });
      }
      
      // 실패 페이지 렌더링
      res.send(`
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>결제 실패</title>
            <style>
              body {
                font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background-color: #f5f5f5;
                color: #333;
              }
              .card {
                background: white;
                padding: 2rem;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 80%;
              }
              h1 {
                color: #F44336;
                margin-bottom: 1rem;
              }
              p {
                margin: 0.5rem 0;
                line-height: 1.5;
              }
              .error-msg {
                font-size: 0.9rem;
                color: #666;
                margin-top: 1rem;
                word-break: break-word;
              }
              .button {
                margin-top: 1.5rem;
                padding: 0.75rem 1.5rem;
                background-color: #2196F3;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                text-decoration: none;
                font-weight: bold;
              }
              .button:hover {
                background-color: #0b7dda;
              }
            </style>
            <script>
              // 3초 후 마스터 페이지로 이동
              setTimeout(function() {
                window.opener ? window.opener.postMessage('payment_fail', '*') : window.location.href = '/';
                setTimeout(function() {
                  // 팝업이면 창 닫기
                  if (window.opener) {
                    window.close();
                  }
                }, 1000);
              }, 3000);
            </script>
          </head>
          <body>
            <div class="card">
              <h1>결제에 실패했습니다</h1>
              <p>결제 중 문제가 발생했습니다.</p>
              <p>다시 시도하거나 고객센터로 문의해 주세요.</p>
              ${message ? `<p class="error-msg">오류 메시지: ${message}</p>` : ''}
              <a href="/" class="button">다시 시도하기</a>
            </div>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error('결제 실패 처리 오류:', error);
      res.status(500).send('결제 실패 처리 중 오류가 발생했습니다.');
    }
  });

  // 간소화된 결제 준비 API - 포트원 V2 API 사용
  app.post("/api/payments/portone-prepare-simple", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }

    const { bidId, orderId, productName, amount } = req.body;

    try {
      // 도메인 정보 가져오기
      const host = req.get('host') || 'localhost:5000';
      const protocol = req.protocol || 'http';
      const baseUrl = `${protocol}://${host}`;
      
      // 콜백 URL 설정
      const successUrl = `${baseUrl}/api/payments/success?orderId=${orderId}`;
      const failUrl = `${baseUrl}/api/payments/fail?orderId=${orderId}`;
      
      // 주문 생성
      const orderData = {
        orderId: orderId,
        productId: 1, // 임시 상품 ID
        amount: amount.toString(),
        customerName: req.user?.username,
        customerEmail: req.user?.email,
        customerPhone: req.user?.phone || ''
      };
      
      // 주문 정보 직접 생성 (fetch 대신 엔드포인트 호출 시)
      try {
        // 사용자 ID 확인
        if (!req.user) {
          throw new Error('로그인이 필요합니다.');
        }
        
        // 구매자 정보 생성
        const buyerInfo = {
          name: req.user.username || '',
          email: req.user.email || '',
          phone: '' // 사용자 전화번호가 없으면 비운 문자열로
        };
        
        // vendors 테이블에서 유효한 판매자 ID 찾기 (3번은 ralphparkvendor)
        const vendorId = 3; // 기본 판매자 ID
        
        // 주문 정보 작성
        const order = await storage.createOrder({
          orderId,
          productId: 1,
          userId: req.user.id,
          vendorId, // 유효한 판매자 ID 사용
          conversationId: 0,
          price: amount.toString(),
          status: 'created',
          buyerInfo,
          recipientInfo: buyerInfo  // 기본적으로 구매자 정보와 동일하게 설정
        });
        
        console.log('주문 생성 성공:', order);
      } catch (orderError) {
        console.error('주문 생성 오류:', orderError);
        throw new Error('주문 생성에 실패했습니다. ' + (orderError instanceof Error ? orderError.message : ''));
      }
      
      // 포트원 V2 API를 통해 결제 시작
      const portoneV2Client = await import('./portone-v2-client');
      const portoneClient = portoneV2Client.default;
      
      const paymentData = await portoneClient.createPayment({
        orderId: orderId,
        orderName: productName,
        channelKey: 'channel-key-5cdfe609-e895-41ae-9efd-d6a7d3148e79',
        amount: amount,
        currency: 'KRW',
        redirectUrl: {
          successUrl,
          failUrl
        },
        // 특수 PG 설정 - 스크린샷에서 가져온 실제 정보
        pgProvider: 'inicis_v2',  // 이니시스 PG
        customer: {
          name: req.user?.username || '',
          email: req.user?.email || '',
          phoneNumber: req.user?.phone || ''
        },
        orderItems: [{
          orderQuantity: 1,
          orderItemName: productName,
          productId: "1",
          orderItemAmt: amount
        }],
        orderMerchantData: {
          merchantUserId: req.user?.id?.toString() || '0',
          orderId: orderId
        },
        payMethod: 'CARD' // 이니시스에서 지원하는 결제 방법
      });

      // 결제 ID 저장
      if (paymentData && paymentData.payment && paymentData.payment.id) {
        await storage.updatePaymentByOrderId(orderId, {
          paymentKey: paymentData.payment.id,
          paymentUrl: paymentData.payment.checkout_url
        });

        // 결제 URL 반환
        res.json({
          success: true,
          orderId,
          amount: amount.toString(),
          orderName: productName,
          url: paymentData.payment.checkout_url
        });
      } else {
        console.error('결제 정보 생성 오류:', paymentData);
        throw new Error('결제 정보 생성에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('결제 준비 API 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '결제 준비 중 오류가 발생했습니다.'
      });
    }
  });

  // 결제 상태 웹훅 (토스페이먼츠에서 호출) - 실제 운영 환경에서 사용
  app.post("/api/payments/webhook", async (req, res) => {
    const { paymentKey, status, orderId } = req.body;

    try {
      // 결제 정보 확인
      const payment = await storage.getPaymentByOrderId(orderId);
      if (!payment) {
        return res.status(404).json({ error: "결제 정보를 찾을 수 없습니다" });
      }

      // 결제 정보 업데이트
      await storage.updatePayment(payment.id, {
        status,
        paymentKey,
        receipt: req.body
      });

      // 입찰 상태 업데이트 (결제 성공 시)
      if (status === 'DONE') {
        await storage.updateBid(payment.bidId, {
          status: 'paid',
          paymentId: payment.id
        });
      } else if (status === 'CANCELED') {
        await storage.updateBid(payment.bidId, {
          status: 'bidded' // 입찰 상태로 복귀
        });
      }

      // 응답
      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error("결제 웹훅 처리 중 오류:", error);
      res.status(500).json({ error: "결제 웹훅 처리에 실패했습니다" });
    }
  });
  
  // 결제 성공 리다이렉트 처리
  app.get("/api/payments/success-redirect", (req, res) => {
    const { paymentKey, orderId, amount } = req.query;
    
    // 결제 성공 페이지로 리다이렉트 (querystring 유지)
    res.redirect(`/payment/success?paymentKey=${paymentKey}&orderId=${orderId}&amount=${amount}`);
  });
  
  // 결제 실패 리다이렉트 처리
  app.get("/api/payments/fail-redirect", (req, res) => {
    const { code, message, orderId } = req.query;
    
    // 결제 실패 페이지로 리다이렉트 (querystring 유지)
    res.redirect(`/payment/fail?code=${code}&message=${encodeURIComponent(message as string)}&orderId=${orderId}`);
  });

  // 결제 성공 페이지
  app.get("/payment/success", (req, res) => {
    const { paymentKey, orderId, amount } = req.query;
    
    // NOTE: 실제 애플리케이션에서는 이 페이지를 React 라우트로 처리해야 합니다.
    // 여기서는 임시로 HTML 응답을 반환합니다.
    res.send(`
      <html>
        <head>
          <title>결제 성공</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <script>
            // 부모 창으로 결제 성공 메시지 전달
            function notifyPaymentResult() {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'PAYMENT_SUCCESS',
                  paymentKey: '${paymentKey}',
                  orderId: '${orderId}',
                  amount: ${amount}
                }, window.location.origin);
                setTimeout(() => window.close(), 1000);
              } else {
                // 부모 창이 없으면 홈으로 리다이렉트
                window.location.href = '/';
              }
            }
            // 페이지 로드 시 실행
            window.onload = notifyPaymentResult;
          </script>
          <style>
            body {
              font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background-color: #f8f9fa;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              max-width: 90%;
              width: 400px;
            }
            h1 {
              color: #4caf50;
              margin-bottom: 1rem;
            }
            p {
              margin-bottom: 1.5rem;
              color: #666;
              line-height: 1.5;
            }
            .info {
              text-align: left;
              margin: 1.5rem 0;
              padding: 1rem;
              background-color: #f5f5f5;
              border-radius: 4px;
              font-size: 0.9rem;
            }
            .info div {
              margin-bottom: 0.5rem;
            }
            .label {
              font-weight: bold;
              color: #333;
              margin-right: 0.5rem;
            }
            .button {
              background-color: #4caf50;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 4px;
              cursor: pointer;
              font-size: 1rem;
              transition: background-color 0.2s;
            }
            .button:hover {
              background-color: #43a047;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>결제가 완료되었습니다</h1>
            <p>결제가 정상적으로 처리되었습니다. 창이 자동으로 닫히지 않으면 아래 버튼을 클릭해주세요.</p>
            
            <div class="info">
              <div><span class="label">주문번호:</span> ${orderId}</div>
              <div><span class="label">결제금액:</span> ${Number(amount).toLocaleString()}원</div>
            </div>
            
            <button class="button" onclick="window.close()">창 닫기</button>
          </div>
        </body>
      </html>
    `);
  });

  // 결제 실패 페이지
  // 체크아웃 페이지 제공 API
  app.post("/api/payments/checkout-page", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }
    
    // 세션이 있는 경우에만 결제 페이지 렌더링
    try {
      const { orderId, orderName, amount, clientKey, successUrl, failUrl } = req.body;
      
      // KG이니시스 설정 추가
      const merchantID = 'imp49910675';  // 포트원 가맹점 식별코드
      const inicisCode = 'MOI3204387';  // KG이니시스 상점ID(MID) - 스크린샷에서 확인
      
      // 사용자 정보 가져오기 (있는 경우)
      const buyer_email = req.user?.email || '';
      const buyer_name = req.user?.username || '';
      const buyer_tel = '';  // 사용자 전화번호 필드 추가 필요
      
      if (!orderId || !amount || !clientKey) {
        return res.status(400).json({ error: "필수 정보가 누락되었습니다" });
      }
      
      // 템플릿 변수 치환 문제를 피하기 위해 하드코딩 방식으로 구현
      const displayOrderName = orderName || '식물 상품';
      const displayAmount = parseInt(amount).toLocaleString();
      const amountValue = parseInt(amount);
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>결제 진행</title>
          <script src="https://cdn.iamport.kr/v1/iamport.js"></script>
          <style>
            body {
              font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
              margin: 0;
              padding: 20px;
              background-color: #f8f9fa;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
            }
            .container {
              max-width: 500px;
              width: 100%;
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              padding: 24px;
            }
            h1 {
              margin-top: 0;
              font-size: 24px;
              font-weight: 600;
              color: #333;
            }
            .order-info {
              margin: 24px 0;
              padding: 16px;
              background-color: #f5f5f5;
              border-radius: 6px;
            }
            .order-item {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
            }
            .order-item:last-child {
              margin-bottom: 0;
              padding-top: 8px;
              border-top: 1px solid #ddd;
              font-weight: 600;
            }
            .label {
              color: #666;
            }
            .value {
              font-weight: 500;
            }
            .button {
              background-color: #16a34a;
              color: white;
              border: none;
              border-radius: 6px;
              padding: 12px 16px;
              font-size: 16px;
              font-weight: 600;
              width: 100%;
              cursor: pointer;
              transition: background-color 0.2s;
            }
            .button:hover {
              background-color: #138a41;
            }
            .button:disabled {
              background-color: #9ca3af;
              cursor: not-allowed;
            }
            .payment-info {
              margin-top: 24px;
              text-align: center;
              font-size: 14px;
              color: #6b7280;
            }
            .loading-spinner {
              display: inline-block;
              width: 16px;
              height: 16px;
              border: 2px solid rgba(255,255,255,.3);
              border-radius: 50%;
              border-top-color: white;
              animation: spin 1s ease-in-out infinite;
              margin-right: 8px;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>결제 정보 확인</h1>
            
            <div class="order-info">
              <div class="order-item">
                <span class="label">상품명</span>
                <span class="value">${displayOrderName}</span>
              </div>
              <div class="order-item">
                <span class="label">주문번호</span>
                <span class="value">${orderId}</span>
              </div>
              <div class="order-item">
                <span class="label">결제 금액</span>
                <span class="value">${displayAmount}원</span>
              </div>
            </div>
            
            <button id="payment-button" class="button">결제하기</button>
            
            <div class="payment-info">
              <p>KG이니시스로 안전하게 결제됩니다.</p>
            </div>
          </div>
          
          <script>
            // 포트원 SDK 초기화
            var IMP = window.IMP;
            IMP.init('${merchantID}');
            
            // 결제 요청 버튼 이벤트 연결
            const button = document.getElementById('payment-button');
            button.addEventListener('click', function() {
              button.disabled = true;
              button.innerHTML = '<span class="loading-spinner"></span>결제 처리 중...';
              
              // KG이니시스 결제 요청
              IMP.request_pay({
                pg: 'inicis_v2.${inicisCode}', // KG이니시스 상점ID(MID)
                pay_method: 'card',           // 결제수단
                merchant_uid: '${orderId}',   // 공급자가 부여하는 주문번호
                name: '${displayOrderName}',  // 상품명
                amount: ${amountValue},        // 결제금액
                buyer_email: '${buyer_email}', // 구매자 이메일
                buyer_name: '${buyer_name}',   // 구매자 이름
                buyer_tel: '${buyer_tel}',     // 구매자 전화번호
                m_redirect_url: '${successUrl}'// 모바일일 경우 리다이렉트 URL
              }, function(rsp) {
                if (rsp.success) {
                  // 결제 성공
                  window.location.href = '${successUrl}?paymentKey=' + rsp.imp_uid + '&orderId=' + rsp.merchant_uid + '&amount=' + rsp.paid_amount;
                } else {
                  // 결제 실패
                  console.error('결제 요청 실패:', rsp);
                  alert('결제 요청 중 오류가 발생했습니다: ' + rsp.error_msg);
                  
                  // 버튼 복원
                  button.disabled = false;
                  button.textContent = '결제하기';
                  
                  // 실패 페이지로 이동 (선택적)
                  // window.location.href = '${failUrl}?code=' + rsp.error_code + '&message=' + encodeURIComponent(rsp.error_msg) + '&orderId=' + rsp.merchant_uid;
                }
              });
            });
          </script>
        </body>
        </html>
      `;
      
      res.send(html);
    } catch (error) {
      console.error("체크아웃 페이지 생성 중 오류:", error);
      res.status(500).json({ error: "체크아웃 페이지 생성에 실패했습니다" });
    }
  });
  
  app.get("/payment/fail", (req, res) => {
    const { code, message, orderId } = req.query;
    
    // NOTE: 실제 애플리케이션에서는 이 페이지를 React 라우트로 처리해야 합니다.
    // 여기서는 임시로 HTML 응답을 반환합니다.
    res.send(`
      <html>
        <head>
          <title>결제 실패</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <script>
            // 부모 창으로 결제 실패 메시지 전달
            function notifyPaymentResult() {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'PAYMENT_FAIL',
                  code: '${code}',
                  message: '${message}',
                  orderId: '${orderId}'
                }, window.location.origin);
                setTimeout(() => window.close(), 1000);
              } else {
                // 부모 창이 없으면 홈으로 리다이렉트
                window.location.href = '/';
              }
            }
            // 페이지 로드 시 실행
            window.onload = notifyPaymentResult;
          </script>
          <style>
            body {
              font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background-color: #f8f9fa;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              max-width: 90%;
              width: 400px;
            }
            h1 {
              color: #f44336;
              margin-bottom: 1rem;
            }
            p {
              margin-bottom: 1.5rem;
              color: #666;
              line-height: 1.5;
            }
            .error {
              text-align: left;
              margin: 1.5rem 0;
              padding: 1rem;
              background-color: #ffebee;
              border-radius: 4px;
              color: #d32f2f;
              font-size: 0.9rem;
            }
            .button {
              background-color: #f44336;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 4px;
              cursor: pointer;
              font-size: 1rem;
              transition: background-color 0.2s;
            }
            .button:hover {
              background-color: #e53935;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>결제에 실패했습니다</h1>
            <p>결제 처리 중 문제가 발생했습니다. 창이 자동으로 닫히지 않으면 아래 버튼을 클릭해주세요.</p>
            
            <div class="error">
              <strong>오류 코드:</strong> ${code}<br>
              <strong>오류 메시지:</strong> ${message}
            </div>
            
            <button class="button" onclick="window.close()">창 닫기</button>
          </div>
        </body>
      </html>
    `);
  });
}