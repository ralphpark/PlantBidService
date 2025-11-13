import { default as axios } from 'axios';

// 테스트할 UUID 형식 결제 ID
const uuidPaymentKey = '0196b315-25b4-27a5-c420-5abf1c4521ba';

async function testCancelWithUUID() {
  try {
    console.log('📌 UUID 형식 ID로 결제 취소 테스트');
    console.log(`테스트 ID: ${uuidPaymentKey}`);
    
    console.log('1. 직접 라우터 호출 (/direct/payments/cancel):');
    const response = await axios.post('http://localhost:5000/direct/payments/cancel', {
      orderId: 'test_uuid_order_' + Date.now(),
      paymentKey: uuidPaymentKey,
      reason: 'UUID 테스트 취소'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ 응답 상태 코드:', response.status);
    console.log('✅ 응답 헤더:', JSON.stringify(response.headers, null, 2));
    
    // 만약 HTML이 반환되면 API가 잘못 처리된 것
    if (response.headers['content-type']?.includes('text/html')) {
      console.error('⚠️ HTML 응답이 반환됨 - API가 제대로 처리되지 않음');
    } else {
      console.log('✅ JSON 응답 확인됨');
      console.log('✅ 응답 데이터:', JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    if (error.response) {
      console.error('응답 상태:', error.response.status);
      console.error('응답 헤더:', JSON.stringify(error.response.headers, null, 2));
      
      if (error.response.headers['content-type']?.includes('application/json')) {
        console.error('응답 데이터:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('응답이 JSON 형식이 아님');
      }
    }
  }
}

// 테스트 실행
testCancelWithUUID();
