#!/usr/bin/env node

/**
 * 포트원 V2 API MID(상점 식별자) 테스트 스크립트
 * 이 스크립트는 MID 필드가 대시보드에 올바르게 표시되는지 테스트합니다.
 */

import axios from 'axios';

// 고정된 MID 값 (상점 식별자)
const MID = "MOI3204387";

// 테스트 주문/결제 ID 생성 (pay_ 형식 26자)
const generatePaymentId = () => {
  const now = new Date();
  const timestamp = now.getTime();
  const random = Math.random().toString(36).substring(2, 8);
  const cleanId = (timestamp.toString() + random).replace(/[^a-zA-Z0-9]/g, '');
  const paddedId = cleanId.substring(0, 22).padEnd(22, 'f');
  return `pay_${paddedId}`;
};

// 결제 생성 및 MID 테스트
async function createPaymentWithMid() {
  try {
    // 결제 ID 생성
    const paymentId = generatePaymentId();
    console.log(`생성된 결제 ID: ${paymentId}`);
    console.log(`사용할 MID: ${MID}`);
    
    // 로컬 서버에 요청 (api_direct 경로 사용)
    const response = await axios.post('http://localhost:5000/api_direct/payment/create-test', {
      paymentId: paymentId,
      amount: 1000,
      productName: 'MID 테스트 상품',
      customerName: '테스터',
      merchantId: MID
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log('결제 생성 응답:', response.data);
    
    // 생성된 URL 출력
    if (response.data.checkoutUrl) {
      console.log('\n===== 결제 테스트 URL =====');
      console.log(response.data.checkoutUrl);
      console.log('============================\n');
      
      // URL에 MID 파라미터가 포함되어 있는지 확인
      const url = new URL(response.data.checkoutUrl);
      const params = new URLSearchParams(url.search);
      console.log('mid 파라미터:', params.get('mid'));
      
      if (params.get('mid') === MID) {
        console.log('✅ 검증 통과: URL에 올바른 MID가 포함되어 있습니다.');
      } else {
        console.log('❌ 검증 실패: URL에 올바른 MID가 포함되어 있지 않습니다.');
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('에러 발생:', error.response?.data || error.message);
    throw error;
  }
}

// 스크립트 실행
createPaymentWithMid()
  .then(() => {
    console.log('MID 테스트 완료');
  })
  .catch(error => {
    console.error('MID 테스트 실패:', error);
    process.exit(1);
  });