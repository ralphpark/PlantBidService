import { Express, Request, Response } from 'express';
import { IStorage } from './storage';
import { isNumber, isString } from 'util';
import { StatusCodes } from 'http-status-codes';
import { PortOneV2Client } from './portone-v2-client';
import { preparePaymentSimple } from './portone-simple-client';

// 토스페이먼츠 테스트 계정 정보
const TOSS_PAYMENTS_TEST = {
  // 클라이언트 측 정보
  clientKey: 'test_ck_lpP2YxJ4K877JAdv7KX8RGZwXLOb', // 클라이언트 키 - 클라이언트에서 사용
  storeId: 'store-cb422187-16bc-4ea5-8fd8-9d08094d27a1',  // 스토어 ID - SDK 내부 사용
  channelKey: 'channel-key-5cdfe609-e895-41ae-9efd-d6a7d3148e79', // 채널키 - plantbid_v2_real 채널
  merchantId: 'imp16062547', // 토스페이먼츠 가맹점 ID (V1 API와 호환 위해 추가)
  
  // 서버 측 정보
  apiSecretKey: 'MtRe07cJYILv8ito8E40Z7ALsZoaGlBNPV6LDOXpvn072iDl4f142QSQRiOKYEF5vXtHI0RZDuipl6LP', // V2 API Secret - 매우 중요
  secretKey: 'test_sk_d26DlbXAaV0xQbpa7y1VqY50Q9RB', // 시크릿 키 - 배포 후 아래 V1 호환용으로 남김
};

// 포트원 V2 API 클라이언트 인스턴스가 portone-v2-client.ts에서 생성됨

/**
 * 포트원 결제 준비 (Payment Request 생성)
 * V2 API 구현
 */
async function preparePortOnePayment(params: {
  orderId: string;
  orderName: string;
  amount: number;
  successUrl: string;
  failUrl: string;
  customerEmail?: string;
  customerName?: string;
}) {
  try {
    // 전체 요청 로깅
    console.log('포트원 V2 결제 준비 요청 (디버깅):', JSON.stringify(params, null, 2));
    
    // portone-v2-client 모듈 동적 로드
    const { default: portOneClient } = await import('./portone-v2-client');
    
    // 실제 V2 API를 통한 결제 생성 요청 수행
    const response = await portOneClient.createPayment({
      orderId: params.orderId,
      orderName: params.orderName,
      amount: params.amount,
      redirectUrl: {
        successUrl: params.successUrl,
        failUrl: params.failUrl
      },
      // V2 API 직접 호출용 옵션
      customer: {
        name: params.customerName || '게스트',
        email: params.customerEmail || 'guest@example.com'
      },
      // V2 API에서는 추가 메타 정보가 지원되지 않음
    });
    
    // 응답 데이터 로깅
    console.log('포트원 V2 API 응답 (디버깅):', JSON.stringify(response, null, 2));
    
    // 생성된 결제 URL 추출 - V2 API 응답 형식에 맞게 수정
    // checkoutUrl 필드를 사용 (V2 API 응답 형식에 맞게)
    const paymentPageUrl = response.checkoutUrl || null;
    const paymentId = response.paymentId || null;
    
    if (!paymentPageUrl) {
      throw new Error('결제 URL이 생성되지 않았습니다.');
    }
    
    console.log('포트원 V2 API - 생성된 결제 정보:', {
      paymentId: paymentId,
      checkoutUrl: paymentPageUrl
    });
    
    // 응답 데이터 구성
    return {
      code: 0,
      message: '결제 정보가 성공적으로 생성되었습니다',
      paymentId: paymentId || '',
      orderId: params.orderId,
      orderName: params.orderName,
      url: paymentPageUrl,
      clientKey: TOSS_PAYMENTS_TEST.clientKey,
      amount: params.amount
    };
  } catch (error: any) {
    // 오류 디테일 로깅
    if (error.response) {
      console.error('포트원 V2 API 오류 발생:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else {
      console.error('포트원 결제 준비 오류:', error.message || error);
    }
    
    // 실패 시 상세 오류 메시지 반환
    throw new Error(
      error.response?.data?.message || 
      error.message || 
      '결제 준비 중 오류가 발생했습니다.'
    );
  }
}

/**
 * 포트원 결제 검증 API 호출 (V2 API 형식)
 */
async function verifyPortOnePayment(impUid: string, merchantUid: string, amount: number) {
  try {
    console.log('포트원 V2 결제 검증 요청:', { impUid, merchantUid, amount });
    
    // V2 API를 통한 결제 정보 조회
    const result = await import('./portone-v2-client').then(module => {
      const client = module.default;
      return client.getPayment(impUid);
    });
    
    // 결제 정보 검증
    if (result.payment?.orderId !== merchantUid || 
        (amount > 0 && result.payment?.amount?.total !== amount)) {
      throw new Error('결제 정보가 일치하지 않습니다.');
    }

    return result.payment;
  } catch (error) {
    console.error('포트원 V2 결제 검증 오류:', error);
    throw new Error('결제 검증에 실패했습니다.');
  }
}

/**
 * 포트원(PortOne) 결제 관련 API 엔드포인트 설정
 */
export function setupPortOneRoutes(app: Express, storage: IStorage) {
  
  // 간소화된 결제 준비 엔드포인트 (신규 테스트 코드로 대체)
  app.post('/api/payments/portone-prepare-simple', async (req: Request, res: Response) => {
    // 사용자 인증 확인
    if (!req.isAuthenticated()) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: '로그인이 필요합니다.'
      });
    }
    
    try {
      const { bidId, orderId, productName, amount, customerEmail, customerName } = req.body;
      
      if (!orderId || !productName || !amount) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: '필수 결제 정보가 누락되었습니다.'
        });
      }
      
      console.log('간소화된 포트원 클라이언트 결제 준비 시작...');
      
      // 간소화된 포트원 클라이언트 사용
      const paymentData = await preparePaymentSimple({
        orderId,
        productName,
        amount: Number(amount),
        customerName,
        customerEmail,
        customerTel: '010-0000-0000'
      });
      
      // 사용자 ID 가져오기
      const userId = req.user!.id;
      
      // V2 API 규격에 맞는 결제 ID 및 상점 주문번호 생성
      const portoneV2Client = await import('./portone-v2-client');
      const paymentKey = portoneV2Client.generatePortonePaymentId();
      const merchantId = portoneV2Client.generateInicisOrderNumber();
      console.log(`포트원 V2 API 규격 결제 ID 생성: ${paymentKey}`);
      console.log(`이니시스 상점 주문번호(MID) 생성: ${merchantId}`);
      
      // 결제 ID 생성 및 저장 (V2 API 형식 paymentKey 및 MID 사용)
      const payment = await storage.createPayment({
        bidId: bidId || 0,
        userId,
        paymentKey: paymentKey, // 처음부터 V2 API 형식의 결제 ID 사용
        merchantId: merchantId, // 이니시스 상점 주문번호 추가
        orderId,
        orderName: productName,
        amount: amount.toString(),
        status: 'READY',
        method: '' // 결제 완료 후 업데이트
      });
      
      // 전송할 응답 데이터 생성
      const responseData = {
        success: true,
        paymentId: payment.id,
        orderId,
        orderName: productName,
        amount: amount.toString(),
        url: paymentData.url,
        clientKey: paymentData.clientKey
      };
      
      console.log('간소화된 포트원 결제 준비 완료, 응답 데이터:', JSON.stringify(responseData, null, 2));
      
      // 응답 반환
      res.json(responseData);
      
    } catch (error) {
      console.error('간소화된 포트원 결제 준비 오류:', error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error instanceof Error ? error.message : '결제 준비 중 오류가 발생했습니다.'
      });
    }
  });
  
  // 기존 결제 준비 엔드포인트 (REST API 방식)
  app.post('/api/payments/portone-prepare', async (req: Request, res: Response) => {
    // 사용자 인증 확인
    if (!req.isAuthenticated()) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: '로그인이 필요합니다.'
      });
    }
    
    try {
      const { bidId, orderId, productName, amount, customerEmail, customerName } = req.body;
      
      if (!bidId || !orderId || !productName || !amount) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: '필수 결제 정보가 누락되었습니다.'
        });
      }
      
      // 현재 서버 도메인 구하기
      const host = req.headers.host || req.get('host') || '';
      const protocol = req.headers['x-forwarded-proto'] || 
                      (host.includes('localhost') ? 'http' : 'https');
      const baseUrl = `${protocol}://${host}`;
      
      // 결제 성공/실패 시 리다이렉트 URL
      const successUrl = `${baseUrl}/api/payments/portone-success?orderId=${orderId}&amount=${amount}`;
      const failUrl = `${baseUrl}/api/payments/portone-fail`;
      
      // 포트원 API를 통해 결제 준비
      const paymentData = await preparePortOnePayment({
        orderId,
        orderName: productName,
        amount: Number(amount),
        successUrl,
        failUrl,
        customerEmail,
        customerName
      });
      
      // 사용자 ID 가져오기 (인증 처리 된 경우 req.user가 반드시 존재함)
      const userId = req.user!.id;
      
      // V2 API 규격에 맞는 결제 ID 및 상점 주문번호 생성
      const portoneV2Client = await import('./portone-v2-client');
      const paymentKey = portoneV2Client.generatePortonePaymentId();
      const merchantId = portoneV2Client.generateInicisOrderNumber();
      console.log(`포트원 V2 API 규격 결제 ID 생성: ${paymentKey}`);
      console.log(`이니시스 상점 주문번호(MID) 생성: ${merchantId}`);
      
      // 결제 ID 생성 및 저장 (V2 API 형식 paymentKey 및 MID 사용)
      const payment = await storage.createPayment({
        bidId,
        userId,
        paymentKey: paymentKey, // 처음부터 V2 API 형식의 결제 ID 사용
        merchantId: merchantId, // 이니시스 상점 주문번호 추가
        orderId,
        orderName: productName,
        amount: amount.toString(),
        status: 'READY',
        method: '' // 결제 완료 후 업데이트
      });
      
      // 전송할 응답 데이터 생성 - 간소화된 구조
      const responseData = {
        success: true,
        paymentId: payment.id,
        orderId,
        orderName: productName,
        amount: amount.toString(),
        successUrl,
        failUrl,
        // URL을 최상위 레벨에 노출
        url: paymentData.url || null,
        clientKey: paymentData.clientKey || 'test_ck_lpP2YxJ4K877JAdv7KX8RGZwXLOb'
      };

      // 응답 데이터 로깅
      console.log('클라이언트에 전송할 응답 데이터:', JSON.stringify(responseData, null, 2));
      console.log('URL 포함 여부 확인:', responseData.url || '없음');
      
      // 분명하게 URL 로깅
      if (responseData.url) {
        console.log('결제 URL을 정상적으로 찾음. 결제 URL:', responseData.url);
      } else {
        console.error('심각한 오류: 결제 URL이 응답 데이터에 없음');
      }
      
      // 응답 반환
      res.json(responseData);
      
    } catch (error) {
      console.error('결제 준비 오류:', error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error instanceof Error ? error.message : '결제 준비 중 오류가 발생했습니다.'
      });
    }
  });
  // 포트원 결제 성공 처리 (V1 API 형식)
  app.get('/api/payments/portone-success', async (req: Request, res: Response) => {
    // V1 API에서는 imp_uid(결제 고유번호)와 merchant_uid(주문번호)를 사용
    const { imp_uid, merchant_uid, amount } = req.query;

    if (!isString(imp_uid) || !isString(merchant_uid)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: '필수 파라미터가 올바르지 않습니다.'
      });
    }
    
    // amount가 없으면 결제 정보에서 조회
    const paymentAmount = isString(amount) ? amount : undefined;

    try {
      // 결제 정보 검증 (V1 API 사용)
      // 결제 정보 획득
      if (!paymentAmount) {
        // amount가 전달되지 않은 경우, API로 결제 정보 조회
        try {
          // 포트원 V1 API로 결제정보 확인
          const verifiedPayment = await verifyPortOnePayment(imp_uid, merchant_uid, 0);
          
          if (verifiedPayment && verifiedPayment.amount) {
            // API에서 조회한 금액으로 설정
            const amountNum = verifiedPayment.amount;
          } else {
            throw new Error('결제 정보를 찾을 수 없습니다.');
          }
        } catch (error) {
          console.error('결제 정보 검증 오류:', error);
          return res.status(StatusCodes.BAD_REQUEST).json({
            error: '결제 정보 검증에 실패했습니다.'
          });
        }
      }
      
      // 주문 ID에서 bidId 추출 (merchant_uid는 사용자 정의 형식이어야 함)
      const bidIdMatch = merchant_uid.match(/^(\d+)_/);
      const bidId = bidIdMatch ? parseInt(bidIdMatch[1]) : null;

      if (!bidId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          error: '올바르지 않은 주문 ID 형식입니다.'
        });
      }

      // 입찰 정보 조회
      const bid = await storage.getBidById(bidId);
      if (!bid) {
        return res.status(StatusCodes.NOT_FOUND).json({
          error: '해당 입찰 정보를 찾을 수 없습니다.'
        });
      }

      // 유효성 검사 (금액 변조 체크)
      const amountNum = paymentAmount ? parseInt(paymentAmount) : 0;
      if (amountNum && amountNum !== parseInt(bid.price)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          error: '결제 금액이 일치하지 않습니다.'
        });
      }

      // 결제 정보 저장
      const payment = await storage.getPaymentByOrderId(merchant_uid);
      const orderName = payment?.orderName || `포트원 결제 - ${bidId}`;
      
      // 입찰에서 사용자 ID 가져오기 (비로그인시 첫 결제 때는 사용자 ID를 입찰에서 가져와야 함)
      const userId = payment?.userId || bid.userId;
      
      if (!userId) {
        throw new Error('사용자 정보를 찾을 수 없습니다.');
      }
      
      // V1 API(imp_uid)에서 V2 API 형식으로 변환
      // V2 API 규격에 맞는 결제 ID가 필요함
      const portoneV2Client = await import('./portone-v2-client');
      
      // imp_uid가 있고 V2 형식이 아닌 경우 변환
      let paymentKey = imp_uid;
      if (imp_uid && (!imp_uid.startsWith('pay_') || imp_uid.length !== 26)) {
        try {
          // V2 API 형식으로 변환 
          paymentKey = portoneV2Client.convertToV2PaymentId(imp_uid);
          console.log(`V1 API ID를 V2 형식으로 변환: ${imp_uid} → ${paymentKey}`);
        } catch (error) {
          console.error('결제 ID 변환 오류:', error);
          // 변환 실패 시 새로 생성
          paymentKey = portoneV2Client.generatePortonePaymentId();
          console.log(`변환 실패로 새 V2 API 결제 ID 생성: ${paymentKey}`);
        }
      }
      
      await storage.createPayment({
        bidId,
        userId,
        paymentKey: paymentKey, // V2 API 형식의 결제 ID 사용
        orderId: merchant_uid,
        orderName, // 사전에 저장된 결제 정보의 제품명 사용
        amount: bid.price, // 입찰 가격 사용
        status: 'DONE',
        method: 'CARD' // 결제수단 (추후 실제 결제수단으로 업데이트 가능)
      });

      // 입찰 상태 업데이트
      await storage.updateBidStatus(bidId, 'PAID');

      // 성공 페이지로 리다이렉트
      // success_url 쿼리가 있으면 해당 URL로 이동
      if (req.query.success_url) {
        res.redirect(req.query.success_url as string);
      } else {
        // 성공 페이지 HTML 직접 렌더링
        res.send(`
          <html>
            <head>
              <title>결제 완료</title>
              <script>
                // 부모 창으로 결제 성공 메시지 전송
                window.opener.postMessage({
                  type: 'PAYMENT_SUCCESS',
                  paymentKey: '${imp_uid}',
                  orderId: '${merchant_uid}',
                  amount: '${bid.price}'
                }, window.location.origin);
                
                // 잠시 후 창 닫기
                setTimeout(() => window.close(), 1000);
              </script>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  margin: 0;
                  background-color: #f8f9fa;
                }
                .success-icon {
                  width: 80px;
                  height: 80px;
                  border-radius: 50%;
                  background-color: #4caf50;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  margin-bottom: 20px;
                }
                .success-icon svg {
                  width: 40px;
                  height: 40px;
                  fill: white;
                }
                h1 {
                  color: #333;
                  margin-bottom: 10px;
                }
                p {
                  color: #666;
                  text-align: center;
                }
                .details {
                  background-color: white;
                  padding: 20px;
                  border-radius: 10px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                  margin-top: 20px;
                  width: 300px;
                }
              </style>
            </head>
            <body>
              <div class="success-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M9 16.17l-4.17-4.17-1.42 1.41 5.59 5.59 12-12-1.41-1.41z"></path>
                </svg>
              </div>
              <h1>결제가 완료되었습니다</h1>
              <p>결제 정보가 처리되었습니다. 이 창은 잠시 후 자동으로 닫힙니다.</p>
              <div class="details">
                <p><strong>주문번호:</strong> ${merchant_uid}</p>
                <p><strong>결제금액:</strong> ${parseInt(bid.price).toLocaleString()}원</p>
              </div>
            </body>
          </html>
        `);
      }
    } catch (error) {
      console.error('포트원 결제 성공 처리 오류:', error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: '결제 정보 처리 중 오류가 발생했습니다.'
      });
    }
  });

  // 포트원 결제 실패 처리
  app.get('/api/payments/portone-fail', async (req: Request, res: Response) => {
    const { message, code } = req.query;

    // 실패 페이지 HTML 직접 렌더링
    res.send(`
      <html>
        <head>
          <title>결제 실패</title>
          <script>
            // 부모 창으로 결제 실패 메시지 전송
            window.opener.postMessage({
              type: 'PAYMENT_FAIL',
              message: '${message || '결제에 실패했습니다.'}',
              code: '${code || 'UNKNOWN_ERROR'}'
            }, window.location.origin);
            
            // 잠시 후 창 닫기
            setTimeout(() => window.close(), 2000);
          </script>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background-color: #f8f9fa;
            }
            .error-icon {
              width: 80px;
              height: 80px;
              border-radius: 50%;
              background-color: #f44336;
              display: flex;
              justify-content: center;
              align-items: center;
              margin-bottom: 20px;
            }
            .error-icon svg {
              width: 40px;
              height: 40px;
              fill: white;
            }
            h1 {
              color: #333;
              margin-bottom: 10px;
            }
            p {
              color: #666;
              text-align: center;
            }
            .error-details {
              background-color: white;
              padding: 20px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              margin-top: 20px;
              width: 300px;
            }
          </style>
        </head>
        <body>
          <div class="error-icon">
            <svg viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path>
            </svg>
          </div>
          <h1>결제에 실패했습니다</h1>
          <p>결제 처리 중 문제가 발생했습니다. 이 창은 잠시 후 자동으로 닫힙니다.</p>
          <div class="error-details">
            <p><strong>오류 메시지:</strong> ${message || '알 수 없는 오류가 발생했습니다.'}</p>
            ${code ? `<p><strong>오류 코드:</strong> ${code}</p>` : ''}
            <p>다시 시도하거나 관리자에게 문의해 주세요.</p>
          </div>
        </body>
      </html>
    `);
  });
}