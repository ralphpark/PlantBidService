/**
 * 포트원 SDK 로더 유틸리티 함수
 * 문서: https://developers.portone.io/docs/ko/v2-payment/authpay
 */

// 가맹점 ID 설정
// 포트원/아임포트 SDK 테스트 용 가맹점 ID
const IMP_MERCHANT_ID = 'imp16062547';  // 테스트 화이트페이퍼에 사용되는 ID
const PG_PROVIDER = 'tosspayments';      // PG사 코드

// 결제 처리에 사용될 PG사 코드
// 일반적인 형태: {PG사}.{MID}
// 고정 테스트용 PG 코드 사용
const PG_CODE = 'tosspayments.iamporttest_3';

// V1 SDK 버전 지정 (포트원이 제일 많이 사용하는 버전)
const SDK_VERSION = '1.1.5';   // 가장 안정적인 버전으로 변경

// 토스페이먼츠 테스트용 정보
const TOSS_PAYMENTS = {
  provider: 'tosspayments',
  channelKey: 'channel-key-76ba6023-8c18-4876-9f56-b737ac1587e5',
  storeId: 'store-cb422187-16bc-4ea5-8fd8-9d08094d27a1'
};

/**
 * 포트원 SDK를 완전히 제거합니다.
 */
export function removePortOneSDK(): void {
  try {
    // V1 SDK 제거
    if (window.IMP) {
      console.log('기존 포트원 V1 SDK 제거');
      delete window.IMP;
    }
    
    // V2 SDK 제거
    if ((window as any).PortOne) {
      console.log('기존 포트원 V2 SDK 제거');
      delete (window as any).PortOne;
    }
    
    // 기존 스크립트 제거
    const scripts = document.querySelectorAll('script[src*="iamport"], script[src*="portone"]');
    scripts.forEach(script => script.remove());
    
    console.log('기존 SDK 제거됨');
  } catch (e) {
    console.error('SDK 제거 중 오류:', e);
  }
}

/**
 * 포트원 SDK를 로드하고 초기화합니다.
 */
export function loadPortOneSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    // 완전히 새로 시작하기 위해 기존 SDK 제거
    removePortOneSDK();
    
    // 머체트 ID 확인
    console.log('SDK 로드 전 메르카도 ID 확인:', IMP_MERCHANT_ID);

    // SDK 로드 - 포트원 V1 SDK (IMP 객체 사용)
    const script = document.createElement('script');
    script.src = `https://cdn.iamport.kr/js/iamport.payment-${SDK_VERSION}.js`;
    script.async = true;

    script.onload = () => {
      console.log('포트원 SDK 로드 성공');
      
      // SDK 로드 후 즉시 초기화
      if (window.IMP) {
        window.IMP.init(IMP_MERCHANT_ID);
        console.log(`포트원 SDK 초기화 완료: ${IMP_MERCHANT_ID}`);
        
        // 토스페이먼츠 전용 설정
        configureTossPayments();
        
        resolve();
      } else {
        console.error('SDK 로드 후 IMP 객체가 없습니다');
        reject(new Error('IMP 객체 초기화 실패'));
      }
    };

    script.onerror = (error) => {
      console.error('포트원 SDK 로드 실패:', error);
      reject(new Error('포트원 SDK 로드 실패'));
    };

    document.head.appendChild(script);
  });
}

/**
 * 토스페이먼츠 전용 설정 구성 - 포트원 공식 문서 방식 채택
 */
function configureTossPayments() {
  if (!window.IMP) {
    console.error('IMP 객체가 없습니다');
    return;
  }

  try {
    // 1. SDK 초기화 확인
    console.log('SDK 초기화 완료:', PG_CODE);

    // 2. 공식 문서 방식으로 지정
    // 형식: {PG사}.{MID}
    // 예시: tosspayments.iamporttest_3
    (window.IMP as any).pg = PG_CODE; 
    
    // 3. 성공 로그 출력
    console.log('포트원 PG 설정 완료:', PG_CODE);
    
    return true;
  } catch (error) {
    console.error('포트원 SDK 설정 중 오류:', error);
    throw error;
  }
}

/**
 * 결제 테스트용 인자를 생성합니다.
 */
export function createPaymentParams(options: {
  amount: number;
  productName: string;
  orderNumber?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}) {
  // 주문번호 생성 (제공되지 않은 경우)
  const merchant_uid = options.orderNumber || 
                      `mid_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  
  return {
    pg: 'tosspayments', // 중요: PG 이름만 지정 - MID 없이
    pay_method: 'card', // 결제수단
    merchant_uid: merchant_uid,
    name: options.productName,
    amount: options.amount,
    buyer_email: options.customerEmail || 'guest@example.com',
    buyer_name: options.customerName || '게스트',
    buyer_tel: options.customerPhone || '010-0000-0000',
    m_redirect_url: `${window.location.origin}/payment/success`,
    
    // 토스페이먼츠 추가 파라미터
    channel_key: 'channel-key-76ba6023-8c18-4876-9f56-b737ac1587e5',
    store_id: 'store-cb422187-16bc-4ea5-8fd8-9d08094d27a1',
    
    // 포트원에서 바로 사용하는 옵션
    digital: false, // 상품 유형: 실물
    escrow: false,  // 에스크로 사용 안함
    vat: 0,         // 부가세
    tax_free: 0     // 면세
  };
}