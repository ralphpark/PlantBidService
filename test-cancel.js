const axios = require('axios');

async function testCancel() {
  try {
    console.log('결제 취소 테스트를 시작합니다.');
    const response = await axios.post('http://localhost:5000/direct/payments/cancel', {
      orderId: 'ord_test_01234',
      paymentKey: '0196b315-25b4-27a5-c420-5abf1c4521ba',
      reason: '테스트 취소 요청'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('응답 데이터:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('오류 발생:', error.message);
    if (error.response) {
      console.error('응답 상태:', error.response.status);
      console.error('응답 데이터:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testCancel();
