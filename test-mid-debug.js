/**
 * 포트원 MID 테스트 및 디버깅 스크립트
 * 이 스크립트는 기존 코드베이스를 활용하여 MID(상점 식별자) 필드를 테스트합니다.
 */

import { v4 as uuidv4 } from 'uuid';

// 고정된 MID 값
const FIXED_MID = "MOI3204387";

// 포트원 테스트 정보
const TEST_INFO = {
  storeId: "store-c2335caa-ad5c-4d3a-802b-568328aab2bc",
  channelKey: "channel-key-5cdfe609-e895-41ae-9efd-d6a7d3148e79"
};

/**
 * 랜덤 주문 ID 생성 (pay_ 형식)
 */
function generateOrderId() {
  const prefix = "pay_";
  const randomPart = Math.random().toString(36).substring(2, 10);
  const timestampPart = Date.now().toString();
  const paddedId = (timestampPart + randomPart).substring(0, 22).padEnd(22, 'f');
  return prefix + paddedId;
}

/**
 * 결제 URL 생성 함수 (체크아웃 URL 형식)
 */
function generatePaymentUrl(params) {
  // URL 기본 정보
  const baseUrl = "https://checkout.portone.io/orders/";
  
  // 필수 파라미터
  const orderId = params.orderId || generateOrderId();
  const amount = params.amount || 1000;
  const productName = params.productName || "테스트 상품";
  
  // MID 설정 (가장 중요)
  const merchantId = params.merchantId || FIXED_MID;
  
  // 체크아웃 URL 생성
  const url = new URL(baseUrl + orderId);
  
  // URL 파라미터 추가
  const urlParams = {
    channel_key: TEST_INFO.channelKey,
    merchant_order_id: "MOI" + new Date().toISOString().slice(0, 10).replace(/-/g, ""),
    payment_id: orderId,
    amount: amount.toString(),
    order_name: productName,
    pay_method: "CARD",
    terms_agreement: "Y",
    user_confirm_yn: "Y",
    mid: merchantId // 중요: 상점 식별자를 명시적으로 설정
  };
  
  // 파라미터를 URL에 추가
  Object.keys(urlParams).forEach(key => {
    url.searchParams.append(key, urlParams[key]);
  });
  
  return url.toString();
}

// 테스트 실행
function runTest() {
  console.log("===== 포트원 MID 테스트 =====");
  console.log(`고정된 MID: ${FIXED_MID}`);
  
  // 랜덤 주문 ID 생성
  const orderId = generateOrderId();
  console.log(`생성된 주문 ID: ${orderId}`);
  
  // 결제 URL 생성
  const paymentUrl = generatePaymentUrl({
    orderId: orderId,
    amount: 1000,
    productName: "MID 테스트 상품",
    merchantId: FIXED_MID
  });
  
  console.log("\n===== 결제 URL =====");
  console.log(paymentUrl);
  
  // URL 파라미터 확인
  const url = new URL(paymentUrl);
  console.log("\n===== URL 파라미터 =====");
  
  // MID 확인
  const mid = url.searchParams.get("mid");
  console.log(`MID: ${mid}`);
  
  if (mid === FIXED_MID) {
    console.log("✅ 검증 통과: URL에 올바른 MID가 포함되어 있습니다.");
  } else {
    console.log("❌ 검증 실패: URL에 올바른 MID가 포함되어 있지 않습니다.");
  }
  
  // 다른 중요 파라미터 확인
  console.log("주문 ID:", url.searchParams.get("payment_id"));
  console.log("상점 주문번호:", url.searchParams.get("merchant_order_id"));
  console.log("채널 키:", url.searchParams.get("channel_key"));
}

// 테스트 실행
runTest();