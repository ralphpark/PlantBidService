/**
 * 포트원 간이 테스트 클라이언트
 * 최신 포트원 API 명세 기반으로 업데이트됨
 * 참고: https://developers.portone.io/opi/ko/integration/start/v2/checkout?v=v2
 */
import axios from 'axios';

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

// 포트원 API 경로 개선 버전 (로깅 추가, 엔드포인트 명확화)
export async function getPortOneAccessToken() {
  try {
    console.log('포트원 인증 토큰 요청 시작 (개선 버전)');
    
    // 최신 포트원 API 문서에 따른 인증 로직 변경
    // https://developers.portone.io/opi/ko/integration/start/v2/checkout?v=v2
    const apiSecretKey = TOSS_PAYMENTS_TEST.apiSecretKey;
    
    // 새 API 엔드포인트 사용
    const response = await axios({
      method: 'post',
      url: 'https://api.portone.io/api-public/v2/login',
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        secretApiKey: apiSecretKey
      }
    });
    
    // 전체 응답 데이터 로깅
    console.log('포트원 인증 응답 데이터:', JSON.stringify(response.data, null, 2));
    
    // 최신 API 형식의 응답 확인
    if (response.data?.access_token) {
      console.log('포트원 V2 인증 토큰 획득 성공 (access_token 필드):', response.data.access_token.substring(0, 10) + '...');
      return response.data.access_token;
    } else {
      throw new Error('응답에 토큰이 없습니다. 응답: ' + JSON.stringify(response.data));
    }
    
  } catch (error) {
    console.error('포트원 인증 토큰 획득 실패:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('포트원 API 응답:', error.response.status, error.response.data);
    }
    throw new Error('포트원 인증에 실패했습니다.');
  }
}

// 결제 준비 함수 (개선 버전)
export async function preparePaymentSimple(params: {
  orderId: string;
  productName: string;
  amount: number;
  customerName?: string;
  customerEmail?: string;
  customerTel?: string;
}) {
  try {
    console.log('포트원 결제 준비 요청 (개선 버전):', params);
    
    // 인증 토큰 받기
    const accessToken = await getPortOneAccessToken();
    
    // 최신 포트원 API에 맞는 결제 준비 데이터 구성
    // https://developers.portone.io/opi/ko/integration/start/v2/checkout?v=v2
    const prepareData = {
      channelKey: TOSS_PAYMENTS_TEST.channelKey,
      paymentId: `payment_${Date.now()}`,
      orderName: params.productName,
      amount: {
        total: params.amount,
        vat: Math.round(params.amount / 11),  // 부가세 자동 계산
        currency: "KRW"
      },
      buyer: {
        name: params.customerName || '게스트',
        email: params.customerEmail || 'guest@example.com',
        phoneNumber: params.customerTel || '010-0000-0000'
      },
      orderMerchantId: params.orderId,
      productType: "REAL",
      products: [
        {
          name: params.productName,
          quantity: 1,
          amount: params.amount
        }
      ],
      method: "CARD",
      redirectUrl: {
        success: `${getBaseUrl()}/payment/success`,
        fail: `${getBaseUrl()}/payment/fail`
      }
    };
    
    const jsonData = JSON.stringify(prepareData);
    console.log('포트원 결제 준비 JSON 데이터:', jsonData);
    
    // 결제 준비 API 요청
    const response = await axios({
      method: 'post',
      url: 'https://api.portone.io/api-public/v2/payments',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      data: jsonData
    });
    
    console.log('포트원 결제 준비 응답:', response.data);
    
    // API 응답에서 paymentId 값 가져오기
    const paymentId = response.data?.paymentId || `portone_${Date.now()}`;
    console.log('받은 결제 ID:', paymentId);
    
    // 응답에서 결제 URL 확인 (새 API 명세에 따름)
    if (response.data?.checkout?.url) {
      // V2 API에서 제공하는 checkoutUrl 사용
      const checkoutUrl = response.data.checkout.url;
      console.log('포트원에서 직접 제공한 checkoutUrl 사용:', checkoutUrl);
      
      return {
        code: 0,
        message: '결제 정보가 성공적으로 생성되었습니다',
        paymentId: paymentId,
        orderId: params.orderId,
        orderName: params.productName,
        url: checkoutUrl,
        clientKey: TOSS_PAYMENTS_TEST.clientKey,
        amount: params.amount
      };
    }

    // 사용자 정의 URL 생성 (응답에 checkout URL이 없는 경우)
    const fallbackUrl = `https://pay.portone.io/checkout?storeId=${TOSS_PAYMENTS_TEST.storeId}&paymentId=${paymentId}&channelKey=${TOSS_PAYMENTS_TEST.channelKey}&amount=${params.amount}&orderName=${encodeURIComponent(params.productName)}`;
    console.log('사용자 정의 fallback URL 사용:', fallbackUrl);
    
    return {
      code: 0,
      message: '결제 정보가 성공적으로 생성되었습니다',
      paymentId: paymentId,
      orderId: params.orderId,
      orderName: params.productName,
      url: fallbackUrl,
      clientKey: TOSS_PAYMENTS_TEST.clientKey,
      amount: params.amount
    };
    
  } catch (error) {
    console.error('포트원 결제 준비 오류:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('포트원 API 응답:', error.response.status, error.response.data);
    }
    throw new Error('결제 준비 중 오류가 발생했습니다.');
  }
}

// 기본 URL 생성 함수
function getBaseUrl() {
  // 개발/배포 환경에 따른 기본 URL
  if (process.env.NODE_ENV === 'production') {
    return 'https://your-production-url.com';
  }
  
  // 개발 환경일 경우 Replit URL 사용
  const replSlug = process.env.REPL_SLUG || 'local-dev';
  const replOwner = process.env.REPL_OWNER || 'local';
  return `https://${replSlug}-${replOwner}.replit.dev`;
}

// 결제 URL 생성 함수
function createPaymentUrl(params: {
  storeId: string;
  channelKey: string;
  clientKey: string;
  paymentId?: string;
  merchantUid: string;
  orderName: string;
  amount: number;
  customerName?: string;
  customerEmail?: string;
  successUrl: string;
  failUrl: string;
}): string {
  // V2 버전의 결제 URL 생성
  const paymentParams = new URLSearchParams({
    storeId: params.storeId,
    channelKey: params.channelKey,
    clientKey: params.clientKey,
    paymentId: params.paymentId || `portone_${Date.now()}`,
    merchantUid: params.merchantUid,
    orderName: params.orderName,
    amount: params.amount.toString(),
    customerName: params.customerName || '게스트',
    customerEmail: params.customerEmail || 'guest@example.com',
    successUrl: params.successUrl,
    failUrl: params.failUrl,
    locale: 'ko',
    payMethod: 'CARD'
  });

  const url = `https://pay.portone.io/checkout?${paymentParams.toString()}`;
  return url;
}
