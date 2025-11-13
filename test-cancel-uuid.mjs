import { default as axios } from 'axios';

// 테스트용 결제 ID (UUID 형식)
const uuid = '0196b315-25b4-27a5-c420-5abf1c4521ba';
const orderId = 'test-order-123'; // 주문 ID 추가

async function testCancelPayment() {
  try {
    console.log('📢 결제 취소 API 테스트 시작 (UUID 형식)');
    console.log(`원본 UUID: ${uuid}`);
    console.log(`주문 ID: ${orderId}`);
    
    // 직접 API 경로 사용
    const response = await axios.post('http://localhost:5000/direct/payments/cancel', {
      paymentId: uuid,
      orderId: orderId,
      reason: '테스트 취소'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ 응답 상태 코드:', response.status);
    
    if (response.headers['content-type']?.includes('application/json')) {
      console.log('✅ JSON 응답 확인됨');
      console.log('응답 데이터:', JSON.stringify(response.data, null, 2));
    } else {
      console.error('❌ JSON이 아닌 다른 형식의 응답:', response.headers['content-type']);
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    if (error.response) {
      console.error('응답 상태:', error.response.status);
      console.error('응답 데이터:', error.response.data);
    }
  }
}

// 테스트 실행
testCancelPayment();
